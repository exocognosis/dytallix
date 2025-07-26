"""
Dytallix AI Services API Server

Provides AI-powered analysis services for the Dytallix blockchain:
- Fraud detection
- Transaction risk scoring  
- Smart contract NLP generation
- Behavioral analysis
- Oracle bridge to blockchain

Performance Optimized Version with:
- Sub-100ms response times
- Model preloading and caching
- Request profiling and monitoring
- Response compression and optimization
"""

import asyncio
import logging
import time
import uuid
from typing import Dict, List, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from fraud_detection import FraudDetector
from risk_scoring import AdvancedRiskScorer
from contract_nlp import ContractNLPGenerator
from oracle import BlockchainOracle
from blockchain_oracle import BlockchainOracle as AIOracle
from signing_service import initialize_signing_service, get_signing_service

# Performance optimization imports
from performance_monitor import get_profiler, get_worker_pool
from performance_middleware import (
    PerformanceMonitoringMiddleware, 
    get_model_warmup_service,
    get_response_optimizer
)
from model_optimization import get_model_loader, get_inference_optimizer
from performance_dashboard import performance_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app with performance optimizations
app = FastAPI(
    title="Dytallix AI Services",
    description="AI-powered analysis services for post-quantum cryptocurrency with performance optimization",
    version="2.1.0"
)

