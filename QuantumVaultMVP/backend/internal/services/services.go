package services

import (
	"context"

	"go.uber.org/zap"

	"quantumvaultmvp/backend/internal/config"
	"quantumvaultmvp/backend/internal/db"
)

type Services struct {
	Vault    *VaultStore
	Scanner  *Scanner
	Risk     *RiskEngine
	Wrapper  *Wrapper
	Attestor *Attestor
}

func New(ctx context.Context, cfg config.Config, logger *zap.Logger, database *db.DB) (*Services, error) {
	vault, err := NewVaultStore(cfg.VaultAddr, cfg.VaultToken)
	if err != nil {
		return nil, err
	}
	risk := NewRiskEngine()
	scanner := NewScanner(logger, database, risk)
	wrapper := NewWrapper(logger, database, vault, risk)
	attestor, err := NewAttestor(logger, database, cfg)
	if err != nil {
		return nil, err
	}
	return &Services{Vault: vault, Scanner: scanner, Risk: risk, Wrapper: wrapper, Attestor: attestor}, nil
}
