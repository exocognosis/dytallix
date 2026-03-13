"""
AI Oracle Signing Service

This service handles the signing of AI oracle responses using post-quantum
cryptography. It integrates with the AI service endpoints to provide
cryptographic verification of all AI responses.
"""

import asyncio
import json
import logging
import time
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import uuid

from pqc_signer import PQCManager, SignedAIOracleResponse, PQCError

logger = logging.getLogger(__name__)

class SigningService:
    """Service for signing AI oracle responses"""
    
    def __init__(self, oracle_id: str = "dytallix_ai_oracle_001", 
                 oracle_name: str = "Dytallix AI Oracle Service"):
        self.oracle_id = oracle_id
        self.oracle_name = oracle_name
        self.pqc_manager = PQCManager(oracle_id, oracle_name)
        self.response_cache: Dict[str, SignedAIOracleResponse] = {}
        self.nonce_counter = int(time.time() * 1000000)
        self.is_initialized = False
        
        # Initialize the service
        self._initialize_service()
    
    def _initialize_service(self):
        """Initialize the signing service"""
        try:
            # Generate initial certificate (self-signed)
            self.pqc_manager.generate_certificate()
            
            # Mark as initialized
            self.is_initialized = True
            
            logger.info(f"Signing service initialized for oracle {self.oracle_id}")
            
        except Exception as e:
            logger.error(f"Failed to initialize signing service: {e}")
            raise PQCError(f"Signing service initialization failed: {e}")
    
    def sign_response(self, response_data: Dict[str, Any], 
                     validity_period: int = 300) -> SignedAIOracleResponse:
        """Sign an AI response payload"""
        if not self.is_initialized:
            raise PQCError("Signing service not initialized")
        
        try:
            # Ensure response has required fields
            if "id" not in response_data:
                response_data["id"] = str(uuid.uuid4())
            
            if "timestamp" not in response_data:
                response_data["timestamp"] = int(time.time())
            
            # Create signed response
            signed_response = self.pqc_manager.create_signed_response(
                response_data, validity_period
            )
            
            # Cache the response
            self.response_cache[response_data["id"]] = signed_response
            
            logger.info(f"Signed response {response_data['id']} for oracle {self.oracle_id}")
            return signed_response
            
        except Exception as e:
            logger.error(f"Failed to sign response: {e}")
            raise PQCError(f"Response signing failed: {e}")
    
    def sign_fraud_detection_response(self, request_id: str, 
                                    fraud_score: float, 
                                    risk_factors: List[str],
                                    processing_time_ms: int) -> Dict[str, Any]:
        """Sign a fraud detection response"""
        response_data = {
            "id": str(uuid.uuid4()),
            "request_id": request_id,
            "service_type": "FraudDetection",
            "response_data": {
                "fraud_score": fraud_score,
                "risk_factors": risk_factors,
                "confidence": 0.95,
                "model_version": "fraud_detector_v2.1"
            },
            "timestamp": int(time.time()),
            "processing_time_ms": processing_time_ms,
            "status": "Success"
        }
        
        signed_response = self.sign_response(response_data)
        return self._serialize_signed_response(signed_response)
    
    def sign_risk_scoring_response(self, request_id: str, 
                                 risk_score: float, 
                                 risk_category: str,
                                 contributing_factors: List[str],
                                 processing_time_ms: int) -> Dict[str, Any]:
        """Sign a risk scoring response"""
        response_data = {
            "id": str(uuid.uuid4()),
            "request_id": request_id,
            "service_type": "RiskScoring",
            "response_data": {
                "risk_score": risk_score,
                "risk_category": risk_category,
                "contributing_factors": contributing_factors,
                "confidence": 0.92,
                "model_version": "risk_scorer_v1.8"
            },
            "timestamp": int(time.time()),
            "processing_time_ms": processing_time_ms,
            "status": "Success"
        }
        
        signed_response = self.sign_response(response_data)
        return self._serialize_signed_response(signed_response)
    
    def sign_contract_analysis_response(self, request_id: str, 
                                      analysis_result: Dict[str, Any],
                                      processing_time_ms: int) -> Dict[str, Any]:
        """Sign a contract analysis response"""
        response_data = {
            "id": str(uuid.uuid4()),
            "request_id": request_id,
            "service_type": "ContractAnalysis",
            "response_data": analysis_result,
            "timestamp": int(time.time()),
            "processing_time_ms": processing_time_ms,
            "status": "Success"
        }
        
        signed_response = self.sign_response(response_data)
        return self._serialize_signed_response(signed_response)
    
    def sign_error_response(self, request_id: str, 
                           error_code: str, 
                           error_message: str,
                           processing_time_ms: int) -> Dict[str, Any]:
        """Sign an error response"""
        response_data = {
            "id": str(uuid.uuid4()),
            "request_id": request_id,
            "service_type": "Error",
            "response_data": {
                "error_code": error_code,
                "error_message": error_message,
                "error_category": "ProcessingError"
            },
            "timestamp": int(time.time()),
            "processing_time_ms": processing_time_ms,
            "status": "Failure"
        }
        
        signed_response = self.sign_response(response_data)
        return self._serialize_signed_response(signed_response)
    
    def _serialize_signed_response(self, signed_response: SignedAIOracleResponse) -> Dict[str, Any]:
        """Serialize signed response for JSON transmission"""
        try:
            return {
                "response": signed_response.response,
                "signature": {
                    "algorithm": signed_response.signature.algorithm.value,
                    "signature": signed_response.signature.signature.hex(),
                    "public_key": signed_response.signature.public_key.hex(),
                    "signature_timestamp": signed_response.signature.signature_timestamp,
                    "signature_version": signed_response.signature.signature_version,
                    "metadata": signed_response.signature.metadata
                },
                "nonce": signed_response.nonce,
                "expires_at": signed_response.expires_at,
                "oracle_identity": {
                    "oracle_id": signed_response.oracle_identity.oracle_id,
                    "name": signed_response.oracle_identity.name,
                    "public_key": signed_response.oracle_identity.public_key.hex(),
                    "signature_algorithm": signed_response.oracle_identity.signature_algorithm.value,
                    "registered_at": signed_response.oracle_identity.registered_at,
                    "reputation_score": signed_response.oracle_identity.reputation_score,
                    "is_active": signed_response.oracle_identity.is_active
                },
                "verification_data": signed_response.verification_data
            }
            
        except Exception as e:
            logger.error(f"Failed to serialize signed response: {e}")
            raise PQCError(f"Serialization failed: {e}")
    
    def get_oracle_info(self) -> Dict[str, Any]:
        """Get oracle information for registration"""
        if not self.is_initialized:
            raise PQCError("Signing service not initialized")
        
        return self.pqc_manager.get_public_key_info()
    
    def get_certificate_chain(self) -> List[Dict[str, Any]]:
        """Get the oracle's certificate chain"""
        if not self.is_initialized:
            raise PQCError("Signing service not initialized")
        
        return [
            {
                "version": cert.version,
                "subject_oracle_id": cert.subject_oracle_id,
                "issuer_oracle_id": cert.issuer_oracle_id,
                "valid_from": cert.valid_from,
                "valid_until": cert.valid_until,
                "public_key": cert.public_key.hex(),
                "signature_algorithm": cert.signature_algorithm.value,
                "signature": cert.signature.hex(),
                "extensions": cert.extensions
            }
            for cert in self.pqc_manager.certificates
        ]
    
    def cleanup_expired_responses(self):
        """Clean up expired responses from cache"""
        current_time = int(time.time())
        expired_keys = []
        
        for response_id, signed_response in self.response_cache.items():
            if signed_response.expires_at < current_time:
                expired_keys.append(response_id)
        
        for key in expired_keys:
            del self.response_cache[key]
        
        if expired_keys:
            logger.info(f"Cleaned up {len(expired_keys)} expired responses")
    
    def get_signing_statistics(self) -> Dict[str, Any]:
        """Get signing service statistics"""
        current_time = int(time.time())
        active_responses = sum(1 for r in self.response_cache.values() 
                             if r.expires_at >= current_time)
        
        return {
            "oracle_id": self.oracle_id,
            "oracle_name": self.oracle_name,
            "is_initialized": self.is_initialized,
            "total_responses_cached": len(self.response_cache),
            "active_responses": active_responses,
            "certificate_count": len(self.pqc_manager.certificates),
            "signature_algorithm": self.pqc_manager.algorithm.value,
            "reputation_score": self.pqc_manager.oracle_identity.reputation_score,
            "is_active": self.pqc_manager.oracle_identity.is_active,
            "uptime": int(time.time() - self.pqc_manager.oracle_identity.registered_at)
        }

# Global signing service instance
signing_service = None

def get_signing_service() -> SigningService:
    """Get the global signing service instance"""
    global signing_service
    if signing_service is None:
        signing_service = SigningService()
    return signing_service

def initialize_signing_service(oracle_id: str = None, oracle_name: str = None):
    """Initialize the global signing service"""
    global signing_service
    oracle_id = oracle_id or "dytallix_ai_oracle_001"
    oracle_name = oracle_name or "Dytallix AI Oracle Service"
    signing_service = SigningService(oracle_id, oracle_name)
    return signing_service
