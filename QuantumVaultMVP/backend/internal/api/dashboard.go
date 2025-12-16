package api

import (
	"encoding/json"
	"net/http"
	"time"
)

func (s *Server) handleDashboardKPIs(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var total int
	_ = s.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM assets`).Scan(&total)
	var nonPQC int
	_ = s.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM assets WHERE pqc_compliance='NON_PQC'`).Scan(&nonPQC)
	var highCritical int
	_ = s.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM assets WHERE risk_level IN ('High','Critical')`).Scan(&highCritical)
	var wrapped int
	_ = s.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM assets WHERE status='WRAPPED_PQC'`).Scan(&wrapped)
	var attested int
	_ = s.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM assets WHERE status='ATTESTED'`).Scan(&attested)
	var covered int
	_ = s.db.Pool.QueryRow(ctx, `SELECT COUNT(DISTINCT asset_id) FROM policy_assets`).Scan(&covered)
	coverage := 0
	if total > 0 {
		coverage = int(float64(covered) / float64(total) * 100.0)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"total_assets": total,
		"non_pqc_assets": nonPQC,
		"high_critical_at_risk": highCritical,
		"wrapped_pqc_count": wrapped,
		"attested_count": attested,
		"policy_coverage_percent": coverage,
	})
}

func (s *Server) handleDashboardCharts(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	riskDist := map[string]int{"Low": 0, "Medium": 0, "High": 0, "Critical": 0}
	rows, _ := s.db.Pool.Query(ctx, `SELECT risk_level, COUNT(*) FROM assets GROUP BY risk_level`)
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var level string
			var c int
			_ = rows.Scan(&level, &c)
			riskDist[level] = c
		}
	}

	statusDist := map[string]int{"DISCOVERED": 0, "AT_RISK": 0, "WRAPPED_PQC": 0, "ATTESTED": 0}
	rows2, _ := s.db.Pool.Query(ctx, `SELECT status, COUNT(*) FROM assets GROUP BY status`)
	if rows2 != nil {
		defer rows2.Close()
		for rows2.Next() {
			var status string
			var c int
			_ = rows2.Scan(&status, &c)
			statusDist[status] = c
		}
	}

	var total, wrapped int
	_ = s.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM assets`).Scan(&total)
	_ = s.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM assets WHERE status='WRAPPED_PQC'`).Scan(&wrapped)
	progress := 0
	if total > 0 {
		progress = int(float64(wrapped) / float64(total) * 100.0)
	}

	timeline := make([]map[string]any, 0)
	rows3, _ := s.db.Pool.Query(ctx, `SELECT captured_at, totals FROM org_snapshots ORDER BY captured_at DESC LIMIT 30`)
	if rows3 != nil {
		defer rows3.Close()
		for rows3.Next() {
			var ts time.Time
			var totalsRaw []byte
			_ = rows3.Scan(&ts, &totalsRaw)
			totals := map[string]any{}
			_ = json.Unmarshal(totalsRaw, &totals)
			timeline = append(timeline, map[string]any{"captured_at": ts, "totals": totals})
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"risk_distribution": riskDist,
		"status_distribution": statusDist,
		"migration_progress_percent": progress,
		"timeline": timeline,
	})
}
