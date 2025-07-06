"""
Dytallix AI Services API Server

Provides AI-powered analysis services for the Dytallix blockchain:
- Fraud detection
- Transaction risk scoring  
- Smart contract NLP generation
- Behavioral analysis
- Oracle bridge to blockchain
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
from risk_scoring import RiskScorer
from contract_nlp import ContractNLPGenerator
from oracle import BlockchainOracle
from blockchain_oracle import BlockchainOracle as AIOracle
from signing_service import initialize_signing_service, get_signing_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Dytallix AI Services",
    description="AI-powered analysis services for post-quantum cryptocurrency",
    version="2.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize AI services
fraud_detector = FraudDetector()
risk_scorer = RiskScorer()
contract_nlp = ContractNLPGenerator()
# Initialize AI services
fraud_detector = FraudDetector()
risk_scorer = RiskScorer()
contract_nlp = ContractNLPGenerator()
oracle = BlockchainOracle()

# Initialize signing service
signing_service = None

async def initialize_oracle():
    """Initialize the AI-Blockchain Oracle Bridge"""
    global ai_oracle, signing_service
    try:
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

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting Dytallix AI Services...")
    await initialize_oracle()

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down Dytallix AI Services...")
    if ai_oracle:
        await ai_oracle.stop()
    if signing_service:
        signing_service.cleanup_expired_responses()

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

@app.get("/")
async def root():
    return {
        "service": "Dytallix AI Services",
        "version": "0.1.0",
        "status": "operational",
        "endpoints": [
            "/analyze/fraud",
            "/analyze/risk", 
            "/generate/contract",
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
        oracle_status = await oracle.is_connected()
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
async def analyze_fraud(request: FraudAnalysisRequest):
    """
    Analyze a transaction for fraud patterns
    """
    start_time = time.time()
    request_id = str(uuid.uuid4())
    
    try:
        logger.info(f"Fraud analysis request {request_id} for transaction: {request.transaction.from_address} -> {request.transaction.to_address}")
        
        analysis = await fraud_detector.analyze_transaction(
            request.transaction.dict(),
            request.historical_data or []
        )
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        # Sign the response if signing service is available
        if signing_service and signing_service.is_initialized:
            signed_response = signing_service.sign_fraud_detection_response(
                request_id=request_id,
                fraud_score=analysis["confidence"],
                risk_factors=analysis["risk_factors"],
                processing_time_ms=processing_time_ms
            )
            
            # Return signed response
            return {
                "is_fraudulent": analysis["is_fraudulent"],
                "confidence": analysis["confidence"],
                "risk_factors": analysis["risk_factors"],
                "recommended_action": analysis["recommended_action"],
                "signed_response": signed_response
            }
        else:
            # Return unsigned response
            return FraudAnalysisResponse(
                is_fraudulent=analysis["is_fraudulent"],
                confidence=analysis["confidence"],
                risk_factors=analysis["risk_factors"],
                recommended_action=analysis["recommended_action"]
            )
        
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
async def analyze_risk(request: RiskScoreRequest):
    """
    Calculate risk score for a transaction
    """
    start_time = time.time()
    request_id = str(uuid.uuid4())
    
    try:
        logger.info(f"Risk analysis request {request_id} for transaction: {request.transaction.from_address} -> {request.transaction.to_address}")
        
        score_data = await risk_scorer.calculate_risk_score(
            request.transaction.dict(),
            request.address_history or []
        )
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        # Sign the response if signing service is available
        if signing_service and signing_service.is_initialized:
            signed_response = signing_service.sign_risk_scoring_response(
                request_id=request_id,
                risk_score=score_data["score"],
                risk_category=score_data["level"],
                contributing_factors=score_data["factors"],
                processing_time_ms=processing_time_ms
            )
            
            # Return signed response
            return {
                "risk_score": score_data["score"],
                "risk_level": score_data["level"],
                "factors": score_data["factors"],
                "signed_response": signed_response
            }
        else:
            # Return unsigned response
            return RiskScoreResponse(
                risk_score=score_data["score"],
                risk_level=score_data["level"],
                factors=score_data["factors"]
            )
        
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
            "model_loaded": fraud_detector.model is not None,
            "model_version": fraud_detector.get_model_version(),
            "last_updated": fraud_detector.get_last_update_time()
        },
        "risk_scoring": {
            "model_loaded": risk_scorer.model is not None,
            "model_version": risk_scorer.get_model_version(),
            "last_updated": risk_scorer.get_last_update_time()
        },
        "contract_nlp": {
            "model_loaded": contract_nlp.model is not None,
            "model_version": contract_nlp.get_model_version(),
            "last_updated": contract_nlp.get_last_update_time()
        }
    }

@app.post("/analyze/contract")
async def analyze_contract(request: Request):
    # TODO: Parse request, call ContractAuditService, return result
    return {"result": "dummy_contract_audit"}

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
