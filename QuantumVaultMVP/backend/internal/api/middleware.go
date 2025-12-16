package api

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"go.uber.org/zap"
)

type ctxKey string

const (
	ctxUserID ctxKey = "user_id"
	ctxUserRole ctxKey = "user_role"
)

func RequestID() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			b := make([]byte, 12)
			_, _ = rand.Read(b)
			rid := hex.EncodeToString(b)
			w.Header().Set("X-Request-ID", rid)
			ctx := context.WithValue(r.Context(), ctxKey("rid"), rid)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func Recoverer(logger *zap.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if v := recover(); v != nil {
					logger.Error("panic", zap.Any("recover", v))
					writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "internal error"})
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}

func AccessLog(logger *zap.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			ww := &wrapWriter{ResponseWriter: w, status: 200}
			next.ServeHTTP(ww, r)
			dur := time.Since(start)
			logger.Info("http",
				zap.String("method", r.Method),
				zap.String("path", r.URL.Path),
				zap.Int("status", ww.status),
				zap.Duration("duration", dur),
			)
		})
	}
}

type wrapWriter struct {
	http.ResponseWriter
	status int
}

func (w *wrapWriter) WriteHeader(status int) {
	w.status = status
	w.ResponseWriter.WriteHeader(status)
}

func bearerToken(r *http.Request) string {
	a := r.Header.Get("Authorization")
	if a == "" {
		return ""
	}
	parts := strings.SplitN(a, " ", 2)
	if len(parts) != 2 {
		return ""
	}
	if strings.ToLower(parts[0]) != "bearer" {
		return ""
	}
	return strings.TrimSpace(parts[1])
}

func UserIDFromContext(ctx context.Context) string {
	v, _ := ctx.Value(ctxUserID).(string)
	return v
}

func UserRoleFromContext(ctx context.Context) string {
	v, _ := ctx.Value(ctxUserRole).(string)
	return v
}
