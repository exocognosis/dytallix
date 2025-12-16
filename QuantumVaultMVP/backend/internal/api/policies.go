package api

import (
	"context"
	"encoding/json"
	"net/http"
	"sort"
	"strings"

	"github.com/go-chi/chi/v5"
)

type policyDTO struct {
	ID                string         `json:"id"`
	Name              string         `json:"name"`
	Mode              string         `json:"mode"`
	Scope             map[string]any `json:"scope"`
	RequiredAlgorithms []string      `json:"required_algorithms"`
	RiskThreshold     int            `json:"risk_threshold"`
	Active            bool           `json:"active"`
}

func (s *Server) handlePoliciesList(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Pool.Query(r.Context(), `SELECT id,name,mode,scope,required_algorithms,risk_threshold,active FROM policies ORDER BY created_at DESC`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "db error"})
		return
	}
	defer rows.Close()
	out := make([]policyDTO, 0)
	for rows.Next() {
		var p policyDTO
		var scopeRaw, algRaw []byte
		if err := rows.Scan(&p.ID, &p.Name, &p.Mode, &scopeRaw, &algRaw, &p.RiskThreshold, &p.Active); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "db error"})
			return
		}
		_ = json.Unmarshal(scopeRaw, &p.Scope)
		_ = json.Unmarshal(algRaw, &p.RequiredAlgorithms)
		out = append(out, p)
	}
	writeJSON(w, http.StatusOK, out)
}

type policyUpsertReq struct {
	Name               string         `json:"name"`
	Mode               string         `json:"mode"`
	Scope              map[string]any `json:"scope"`
	RequiredAlgorithms []string       `json:"required_algorithms"`
	RiskThreshold      int            `json:"risk_threshold"`
	Active             bool           `json:"active"`
}

func (s *Server) handlePolicyCreate(w http.ResponseWriter, r *http.Request) {
	if !s.requireRole(w, r, "admin") {
		return
	}
	var req policyUpsertReq
	if err := readJSON(w, r, &req, 1<<20); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	if req.Scope == nil {
		req.Scope = map[string]any{}
	}
	scopeRaw, _ := json.Marshal(req.Scope)
	algRaw, _ := json.Marshal(req.RequiredAlgorithms)
	var id string
	err := s.db.Pool.QueryRow(r.Context(), `INSERT INTO policies(name,mode,scope,required_algorithms,risk_threshold,active) VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
		req.Name, req.Mode, scopeRaw, algRaw, req.RiskThreshold, req.Active,
	).Scan(&id)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"id": id})
}

func (s *Server) handlePolicyUpdate(w http.ResponseWriter, r *http.Request) {
	if !s.requireRole(w, r, "admin") {
		return
	}
	id := chi.URLParam(r, "id")
	var req policyUpsertReq
	if err := readJSON(w, r, &req, 1<<20); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	if req.Scope == nil {
		req.Scope = map[string]any{}
	}
	scopeRaw, _ := json.Marshal(req.Scope)
	algRaw, _ := json.Marshal(req.RequiredAlgorithms)
	_, err := s.db.Pool.Exec(r.Context(), `UPDATE policies SET name=$2,mode=$3,scope=$4,required_algorithms=$5,risk_threshold=$6,active=$7,updated_at=now() WHERE id=$1`,
		id, req.Name, req.Mode, scopeRaw, algRaw, req.RiskThreshold, req.Active,
	)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handlePolicyDelete(w http.ResponseWriter, r *http.Request) {
	if !s.requireRole(w, r, "admin") {
		return
	}
	id := chi.URLParam(r, "id")
	_, err := s.db.Pool.Exec(r.Context(), `DELETE FROM policies WHERE id=$1`, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "delete failed"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handlePolicyEvaluate(w http.ResponseWriter, r *http.Request) {
	policyID := chi.URLParam(r, "id")
	var mode string
	var scopeRaw []byte
	var riskThreshold int
	err := s.db.Pool.QueryRow(r.Context(), `SELECT mode,scope,risk_threshold FROM policies WHERE id=$1`, policyID).Scan(&mode, &scopeRaw, &riskThreshold)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "not found"})
		return
	}
	scope := map[string]any{}
	_ = json.Unmarshal(scopeRaw, &scope)

	matched, err := s.evaluatePolicy(r.Context(), policyID, scope, riskThreshold)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
		return
	}

	wrapTriggered := ""
	if mode == "ENFORCE" {
		assetIDs := make([]string, 0)
		rows, _ := s.db.Pool.Query(r.Context(), `
			SELECT a.id
			FROM policy_assets pa
			JOIN assets a ON a.id = pa.asset_id
			LEFT JOIN asset_secrets s ON s.asset_id = a.id
			WHERE pa.policy_id=$1 AND a.pqc_compliance IN ('NON_PQC','UNKNOWN') AND a.status <> 'WRAPPED_PQC' AND s.id IS NOT NULL
			GROUP BY a.id
		`, policyID)
		if rows != nil {
			defer rows.Close()
			for rows.Next() {
				var aid string
				_ = rows.Scan(&aid)
				assetIDs = append(assetIDs, aid)
			}
		}
		if len(assetIDs) > 0 {
			var anchorID string
			_ = s.db.Pool.QueryRow(r.Context(), `SELECT id FROM anchors WHERE active=true ORDER BY created_at DESC LIMIT 1`).Scan(&anchorID)
			if anchorID != "" {
				jobID, err := s.Wrapper.WrapAssets(r.Context(), anchorID, assetIDs, UserIDFromContext(r.Context()))
				if err == nil {
					wrapTriggered = jobID
				}
			}
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{"matched": matched, "wrap_job_id": wrapTriggered})
}

func (s *Server) evaluatePolicy(ctx context.Context, policyID string, scope map[string]any, riskThreshold int) (int, error) {
	filters := make([]string, 0)
	args := make([]any, 0)
	add := func(expr string, v any) {
		args = append(args, v)
		filters = append(filters, expr+"$"+itoa(len(args)))
	}

	if v, ok := scope["environment"].(string); ok && v != "" {
		add("environment=", v)
	}
	if v, ok := scope["asset_type"].(string); ok && v != "" {
		add("asset_type=", v)
	}
	if v, ok := scope["pqc_compliance"].(string); ok && v != "" {
		add("pqc_compliance=", v)
	}
	if riskThreshold > 0 {
		args = append(args, riskThreshold)
		filters = append(filters, "quantum_risk_score >= $"+itoa(len(args)))
	}

	q := `SELECT id FROM assets`
	if len(filters) > 0 {
		q += " WHERE " + strings.Join(filters, " AND ")
	}

	rows, err := s.db.Pool.Query(ctx, q, args...)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	assetIDs := make([]string, 0)
	for rows.Next() {
		var id string
		_ = rows.Scan(&id)
		assetIDs = append(assetIDs, id)
	}

	// replace mappings.
	_, err = s.db.Pool.Exec(ctx, `DELETE FROM policy_assets WHERE policy_id=$1`, policyID)
	if err != nil {
		return 0, err
	}
	for _, aid := range assetIDs {
		_, _ = s.db.Pool.Exec(ctx, `INSERT INTO policy_assets(policy_id, asset_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, policyID, aid)
	}

	sort.Strings(assetIDs)
	_, _ = s.db.Pool.Exec(ctx, `INSERT INTO audit_log(actor_user_id, action, entity_type, entity_id, metadata) VALUES(NULL,'POLICY_EVALUATE','policy',$1, jsonb_build_object('matched', $2))`, policyID, len(assetIDs))
	return len(assetIDs), nil
}
