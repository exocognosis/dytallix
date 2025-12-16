package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"quantumvaultmvp/backend/internal/api"
	"quantumvaultmvp/backend/internal/auth"
	"quantumvaultmvp/backend/internal/config"
	"quantumvaultmvp/backend/internal/db"
	"quantumvaultmvp/backend/internal/log"
	"quantumvaultmvp/backend/internal/services"

	"go.uber.org/zap"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}
	logger, err := log.New(cfg.Env)
	if err != nil {
		panic(err)
	}
	defer logger.Sync()

	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	database, err := db.Connect(ctx, cfg.DBDSN)
	if err != nil {
		logger.Fatal("db connect failed", zap.Error(err))
	}
	defer database.Close()

	if err := db.Migrate(ctx, database.Pool, "/app/migrations"); err != nil {
		logger.Fatal("db migrate failed", zap.Error(err))
	}

	if err := ensureAdmin(ctx, database, cfg); err != nil {
		logger.Fatal("admin bootstrap failed", zap.Error(err))
	}

	svc, err := services.New(ctx, cfg, logger, database)
	if err != nil {
		logger.Fatal("services init failed", zap.Error(err))
	}

	srv := api.New(cfg, logger, database, svc)

	errCh := make(chan error, 1)
	go func() {
		errCh <- srv.Start(ctx)
	}()

	select {
	case <-ctx.Done():
		logger.Info("shutdown requested")
		<-time.After(250 * time.Millisecond)
	case err := <-errCh:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Fatal("http server error", zap.Error(err))
		}
	}
}

func ensureAdmin(ctx context.Context, database *db.DB, cfg config.Config) error {
	var exists bool
	if err := database.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE email=$1)`, cfg.AdminEmail).Scan(&exists); err != nil {
		return err
	}
	h := auth.DefaultPasswordHasher()
	hash, err := h.Hash(cfg.AdminPassword)
	if err != nil {
		return err
	}
	if exists {
		if !cfg.AdminBootstrapForce {
			return nil
		}
		_, err := database.Pool.Exec(ctx, `UPDATE users SET password_hash=$2, role='admin' WHERE email=$1`, cfg.AdminEmail, hash)
		return err
	}
	_, err = database.Pool.Exec(ctx, `INSERT INTO users(email,password_hash,role) VALUES($1,$2,'admin')`, cfg.AdminEmail, hash)
	if err != nil {
		return err
	}
	// Write a small file for local dev visibility inside container.
	_ = os.WriteFile("/app/BOOTSTRAP_ADMIN.txt", []byte("admin bootstrapped\n"), 0600)
	return nil
}
