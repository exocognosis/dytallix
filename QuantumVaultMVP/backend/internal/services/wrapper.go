package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"time"

	"github.com/cloudflare/circl/kem"
	"github.com/cloudflare/circl/kem/kyber/kyber768"
	"golang.org/x/crypto/chacha20poly1305"
	"golang.org/x/crypto/hkdf"
	"go.uber.org/zap"

	"quantumvaultmvp/backend/internal/db"
)

type Wrapper struct {
	log   *zap.Logger
	db    *db.DB
	vault *VaultStore
	risk  *RiskEngine
}

func NewWrapper(logger *zap.Logger, database *db.DB, vault *VaultStore, risk *RiskEngine) *Wrapper {
	return &Wrapper{log: logger, db: database, vault: vault, risk: risk}
}

type Anchor struct {
	ID          string
	Name        string
	Environment string
	Active      bool
	KemAlgorithm string
	VaultPathPublic  string
	VaultPathPrivate string
	RotatedFrom *string
}

func (w *Wrapper) CreateAnchor(ctx context.Context, name, environment string) (string, error) {
	if environment == "" {
		environment = "prod"
	}
	pubPath := fmt.Sprintf("qv/anchors/%s/public", "NEW")
	privPath := fmt.Sprintf("qv/anchors/%s/private", "NEW")
	var id string
	err := w.db.Pool.QueryRow(ctx, `
		INSERT INTO anchors(name, environment, active, kem_algorithm, vault_path_public, vault_path_private)
		VALUES($1,$2,false,'Kyber768',$3,$4)
		RETURNING id
	`, name, environment, pubPath, privPath).Scan(&id)
	if err != nil {
		return "", err
	}
	pubPath = fmt.Sprintf("qv/anchors/%s/public", id)
	privPath = fmt.Sprintf("qv/anchors/%s/private", id)
	_, err = w.db.Pool.Exec(ctx, `UPDATE anchors SET vault_path_public=$2, vault_path_private=$3 WHERE id=$1`, id, pubPath, privPath)
	if err != nil {
		return "", err
	}

	pub, priv, err := kyber768.GenerateKeyPair(rand.Reader)
	if err != nil {
		return "", err
	}
	pubBytes, err := pub.MarshalBinary()
	if err != nil {
		return "", err
	}
	privBytes, err := priv.MarshalBinary()
	if err != nil {
		return "", err
	}
	if err := w.vault.PutJSON(pubPath, map[string]any{"kem": "Kyber768", "public_b64": base64.RawStdEncoding.EncodeToString(pubBytes)}); err != nil {
		return "", err
	}
	if err := w.vault.PutJSON(privPath, map[string]any{"kem": "Kyber768", "private_b64": base64.RawStdEncoding.EncodeToString(privBytes)}); err != nil {
		return "", err
	}
	_, _ = w.db.Pool.Exec(ctx, `INSERT INTO audit_log(actor_user_id, action, entity_type, entity_id, metadata) VALUES(NULL,'ANCHOR_CREATE','anchor',$1,'{}'::jsonb)`, id)
	return id, nil
}

func (w *Wrapper) ActivateAnchor(ctx context.Context, anchorID string) error {
	var env string
	if err := w.db.Pool.QueryRow(ctx, `SELECT environment FROM anchors WHERE id=$1`, anchorID).Scan(&env); err != nil {
		return err
	}
	_, err := w.db.Pool.Exec(ctx, `UPDATE anchors SET active=false WHERE environment=$1`, env)
	if err != nil {
		return err
	}
	_, err = w.db.Pool.Exec(ctx, `UPDATE anchors SET active=true WHERE id=$1`, anchorID)
	if err != nil {
		return err
	}
	_, _ = w.db.Pool.Exec(ctx, `INSERT INTO audit_log(actor_user_id, action, entity_type, entity_id, metadata) VALUES(NULL,'ANCHOR_ACTIVATE','anchor',$1,'{}'::jsonb)`, anchorID)
	return nil
}

