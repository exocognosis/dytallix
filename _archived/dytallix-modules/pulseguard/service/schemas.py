"""Pydantic schemas for API request/response validation."""
from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field


class TxScoreRequest(BaseModel):
    """Request to score a single transaction by hash."""
    tx_hash: str = Field(..., description="Transaction hash to score")


class WindowScoreRequest(BaseModel):
    """Request to score a time window."""
    window_id: str = Field(..., description="Time window identifier")
    start_time: Optional[int] = Field(None, description="Window start timestamp")
    end_time: Optional[int] = Field(None, description="Window end timestamp")


class BatchScoreRequest(BaseModel):
    """Request to score a batch of transactions."""
    transactions: List[Dict[str, Any]] = Field(..., description="List of transaction objects")


ScoreRequest = Union[TxScoreRequest, WindowScoreRequest, BatchScoreRequest]


class SubScores(BaseModel):
    """Sub-scores from different models."""
    isolation_forest: Optional[float] = Field(None, description="IsolationForest anomaly score")
    gbdt: Optional[float] = Field(None, description="GBDT probability score")
    graph: Optional[float] = Field(None, description="Graph-based score")
    temporal: Optional[float] = Field(None, description="Temporal features score")


class ScoreResponse(BaseModel):
    """Response with anomaly score and metadata."""
    score: float = Field(..., description="Final ensemble anomaly score [0,1]")
    reasons: List[str] = Field(..., description="Reason codes (e.g., PG.FLASH.CHAINBURST.K1)")
    sub_scores: SubScores = Field(..., description="Individual model scores")
    version: str = Field(..., description="Model version")
    latency_ms: int = Field(..., description="Processing latency in milliseconds")
    trace_id: str = Field(..., description="Trace ID for debugging")
    timestamp: int = Field(..., description="Response timestamp")


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = Field(..., description="Service status")
    version: str = Field(..., description="Service version")
    uptime_seconds: Optional[float] = Field(None, description="Service uptime")
    checks: Dict[str, bool] = Field(default_factory=dict, description="Component health checks")


class MetricsResponse(BaseModel):
    """Metrics endpoint response."""
    metrics: Dict[str, Any] = Field(..., description="Current metrics")
    timestamp: int = Field(..., description="Metrics timestamp")


class ErrorResponse(BaseModel):
    """Error response."""
    error: str = Field(..., description="Error message")
    code: str = Field(..., description="Error code")
    trace_id: str = Field(..., description="Trace ID for debugging")
    timestamp: int = Field(..., description="Error timestamp")


class WebhookRequest(BaseModel):
    """Webhook registration request."""
    url: str = Field(..., description="Webhook URL")
    events: List[str] = Field(default=["alert"], description="Event types to subscribe to")


class AlertPayload(BaseModel):
    """Alert webhook payload."""
    type: str = Field(..., description="Alert type")
    score: float = Field(..., description="Anomaly score")
    reasons: List[str] = Field(..., description="Reason codes")
    transaction: Optional[Dict[str, Any]] = Field(None, description="Transaction data")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    timestamp: int = Field(..., description="Alert timestamp")


class ModelStatus(BaseModel):
    """Model status information."""
    version: str = Field(..., description="Model version")
    type: str = Field(..., description="Model type (isolation_forest, gbdt, ensemble)")
    trained: bool = Field(..., description="Whether model is trained")
    last_trained: Optional[int] = Field(None, description="Last training timestamp")
    performance: Dict[str, float] = Field(default_factory=dict, description="Performance metrics")


class SystemStatus(BaseModel):
    """System status information."""
    mode: str = Field(..., description="Operation mode (synthetic/live)")
    models: List[ModelStatus] = Field(..., description="Model statuses")
    connectors: Dict[str, bool] = Field(..., description="Connector statuses")
    queue_sizes: Dict[str, int] = Field(..., description="Queue sizes")
    processed_counts: Dict[str, int] = Field(..., description="Processed item counts")


class ConfigResponse(BaseModel):
    """Configuration response."""
    mode: str = Field(..., description="Operation mode")
    version: str = Field(..., description="System version")
    features: Dict[str, bool] = Field(..., description="Enabled features")
    thresholds: Dict[str, float] = Field(..., description="Detection thresholds")


# Request validation schemas
class StrictTxScoreRequest(TxScoreRequest):
    """Strict validation for transaction scoring."""
    
    class Config:
        extra = "forbid"  # Don't allow extra fields


class StrictBatchScoreRequest(BatchScoreRequest):
    """Strict validation for batch scoring."""
    
    class Config:
        extra = "forbid"
        
    def __init__(self, **data):
        super().__init__(**data)
        
        # Validate transaction structure
        for i, tx in enumerate(self.transactions):
            if not isinstance(tx, dict):
                raise ValueError(f"Transaction {i} must be a dictionary")
            if "hash" not in tx and "from" not in tx:
                raise ValueError(f"Transaction {i} must have at least 'hash' or 'from' field")