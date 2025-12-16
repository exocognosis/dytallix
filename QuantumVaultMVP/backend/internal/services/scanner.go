package services

import (
	"context"
	"crypto/ecdsa"
	"crypto/rsa"
	"crypto/sha1"
	"crypto/tls"
	"crypto/x509"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"

	"quantumvaultmvp/backend/internal/db"
)

type Scanner struct {
	log  *zap.Logger
	db   *db.DB
	risk *RiskEngine
}

func NewScanner(logger *zap.Logger, database *db.DB, risk *RiskEngine) *Scanner {
	return &Scanner{log: logger, db: database, risk: risk}
}

type Target struct {
	ID          string
	Name        string
	Type        string
	Environment string
	Address     string
	Port        *int
	URL         *string
	DBDSN       *string
	Tags        map[string]any
}

type Scan struct {
	ID        string
	TargetID  string
	Status    string
	Error     *string
	StartedAt *time.Time
	FinishedAt *time.Time
	CreatedAt time.Time
}

func (s *Scanner) StartScan(ctx context.Context, targetID string) (string, error) {
	id := ""
	if err := s.db.Pool.QueryRow(ctx, `INSERT INTO scans(target_id,status) VALUES($1,'QUEUED') RETURNING id`, targetID).Scan(&id); err != nil {
		return "", err
	}
	go s.runScan(context.Background(), id)
	return id, nil
}

func (s *Scanner) runScan(ctx context.Context, scanID string) {
	logger := s.log.With(zap.String("scan_id", scanID))
	started := time.Now()
	_, _ = s.db.Pool.Exec(ctx, `UPDATE scans SET status='RUNNING', started_at=$2 WHERE id=$1`, scanID, started)

	var t Target
	var tagsRaw []byte
	var port *int
	var u *string
	var dsn *string
	err := s.db.Pool.QueryRow(ctx, `
		SELECT st.id, st.name, st.type, st.environment, st.address, st.port, st.url, st.db_dsn, st.tags
		FROM scans s
		JOIN scan_targets st ON st.id = s.target_id
		WHERE s.id=$1
	`, scanID).Scan(&t.ID, &t.Name, &t.Type, &t.Environment, &t.Address, &port, &u, &dsn, &tagsRaw)
	if err != nil {
		errStr := err.Error()
		_, _ = s.db.Pool.Exec(ctx, `UPDATE scans SET status='FAILED', error=$2, finished_at=$3 WHERE id=$1`, scanID, errStr, time.Now())
		logger.Error("scan load target failed", zap.Error(err))
		return
	}
	t.Port = port
	t.URL = u
	t.DBDSN = dsn
	_ = json.Unmarshal(tagsRaw, &t.Tags)

	assetID, evidence, algos, pqc, scanErr := s.scanTarget(ctx, t)

	finished := time.Now()
	if scanErr != nil {
		errStr := scanErr.Error()
		_, _ = s.db.Pool.Exec(ctx, `UPDATE scans SET status='FAILED', error=$2, finished_at=$3 WHERE id=$1`, scanID, errStr, finished)
		logger.Error("scan failed", zap.Error(scanErr))
		return
	}

	// Persist evidence.
	b, _ := json.Marshal(evidence)
	_, _ = s.db.Pool.Exec(ctx, `INSERT INTO scan_evidence(scan_id, asset_id, evidence) VALUES($1,$2,$3)`, scanID, assetID, b)

	// Update asset with scan outputs + computed risk.
	inputs := RiskInputs{
		PQCCompliance:      pqc,
		Algorithms:         algos,
		Exposure:           "INTERNAL",
		DataSensitivity:    "MEDIUM",
		BusinessCriticality: "MEDIUM",
		AssetType:          evidence["asset_type"].(string),
		LastScannedAt:      &finished,
	}
	res := s.risk.Compute(inputs)
	algoJSON, _ := json.Marshal(algos)
	_, _ = s.db.Pool.Exec(ctx, `UPDATE assets SET pqc_compliance=$2, crypto_algorithms=$3, last_scanned_at=$4, quantum_risk_score=$5, risk_level=$6, updated_at=now() WHERE id=$1`,
		assetID, pqc, algoJSON, finished, res.Score, res.RiskLevel,
	)

	_, _ = s.db.Pool.Exec(ctx, `UPDATE scans SET status='SUCCEEDED', finished_at=$2 WHERE id=$1`, scanID, finished)
	_ = s.insertSnapshot(ctx)
	logger.Info("scan completed", zap.Duration("duration", finished.Sub(started)))
}

