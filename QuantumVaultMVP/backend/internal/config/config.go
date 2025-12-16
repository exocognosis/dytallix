package config

import (
	"time"

	"github.com/caarlos0/env/v11"
)

type Config struct {
	Env string `env:"QV_ENV" envDefault:"dev"`

	HTTPAddr string `env:"QV_HTTP_ADDR" envDefault:"0.0.0.0:8080"`
	CORSOrigin string `env:"QV_CORS_ORIGIN" envDefault:""`

	DBDSN string `env:"QV_DB_DSN,required"`

	JWTIssuer     string        `env:"QV_JWT_ISSUER" envDefault:"quantumvault"`
	JWTSecret     string        `env:"QV_JWT_SECRET,required"`
	JWTAccessTTL  time.Duration `env:"QV_JWT_ACCESS_TTL" envDefault:"15m"`
	JWTRefreshTTL time.Duration `env:"QV_JWT_REFRESH_TTL" envDefault:"720h"`

	AdminEmail    string `env:"QV_ADMIN_EMAIL" envDefault:"admin@local"`
	AdminPassword string `env:"QV_ADMIN_PASSWORD" envDefault:"ChangeMe!12345"`
	AdminBootstrapForce bool `env:"QV_ADMIN_BOOTSTRAP_FORCE" envDefault:"false"`

	VaultAddr  string `env:"QV_VAULT_ADDR" envDefault:""`
	VaultToken string `env:"QV_VAULT_TOKEN" envDefault:""`

	EthRPCURL          string `env:"QV_ETH_RPC_URL" envDefault:""`
	EthChainID         string `env:"QV_ETH_CHAIN_ID" envDefault:""`
	EthPrivateKey      string `env:"QV_ETH_PRIVATE_KEY" envDefault:""`
	AttestationContractFile string `env:"QV_ATTESTATION_CONTRACT_FILE" envDefault:""`
}

func Load() (Config, error) {
	var cfg Config
	if err := env.Parse(&cfg); err != nil {
		return Config{}, err
	}
	return cfg, nil
}