# Add performance monitoring middleware FIRST (outer layer)
app.add_middleware(
    PerformanceMonitoringMiddleware,
    enable_compression=True,
    enable_caching=True
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include performance monitoring router
app.include_router(performance_router)

# Initialize AI services with performance optimization
fraud_detector = None
risk_scorer = None
contract_nlp = None
oracle = None
signing_service = None

# Performance optimization services
profiler = get_profiler()
model_loader = get_model_loader()
inference_optimizer = get_inference_optimizer()
model_warmup_service = get_model_warmup_service()
response_optimizer = get_response_optimizer()
worker_pool = get_worker_pool()

async def initialize_ai_services():
    """Initialize AI services with performance optimization"""
    global fraud_detector, risk_scorer, contract_nlp
    
    logger.info("Initializing AI services with performance optimization...")
    start_time = time.time()
    
    # Define model loader functions
    async def load_fraud_detector():
        detector = FraudDetector()
        # Simulate model loading/warming
        await asyncio.sleep(0.1)
        return detector
    
    async def load_risk_scorer():
        scorer = AdvancedRiskScorer()
        # Simulate model loading/warming
        await asyncio.sleep(0.1)
        return scorer
    
    async def load_contract_nlp():
        nlp = ContractNLPGenerator()
        # Simulate model loading/warming
        await asyncio.sleep(0.1)
        return nlp
    
    # Load models with caching and optimization
    try:
        fraud_detector = await model_loader.load_model_async(
            "fraud_detector", 
            lambda: FraudDetector(),
            "v3.0.0"
        )
        logger.info("✅ Fraud detector loaded and optimized")
        
        risk_scorer = await model_loader.load_model_async(
            "risk_scorer",
            lambda: AdvancedRiskScorer(), 
            "v2.0.0"
        )
        logger.info("✅ Risk scorer loaded and optimized")
        
        contract_nlp = await model_loader.load_model_async(
            "contract_nlp",
            lambda: ContractNLPGenerator(),
            "v1.0.0"
        )
        logger.info("✅ Contract NLP loaded and optimized")
        
    except Exception as e:
        logger.error(f"Failed to load AI models: {e}")
        # Fallback to direct initialization
        fraud_detector = FraudDetector()
        risk_scorer = AdvancedRiskScorer()
        contract_nlp = ContractNLPGenerator()
        logger.warning("Using fallback model initialization")
    
    # Warmup models for optimal performance
    warmup_functions = {
        "fraud_detection": lambda: fraud_detector.is_ready() if fraud_detector else True,
        "risk_scoring": lambda: risk_scorer.is_ready() if risk_scorer else True,
        "contract_nlp": lambda: contract_nlp.is_ready() if contract_nlp else True
    }
    
    # Start model warmup in background
    asyncio.create_task(model_warmup_service.warmup_all_models(warmup_functions))
    
    initialization_time = (time.time() - start_time) * 1000
    logger.info(f"AI services initialized in {initialization_time:.2f}ms")

async def initialize_oracle():
    """Initialize the AI-Blockchain Oracle Bridge"""
    global ai_oracle, signing_service, oracle
    try:
        # Initialize basic oracle first
        oracle = BlockchainOracle()
        logger.info("Basic oracle initialized")
        
        # Initialize signing service
        signing_service = initialize_signing_service()
        logger.info("PQC Signing service initialized")
        
        # Initialize AI-Blockchain Oracle Bridge
        ai_oracle = AIOracle(
            blockchain_rpc_url="http://localhost:8080",
            ai_services_url="http://localhost:8000"
        )
        await ai_oracle.start()
        logger.info("AI-Blockchain Oracle Bridge initialized")
    except Exception as e:
        logger.error(f"Failed to initialize oracle bridge: {e}")
        # Initialize basic oracle as fallback
        oracle = BlockchainOracle()

@app.on_event("startup")
async def startup_event():
    """Initialize all services on startup with performance optimization"""
    logger.info("🚀 Starting Dytallix AI Services with Performance Optimization...")
    startup_start = time.time()
    
    # Start worker pool for background tasks
    await worker_pool.start()
    logger.info("✅ Background worker pool started")
    
    # Initialize AI services concurrently for faster startup
    await asyncio.gather(
        initialize_ai_services(),
        initialize_oracle(),
        return_exceptions=True
    )
    
    startup_time = (time.time() - startup_start) * 1000
    logger.info(f"🎉 Dytallix AI Services started successfully in {startup_time:.2f}ms")
    logger.info("📊 Performance monitoring active - visit /performance/dashboard")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("🛑 Shutting down Dytallix AI Services...")
    
    # Stop worker pool
    await worker_pool.stop()
    
    # Cleanup AI oracle
    if 'ai_oracle' in globals() and ai_oracle:
        await ai_oracle.stop()
        
    # Cleanup signing service
    if signing_service:
        signing_service.cleanup_expired_responses()
        
    logger.info("✅ Shutdown complete")

# Pydantic models for API
class TransactionData(BaseModel):
    from_address: str
    to_address: str
    amount: float
    timestamp: int
    metadata: Optional[Dict] = None

class FraudAnalysisRequest(BaseModel):
    transaction: TransactionData
    historical_data: Optional[List[TransactionData]] = None

class RiskScoreRequest(BaseModel):
    transaction: TransactionData
    address_history: Optional[List[TransactionData]] = None

class ContractGenerationRequest(BaseModel):
    description: str
    contract_type: str = "escrow"
    requirements: Optional[List[str]] = None

class FraudAnalysisResponse(BaseModel):
    is_fraudulent: bool
    confidence: float
    risk_factors: List[str]
    recommended_action: str

class RiskScoreResponse(BaseModel):
    risk_score: float  # 0.0 to 1.0
    risk_level: str    # "low", "medium", "high"
    factors: List[str]

class ContractGenerationResponse(BaseModel):
    contract_code: str
    language: str
    security_analysis: Dict
    estimated_gas: Optional[int] = None

class ContractAuditRequest(BaseModel):
    contract_code: str
    contract_type: str = "general"
    audit_level: str = "standard"

class ContractAuditResponse(BaseModel):
    security_score: float
    vulnerabilities: List[str]
    recommendations: List[str]
    gas_efficiency: float
    compliance_flags: List[str]

@app.get("/")
async def root():
    return {
        "service": "Dytallix AI Services",
        "version": "0.1.0",
        "status": "operational",
        "endpoints": [
            "/analyze/fraud",
            "/analyze/risk",
            "/analyze/contract",
            "/generate/contract",
            "/oracle/request",
            "/oracle/info",
            "/health"
        ]
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    try:
        # Check if all services are responsive
        fraud_status = fraud_detector.is_ready()
        risk_status = risk_scorer.is_ready()
        nlp_status = contract_nlp.is_ready()
        oracle_status = oracle.is_connected
        signing_status = signing_service.is_initialized if signing_service else False
        
        return {
            "status": "healthy" if all([fraud_status, risk_status, nlp_status, oracle_status, signing_status]) else "degraded",
            "services": {
                "fraud_detection": fraud_status,
                "risk_scoring": risk_status,
                "contract_nlp": nlp_status,
                "blockchain_oracle": oracle_status,
                "pqc_signing": signing_status
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail="Health check failed")

@app.post("/analyze/fraud", response_model=FraudAnalysisResponse)
async def analyze_fraud(request: FraudAnalysisRequest, http_request: Request):
    """
    Analyze a transaction for fraud patterns with performance optimization
    """
    start_time = time.time()
    request_id = getattr(http_request.state, 'request_id', str(uuid.uuid4()))
    
    try:
        logger.info(f"Fraud analysis request {request_id} for transaction: {request.transaction.from_address} -> {request.transaction.to_address}")
        
        # Use optimized inference
        preprocessing_start = time.time()
        
        # Check if fraud detector is available
        if not fraud_detector:
            raise HTTPException(status_code=503, detail="Fraud detection service not available")
        
        # Prepare input data
        transaction_data = request.transaction.dict()
        historical_data = [tx.dict() for tx in request.historical_data] if request.historical_data else []
        
        preprocessing_time = (time.time() - preprocessing_start) * 1000
        
        # Update request timing
        if hasattr(http_request.state, 'metrics'):
            profiler.update_request_timing(
                request_id,
                preprocessing_time_ms=preprocessing_time
            )
        
        # Run optimized inference
        inference_start = time.time()
        analysis = await inference_optimizer.optimized_inference(
            model=fraud_detector,
            inputs={
                "transaction": transaction_data,
                "historical_data": historical_data
            },
            model_name="fraud_detection",
            use_cache=True
        )
        
        # Fallback to direct call if optimized inference fails
        if analysis is None:
            analysis = await fraud_detector.analyze_transaction(transaction_data, historical_data)
            
        inference_time = (time.time() - inference_start) * 1000
        
        # Update request timing
        if hasattr(http_request.state, 'metrics'):
            profiler.update_request_timing(
                request_id,
                inference_time_ms=inference_time
            )
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        # Optimize response
        response_data = {
            "is_fraudulent": analysis["is_fraudulent"],
            "confidence": analysis["confidence"],
            "risk_factors": analysis["risk_factors"],
            "recommended_action": analysis["recommended_action"]
        }
        
        # Use response optimizer
        optimized_response = response_optimizer.optimize_response(response_data)
        
        # Sign the response if signing service is available
        if signing_service and signing_service.is_initialized:
            signed_response = signing_service.sign_fraud_detection_response(
                request_id=request_id,
                fraud_score=analysis["confidence"],
                risk_factors=analysis["risk_factors"],
                processing_time_ms=processing_time_ms
            )
            
            optimized_response["signed_response"] = signed_response
        
        return FraudAnalysisResponse(**optimized_response)
        
    except Exception as e:
        logger.error(f"Fraud analysis failed: {e}")
        
        # Sign error response if signing service is available
        if signing_service and signing_service.is_initialized:
            processing_time_ms = int((time.time() - start_time) * 1000)
            signed_error = signing_service.sign_error_response(
                request_id=request_id,
                error_code="FRAUD_ANALYSIS_ERROR",
                error_message=str(e),
                processing_time_ms=processing_time_ms
            )
            raise HTTPException(status_code=500, detail={
                "error": f"Fraud analysis failed: {str(e)}",
                "signed_error": signed_error
            })
        else:
            raise HTTPException(status_code=500, detail=f"Fraud analysis failed: {str(e)}")

@app.post("/analyze/risk", response_model=RiskScoreResponse)
async def analyze_risk(request: RiskScoreRequest, http_request: Request):
    """
    Calculate risk score for a transaction with performance optimization
    """
    start_time = time.time()
    request_id = getattr(http_request.state, 'request_id', str(uuid.uuid4()))
    
    try:
        logger.info(f"Risk analysis request {request_id} for transaction: {request.transaction.from_address} -> {request.transaction.to_address}")
        
        # Check if risk scorer is available
        if not risk_scorer:
            raise HTTPException(status_code=503, detail="Risk scoring service not available")
        
        # Use optimized inference
        preprocessing_start = time.time()
        
        # Prepare input data
        transaction_data = request.transaction.dict()
        address_history = [tx.dict() for tx in request.address_history] if request.address_history else []
        
        preprocessing_time = (time.time() - preprocessing_start) * 1000
        
        # Update request timing
        if hasattr(http_request.state, 'metrics'):
            profiler.update_request_timing(
                request_id,
                preprocessing_time_ms=preprocessing_time
            )
        
        # Run optimized inference
        inference_start = time.time()
        score_data = await inference_optimizer.optimized_inference(
            model=risk_scorer,
            inputs={
                "transaction": transaction_data,
                "address_history": address_history
            },
            model_name="risk_scoring",
            use_cache=True
        )
        
        # Fallback to direct call if optimized inference fails
        if score_data is None:
            score_data = await risk_scorer.calculate_comprehensive_risk(transaction_data, address_history)
            
        inference_time = (time.time() - inference_start) * 1000
        
        # Update request timing
        if hasattr(http_request.state, 'metrics'):
            profiler.update_request_timing(
                request_id,
                inference_time_ms=inference_time
            )
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        # Optimize response
        response_data = {
            "risk_score": score_data.score,
            "risk_level": score_data.level,
            "factors": score_data.factors
        }
        
        # Use response optimizer
        optimized_response = response_optimizer.optimize_response(response_data)
        
        # Sign the response if signing service is available
        if signing_service and signing_service.is_initialized:
            signed_response = signing_service.sign_risk_scoring_response(
                request_id=request_id,
                risk_score=score_data.score,
                risk_category=score_data.level,
                contributing_factors=score_data.factors,
                processing_time_ms=processing_time_ms
            )
            
            optimized_response["signed_response"] = signed_response
        
        return RiskScoreResponse(**optimized_response)
        
    except Exception as e:
        logger.error(f"Risk analysis failed: {e}")
        
        # Sign error response if signing service is available
        if signing_service and signing_service.is_initialized:
            processing_time_ms = int((time.time() - start_time) * 1000)
            signed_error = signing_service.sign_error_response(
                request_id=request_id,
                error_code="RISK_ANALYSIS_ERROR",
                error_message=str(e),
                processing_time_ms=processing_time_ms
            )
            raise HTTPException(status_code=500, detail={
                "error": f"Risk analysis failed: {str(e)}",
                "signed_error": signed_error
            })
        else:
            raise HTTPException(status_code=500, detail=f"Risk analysis failed: {str(e)}")

@app.post("/generate/contract", response_model=ContractGenerationResponse)
async def generate_contract(request: ContractGenerationRequest):
    """
    Generate smart contract code from natural language description
    """
    start_time = time.time()
    request_id = str(uuid.uuid4())
    
    try:
        logger.info(f"Contract generation request {request_id}: {request.contract_type}")
        
        contract_data = await contract_nlp.generate_contract(
            request.description,
            request.contract_type,
            request.requirements or []
        )
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        # Sign the response if signing service is available
        if signing_service and signing_service.is_initialized:
            signed_response = signing_service.sign_contract_analysis_response(
                request_id=request_id,
                analysis_result={
                    "contract_code": contract_data["code"],
                    "language": contract_data["language"],
                    "security_analysis": contract_data["security_analysis"],
                    "estimated_gas": contract_data.get("estimated_gas"),
                    "contract_type": request.contract_type
                },
                processing_time_ms=processing_time_ms
            )
            
            # Return signed response
            return {
                "contract_code": contract_data["code"],
                "language": contract_data["language"],
                "security_analysis": contract_data["security_analysis"],
                "estimated_gas": contract_data.get("estimated_gas"),
                "signed_response": signed_response
            }
        else:
            # Return unsigned response
            return ContractGenerationResponse(
                contract_code=contract_data["code"],
                language=contract_data["language"],
                security_analysis=contract_data["security_analysis"],
                estimated_gas=contract_data.get("estimated_gas")
            )
        
    except Exception as e:
        logger.error(f"Contract generation failed: {e}")
        
        # Sign error response if signing service is available
        if signing_service and signing_service.is_initialized:
            processing_time_ms = int((time.time() - start_time) * 1000)
            signed_error = signing_service.sign_error_response(
                request_id=request_id,
                error_code="CONTRACT_GENERATION_ERROR",
                error_message=str(e),
                processing_time_ms=processing_time_ms
            )
            raise HTTPException(status_code=500, detail={
                "error": f"Contract generation failed: {str(e)}",
                "signed_error": signed_error
            })
        else:
            raise HTTPException(status_code=500, detail=f"Contract generation failed: {str(e)}")

@app.post("/oracle/submit")
async def submit_to_oracle(background_tasks: BackgroundTasks, data: Dict):
    """
    Submit AI analysis results to blockchain oracle
    """
    try:
        background_tasks.add_task(oracle.submit_analysis_result, data)
        return {"status": "queued", "message": "Analysis result queued for blockchain submission"}
        
    except Exception as e:
        logger.error(f"Oracle submission failed: {e}")
        raise HTTPException(status_code=500, detail=f"Oracle submission failed: {str(e)}")

@app.get("/models/status")
async def models_status():
    """
    Get status of loaded AI models
    """
    return {
        "fraud_detection": {
            "model_loaded": fraud_detector.is_ready(),
            "model_version": fraud_detector.get_model_version(),
            "last_updated": fraud_detector.get_last_update_time()
        },
        "risk_scoring": {
            "model_loaded": risk_scorer.is_ready(),
            "model_version": risk_scorer.get_model_version(),
            "last_updated": risk_scorer.get_last_update_time()
        },
        "contract_nlp": {
            "model_loaded": contract_nlp.model is not None,
            "model_version": contract_nlp.get_model_version(),
            "last_updated": contract_nlp.get_last_update_time()
        }
    }

@app.post("/analyze/contract", response_model=ContractAuditResponse)
async def analyze_contract(request: ContractAuditRequest):
    """
    Audit a smart contract for security vulnerabilities and compliance
    """
    start_time = time.time()
    request_id = str(uuid.uuid4())
    
    try:
        logger.info(f"Contract audit request {request_id} for {request.contract_type} contract")
        
        # Use the contract_nlp module's security analysis method
        # Parse the contract code and analyze security
        analysis = contract_nlp._analyze_contract_security(request.contract_code, {})
        
        # Calculate gas efficiency based on contract complexity
        estimated_gas = contract_nlp._estimate_gas_cost(request.contract_code, request.contract_type)
        gas_efficiency = min(1.0, max(0.0, 1.0 - (estimated_gas / 1000000.0)))  # Normalize to 0-1
        
        # Enhanced analysis based on audit level
        if request.audit_level == "comprehensive":
            # Perform additional checks for comprehensive audit
            additional_checks = _perform_comprehensive_audit(request.contract_code)
            analysis["vulnerabilities"].extend(additional_checks["vulnerabilities"])
            analysis["recommendations"].extend(additional_checks["recommendations"])
            analysis["compliance"].extend(additional_checks["compliance"])
            # Adjust security score based on additional findings
            analysis["security_score"] = max(0.0, analysis["security_score"] - len(additional_checks["vulnerabilities"]) * 0.05)
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        # Sign the response if signing service is available
        if signing_service and signing_service.is_initialized:
            analysis_result = {
                "contract_code": request.contract_code,
                "language": "rust",
                "security_analysis": analysis,
                "estimated_gas": estimated_gas
            }
            
            signed_response = signing_service.sign_contract_analysis_response(
                request_id=request_id,
                analysis_result=analysis_result,
                processing_time_ms=processing_time_ms
            )
            
            # Return signed response
            return {
                "security_score": analysis["security_score"],
                "vulnerabilities": analysis["vulnerabilities"],
                "recommendations": analysis["recommendations"],
                "gas_efficiency": gas_efficiency,
                "compliance_flags": analysis["compliance"],
                "signed_response": signed_response
            }
        else:
            # Return unsigned response
            return ContractAuditResponse(
                security_score=analysis["security_score"],
                vulnerabilities=analysis["vulnerabilities"],
                recommendations=analysis["recommendations"],
                gas_efficiency=gas_efficiency,
                compliance_flags=analysis["compliance"]
            )
        
    except Exception as e:
        logger.error(f"Contract audit failed: {e}")
        
        # Sign error response if signing service is available
        if signing_service and signing_service.is_initialized:
            error_response = signing_service.sign_error_response(
                request_id=request_id,
                error_code="CONTRACT_AUDIT_ERROR",
                error_message=str(e),
                processing_time_ms=int((time.time() - start_time) * 1000)
            )
            
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "Contract audit failed",
                    "message": str(e),
                    "signed_response": error_response
                }
            )
        else:
            raise HTTPException(status_code=500, detail=f"Contract audit failed: {str(e)}")

def _perform_comprehensive_audit(contract_code: str) -> Dict[str, List[str]]:
    """Perform comprehensive security audit on contract code"""
    result = {
        "vulnerabilities": [],
        "recommendations": [],
        "compliance": []
    }
    
    code_lower = contract_code.lower()
    
    # Check for common vulnerability patterns
    if "unsafe" in code_lower:
        result["vulnerabilities"].append("Unsafe code blocks detected")
        result["recommendations"].append("Replace unsafe blocks with safe alternatives")
    
    if "unwrap()" in contract_code:
        result["vulnerabilities"].append("Unsafe unwrap() calls that can cause panics")
        result["recommendations"].append("Use expect() or proper error handling instead of unwrap()")
    
    if "unchecked" in code_lower:
        result["vulnerabilities"].append("Unchecked arithmetic operations")
        result["recommendations"].append("Use checked arithmetic to prevent overflow/underflow")
    
    # Check for proper error handling
    if "Result<" not in contract_code and "Option<" not in contract_code:
        result["vulnerabilities"].append("Limited error handling patterns")
        result["recommendations"].append("Implement comprehensive error handling with Result/Option types")
    
    # Check for reentrancy protection
    if "mutex" not in code_lower and "lock" not in code_lower:
        result["vulnerabilities"].append("Missing reentrancy protection")
        result["recommendations"].append("Implement mutex or other reentrancy protection mechanisms")
    
    # Check for access control
    if "caller" not in code_lower and "owner" not in code_lower:
        result["vulnerabilities"].append("Missing access control mechanisms")
        result["recommendations"].append("Implement proper access control with owner/caller checks")
    
    # Check for input validation
    if "assert" not in code_lower and "require" not in code_lower:
        result["vulnerabilities"].append("Insufficient input validation")
        result["recommendations"].append("Add comprehensive input validation with assert/require statements")
    
    # Check for event logging
    if "event" not in code_lower and "log" not in code_lower:
        result["recommendations"].append("Add event logging for better transparency and debugging")
    
    # Compliance checks
    if "audit" in code_lower or "compliance" in code_lower:
        result["compliance"].append("Contains audit/compliance annotations")
    
    if "timestamp" in code_lower:
        result["compliance"].append("Time-based operations detected - ensure proper handling")
    
    return result

# Oracle Management Endpoints

@app.get("/oracle/info")
async def get_oracle_info():
    """Get oracle information including public key and certificates"""
    try:
        if not signing_service or not signing_service.is_initialized:
            raise HTTPException(status_code=503, detail="Signing service not initialized")
        
        oracle_info = signing_service.get_oracle_info()
        return {
            "oracle_info": oracle_info,
            "certificate_chain": signing_service.get_certificate_chain(),
            "signing_statistics": signing_service.get_signing_statistics()
        }
    except Exception as e:
        logger.error(f"Failed to get oracle info: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get oracle info: {str(e)}")

@app.get("/oracle/certificates")
async def get_oracle_certificates():
    """Get oracle certificate chain"""
    try:
        if not signing_service or not signing_service.is_initialized:
            raise HTTPException(status_code=503, detail="Signing service not initialized")
        
        return {
            "certificates": signing_service.get_certificate_chain()
        }
    except Exception as e:
        logger.error(f"Failed to get certificates: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get certificates: {str(e)}")

@app.get("/oracle/statistics")
async def get_oracle_statistics():
    """Get oracle signing statistics"""
    try:
        if not signing_service or not signing_service.is_initialized:
            raise HTTPException(status_code=503, detail="Signing service not initialized")
        
        stats = signing_service.get_signing_statistics()
        return stats
    except Exception as e:
        logger.error(f"Failed to get statistics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")

@app.post("/oracle/cleanup")
async def cleanup_expired_responses():
    """Clean up expired responses from cache"""
    try:
        if not signing_service or not signing_service.is_initialized:
            raise HTTPException(status_code=503, detail="Signing service not initialized")
        
        signing_service.cleanup_expired_responses()
        return {"status": "success", "message": "Expired responses cleaned up"}
    except Exception as e:
        logger.error(f"Failed to cleanup responses: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to cleanup responses: {str(e)}")

if __name__ == "__main__":
    logger.info("Starting Dytallix AI Services...")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )
