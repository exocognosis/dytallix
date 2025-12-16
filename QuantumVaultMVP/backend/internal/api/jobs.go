package api

import "net/http"

type bulkReq struct {
	AssetIDs []string `json:"asset_ids"`
	AnchorID string   `json:"anchor_id,omitempty"`
}

func (s *Server) handleWrapBulk(w http.ResponseWriter, r *http.Request) {
	var req bulkReq
	if err := readJSON(w, r, &req, 1<<20); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	anchorID := req.AnchorID
	if anchorID == "" {
		// pick active anchor for prod
		_ = s.db.Pool.QueryRow(r.Context(), `SELECT id FROM anchors WHERE active=true ORDER BY created_at DESC LIMIT 1`).Scan(&anchorID)
	}
	if anchorID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "no active anchor"})
		return
	}
	jobID, err := s.Wrapper.WrapAssets(r.Context(), anchorID, req.AssetIDs, UserIDFromContext(r.Context()))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]any{"job_id": jobID})
}

type attestReq struct {
	AssetIDs []string `json:"asset_ids"`
}

func (s *Server) handleAttestBulk(w http.ResponseWriter, r *http.Request) {
	var req attestReq
	if err := readJSON(w, r, &req, 1<<20); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	jobID, err := s.Attestor.AttestAssets(r.Context(), req.AssetIDs, UserIDFromContext(r.Context()))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]any{"job_id": jobID})
}
