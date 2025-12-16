package api

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
)

func (s *Server) handleAttestationsList(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Pool.Query(r.Context(), `
		SELECT a.id,a.asset_id,a.network,a.chain_id,a.contract_address,a.tx_hash,a.block_number,a.status,a.error,a.created_at
		FROM attestations a
		ORDER BY a.created_at DESC
		LIMIT 200
	`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "db error"})
		return
	}
	defer rows.Close()
	out := make([]map[string]any, 0)
	for rows.Next() {
		var id, assetID, network, contract, tx, status string
		var chainID int64
		var block *int64
		var errStr *string
		var created time.Time
		if err := rows.Scan(&id, &assetID, &network, &chainID, &contract, &tx, &block, &status, &errStr, &created); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "db error"})
			return
		}
		out = append(out, map[string]any{"id": id, "asset_id": assetID, "network": network, "chain_id": chainID, "contract_address": contract, "tx_hash": tx, "block_number": block, "status": status, "error": errStr, "created_at": created})
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) handleWrappingJobsList(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Pool.Query(r.Context(), `SELECT id,anchor_id,policy_id,status,error,created_at,started_at,finished_at FROM wrapping_jobs ORDER BY created_at DESC LIMIT 100`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "db error"})
		return
	}
	defer rows.Close()
	out := make([]map[string]any, 0)
	for rows.Next() {
		var id, anchorID, status string
		var policyID *string
		var errStr *string
		var created time.Time
		var started, finished *time.Time
		if err := rows.Scan(&id, &anchorID, &policyID, &status, &errStr, &created, &started, &finished); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "db error"})
			return
		}
		out = append(out, map[string]any{"id": id, "anchor_id": anchorID, "policy_id": policyID, "status": status, "error": errStr, "created_at": created, "started_at": started, "finished_at": finished})
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) handleWrappingJobGet(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	rows, err := s.db.Pool.Query(r.Context(), `SELECT asset_id,status,wrapper_algorithm,vault_path_wrapped,error,updated_at FROM wrapping_results WHERE job_id=$1 ORDER BY updated_at DESC`, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "db error"})
		return
	}
	defer rows.Close()
	results := make([]map[string]any, 0)
	for rows.Next() {
		var assetID, status string
		var alg, vaultPath, errStr *string
		var updated time.Time
		if err := rows.Scan(&assetID, &status, &alg, &vaultPath, &errStr, &updated); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "db error"})
			return
		}
		results = append(results, map[string]any{"asset_id": assetID, "status": status, "wrapper_algorithm": alg, "vault_path_wrapped": vaultPath, "error": errStr, "updated_at": updated})
	}
	writeJSON(w, http.StatusOK, map[string]any{"job_id": id, "results": results})
}

func (s *Server) handleAttestationJobsList(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Pool.Query(r.Context(), `SELECT id,status,error,created_at,started_at,finished_at FROM attestation_jobs ORDER BY created_at DESC LIMIT 100`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "db error"})
		return
	}
	defer rows.Close()
	out := make([]map[string]any, 0)
	for rows.Next() {
		var id, status string
		var errStr *string
		var created time.Time
		var started, finished *time.Time
		if err := rows.Scan(&id, &status, &errStr, &created, &started, &finished); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "db error"})
			return
		}
		out = append(out, map[string]any{"id": id, "status": status, "error": errStr, "created_at": created, "started_at": started, "finished_at": finished})
	}
	writeJSON(w, http.StatusOK, out)
}
