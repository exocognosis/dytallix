package api

import (
	"context"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"

	"quantumvaultmvp/backend/internal/auth"
	"quantumvaultmvp/backend/internal/config"
	"quantumvaultmvp/backend/internal/db"
	"quantumvaultmvp/backend/internal/services"
)

type Server struct {
	cfg config.Config
	log *zap.Logger
	db  *db.DB

	Tokens auth.TokenManager
	Hasher auth.PasswordHasher

	Vault *services.VaultStore
	Scanner *services.Scanner
	Risk *services.RiskEngine
	Wrapper *services.Wrapper
	Attestor *services.Attestor

	httpServer *http.Server
}

func New(cfg config.Config, logger *zap.Logger, database *db.DB, svc *services.Services) *Server {
	return &Server{
		cfg: cfg,
		log: logger,
		db:  database,
		Tokens: auth.TokenManager{
			Issuer:     cfg.JWTIssuer,
			Secret:     []byte(cfg.JWTSecret),
			AccessTTL:  cfg.JWTAccessTTL,
			RefreshTTL: cfg.JWTRefreshTTL,
		},
		Hasher: auth.DefaultPasswordHasher(),
		Vault: svc.Vault,
		Scanner: svc.Scanner,
		Risk: svc.Risk,
		Wrapper: svc.Wrapper,
		Attestor: svc.Attestor,
	}
}

func (s *Server) Router() http.Handler {
	r := chi.NewRouter()

	r.Use(RequestID())
	r.Use(Recoverer(s.log))
	r.Use(AccessLog(s.log))

	if s.cfg.CORSOrigin != "" {
		r.Use(cors.Handler(cors.Options{
			AllowedOrigins:   []string{s.cfg.CORSOrigin},
			AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
			AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
			ExposedHeaders:   []string{"X-Request-ID"},
			AllowCredentials: true,
			MaxAge:           300,
		}))
	}

	r.Route("/api", func(api chi.Router) {
		api.Get("/health", s.handleHealth)
		api.Handle("/metrics", promhttp.Handler())

		api.Post("/auth/login", s.handleLogin)
		api.Post("/auth/refresh", s.handleRefresh)

		api.Group(func(pr chi.Router) {
			pr.Use(s.AuthMiddleware())
			pr.Get("/me", s.handleMe)

			pr.Route("/targets", func(t chi.Router) {
				t.Get("/", s.handleTargetsList)
				t.Post("/", s.handleTargetsCreate)
				t.Put("/{id}", s.handleTargetsUpdate)
				t.Delete("/{id}", s.handleTargetsDelete)
			})

			pr.Route("/scans", func(sc chi.Router) {
				sc.Post("/", s.handleScanStart)
				sc.Get("/", s.handleScansList)
				sc.Get("/{id}", s.handleScanGet)
			})

			pr.Route("/assets", func(a chi.Router) {
				a.Get("/", s.handleAssetsList)
				a.Patch("/{id}", s.handleAssetPatch)
				a.Post("/{id}/secrets", s.handleSecretUpload)
			})

			pr.Route("/anchors", func(a chi.Router) {
				a.Get("/", s.handleAnchorsList)
				a.Post("/", s.handleAnchorCreate)
				a.Post("/{id}/activate", s.handleAnchorActivate)
				a.Post("/{id}/rotate", s.handleAnchorRotate)
			})

			pr.Route("/policies", func(p chi.Router) {
				p.Get("/", s.handlePoliciesList)
				p.Post("/", s.handlePolicyCreate)
				p.Put("/{id}", s.handlePolicyUpdate)
				p.Delete("/{id}", s.handlePolicyDelete)
				p.Post("/{id}/evaluate", s.handlePolicyEvaluate)
			})

			pr.Post("/wrap", s.handleWrapBulk)
			pr.Post("/attest", s.handleAttestBulk)
			pr.Get("/attestations", s.handleAttestationsList)
			pr.Get("/wrapping-jobs", s.handleWrappingJobsList)
			pr.Get("/wrapping-jobs/{id}", s.handleWrappingJobGet)
			pr.Get("/attestation-jobs", s.handleAttestationJobsList)

			pr.Get("/dashboard/kpis", s.handleDashboardKPIs)
			pr.Get("/dashboard/charts", s.handleDashboardCharts)
		})
	})

	return r
}

func (s *Server) Start(ctx context.Context) error {
	s.httpServer = &http.Server{
		Addr:              s.cfg.HTTPAddr,
		Handler:           s.Router(),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	s.log.Info("http server starting", zap.String("addr", s.cfg.HTTPAddr))
	go func() {
		<-ctx.Done()
		ctxShutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = s.httpServer.Shutdown(ctxShutdown)
	}()

	return s.httpServer.ListenAndServe()
}
