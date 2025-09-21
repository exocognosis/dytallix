"""FastAPI service for real-time scoring with <100ms P95 latency target."""
import asyncio
import logging
import time
import json
from typing import Dict, Any, List, Optional
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, Depends, status
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from ..config.settings import settings
from ..service.schemas import *
from ..service.security import init_security_manager, validate_request_hmac, create_request_id
from ..service.telemetry import init_telemetry, get_telemetry, timing_context
from ..connectors.mempool_ws import start_mempool_subscriber
from ..connectors.blocks_rpc import start_blocks_poller
from ..features.temporal_features import temporal_engine, compute_temporal_features
from ..features.feature_store import feature_store
from ..graph.dag_builder import build_interaction_dag, find_multi_hop_paths
from ..graph.features_structural import compute_transaction_structural_features
from ..models.ensemble import EnsembleModel
from ..detectors.flash_loan import detect_flash_loan_patterns
from ..detectors.mint_burn import detect_mint_burn_patterns
from ..detectors.bridge_sequences import detect_bridge_patterns

logger = logging.getLogger(__name__)

# Global state
ensemble_model: Optional[EnsembleModel] = None
mempool_queue = asyncio.Queue()
startup_time = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("Starting PulseGuard API...")
    
    # Initialize security
    security_manager = init_security_manager(
        hmac_key=settings.pg_hmac_key,
        signing_secret=settings.pg_signing_secret,
        pqc_enabled=settings.pg_pqc_enabled
    )
    
    # Initialize telemetry
    telemetry = init_telemetry(
        service_name="pulseguard",
        otlp_endpoint=settings.otel_exporter_otlp_endpoint,
        enable_tracing=True
    )
    
    # Load or initialize models
    global ensemble_model
    await load_models()
    
    # Start data connectors if in live mode
    if settings.pulseguard_mode == "live":
        await start_live_connectors()
    
    logger.info(f"PulseGuard API started in {settings.pulseguard_mode} mode")
    
    yield
    
    # Shutdown
    logger.info("Shutting down PulseGuard API...")


app = FastAPI(
    title="PulseGuard Scoring API",
    version="0.1.0",
    description="Real-time anomaly and fraud detection for blockchain transactions",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def load_models():
    """Load or initialize the ensemble model."""
    global ensemble_model
    
    try:
        # Try to load existing model
        if feature_store.get_latest_version():
            logger.info("Loading existing ensemble model...")
            ensemble_model = EnsembleModel()
            # TODO: Load from saved files
            
        # Initialize with default parameters
        if ensemble_model is None:
            logger.info("Initializing new ensemble model...")
            ensemble_model = EnsembleModel(
                isolation_forest_weight=0.4,
                gbdt_weight=0.6,
                iforest_params={"n_estimators": settings.iforest_n_estimators},
                gbdt_params={"n_estimators": 100}
            )
            
        # Update telemetry
        telemetry = get_telemetry()
        if telemetry:
            telemetry.update_model_version(settings.model_version, "ensemble")
            
    except Exception as e:
        logger.error(f"Error loading models: {e}")
        ensemble_model = None


async def start_live_connectors():
    """Start live data connectors."""
    try:
        # Start mempool subscriber
        if settings.ethereum_mempool_ws_url:
            await start_mempool_subscriber(settings.ethereum_mempool_ws_url, mempool_queue)
            logger.info("Started mempool subscriber")
            
        # Start blocks poller
        if settings.json_rpc_url:
            await start_blocks_poller(settings.json_rpc_url, settings.confirmations)
            logger.info("Started blocks RPC poller")
            
    except Exception as e:
        logger.error(f"Error starting live connectors: {e}")


def get_security_manager():
    """Dependency to get security manager."""
    from ..service.security import get_security_manager
    return get_security_manager()


async def validate_hmac(request: Request):
    """Validate HMAC signature on request."""
    security_manager = get_security_manager()
    if not security_manager:
        return True  # Skip validation if security not initialized
        
    try:
        body = await request.body()
        headers = dict(request.headers)
        
        if not validate_request_hmac(body, headers, security_manager):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid HMAC signature"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"HMAC validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication error"
        )


