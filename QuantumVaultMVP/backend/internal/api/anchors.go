package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

func (s *Server) handleAnchorsList(w http.ResponseWriter, r *http.Request) {
	anchors, err := s.Wrapper.ListAnchors(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, anchors)
}

type anchorCreateReq struct {
	Name        string `json:"name"`
	Environment string `json:"environment"`
}

func (s *Server) handleAnchorCreate(w http.ResponseWriter, r *http.Request) {
	if !s.requireRole(w, r, "admin") {
		return
	}
	var req anchorCreateReq
	if err := readJSON(w, r, &req, 1<<20); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	id, err := s.Wrapper.CreateAnchor(r.Context(), req.Name, req.Environment)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"id": id})
}

func (s *Server) handleAnchorActivate(w http.ResponseWriter, r *http.Request) {
	if !s.requireRole(w, r, "admin") {
		return
	}
	id := chi.URLParam(r, "id")
	if err := s.Wrapper.ActivateAnchor(r.Context(), id); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleAnchorRotate(w http.ResponseWriter, r *http.Request) {
	if !s.requireRole(w, r, "admin") {
		return
	}
	id := chi.URLParam(r, "id")
	newID, err := s.Wrapper.RotateAnchor(r.Context(), id)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"id": newID})
}
