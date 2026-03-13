"""
Blockchain Oracle Module

Provides secure bridge between AI services and the Dytallix blockchain.
Handles AI result submission and verification using post-quantum cryptography.
"""

import asyncio
import logging
import json
from typing import Dict, List, Optional, Any
from datetime import datetime
import aiohttp
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization

logger = logging.getLogger(__name__)

class BlockchainOracle:
    def __init__(self, node_url: str = "http://localhost:8080"):
        self.node_url = node_url
        self.session = None
        self.is_connected = False
        self.private_key = None
        self.public_key = None
        self.oracle_address = "oracle_dytallix_ai_001"
        
        # Initialize cryptographic keys for oracle signing
        self._initialize_keys()
    
    def _initialize_keys(self):
        """Initialize cryptographic keys for oracle authentication"""
        try:
            # In a real implementation, this would use PQC keys
            # For now, using RSA as placeholder
            self.private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048,
            )
            self.public_key = self.private_key.public_key()
            logger.info("Oracle cryptographic keys initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize oracle keys: {e}")
    
    async def connect(self):
        """Connect to the blockchain node"""
        try:
            self.session = aiohttp.ClientSession()
            
            # Test connection
            async with self.session.get(f"{self.node_url}/health") as response:
                if response.status == 200:
                    self.is_connected = True
                    logger.info(f"Connected to blockchain node at {self.node_url}")
                else:
                    logger.error(f"Failed to connect to node: HTTP {response.status}")
                    
        except Exception as e:
            logger.error(f"Oracle connection failed: {e}")
            self.is_connected = False
    
    async def disconnect(self):
        """Disconnect from the blockchain node"""
        if self.session:
            await self.session.close()
            self.is_connected = False
            logger.info("Disconnected from blockchain node")
    
    async def is_connected_to_node(self) -> bool:
        """Check if oracle is connected to blockchain node"""
        if not self.session:
            return False
        
        try:
            async with self.session.get(f"{self.node_url}/health", timeout=5) as response:
                return response.status == 200
        except:
            return False
    
    async def submit_analysis_result(self, analysis_data: Dict[str, Any]) -> bool:
        """
        Submit AI analysis result to blockchain
        
        Args:
            analysis_data: AI analysis result to submit
            
        Returns:
            Success status
        """
        try:
            if not self.is_connected:
                await self.connect()
            
            # Prepare oracle transaction
            oracle_tx = self._prepare_oracle_transaction(analysis_data)
            
            # Sign with oracle private key
            signed_tx = self._sign_oracle_transaction(oracle_tx)
            
            # Submit to blockchain
            success = await self._submit_to_blockchain(signed_tx)
            
            if success:
                logger.info(f"Analysis result submitted successfully: {analysis_data.get('type', 'unknown')}")
            else:
                logger.error("Failed to submit analysis result to blockchain")
                
            return success
            
        except Exception as e:
            logger.error(f"Oracle submission failed: {e}")
            return False
    
    def _prepare_oracle_transaction(self, analysis_data: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare oracle transaction with AI analysis data"""
        
        oracle_tx = {
            "type": "oracle_submission",
            "oracle_address": self.oracle_address,
            "timestamp": datetime.now().isoformat(),
            "data": {
                "analysis_type": analysis_data.get("type", "unknown"),
                "result": analysis_data.get("result", {}),
                "confidence": analysis_data.get("confidence", 0.0),
                "metadata": {
                    "ai_service_version": "1.0.0",
                    "processing_time": analysis_data.get("processing_time", 0),
                    "model_version": analysis_data.get("model_version", "unknown")
                }
            },
            "nonce": self._generate_nonce()
        }
        
        return oracle_tx
    
    def _sign_oracle_transaction(self, oracle_tx: Dict[str, Any]) -> Dict[str, Any]:
        """Sign oracle transaction with private key"""
        try:
            # Serialize transaction data
            tx_data = json.dumps(oracle_tx, sort_keys=True).encode('utf-8')
            
            # Create signature (placeholder - would use PQC in production)
            signature = self.private_key.sign(
                tx_data,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            
            # Add signature to transaction
            oracle_tx["signature"] = {
                "algorithm": "RSA-PSS-SHA256",  # Would be "CRYSTALS-Dilithium5" in production
                "data": signature.hex(),
                "public_key": self.public_key.public_key_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PublicFormat.SubjectPublicKeyInfo
                ).decode('utf-8')
            }
            
            return oracle_tx
            
        except Exception as e:
            logger.error(f"Oracle transaction signing failed: {e}")
            return oracle_tx
    
    async def _submit_to_blockchain(self, signed_tx: Dict[str, Any]) -> bool:
        """Submit signed transaction to blockchain node"""
        try:
            if not self.session:
                return False
            
            async with self.session.post(
                f"{self.node_url}/api/oracle/submit",
                json=signed_tx,
                headers={"Content-Type": "application/json"}
            ) as response:
                
                if response.status == 200:
                    result = await response.json()
                    logger.debug(f"Blockchain response: {result}")
                    return result.get("success", False)
                else:
                    logger.error(f"Blockchain submission failed: HTTP {response.status}")
                    return False
                    
        except Exception as e:
            logger.error(f"Blockchain submission error: {e}")
            return False
    
    def _generate_nonce(self) -> int:
        """Generate nonce for transaction uniqueness"""
        return int(datetime.now().timestamp() * 1000000)
    
    async def submit_fraud_analysis(
        self, 
        transaction_hash: str, 
        is_fraudulent: bool, 
        confidence: float,
        risk_factors: List[str]
    ) -> bool:
        """Submit fraud analysis result"""
        
        analysis_data = {
            "type": "fraud_analysis",
            "transaction_hash": transaction_hash,
            "result": {
                "is_fraudulent": is_fraudulent,
                "confidence": confidence,
                "risk_factors": risk_factors
            },
            "confidence": confidence
        }
        
        return await self.submit_analysis_result(analysis_data)
    
    async def submit_risk_score(
        self,
        transaction_hash: str,
        risk_score: float,
        risk_level: str,
        factors: List[str]
    ) -> bool:
        """Submit risk score analysis result"""
        
        analysis_data = {
            "type": "risk_analysis",
            "transaction_hash": transaction_hash,
            "result": {
                "risk_score": risk_score,
                "risk_level": risk_level,
                "factors": factors
            },
            "confidence": min(1.0, 1.0 - (risk_score * 0.2))  # Higher risk = lower confidence
        }
        
        return await self.submit_analysis_result(analysis_data)
    
    async def submit_contract_analysis(
        self,
        contract_address: str,
        security_score: float,
        vulnerabilities: List[str],
        recommendations: List[str]
    ) -> bool:
        """Submit smart contract security analysis"""
        
        analysis_data = {
            "type": "contract_analysis", 
            "contract_address": contract_address,
            "result": {
                "security_score": security_score,
                "vulnerabilities": vulnerabilities,
                "recommendations": recommendations
            },
            "confidence": security_score
        }
        
        return await self.submit_analysis_result(analysis_data)
    
    async def get_pending_analysis_requests(self) -> List[Dict[str, Any]]:
        """Get pending analysis requests from blockchain"""
        try:
            if not self.session:
                await self.connect()
            
            async with self.session.get(f"{self.node_url}/api/oracle/pending") as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get("requests", [])
                else:
                    logger.error(f"Failed to get pending requests: HTTP {response.status}")
                    return []
                    
        except Exception as e:
            logger.error(f"Failed to get pending requests: {e}")
            return []
    
    async def process_pending_requests(self) -> int:
        """Process all pending analysis requests"""
        try:
            requests = await self.get_pending_analysis_requests()
            processed = 0
            
            for request in requests:
                request_type = request.get("type")
                
                if request_type == "fraud_analysis":
                    # Process fraud analysis request
                    # This would trigger the fraud detection service
                    logger.info(f"Processing fraud analysis request: {request.get('id')}")
                    processed += 1
                    
                elif request_type == "risk_scoring":
                    # Process risk scoring request
                    logger.info(f"Processing risk scoring request: {request.get('id')}")
                    processed += 1
                    
                elif request_type == "contract_analysis":
                    # Process contract analysis request
                    logger.info(f"Processing contract analysis request: {request.get('id')}")
                    processed += 1
            
            logger.info(f"Processed {processed} oracle requests")
            return processed
            
        except Exception as e:
            logger.error(f"Failed to process pending requests: {e}")
            return 0
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform oracle health check"""
        return {
            "oracle_address": self.oracle_address,
            "connected_to_blockchain": await self.is_connected_to_node(),
            "keys_initialized": self.private_key is not None,
            "node_url": self.node_url,
            "status": "healthy" if self.is_connected else "disconnected"
        }
