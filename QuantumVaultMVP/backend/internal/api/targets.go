package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

type targetDTO struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Type        string         `json:"type"`
	Environment string         `json:"environment"`
	Address     string         `json:"address"`
	Port        *int           `json:"port,omitempty"`
	URL         *string        `json:"url,omitempty"`
	DBDSN       *string        `json:"db_dsn,omitempty"`
	Tags        map[string]any `json:"tags"`
	Enabled     bool           `json:"enabled"`
	CreatedAt   string         `json:"created_at"`
	UpdatedAt   string         `json:"updated_at"`
}

func (s *Server) handleTargetsList(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Pool.Query(r.Context(), `SELECT id,name,type,environment,address,port,url,db_dsn,tags,enabled,created_at,updated_at FROM scan_targets ORDER BY created_at DESC`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "db error"})
		return
	}
	defer rows.Close()
	out := make([]targetDTO, 0)
	for rows.Next() {
		var t targetDTO
		var tagsRaw []byte
		if err := rows.Scan(&t.ID, &t.Name, &t.Type, &t.Environment, &t.Address, &t.Port, &t.URL, &t.DBDSN, &tagsRaw, &t.Enabled, &t.CreatedAt, &t.UpdatedAt); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "db error"})
			return
		}
		_ = json.Unmarshal(tagsRaw, &t.Tags)
		out = append(out, t)
	}
	writeJSON(w, http.StatusOK, out)
}

type targetCreateReq struct {
	Name        string         `json:"name"`
	Type        string         `json:"type"`
	Environment string         `json:"environment"`
	Address     string         `json:"address"`
	Port        *int           `json:"port,omitempty"`
	URL         *string        `json:"url,omitempty"`
	DBDSN       *string        `json:"db_dsn,omitempty"`
	Tags        map[string]any `json:"tags,omitempty"`
	Enabled     *bool          `json:"enabled,omitempty"`
}

func (s *Server) handleTargetsCreate(w http.ResponseWriter, r *http.Request) {
	if !s.requireRole(w, r, "admin", "analyst") {
		return
	}
	var req targetCreateReq
	if err := readJSON(w, r, &req, 1<<20); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	if req.Environment == "" {
		req.Environment = "prod"
	}
	if req.Tags == nil {
		req.Tags = map[string]any{}
	}
	tagsRaw, _ := json.Marshal(req.Tags)
	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}
	var id string
	err := s.db.Pool.QueryRow(r.Context(), `
		INSERT INTO scan_targets(name,type,environment,address,port,url,db_dsn,tags,enabled)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
		RETURNING id
	`, req.Name, req.Type, req.Environment, req.Address, req.Port, req.URL, req.DBDSN, tagsRaw, enabled).Scan(&id)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "insert failed"})
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"id": id})
}

type targetUpdateReq struct {
	Name        *string        `json:"name,omitempty"`
	Environment *string        `json:"environment,omitempty"`
	Address     *string        `json:"address,omitempty"`
	Port        *int           `json:"port,omitempty"`
	URL         *string        `json:"url,omitempty"`
	DBDSN       *string        `json:"db_dsn,omitempty"`
	Tags        map[string]any `json:"tags,omitempty"`
	Enabled     *bool          `json:"enabled,omitempty"`
}

func (s *Server) handleTargetsUpdate(w http.ResponseWriter, r *http.Request) {
	if !s.requireRole(w, r, "admin", "analyst") {
		return
	}
	id := chi.URLParam(r, "id")
	var req targetUpdateReq
	if err := readJSON(w, r, &req, 1<<20); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	// Fetch current.
	var cur targetDTO
	var tagsRaw []byte
	if err := s.db.Pool.QueryRow(r.Context(), `SELECT id,name,type,environment,address,port,url,db_dsn,tags,enabled,created_at,updated_at FROM scan_targets WHERE id=$1`, id).
		Scan(&cur.ID, &cur.Name, &cur.Type, &cur.Environment, &cur.Address, &cur.Port, &cur.URL, &cur.DBDSN, &tagsRaw, &cur.Enabled, &cur.CreatedAt, &cur.UpdatedAt); err != nil {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "not found"})
		return
	}
	_ = json.Unmarshal(tagsRaw, &cur.Tags)

	if req.Name != nil {
		cur.Name = *req.Name
	}
	if req.Environment != nil {
		cur.Environment = *req.Environment
	}
	if req.Address != nil {
		cur.Address = *req.Address
	}
	if req.Port != nil {
		cur.Port = req.Port
	}
	if req.URL != nil {
		cur.URL = req.URL
	}
	if req.DBDSN != nil {
		cur.DBDSN = req.DBDSN
	}
	if req.Tags != nil {
		cur.Tags = req.Tags
	}
	if req.Enabled != nil {
		cur.Enabled = *req.Enabled
	}

	tagsRaw, _ = json.Marshal(cur.Tags)
	_, err := s.db.Pool.Exec(r.Context(), `
		UPDATE scan_targets SET name=$2, environment=$3, address=$4, port=$5, url=$6, db_dsn=$7, tags=$8, enabled=$9, updated_at=now() WHERE id=$1
	`, id, cur.Name, cur.Environment, cur.Address, cur.Port, cur.URL, cur.DBDSN, tagsRaw, cur.Enabled)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "update failed"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleTargetsDelete(w http.ResponseWriter, r *http.Request) {
	if !s.requireRole(w, r, "admin") {
		return
	}
	id := chi.URLParam(r, "id")
	_, err := s.db.Pool.Exec(r.Context(), `DELETE FROM scan_targets WHERE id=$1`, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "delete failed"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}