@app.get("/healthz", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    try:
        uptime = time.time() - startup_time
        
        # Check component health
        checks = {
            "ensemble_model": ensemble_model is not None,
            "security_manager": get_security_manager() is not None,
            "telemetry": get_telemetry() is not None,
            "feature_store": True,  # Always available
            "temporal_engine": True,  # Always available
        }
        
        # Check live connectors if in live mode
        if settings.pulseguard_mode == "live":
            checks["mempool_queue"] = mempool_queue.qsize() >= 0
            checks["rpc_connection"] = True  # TODO: Add actual check
            
        all_healthy = all(checks.values())
        
        return HealthResponse(
            status="healthy" if all_healthy else "degraded",
            version="0.1.0",
            uptime_seconds=uptime,
            checks=checks
        )
        
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return HealthResponse(
            status="unhealthy",
            version="0.1.0",
            checks={}
        )


@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint."""
    try:
        telemetry = get_telemetry()
        if not telemetry:
            raise HTTPException(status_code=503, detail="Telemetry not available")
            
        from prometheus_client import generate_latest
        registry = telemetry.get_registry()
        
        return PlainTextResponse(
            content=generate_latest(registry),
            media_type="text/plain"
        )
        
    except Exception as e:
        logger.error(f"Metrics error: {e}")
        raise HTTPException(status_code=500, detail="Metrics error")


@app.post("/score", response_model=ScoreResponse, dependencies=[Depends(validate_hmac)])
async def score_endpoint(request: Union[TxScoreRequest, WindowScoreRequest, BatchScoreRequest]):
    """Score transactions for anomalies with <100ms P95 latency target."""
    start_time = time.time()
    trace_id = create_request_id()
    
    telemetry = get_telemetry()
    
    try:
        with timing_context("score_request", trace_id=trace_id) if telemetry else None:
            
            # Parse request based on type
            if isinstance(request, TxScoreRequest):
                # TODO: Fetch transaction by hash from RPC/cache
                transactions = [{"hash": request.tx_hash}]  # Stub
            elif isinstance(request, WindowScoreRequest):
                # TODO: Get transactions from time window
                transactions = []  # Stub
            elif isinstance(request, BatchScoreRequest):
                transactions = request.transactions
            else:
                raise HTTPException(status_code=400, detail="Invalid request type")
                
            if not transactions:
                raise HTTPException(status_code=400, detail="No transactions to score")
                
            # Compute features
            feature_start = time.time()
            
            # Temporal features
            temporal_features = compute_temporal_features(transactions)
            
            # Graph features
            dag_result = build_interaction_dag(transactions)
            structural_features = compute_transaction_structural_features(transactions)
            
            # Combine features
            combined_features = []
            for i, tx in enumerate(transactions):
                features = {}
                
                if i < len(temporal_features):
                    features.update(temporal_features[i])
                    
                if i < len(structural_features):
                    features.update(structural_features[i])
                    
                combined_features.append(features)
                
            feature_time = time.time() - feature_start
            
            # Run ensemble model
            ensemble_start = time.time()
            
            if ensemble_model and combined_features:
                # Convert to DataFrame for model
                import pandas as pd
                features_df = pd.DataFrame(combined_features)
                
                # Get ensemble scores
                ensemble_scores, explanations = ensemble_model.predict_scores(features_df)
                
                if len(ensemble_scores) > 0:
                    final_score = float(ensemble_scores[0])
                    sub_scores = explanations.get("sub_scores", {})
                else:
                    final_score = 0.0
                    sub_scores = {}
            else:
                final_score = 0.0
                sub_scores = {}
                
            ensemble_time = time.time() - ensemble_start
            
            # Run domain detectors
            detector_start = time.time()
            
            flash_loan_codes = detect_flash_loan_patterns(transactions)
            mint_burn_codes = detect_mint_burn_patterns(transactions)
            bridge_codes = detect_bridge_patterns(transactions)
            
            # Aggregate reason codes
            all_reasons = []
            for codes_list in [flash_loan_codes, mint_burn_codes, bridge_codes]:
                for codes in codes_list:
                    all_reasons.extend(codes)
                    
            detector_time = time.time() - detector_start
            
            # Calculate total latency
            total_latency = time.time() - start_time
            latency_ms = int(total_latency * 1000)
            
            # Record metrics
            if telemetry:
                telemetry.record_api_request("POST", "/score", 200, total_latency)
                telemetry.record_score(final_score)
                
                # Record feature computation time
                telemetry.record_feature_computation("temporal", feature_time)
                telemetry.record_feature_computation("structural", feature_time)
                
                # Record detector triggers
                for reason in all_reasons:
                    telemetry.record_detector_trigger(reason)
                    
            # Sign response
            response_data = {
                "score": final_score,
                "reasons": all_reasons,
                "sub_scores": SubScores(
                    isolation_forest=sub_scores.get("isolation_forest", [None])[0] if isinstance(sub_scores.get("isolation_forest"), list) else sub_scores.get("isolation_forest"),
                    gbdt=sub_scores.get("gbdt", [None])[0] if isinstance(sub_scores.get("gbdt"), list) else sub_scores.get("gbdt"),
                    graph=dag_result.get("metrics", {}).get("density", 0.0),
                    temporal=final_score  # Placeholder
                ),
                "version": settings.model_version,
                "latency_ms": latency_ms,
                "trace_id": trace_id,
                "timestamp": int(time.time())
            }
            
            # Add signature
            security_manager = get_security_manager()
            if security_manager:
                signature_info = security_manager.sign_response(response_data)
                # Add signature headers would be done in middleware
                
            return ScoreResponse(**response_data)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Scoring error: {e}", exc_info=True)
        
        # Record error metrics
        if telemetry:
            telemetry.record_api_request("POST", "/score", 500, time.time() - start_time)
            
        raise HTTPException(
            status_code=500,
            detail=f"Scoring error: {str(e)}"
        )


@app.get("/status", response_model=SystemStatus)
async def system_status():
    """Get system status information."""
    try:
        models = []
        if ensemble_model:
            models.append(ModelStatus(
                version=settings.model_version,
                type="ensemble",
                trained=ensemble_model.is_trained,
                performance={}
            ))
            
        connectors = {}
        if settings.pulseguard_mode == "live":
            connectors["mempool"] = True  # TODO: Add actual checks
            connectors["blocks"] = True
            
        return SystemStatus(
            mode=settings.pulseguard_mode,
            models=models,
            connectors=connectors,
            queue_sizes={"mempool": mempool_queue.qsize()},
            processed_counts={}  # TODO: Add actual counts
        )
        
    except Exception as e:
        logger.error(f"Status error: {e}")
        raise HTTPException(status_code=500, detail="Status error")


@app.get("/config", response_model=ConfigResponse)
async def get_config():
    """Get configuration information."""
    return ConfigResponse(
        mode=settings.pulseguard_mode,
        version="0.1.0",
        features={
            "live_data": settings.pulseguard_mode == "live",
            "pqc": settings.pg_pqc_enabled,
            "hmac": bool(settings.pg_hmac_key),
            "signing": bool(settings.pg_signing_secret)
        },
        thresholds={
            "latency_budget_ms": settings.latency_budget_ms
        }
    )


if __name__ == "__main__":
    uvicorn.run(
        "api:app",
        host=settings.api_host,
        port=settings.api_port,
        log_level="info"
    )