func (w *Wrapper) RotateAnchor(ctx context.Context, anchorID string) (string, error) {
	var name, env string
	if err := w.db.Pool.QueryRow(ctx, `SELECT name, environment FROM anchors WHERE id=$1`, anchorID).Scan(&name, &env); err != nil {
		return "", err
	}
	newID, err := w.CreateAnchor(ctx, name+" (rotated)", env)
	if err != nil {
		return "", err
	}
	_, err = w.db.Pool.Exec(ctx, `UPDATE anchors SET rotated_from=$2 WHERE id=$1`, newID, anchorID)
	if err != nil {
		return "", err
	}
	// Activate the new anchor.
	if err := w.ActivateAnchor(ctx, newID); err != nil {
		return "", err
	}
	_, _ = w.db.Pool.Exec(ctx, `INSERT INTO audit_log(actor_user_id, action, entity_type, entity_id, metadata) VALUES(NULL,'ANCHOR_ROTATE','anchor',$1, jsonb_build_object('from',$2))`, newID, anchorID)
	return newID, nil
}

func (w *Wrapper) ListAnchors(ctx context.Context) ([]Anchor, error) {
	rows, err := w.db.Pool.Query(ctx, `SELECT id,name,environment,active,kem_algorithm,vault_path_public,vault_path_private,rotated_from FROM anchors ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]Anchor, 0)
	for rows.Next() {
		var a Anchor
		if err := rows.Scan(&a.ID, &a.Name, &a.Environment, &a.Active, &a.KemAlgorithm, &a.VaultPathPublic, &a.VaultPathPrivate, &a.RotatedFrom); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, nil
}

func (w *Wrapper) WrapAssets(ctx context.Context, anchorID string, assetIDs []string, createdBy string) (string, error) {
	if len(assetIDs) == 0 {
		return "", errors.New("asset_ids required")
	}
	jobID := ""
	if err := w.db.Pool.QueryRow(ctx, `INSERT INTO wrapping_jobs(created_by, anchor_id, status) VALUES($1,$2,'QUEUED') RETURNING id`, nullIfEmpty(createdBy), anchorID).Scan(&jobID); err != nil {
		return "", err
	}
	for _, aid := range assetIDs {
		_, _ = w.db.Pool.Exec(ctx, `INSERT INTO wrapping_results(job_id, asset_id, status) VALUES($1,$2,'PENDING') ON CONFLICT (job_id, asset_id) DO NOTHING`, jobID, aid)
	}
	go w.runWrapJob(context.Background(), jobID)
	return jobID, nil
}

func (w *Wrapper) runWrapJob(ctx context.Context, jobID string) {
	logger := w.log.With(zap.String("wrap_job_id", jobID))
	started := time.Now()
	_, _ = w.db.Pool.Exec(ctx, `UPDATE wrapping_jobs SET status='RUNNING', started_at=$2 WHERE id=$1`, jobID, started)

	var anchorID string
	if err := w.db.Pool.QueryRow(ctx, `SELECT anchor_id FROM wrapping_jobs WHERE id=$1`, jobID).Scan(&anchorID); err != nil {
		finishWrapFail(ctx, w.db, jobID, err)
		return
	}

	pub, priv, err := w.loadAnchorKeys(ctx, anchorID)
	if err != nil {
		finishWrapFail(ctx, w.db, jobID, err)
		return
	}

	rows, err := w.db.Pool.Query(ctx, `SELECT asset_id FROM wrapping_results WHERE job_id=$1`, jobID)
	if err != nil {
		finishWrapFail(ctx, w.db, jobID, err)
		return
	}
	defer rows.Close()

	anyFailed := false
	for rows.Next() {
		var assetID string
		_ = rows.Scan(&assetID)
		if err := w.wrapOne(ctx, jobID, anchorID, pub, priv, assetID); err != nil {
			anyFailed = true
			logger.Error("wrap asset failed", zap.String("asset_id", assetID), zap.Error(err))
		}
	}

	finished := time.Now()
	if anyFailed {
		_, _ = w.db.Pool.Exec(ctx, `UPDATE wrapping_jobs SET status='FAILED', error='one or more assets failed', finished_at=$2 WHERE id=$1`, jobID, finished)
	} else {
		_, _ = w.db.Pool.Exec(ctx, `UPDATE wrapping_jobs SET status='SUCCEEDED', finished_at=$2 WHERE id=$1`, jobID, finished)
	}
}

func (w *Wrapper) wrapOne(ctx context.Context, jobID, anchorID string, pub kem.PublicKey, priv kem.PrivateKey, assetID string) error {
	// Get raw secret path.
	var vaultPathRaw string
	err := w.db.Pool.QueryRow(ctx, `SELECT vault_path_raw FROM asset_secrets WHERE asset_id=$1 ORDER BY created_at DESC LIMIT 1`, assetID).Scan(&vaultPathRaw)
	if err != nil {
		_, _ = w.db.Pool.Exec(ctx, `UPDATE wrapping_results SET status='FAILED', error='missing secret', updated_at=now() WHERE job_id=$1 AND asset_id=$2`, jobID, assetID)
		return errors.New("missing secret")
	}
	raw, err := w.vault.GetJSON(vaultPathRaw)
	if err != nil || raw == nil {
		_, _ = w.db.Pool.Exec(ctx, `UPDATE wrapping_results SET status='FAILED', error='vault read failed', updated_at=now() WHERE job_id=$1 AND asset_id=$2`, jobID, assetID)
		return fmt.Errorf("vault read failed: %w", err)
	}
	secretB64, _ := raw["secret_b64"].(string)
	secret, err := base64.RawStdEncoding.DecodeString(secretB64)
	if err != nil {
		secret, err = base64.RawURLEncoding.DecodeString(secretB64)
		if err != nil {
			_, _ = w.db.Pool.Exec(ctx, `UPDATE wrapping_results SET status='FAILED', error='invalid secret encoding', updated_at=now() WHERE job_id=$1 AND asset_id=$2`, jobID, assetID)
			return err
		}
	}

	scheme := kyber768.Scheme()
	ct, ss, err := scheme.Encapsulate(pub)
	if err != nil {
		return err
	}
	// sanity: ensure private key can decapsulate
	ss2, err := scheme.Decapsulate(priv, ct)
	if err != nil {
		return err
	}
	if !equalBytes(ss, ss2) {
		return errors.New("kem decapsulation mismatch")
	}

	salt := sha256.Sum256([]byte("qv-wrap:" + assetID + ":" + anchorID))
	h := hkdf.New(sha256.New, ss, salt[:], []byte("qv-aead-key"))
	key := make([]byte, chacha20poly1305.KeySize)
	if _, err := io.ReadFull(h, key); err != nil {
		return err
	}
	aead, err := chacha20poly1305.New(key)
	if err != nil {
		return err
	}
	nonce := make([]byte, aead.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return err
	}
	aad := []byte("qv:" + assetID)
	ciphertext := aead.Seal(nil, nonce, secret, aad)

	wrapped := map[string]any{
		"kem": "Kyber768",
		"kdf": "HKDF-SHA256",
		"aead": "ChaCha20-Poly1305",
		"kem_ciphertext_b64": base64.RawStdEncoding.EncodeToString(ct),
		"nonce_b64": base64.RawStdEncoding.EncodeToString(nonce),
		"aad_b64": base64.RawStdEncoding.EncodeToString(aad),
		"ciphertext_b64": base64.RawStdEncoding.EncodeToString(ciphertext),
		"wrapped_at": time.Now().UTC().Format(time.RFC3339Nano),
		"anchor_id": anchorID,
	}
	vaultPathWrapped := fmt.Sprintf("qv/assets/%s/wrapped/%s", assetID, anchorID)
	if err := w.vault.PutJSON(vaultPathWrapped, wrapped); err != nil {
		_, _ = w.db.Pool.Exec(ctx, `UPDATE wrapping_results SET status='FAILED', error='vault write failed', updated_at=now() WHERE job_id=$1 AND asset_id=$2`, jobID, assetID)
		return err
	}

	_, _ = w.db.Pool.Exec(ctx, `UPDATE wrapping_results SET status='WRAPPED', wrapper_algorithm=$3, vault_path_wrapped=$4, updated_at=now() WHERE job_id=$1 AND asset_id=$2`,
		jobID, assetID, "Kyber768+HKDF-SHA256+ChaCha20-Poly1305", vaultPathWrapped,
	)

	// Update asset status and metadata.
	meta := map[string]any{"wrapped_anchor_id": anchorID, "wrapped_vault_path": vaultPathWrapped}
	metaRaw, _ := json.Marshal(meta)
	_, _ = w.db.Pool.Exec(ctx, `UPDATE assets SET status='WRAPPED_PQC', metadata = metadata || $2::jsonb, updated_at=now() WHERE id=$1`, assetID, metaRaw)

	// Recompute risk with PQC compliance set to PQC after wrapping.
	var exposure, sens, crit, assetType string
	var algRaw []byte
	var last *time.Time
	_ = w.db.Pool.QueryRow(ctx, `SELECT asset_type, exposure, data_sensitivity, business_criticality, crypto_algorithms, last_scanned_at FROM assets WHERE id=$1`, assetID).
		Scan(&assetType, &exposure, &sens, &crit, &algRaw, &last)
	algos := []string{}
	_ = json.Unmarshal(algRaw, &algos)
	algos = append(algos, "Kyber768", "ChaCha20-Poly1305")
	algoJSON, _ := json.Marshal(uniqueStrings(algos))
	res := w.risk.Compute(RiskInputs{PQCCompliance: "PQC", Algorithms: algos, Exposure: exposure, DataSensitivity: sens, BusinessCriticality: crit, AssetType: assetType, LastScannedAt: last})
	_, _ = w.db.Pool.Exec(ctx, `UPDATE assets SET pqc_compliance='PQC', crypto_algorithms=$2, quantum_risk_score=$3, risk_level=$4, updated_at=now() WHERE id=$1`, assetID, algoJSON, res.Score, res.RiskLevel)

	_, _ = w.db.Pool.Exec(ctx, `INSERT INTO audit_log(actor_user_id, action, entity_type, entity_id, metadata) VALUES(NULL,'WRAP_ASSET','asset',$1, jsonb_build_object('anchor_id',$2,'job_id',$3))`, assetID, anchorID, jobID)
	return nil
}

func (w *Wrapper) loadAnchorKeys(ctx context.Context, anchorID string) (pub kem.PublicKey, priv kem.PrivateKey, err error) {
	var pubPath, privPath string
	err = w.db.Pool.QueryRow(ctx, `SELECT vault_path_public, vault_path_private FROM anchors WHERE id=$1`, anchorID).Scan(&pubPath, &privPath)
	if err != nil {
		return nil, nil, err
	}
	pubRec, err := w.vault.GetJSON(pubPath)
	if err != nil || pubRec == nil {
		return nil, nil, fmt.Errorf("vault read anchor pub: %w", err)
	}
	privRec, err := w.vault.GetJSON(privPath)
	if err != nil || privRec == nil {
		return nil, nil, fmt.Errorf("vault read anchor priv: %w", err)
	}
	pubB64, _ := pubRec["public_b64"].(string)
	privB64, _ := privRec["private_b64"].(string)
	pubBytes, err := base64.RawStdEncoding.DecodeString(pubB64)
	if err != nil {
		return nil, nil, err
	}
	privBytes, err := base64.RawStdEncoding.DecodeString(privB64)
	if err != nil {
		return nil, nil, err
	}
	scheme := kyber768.Scheme()
	pubKey, err := scheme.UnmarshalBinaryPublicKey(pubBytes)
	if err != nil {
		return nil, nil, err
	}
	privKey, err := scheme.UnmarshalBinaryPrivateKey(privBytes)
	if err != nil {
		return nil, nil, err
	}
	return pubKey, privKey, nil
}

func finishWrapFail(ctx context.Context, database *db.DB, jobID string, err error) {
	_, _ = database.Pool.Exec(ctx, `UPDATE wrapping_jobs SET status='FAILED', error=$2, finished_at=$3 WHERE id=$1`, jobID, err.Error(), time.Now())
}

func equalBytes(a, b []byte) bool {
	if len(a) != len(b) {
		return false
	}
	var v byte
	for i := 0; i < len(a); i++ {
		v |= a[i] ^ b[i]
	}
	return v == 0
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}
