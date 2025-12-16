package api

import (
	"context"
	"net/http"
	"time"

	"quantumvaultmvp/backend/internal/auth"

	"github.com/jackc/pgx/v5"
)

type loginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginResp struct {
	AccessToken  string    `json:"access_token"`
	AccessExp    time.Time `json:"access_expires_at"`
	RefreshToken string    `json:"refresh_token"`
	RefreshExp   time.Time `json:"refresh_expires_at"`
}

func (s *Server) AuthMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tok := bearerToken(r)
			if tok == "" {
				writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "missing bearer token"})
				return
			}
			claims, err := s.Tokens.ParseAccessToken(tok)
			if err != nil {
				writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "invalid token"})
				return
			}
			ctx := r.Context()
			ctx = contextWithUser(ctx, claims.UserID, claims.Role)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func contextWithUser(ctx context.Context, userID, role string) context.Context {
	ctx = context.WithValue(ctx, ctxUserID, userID)
	ctx = context.WithValue(ctx, ctxUserRole, role)
	return ctx
}

func (s *Server) requireRole(w http.ResponseWriter, r *http.Request, roles ...string) bool {
	role := UserRoleFromContext(r.Context())
	for _, rr := range roles {
		if role == rr {
			return true
		}
	}
	writeJSON(w, http.StatusForbidden, map[string]any{"error": "forbidden"})
	return false
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req loginReq
	if err := readJSON(w, r, &req, 1<<20); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}

	var userID, role, passwordHash string
	err := s.db.Pool.QueryRow(r.Context(), `SELECT id, role, password_hash FROM users WHERE email=$1`, req.Email).Scan(&userID, &role, &passwordHash)
	if err != nil {
		if err == pgx.ErrNoRows {
			writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "invalid credentials"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "db error"})
		return
	}
	ok, err := s.Hasher.Verify(req.Password, passwordHash)
	if err != nil || !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "invalid credentials"})
		return
	}

	access, accessExp, err := s.Tokens.MintAccessToken(userID, role)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "token mint failed"})
		return
	}
	refreshPlain, refreshHash, refreshExp, err := s.Tokens.NewRefreshToken()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "refresh mint failed"})
		return
	}
	_, err = s.db.Pool.Exec(r.Context(), `INSERT INTO refresh_tokens(user_id, token_hash, expires_at) VALUES($1,$2,$3)`, userID, refreshHash, refreshExp)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "refresh store failed"})
		return
	}

	writeJSON(w, http.StatusOK, loginResp{AccessToken: access, AccessExp: accessExp, RefreshToken: refreshPlain, RefreshExp: refreshExp})
}

type refreshReq struct {
	RefreshToken string `json:"refresh_token"`
}

func (s *Server) handleRefresh(w http.ResponseWriter, r *http.Request) {
	var req refreshReq
	if err := readJSON(w, r, &req, 1<<20); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	hash := auth.HashRefreshToken(req.RefreshToken)
	var userID, role string
	err := s.db.Pool.QueryRow(r.Context(), `
		SELECT u.id, u.role
		FROM refresh_tokens rt
		JOIN users u ON u.id = rt.user_id
		WHERE rt.token_hash=$1 AND rt.revoked_at IS NULL AND rt.expires_at > now()
	`, hash).Scan(&userID, &role)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "invalid refresh token"})
		return
	}
	access, accessExp, err := s.Tokens.MintAccessToken(userID, role)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "token mint failed"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"access_token": access, "access_expires_at": accessExp})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	uid := UserIDFromContext(r.Context())
	role := UserRoleFromContext(r.Context())
	writeJSON(w, http.StatusOK, map[string]any{"user_id": uid, "role": role})
}
