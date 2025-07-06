"""
Post-Quantum Cryptography Interface for Python AI Services

This module provides a Python interface to the Dytallix PQC crypto library
for signing AI oracle responses using post-quantum cryptographic algorithms.
"""

import ctypes
import json
import os
import time
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class SignatureAlgorithm(Enum):
    """Supported post-quantum signature algorithms"""
    DILITHIUM5 = "Dilithium5"
    FALCON1024 = "Falcon1024"
    SPHINCS_SHA256_128S = "SphincsSha256128s"

@dataclass
class KeyPair:
    """Post-quantum key pair"""
    public_key: bytes
    secret_key: bytes
    algorithm: SignatureAlgorithm

@dataclass
class Signature:
    """Post-quantum signature"""
    data: bytes
    algorithm: SignatureAlgorithm

@dataclass
class OracleIdentity:
    """Oracle identity information"""
    oracle_id: str
    name: str
    public_key: bytes
    signature_algorithm: SignatureAlgorithm
    registered_at: int
    reputation_score: float
    is_active: bool

@dataclass
class OracleCertificate:
    """Oracle certificate for identity verification"""
    version: int
    subject_oracle_id: str
    issuer_oracle_id: str
    valid_from: int
    valid_until: int
    public_key: bytes
    signature_algorithm: SignatureAlgorithm
    signature: bytes
    extensions: Optional[Dict[str, Any]] = None

@dataclass
class AIResponseSignature:
    """AI response signature with metadata"""
    algorithm: SignatureAlgorithm
    signature: bytes
    public_key: bytes
    signature_timestamp: int
    signature_version: int = 1
    metadata: Optional[Dict[str, Any]] = None

@dataclass
class SignedAIOracleResponse:
    """Signed AI Oracle response"""
    response: Dict[str, Any]
    signature: AIResponseSignature
    nonce: int
    expires_at: int
    oracle_identity: OracleIdentity
    verification_data: Optional[Dict[str, Any]] = None

class PQCError(Exception):
    """PQC-related errors"""
    pass

