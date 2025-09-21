"""Configuration settings using Pydantic Settings."""
from typing import List, Optional
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """PulseGuard configuration settings."""
    
    # Core operation mode
    pulseguard_mode: str = Field(default="synthetic", description="synthetic or live")
    
    # API settings
    api_port: int = Field(default=8088, alias="PORT")
    api_host: str = Field(default="0.0.0.0")
    
    # Data sources (live mode)
    ethereum_mempool_ws_url: str = Field(default="", description="Mempool websocket URL")
    json_rpc_url: str = Field(default="", description="Ethereum JSON-RPC URL")
    confirmations: int = Field(default=12, description="Required block confirmations")
    
    # Feature engineering
    feature_window_seconds: int = Field(default=300, description="Feature window size")
    
    # Model settings
    model_version: str = Field(default="v0_1_0")
    iforest_n_estimators: int = Field(default=200)
    gbdt_model_path: str = Field(default="./models/artifacts/gbdt_v0_1_0.pkl")
    feature_manifest: str = Field(default="./features/artifacts/manifest.json")
    
    # Security
    pg_hmac_key: str = Field(default="change_me")
    pg_signing_secret: str = Field(default="", description="Base64 Ed25519 secret")
    pg_pqc_enabled: bool = Field(default=False, description="PQC placeholder flag")
    
    # Telemetry
    otel_exporter_otlp_endpoint: str = Field(default="http://localhost:4317")
    prometheus_port: int = Field(default=9109)
    
    # Performance
    latency_budget_ms: int = Field(default=100, description="P95 latency budget")
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "allow"


# Global settings instance
settings = Settings()