func (s *Scanner) insertSnapshot(ctx context.Context) error {
	var total, nonPQC, highCritical, wrapped, attested int
	_ = s.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM assets`).Scan(&total)
	_ = s.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM assets WHERE pqc_compliance='NON_PQC'`).Scan(&nonPQC)
	_ = s.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM assets WHERE risk_level IN ('High','Critical')`).Scan(&highCritical)
	_ = s.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM assets WHERE status='WRAPPED_PQC'`).Scan(&wrapped)
	_ = s.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM assets WHERE status='ATTESTED'`).Scan(&attested)
	coverage := 0
	if total > 0 {
		var covered int
		_ = s.db.Pool.QueryRow(ctx, `SELECT COUNT(DISTINCT asset_id) FROM policy_assets`).Scan(&covered)
		coverage = int(float64(covered) / float64(total) * 100.0)
	}

	totals := map[string]any{
		"total_assets": total,
		"non_pqc_assets": nonPQC,
		"high_critical_at_risk": highCritical,
		"wrapped_pqc_count": wrapped,
		"attested_count": attested,
		"policy_coverage_percent": coverage,
	}
	b, _ := json.Marshal(totals)
	_, err := s.db.Pool.Exec(ctx, `INSERT INTO org_snapshots(totals) VALUES($1)`, b)
	return err
}

func (s *Scanner) scanTarget(ctx context.Context, t Target) (assetID string, evidence map[string]any, algorithms []string, pqcCompliance string, err error) {
	evidence = map[string]any{
		"target_id":    t.ID,
		"target_name":  t.Name,
		"target_type":  t.Type,
		"environment":  t.Environment,
		"captured_at":  time.Now().UTC().Format(time.RFC3339Nano),
	}

	switch t.Type {
	case "TLS":
		port := 443
		if t.Port != nil {
			port = *t.Port
		}
		host := t.Address
		addr := fmt.Sprintf("%s:%d", host, port)
		state, chain, err := scanTLS(ctx, addr, host)
		if err != nil {
			return "", nil, nil, "UNKNOWN", err
		}
		algorithms, pqcCompliance = classifyTLS(state, chain)
		evidence["asset_type"] = "TLS_ENDPOINT"
		evidence["locator"] = addr
		evidence["tls"] = tlsEvidence(state, chain)

		assetID, err = upsertAsset(ctx, s.db.Pool, t, "TLS_ENDPOINT", fmt.Sprintf("%s (%s)", t.Name, addr), addr)
		return assetID, evidence, algorithms, pqcCompliance, err

	case "HTTP":
		uStr := ""
		if t.URL != nil {
			uStr = *t.URL
		} else {
			uStr = fmt.Sprintf("https://%s", t.Address)
		}
		u, err := url.Parse(uStr)
		if err != nil {
			return "", nil, nil, "UNKNOWN", err
		}
		respEv, tlsEv, algos, pqc, err := scanHTTP(ctx, u)
		if err != nil {
			return "", nil, nil, "UNKNOWN", err
		}
		algorithms = algos
		pqcCompliance = pqc
		evidence["asset_type"] = "HTTP_SERVICE"
		evidence["locator"] = u.String()
		evidence["http"] = respEv
		if tlsEv != nil {
			evidence["tls"] = tlsEv
		}
		assetID, err = upsertAsset(ctx, s.db.Pool, t, "HTTP_SERVICE", fmt.Sprintf("%s (%s)", t.Name, u.Host), u.String())
		return assetID, evidence, algorithms, pqcCompliance, err

	case "POSTGRES":
		if t.DBDSN == nil || *t.DBDSN == "" {
			return "", nil, nil, "UNKNOWN", errors.New("POSTGRES target requires db_dsn")
		}
		pgEv, tlsEv, algos, pqc, err := scanPostgres(ctx, *t.DBDSN)
		if err != nil {
			return "", nil, nil, "UNKNOWN", err
		}
		algorithms = algos
		pqcCompliance = pqc
		evidence["asset_type"] = "POSTGRES_DB"
		evidence["locator"] = redactDSN(*t.DBDSN)
		evidence["postgres"] = pgEv
		if tlsEv != nil {
			evidence["tls"] = tlsEv
		}
		assetID, err = upsertAsset(ctx, s.db.Pool, t, "POSTGRES_DB", t.Name, evidence["locator"].(string))
		return assetID, evidence, algorithms, pqcCompliance, err
	default:
		return "", nil, nil, "UNKNOWN", fmt.Errorf("unsupported target type: %s", t.Type)
	}
}

func upsertAsset(ctx context.Context, pool *pgxpool.Pool, t Target, assetType, name, locator string) (string, error) {
	var id string
	// Insert or update based on UNIQUE(asset_type, locator)
	err := pool.QueryRow(ctx, `
		INSERT INTO assets(target_id, asset_type, environment, name, locator)
		VALUES($1,$2,$3,$4,$5)
		ON CONFLICT (asset_type, locator)
		DO UPDATE SET target_id=EXCLUDED.target_id, name=EXCLUDED.name, environment=EXCLUDED.environment, updated_at=now()
		RETURNING id
	`, t.ID, assetType, t.Environment, name, locator).Scan(&id)
	return id, err
}

func scanTLS(ctx context.Context, addr, serverName string) (tls.ConnectionState, []*x509.Certificate, error) {
	d := &net.Dialer{Timeout: 10 * time.Second}
	conf := &tls.Config{ServerName: serverName, InsecureSkipVerify: true, MinVersion: tls.VersionTLS10}
	conn, err := tls.DialWithDialer(d, "tcp", addr, conf)
	if err != nil {
		return tls.ConnectionState{}, nil, err
	}
	defer conn.Close()
	state := conn.ConnectionState()
	chain := state.PeerCertificates
	return state, chain, nil
}

func tlsEvidence(state tls.ConnectionState, chain []*x509.Certificate) map[string]any {
	certs := make([]map[string]any, 0, len(chain))
	for _, c := range chain {
		pubAlg, pubSize := publicKeyInfo(c)
		certs = append(certs, map[string]any{
			"subject":            c.Subject.String(),
			"issuer":             c.Issuer.String(),
			"serial":             c.SerialNumber.String(),
			"not_before":         c.NotBefore.UTC().Format(time.RFC3339),
			"not_after":          c.NotAfter.UTC().Format(time.RFC3339),
			"signature_algorithm": c.SignatureAlgorithm.String(),
			"public_key_algorithm": pubAlg,
			"public_key_size":     pubSize,
			"dns_names":          c.DNSNames,
			"ip_addresses":       ipsToStrings(c.IPAddresses),
			"key_usage":          c.KeyUsage,
			"ext_key_usage":      c.ExtKeyUsage,
			"sha1_fingerprint":   sha1Fingerprint(c.Raw),
		})
	}
	return map[string]any{
		"version":           tlsVersionName(state.Version),
		"cipher_suite":      tls.CipherSuiteName(state.CipherSuite),
		"negotiated_protocol": state.NegotiatedProtocol,
		"server_name":       state.ServerName,
		"handshake_complete": state.HandshakeComplete,
		"peer_cert_chain":   certs,
	}
}

func classifyTLS(state tls.ConnectionState, chain []*x509.Certificate) ([]string, string) {
	algos := make([]string, 0)
	pqc := "UNKNOWN"
	if len(chain) > 0 {
		pubAlg, pubSize := publicKeyInfo(chain[0])
		algos = append(algos, fmt.Sprintf("%s-%d", pubAlg, pubSize))
		if isNonPQC(pubAlg) {
			pqc = "NON_PQC"
		} else if isPQC(pubAlg) {
			pqc = "PQC"
		}
		algos = append(algos, chain[0].SignatureAlgorithm.String())
	}
	algos = append(algos, tlsVersionName(state.Version))
	algos = append(algos, tls.CipherSuiteName(state.CipherSuite))
	if pqc == "UNKNOWN" {
		// TLS 1.3 + RSA/ECDSA certs are still non-PQC; treat as NON_PQC when cert clearly classic.
		if len(chain) > 0 {
			pubAlg, _ := publicKeyInfo(chain[0])
			if isNonPQC(pubAlg) {
				pqc = "NON_PQC"
			}
		}
	}
	return uniqueStrings(algos), pqc
}

func scanHTTP(ctx context.Context, u *url.URL) (httpEvidence map[string]any, tlsEv map[string]any, algos []string, pqc string, err error) {
	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, nil, nil, "UNKNOWN", err
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, nil, nil, "UNKNOWN", err
	}
	defer resp.Body.Close()

	headers := map[string]string{}
	for k, v := range resp.Header {
		if len(v) > 0 {
			headers[k] = v[0]
		}
	}

	httpEvidence = map[string]any{
		"url":         u.String(),
		"status":      resp.StatusCode,
		"headers":     headers,
		"hsts":        headers["Strict-Transport-Security"],
		"csp":         headers["Content-Security-Policy"],
		"xcto":        headers["X-Content-Type-Options"],
		"xfo":         headers["X-Frame-Options"],
		"referrer_policy": headers["Referrer-Policy"],
	}

	if resp.TLS != nil {
		tlsEv = tlsEvidence(*resp.TLS, resp.TLS.PeerCertificates)
		algos, pqc = classifyTLS(*resp.TLS, resp.TLS.PeerCertificates)
	} else {
		algos, pqc = []string{"HTTP"}, "UNKNOWN"
	}
	return httpEvidence, tlsEv, algos, pqc, nil
}

func scanPostgres(ctx context.Context, dsn string) (pgEvidence map[string]any, tlsEv map[string]any, algos []string, pqc string, err error) {
	cfg, err := pgx.ParseConfig(dsn)
	if err != nil {
		return nil, nil, nil, "UNKNOWN", err
	}
	// Force TLS if possible; if server doesn't support, connect may fail.
	if cfg.TLSConfig == nil {
		cfg.TLSConfig = &tls.Config{InsecureSkipVerify: true}
	}
	ctxT, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	conn, err := pgx.ConnectConfig(ctxT, cfg)
	if err != nil {
		return nil, nil, nil, "UNKNOWN", err
	}
	defer conn.Close(ctx)

	pgEvidence = map[string]any{
		"dsn": redactDSN(dsn),
	}

	var sslSetting string
	_ = conn.QueryRow(ctx, "SHOW ssl").Scan(&sslSetting)
	pgEvidence["server_ssl"] = sslSetting

	nc := conn.PgConn().Conn()
	if tc, ok := nc.(*tls.Conn); ok {
		st := tc.ConnectionState()
		tlsEv = tlsEvidence(st, st.PeerCertificates)
		algos, pqc = classifyTLS(st, st.PeerCertificates)
	} else {
		algos, pqc = []string{"POSTGRES"}, "UNKNOWN"
	}

	return pgEvidence, tlsEv, algos, pqc, nil
}

func redactDSN(dsn string) string {
	// very small redaction: remove password=... and userinfo in URL form.
	if strings.Contains(dsn, "://") {
		u, err := url.Parse(dsn)
		if err == nil {
			if u.User != nil {
				u.User = url.User(u.User.Username())
			}
			return u.String()
		}
	}
	parts := strings.Fields(dsn)
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if strings.HasPrefix(strings.ToLower(p), "password=") {
			out = append(out, "password=REDACTED")
			continue
		}
		out = append(out, p)
	}
	return strings.Join(out, " ")
}

func publicKeyInfo(c *x509.Certificate) (alg string, size int) {
	switch pk := c.PublicKey.(type) {
	case *rsa.PublicKey:
		return "RSA", pk.N.BitLen()
	case *ecdsa.PublicKey:
		if pk.Curve != nil {
			return "ECDSA", pk.Curve.Params().BitSize
		}
		return "ECDSA", 0
	default:
		// attempt OID-based detection for PQC (common OQS OIDs live in 1.3.6.1.4.1.2.267.*)
		if strings.HasPrefix(c.PublicKeyAlgorithm.String(), "Unknown") {
			return "UNKNOWN", 0
		}
		return c.PublicKeyAlgorithm.String(), 0
	}
}

func isNonPQC(pubAlg string) bool {
	p := strings.ToUpper(pubAlg)
	return p == "RSA" || p == "ECDSA" || p == "EC" || strings.Contains(p, "ECDH")
}

func isPQC(pubAlg string) bool {
	p := strings.ToUpper(pubAlg)
	return strings.Contains(p, "KYBER") || strings.Contains(p, "DILITHIUM") || strings.Contains(p, "FALCON")
}

func tlsVersionName(v uint16) string {
	switch v {
	case tls.VersionTLS10:
		return "TLS1.0"
	case tls.VersionTLS11:
		return "TLS1.1"
	case tls.VersionTLS12:
		return "TLS1.2"
	case tls.VersionTLS13:
		return "TLS1.3"
	default:
		return fmt.Sprintf("TLS(0x%x)", v)
	}
}

func sha1Fingerprint(raw []byte) string {
	sum := sha1.Sum(raw)
	return strings.ToUpper(hex.EncodeToString(sum[:]))
}

func ipsToStrings(ips []net.IP) []string {
	out := make([]string, 0, len(ips))
	for _, ip := range ips {
		out = append(out, ip.String())
	}
	return out
}

func uniqueStrings(in []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(in))
	for _, s := range in {
		s = strings.TrimSpace(s)
		if s == "" {
			continue
		}
		if _, ok := seen[s]; ok {
			continue
		}
		seen[s] = struct{}{}
		out = append(out, s)
	}
	return out
}
