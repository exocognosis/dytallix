package api

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"quantumvaultmvp/backend/internal/services"
)

type assetDTO struct {
	ID              string         `json:"id"`
	AssetType       string         `json:"asset_type"`
	Environment     string         `json:"environment"`
	Name            string         `json:"name"`
	Locator         string         `json:"locator"`
	Exposure        string         `json:"exposure"`
	DataSensitivity string         `json:"data_sensitivity"`
	BusinessCriticality string     `json:"business_criticality"`
	PQCCompliance   string         `json:"pqc_compliance"`
	Algorithms      []string       `json:"crypto_algorithms"`
	Status          string         `json:"status"`
	QuantumRiskScore int           `json:"quantum_risk_score"`
	RiskLevel       string         `json:"risk_level"`
	LastScannedAt   *time.Time     `json:"last_scanned_at"`
	Metadata        map[string]any `json:"metadata"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
}

func (s *Server) handleAssetsList(w http.ResponseWriter, r *http.Request) {
	where := make([]string, 0)
	args := make([]any, 0)
	addEq := func(col, q string) {
		v := strings.TrimSpace(r.URL.Query().Get(q))
		if v == "" {
			return
		}
		args = append(args, v)
		where = append(where, col+"=$"+itoa(len(args)))
	}
	addEq("asset_type", "asset_type")
	addEq("environment", "environment")
	addEq("pqc_compliance", "pqc_compliance")
	addEq("risk_level", "risk_level")
	addEq("status", "status")

	sql := `
		SELECT id,asset_type,environment,name,locator,exposure,data_sensitivity,business_criticality,pqc_compliance,crypto_algorithms,status,quantum_risk_score,risk_level,last_scanned_at,metadata,created_at,updated_at
		FROM assets`
	if len(where) > 0 {
		sql += " WHERE " + strings.Join(where, " AND ")
	}
	sql += " ORDER BY updated_at DESC LIMIT 500"

	rows, err := s.db.Pool.Query(r.Context(), sql, args...)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "db error"})
		return
	}
	defer rows.Close()
	out := make([]assetDTO, 0)
	for rows.Next() {
		var a assetDTO
		var algRaw []byte
		var metaRaw []byte
		if err := rows.Scan(&a.ID, &a.AssetType, &a.Environment, &a.Name, &a.Locator, &a.Exposure, &a.DataSensitivity, &a.BusinessCriticality, &a.PQCCompliance, &algRaw, &a.Status, &a.QuantumRiskScore, &a.RiskLevel, &a.LastScannedAt, &metaRaw, &a.CreatedAt, &a.UpdatedAt); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "db error"})
			return
		}
		_ = json.Unmarshal(algRaw, &a.Algorithms)
		_ = json.Unmarshal(metaRaw, &a.Metadata)
		out = append(out, a)
	}
	writeJSON(w, http.StatusOK, out)
}

type assetPatchReq struct {
	Exposure           *string `json:"exposure,omitempty"`
	DataSensitivity    *string `json:"data_sensitivity,omitempty"`
	BusinessCriticality *string `json:"business_criticality,omitempty"`
}

func (s *Server) handleAssetPatch(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req assetPatchReq
	if err := readJSON(w, r, &req, 1<<20); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	var assetType, pqc, exposure, sens, crit string
	var algRaw []byte
	var last *time.Time
	err := s.db.Pool.QueryRow(r.Context(), `SELECT asset_type,pqc_compliance,exposure,data_sensitivity,business_criticality,crypto_algorithms,last_scanned_at FROM assets WHERE id=$1`, id).
		Scan(&assetType, &pqc, &exposure, &sens, &crit, &algRaw, &last)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "not found"})
		return
	}
	if req.Exposure != nil {
		exposure = *req.Exposure
	}
	if req.DataSensitivity != nil {
		sens = *req.DataSensitivity
	}
	if req.BusinessCriticality != nil {
		crit = *req.BusinessCriticality
	}
	algos := []string{}
	_ = json.Unmarshal(algRaw, &algos)
	res := s.Risk.Compute(services.RiskInputs{PQCCompliance: pqc, Algorithms: algos, Exposure: exposure, DataSensitivity: sens, BusinessCriticality: crit, AssetType: assetType, LastScannedAt: last})
	_, err = s.db.Pool.Exec(r.Context(), `UPDATE assets SET exposure=$2,data_sensitivity=$3,business_criticality=$4,quantum_risk_score=$5,risk_level=$6,updated_at=now() WHERE id=$1`,
		id, exposure, sens, crit, res.Score, res.RiskLevel,
	)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "update failed"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

type secretUploadReq struct {
	SecretB64  string `json:"secret_b64"`
	SecretType string `json:"secret_type"`
}

func (s *Server) handleSecretUpload(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req secretUploadReq
	if err := readJSON(w, r, &req, 5<<20); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	if req.SecretType == "" {
		req.SecretType = "BLOB"
	}
	if _, err := base64.RawStdEncoding.DecodeString(req.SecretB64); err != nil {
		// allow URL encoding too
		if _, err2 := base64.RawURLEncoding.DecodeString(req.SecretB64); err2 != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "secret_b64 must be base64"})
			return
		}
	}

	vaultPath := "qv/assets/" + id + "/raw"
	if err := s.Vault.PutJSON(vaultPath, map[string]any{"secret_b64": req.SecretB64, "type": req.SecretType}); err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": "vault write failed"})
		return
	}
	_, err := s.db.Pool.Exec(r.Context(), `INSERT INTO asset_secrets(asset_id, secret_type, vault_path_raw) VALUES($1,$2,$3)`, id, req.SecretType, vaultPath)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "db insert failed"})
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"ok": true, "vault_path": vaultPath})
}

func itoa(i int) string {
	return strconv.Itoa(i)
}