class PQCManager:
    """Post-Quantum Cryptography Manager for AI Services"""
    
    def __init__(self, oracle_id: str = "ai_oracle_001", name: str = "Dytallix AI Oracle"):
        self.oracle_id = oracle_id
        self.name = name
        self.algorithm = SignatureAlgorithm.DILITHIUM5
        self.keypair: Optional[KeyPair] = None
        self.oracle_identity: Optional[OracleIdentity] = None
        self.certificates: List[OracleCertificate] = []
        
        # Initialize keys
        self._initialize_keys()
    
    def _initialize_keys(self):
        """Initialize or load PQC keys"""
        try:
            # For now, generate new keys each time
            # In production, this would load from secure storage
            self.keypair = self._generate_keypair(self.algorithm)
            
            # Create oracle identity
            self.oracle_identity = OracleIdentity(
                oracle_id=self.oracle_id,
                name=self.name,
                public_key=self.keypair.public_key,
                signature_algorithm=self.algorithm,
                registered_at=int(time.time()),
                reputation_score=0.8,  # Start with good reputation
                is_active=True
            )
            
            logger.info(f"PQC keys initialized for oracle {self.oracle_id}")
            
        except Exception as e:
            logger.error(f"Failed to initialize PQC keys: {e}")
            raise PQCError(f"Key initialization failed: {e}")
    
    def _generate_keypair(self, algorithm: SignatureAlgorithm) -> KeyPair:
        """Generate a new key pair for the specified algorithm"""
        # This is a mock implementation
        # In production, this would call the actual PQC library
        
        if algorithm == SignatureAlgorithm.DILITHIUM5:
            # Mock Dilithium5 key sizes
            public_key = os.urandom(2592)  # Dilithium5 public key size
            secret_key = os.urandom(4864)  # Dilithium5 secret key size
        elif algorithm == SignatureAlgorithm.FALCON1024:
            # Mock Falcon1024 key sizes
            public_key = os.urandom(1793)  # Falcon1024 public key size
            secret_key = os.urandom(2305)  # Falcon1024 secret key size
        elif algorithm == SignatureAlgorithm.SPHINCS_SHA256_128S:
            # Mock SPHINCS+ key sizes
            public_key = os.urandom(32)    # SPHINCS+ public key size
            secret_key = os.urandom(64)    # SPHINCS+ secret key size
        else:
            raise PQCError(f"Unsupported algorithm: {algorithm}")
        
        return KeyPair(
            public_key=public_key,
            secret_key=secret_key,
            algorithm=algorithm
        )
    
    def sign_message(self, message: bytes) -> Signature:
        """Sign a message using the oracle's private key"""
        if not self.keypair:
            raise PQCError("No keypair available for signing")
        
        try:
            # This is a mock implementation
            # In production, this would call the actual PQC signing function
            
            # Create a mock signature by hashing the message and key
            import hashlib
            hash_input = message + self.keypair.secret_key + str(int(time.time())).encode()
            
            if self.algorithm == SignatureAlgorithm.DILITHIUM5:
                signature_data = hashlib.sha256(hash_input).digest() + os.urandom(4563)  # Mock Dilithium5 signature
            elif self.algorithm == SignatureAlgorithm.FALCON1024:
                signature_data = hashlib.sha256(hash_input).digest() + os.urandom(1298)  # Mock Falcon1024 signature
            elif self.algorithm == SignatureAlgorithm.SPHINCS_SHA256_128S:
                signature_data = hashlib.sha256(hash_input).digest() + os.urandom(7824)  # Mock SPHINCS+ signature
            else:
                raise PQCError(f"Unsupported algorithm: {self.algorithm}")
            
            return Signature(
                data=signature_data,
                algorithm=self.algorithm
            )
            
        except Exception as e:
            logger.error(f"Failed to sign message: {e}")
            raise PQCError(f"Signing failed: {e}")
    
    def create_signed_response(self, response_data: Dict[str, Any], 
                             validity_period: int = 300) -> SignedAIOracleResponse:
        """Create a signed AI oracle response"""
        if not self.oracle_identity:
            raise PQCError("Oracle identity not initialized")
        
        try:
            # Generate nonce and expiration
            nonce = int(time.time() * 1000000) % (2**63)  # Microsecond precision
            expires_at = int(time.time()) + validity_period
            
            # Create signable data
            signable_data = self._create_signable_data(response_data, nonce, expires_at)
            
            # Sign the data
            signature = self.sign_message(signable_data)
            
            # Create response signature
            response_signature = AIResponseSignature(
                algorithm=signature.algorithm,
                signature=signature.data,
                public_key=self.keypair.public_key,
                signature_timestamp=int(time.time()),
                signature_version=1,
                metadata={
                    "key_id": f"{self.oracle_id}_key_001",
                    "cert_chain": [cert.subject_oracle_id for cert in self.certificates]
                }
            )
            
            # Create signed response
            signed_response = SignedAIOracleResponse(
                response=response_data,
                signature=response_signature,
                nonce=nonce,
                expires_at=expires_at,
                oracle_identity=self.oracle_identity,
                verification_data={
                    "request_hash": self._hash_request(response_data),
                    "timestamp_proof": None,  # Could add external timestamp proof
                    "metadata": {
                        "signing_time": int(time.time()),
                        "oracle_version": "2.0.0"
                    }
                }
            )
            
            logger.info(f"Created signed response for oracle {self.oracle_id}")
            return signed_response
            
        except Exception as e:
            logger.error(f"Failed to create signed response: {e}")
            raise PQCError(f"Signed response creation failed: {e}")
    
    def _create_signable_data(self, response_data: Dict[str, Any], 
                            nonce: int, expires_at: int) -> bytes:
        """Create deterministic signable data from response"""
        try:
            # Create canonical representation
            canonical_data = {
                "response_id": response_data.get("id", ""),
                "request_id": response_data.get("request_id", ""),
                "timestamp": response_data.get("timestamp", 0),
                "processing_time_ms": response_data.get("processing_time_ms", 0),
                "response_data": response_data.get("response_data", {}),
                "nonce": nonce,
                "expires_at": expires_at,
                "oracle_id": self.oracle_id
            }
            
            # Create deterministic JSON
            canonical_json = json.dumps(canonical_data, sort_keys=True, separators=(',', ':'))
            return canonical_json.encode('utf-8')
            
        except Exception as e:
            logger.error(f"Failed to create signable data: {e}")
            raise PQCError(f"Signable data creation failed: {e}")
    
    def _hash_request(self, response_data: Dict[str, Any]) -> bytes:
        """Create hash of the original request for verification"""
        try:
            import hashlib
            request_id = response_data.get("request_id", "")
            return hashlib.sha256(request_id.encode()).digest()
        except Exception as e:
            logger.error(f"Failed to hash request: {e}")
            return b""
    
    def generate_certificate(self, issuer_oracle_id: str = None,
                           validity_days: int = 365) -> OracleCertificate:
        """Generate a certificate for this oracle"""
        if not self.oracle_identity:
            raise PQCError("Oracle identity not initialized")
        
        try:
            now = int(time.time())
            valid_until = now + (validity_days * 24 * 60 * 60)
            
            # Self-signed certificate if no issuer specified
            issuer_id = issuer_oracle_id or self.oracle_id
            
            # Create certificate data
            cert_data = {
                "version": 1,
                "subject_oracle_id": self.oracle_id,
                "issuer_oracle_id": issuer_id,
                "valid_from": now,
                "valid_until": valid_until,
                "public_key": self.keypair.public_key.hex(),
                "signature_algorithm": self.algorithm.value
            }
            
            # Sign the certificate
            cert_json = json.dumps(cert_data, sort_keys=True, separators=(',', ':'))
            signature = self.sign_message(cert_json.encode('utf-8'))
            
            certificate = OracleCertificate(
                version=1,
                subject_oracle_id=self.oracle_id,
                issuer_oracle_id=issuer_id,
                valid_from=now,
                valid_until=valid_until,
                public_key=self.keypair.public_key,
                signature_algorithm=self.algorithm,
                signature=signature.data,
                extensions={
                    "oracle_name": self.name,
                    "oracle_type": "ai_service",
                    "capabilities": ["fraud_detection", "risk_scoring", "contract_analysis"]
                }
            )
            
            # Add to certificate chain
            self.certificates.append(certificate)
            
            logger.info(f"Generated certificate for oracle {self.oracle_id}")
            return certificate
            
        except Exception as e:
            logger.error(f"Failed to generate certificate: {e}")
            raise PQCError(f"Certificate generation failed: {e}")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert signed response to dictionary for JSON serialization"""
        def _serialize_bytes(obj):
            if isinstance(obj, bytes):
                return obj.hex()
            elif isinstance(obj, SignatureAlgorithm):
                return obj.value
            elif hasattr(obj, '__dict__'):
                return {k: _serialize_bytes(v) for k, v in obj.__dict__.items()}
            elif isinstance(obj, dict):
                return {k: _serialize_bytes(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [_serialize_bytes(item) for item in obj]
            else:
                return obj
        
        return _serialize_bytes(self.__dict__)
    
    def get_public_key_info(self) -> Dict[str, Any]:
        """Get public key information for blockchain registration"""
        if not self.keypair or not self.oracle_identity:
            raise PQCError("Oracle not initialized")
        
        return {
            "oracle_id": self.oracle_id,
            "name": self.name,
            "public_key": self.keypair.public_key.hex(),
            "signature_algorithm": self.algorithm.value,
            "registered_at": self.oracle_identity.registered_at,
            "reputation_score": self.oracle_identity.reputation_score,
            "is_active": self.oracle_identity.is_active,
            "certificates": [
                {
                    "subject_oracle_id": cert.subject_oracle_id,
                    "issuer_oracle_id": cert.issuer_oracle_id,
                    "valid_from": cert.valid_from,
                    "valid_until": cert.valid_until,
                    "signature_algorithm": cert.signature_algorithm.value
                }
                for cert in self.certificates
            ]
        }
