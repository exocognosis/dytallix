package api

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
)

type scanStartReq struct {
	TargetID string `json:"target_id"`
}

func (s *Server) handleScanStart(w http.ResponseWriter, r *http.Request) {
	var req scanStartReq
	if err := readJSON(w, r, &req, 1<<20); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	id, err := s.Scanner.StartScan(r.Context(), req.TargetID)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]any{"scan_id": id})
}

func (s *Server) handleScansList(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Pool.Query(r.Context(), `SELECT id,target_id,status,error,started_at,finished_at,created_at FROM scans ORDER BY created_at DESC LIMIT 200`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "db error"})
		return
	}
	defer rows.Close()
	out := make([]map[string]any, 0)
	for rows.Next() {
		var id, targetID, status string
		var errStr *string
		var started, finished *time.Time
		var created time.Time
		if err := rows.Scan(&id, &targetID, &status, &errStr, &started, &finished, &created); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "db error"})
			return
		}
		out = append(out, map[string]any{"id": id, "target_id": targetID, "status": status, "error": errStr, "started_at": started, "finished_at": finished, "created_at": created})
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) handleScanGet(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var targetID, status string
	var errStr *string
	var started, finished *time.Time
	var created time.Time
	err := s.db.Pool.QueryRow(r.Context(), `SELECT target_id,status,error,started_at,finished_at,created_at FROM scans WHERE id=$1`, id).
		Scan(&targetID, &status, &errStr, &started, &finished, &created)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "not found"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"id": id, "target_id": targetID, "status": status, "error": errStr, "started_at": started, "finished_at": finished, "created_at": created})
}
