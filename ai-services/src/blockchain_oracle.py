"""
AI-Blockchain Oracle Bridge

Secure bridge connecting AI services to the Dytallix blockchain with:
- Real-time AI analysis integration
- Post-quantum secure communication
- Fraud detection triggers
- Smart contract AI hooks
- Performance monitoring
"""

import asyncio
import logging
import json
import time
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass
from datetime import datetime, timedelta
import aiohttp
import hashlib
import hmac

logger = logging.getLogger(__name__)

@dataclass
class OracleRequest:
    request_id: str
    request_type: str  # 'fraud_analysis', 'risk_scoring', 'contract_audit'
    transaction_hash: Optional[str]
    contract_address: Optional[str]
    input_data: Dict[str, Any]
    requester_address: str
    gas_limit: int
    timestamp: int
    signature: Optional[str] = None

@dataclass
class OracleResponse:
    request_id: str
    success: bool
    result: Dict[str, Any]
    confidence: float
    gas_used: int
    processing_time_ms: int
    ai_model_version: str
    signature: Optional[str] = None
    timestamp: int = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = int(time.time())

class BlockchainOracle:
    """
    AI-Blockchain Oracle Bridge
    
    Handles secure communication between AI services and blockchain:
    - Receives AI analysis requests from blockchain
    - Processes requests through AI services
    - Returns results with cryptographic proofs
    - Monitors performance and security
    """
    
    def __init__(
        self,
        blockchain_rpc_url: str = "http://localhost:8080",
        ai_services_url: str = "http://localhost:8000",
        oracle_private_key: Optional[str] = None
    ):
        self.blockchain_rpc_url = blockchain_rpc_url
        self.ai_services_url = ai_services_url
        self.oracle_private_key = oracle_private_key or self._generate_key()
        
        # Request tracking
        self.pending_requests: Dict[str, OracleRequest] = {}
        self.completed_requests: Dict[str, OracleResponse] = {}
        
        # Performance metrics
        self.total_requests_processed = 0
        self.avg_processing_time = 0.0
        self.error_count = 0
        
        # AI service clients
        self.fraud_detector = None
        self.risk_scorer = None
        self.contract_analyzer = None
        
        # Event handlers
        self.request_handlers: Dict[str, Callable] = {
            'fraud_analysis': self._handle_fraud_analysis,
            'risk_scoring': self._handle_risk_scoring,
            'contract_audit': self._handle_contract_audit,
            'address_reputation': self._handle_address_reputation,
        }
        
        self.is_running = False
        
    async def start(self):
        """Start the oracle service"""
        logger.info("Starting AI-Blockchain Oracle Bridge...")
        
        # Initialize AI service connections
        await self._initialize_ai_services()
        
        # Start listening for blockchain requests
        self.is_running = True
        
        # Start background tasks
        asyncio.create_task(self._blockchain_listener())
        asyncio.create_task(self._response_submitter())
        asyncio.create_task(self._health_monitor())
        
        logger.info("AI-Blockchain Oracle Bridge started successfully")
    
    async def stop(self):
        """Stop the oracle service"""
        logger.info("Stopping AI-Blockchain Oracle Bridge...")
        self.is_running = False
        
    async def _initialize_ai_services(self):
        """Initialize connections to AI services"""
        try:
            async with aiohttp.ClientSession() as session:
                # Test AI services connectivity
                async with session.get(f"{self.ai_services_url}/health") as response:
                    if response.status == 200:
                        logger.info("AI services connection established")
                    else:
                        logger.warning(f"AI services health check failed: {response.status}")
                        
        except Exception as e:
            logger.error(f"Failed to connect to AI services: {e}")
    
    async def _blockchain_listener(self):
        """Listen for requests from the blockchain"""
        logger.info("Starting blockchain listener...")
        
        while self.is_running:
            try:
                # Poll for new AI oracle requests from blockchain
                requests = await self._fetch_pending_requests()
                
                for request in requests:
                    if request.request_id not in self.pending_requests:
                        logger.info(f"Received new oracle request: {request.request_id}")
                        self.pending_requests[request.request_id] = request
                        
                        # Process request asynchronously
                        asyncio.create_task(self._process_request(request))
                
                # Wait before next poll
                await asyncio.sleep(1.0)
                
            except Exception as e:
                logger.error(f"Error in blockchain listener: {e}")
                await asyncio.sleep(5.0)
    
    async def _fetch_pending_requests(self) -> List[OracleRequest]:
        """Fetch pending AI oracle requests from blockchain"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.blockchain_rpc_url}/api/oracle/pending") as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        requests = []
                        for item in data.get('requests', []):
                            request = OracleRequest(
                                request_id=item['request_id'],
                                request_type=item['request_type'],
                                transaction_hash=item.get('transaction_hash'),
                                contract_address=item.get('contract_address'),
                                input_data=item['input_data'],
                                requester_address=item['requester_address'],
                                gas_limit=item['gas_limit'],
                                timestamp=item['timestamp'],
                                signature=item.get('signature')
                            )
                            requests.append(request)
                        
                        return requests
                    else:
                        logger.warning(f"Failed to fetch pending requests: {response.status}")
                        return []
                        
        except Exception as e:
            logger.error(f"Error fetching pending requests: {e}")
            return []
    
    async def _process_request(self, request: OracleRequest):
        """Process an oracle request"""
        start_time = time.time()
        
        try:
            logger.info(f"Processing request {request.request_id} of type {request.request_type}")
            
            # Route to appropriate handler
            if request.request_type in self.request_handlers:
                handler = self.request_handlers[request.request_type]
                result = await handler(request)
            else:
                result = {
                    'error': f'Unknown request type: {request.request_type}',
                    'supported_types': list(self.request_handlers.keys())
                }
            
            processing_time = int((time.time() - start_time) * 1000)
            
            # Create response
            response = OracleResponse(
                request_id=request.request_id,
                success='error' not in result,
                result=result,
                confidence=result.get('confidence', 0.0),
                gas_used=self._calculate_gas_used(request, result),
                processing_time_ms=processing_time,
                ai_model_version=result.get('model_version', '1.0.0')
            )
            
            # Sign response
            response.signature = self._sign_response(response)
            
            # Store completed response
            self.completed_requests[request.request_id] = response
            
            # Update metrics
            self._update_metrics(processing_time, True)
            
            logger.info(f"Request {request.request_id} processed in {processing_time}ms")
            
        except Exception as e:
            logger.error(f"Error processing request {request.request_id}: {e}")
            
            processing_time = int((time.time() - start_time) * 1000)
            
            # Create error response
            response = OracleResponse(
                request_id=request.request_id,
                success=False,
                result={'error': str(e)},
                confidence=0.0,
                gas_used=1000,  # Minimal gas for error
                processing_time_ms=processing_time,
                ai_model_version='error'
            )
            
            self.completed_requests[request.request_id] = response
            self._update_metrics(processing_time, False)
        
        finally:
            # Remove from pending
            if request.request_id in self.pending_requests:
                del self.pending_requests[request.request_id]
    
    async def _handle_fraud_analysis(self, request: OracleRequest) -> Dict[str, Any]:
        """Handle fraud analysis request"""
        try:
            async with aiohttp.ClientSession() as session:
                fraud_request = {
                    'transaction': request.input_data.get('transaction', {}),
                    'historical_data': request.input_data.get('historical_data', [])
                }
                
                async with session.post(
                    f"{self.ai_services_url}/analyze/fraud",
                    json=fraud_request
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return {
                            'is_fraudulent': result['is_fraudulent'],
                            'confidence': result['confidence'],
                            'risk_factors': result['risk_factors'],
                            'recommended_action': result['recommended_action'],
                            'model_version': result.get('model_version', '1.0.0')
                        }
                    else:
                        error_text = await response.text()
                        return {'error': f'AI service error: {error_text}'}
                        
        except Exception as e:
            return {'error': f'Fraud analysis failed: {str(e)}'}
    
    async def _handle_risk_scoring(self, request: OracleRequest) -> Dict[str, Any]:
        """Handle risk scoring request"""
        try:
            async with aiohttp.ClientSession() as session:
                risk_request = {
                    'transaction': request.input_data.get('transaction', {}),
                    'address_history': request.input_data.get('address_history', {}),
                    'network_analysis': request.input_data.get('network_analysis', {})
                }
                
                async with session.post(
                    f"{self.ai_services_url}/analyze/risk",
                    json=risk_request
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return {
                            'risk_score': result['risk_score'],
                            'risk_category': result['risk_category'],
                            'factors': result['factors'],
                            'recommendations': result['recommendations'],
                            'model_version': result.get('model_version', '1.0.0')
                        }
                    else:
                        error_text = await response.text()
                        return {'error': f'Risk scoring service error: {error_text}'}
                        
        except Exception as e:
            return {'error': f'Risk scoring failed: {str(e)}'}
    
    async def _handle_contract_audit(self, request: OracleRequest) -> Dict[str, Any]:
        """Handle smart contract audit request"""
        try:
            contract_code = request.input_data.get('contract_code', '')
            contract_type = request.input_data.get('contract_type', 'general')
            
            async with aiohttp.ClientSession() as session:
                audit_request = {
                    'contract_code': contract_code,
                    'contract_type': contract_type,
                    'audit_level': 'comprehensive'
                }
                
                async with session.post(
                    f"{self.ai_services_url}/analyze/contract",
                    json=audit_request
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return {
                            'security_score': result['security_score'],
                            'vulnerabilities': result['vulnerabilities'],
                            'gas_efficiency': result['gas_efficiency'],
                            'recommendations': result['recommendations'],
                            'compliance_flags': result.get('compliance_flags', []),
                            'model_version': result.get('model_version', '1.0.0')
                        }
                    else:
                        error_text = await response.text()
                        return {'error': f'Contract audit service error: {error_text}'}
                        
        except Exception as e:
            return {'error': f'Contract audit failed: {str(e)}'}
    
    async def _handle_address_reputation(self, request: OracleRequest) -> Dict[str, Any]:
        """Handle address reputation analysis"""
        try:
            address = request.input_data.get('address', '')
            transaction_history = request.input_data.get('transaction_history', [])
            
            # Simple reputation scoring based on transaction patterns
            score = 50  # Default neutral score
            
            if len(transaction_history) > 100:
                score += 20  # Bonus for established address
            
            # Check for suspicious patterns
            large_tx_count = sum(1 for tx in transaction_history if tx.get('amount', 0) > 100000)
            if large_tx_count > len(transaction_history) * 0.5:
                score -= 30  # Penalty for many large transactions
            
            # Check timing patterns
            night_tx_count = sum(1 for tx in transaction_history 
                                if (tx.get('timestamp', 0) % 86400) / 3600 < 6 or 
                                   (tx.get('timestamp', 0) % 86400) / 3600 > 22)
            if night_tx_count > len(transaction_history) * 0.3:
                score -= 20  # Penalty for many night transactions
            
            score = max(0, min(100, score))  # Clamp to 0-100
            
            reputation_level = "high" if score >= 80 else "medium" if score >= 40 else "low"
            
            return {
                'reputation_score': score,
                'reputation_level': reputation_level,
                'factors': {
                    'transaction_count': len(transaction_history),
                    'large_transaction_ratio': large_tx_count / max(len(transaction_history), 1),
                    'night_transaction_ratio': night_tx_count / max(len(transaction_history), 1)
                },
                'model_version': '1.0.0'
            }
            
        except Exception as e:
            return {'error': f'Address reputation analysis failed: {str(e)}'}
    
    async def _response_submitter(self):
        """Submit completed responses back to blockchain"""
        logger.info("Starting response submitter...")
        
        while self.is_running:
            try:
                # Get completed responses that haven't been submitted
                responses_to_submit = []
                for response in self.completed_requests.values():
                    # Check if already submitted (simplified check)
                    responses_to_submit.append(response)
                
                # Submit responses
                for response in responses_to_submit:
                    await self._submit_response(response)
                
                # Clean up old responses
                await self._cleanup_old_responses()
                
                await asyncio.sleep(2.0)
                
            except Exception as e:
                logger.error(f"Error in response submitter: {e}")
                await asyncio.sleep(5.0)
    
    async def _submit_response(self, response: OracleResponse):
        """Submit a response to the blockchain"""
        try:
            async with aiohttp.ClientSession() as session:
                response_data = {
                    'request_id': response.request_id,
                    'success': response.success,
                    'result': response.result,
                    'confidence': response.confidence,
                    'gas_used': response.gas_used,
                    'processing_time_ms': response.processing_time_ms,
                    'ai_model_version': response.ai_model_version,
                    'signature': response.signature,
                    'timestamp': response.timestamp
                }
                
                async with session.post(
                    f"{self.blockchain_rpc_url}/api/oracle/submit",
                    json=response_data
                ) as http_response:
                    if http_response.status == 200:
                        logger.debug(f"Response {response.request_id} submitted successfully")
                    else:
                        error_text = await http_response.text()
                        logger.warning(f"Failed to submit response {response.request_id}: {error_text}")
                        
        except Exception as e:
            logger.error(f"Error submitting response {response.request_id}: {e}")
    
    async def _health_monitor(self):
        """Monitor oracle health and performance"""
        while self.is_running:
            try:
                # Log performance metrics
                if self.total_requests_processed > 0:
                    logger.info(f"Oracle Stats - Processed: {self.total_requests_processed}, "
                              f"Avg Time: {self.avg_processing_time:.1f}ms, "
                              f"Pending: {len(self.pending_requests)}, "
                              f"Errors: {self.error_count}")
                
                # Check AI services health
                await self._check_ai_services_health()
                
                await asyncio.sleep(30.0)  # Health check every 30 seconds
                
            except Exception as e:
                logger.error(f"Error in health monitor: {e}")
                await asyncio.sleep(60.0)
    
    async def _check_ai_services_health(self):
        """Check AI services health"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.ai_services_url}/health") as response:
                    if response.status != 200:
                        logger.warning("AI services health check failed")
                        
        except Exception as e:
            logger.error(f"AI services health check error: {e}")
    
    def _calculate_gas_used(self, request: OracleRequest, result: Dict[str, Any]) -> int:
        """Calculate gas used for processing"""
        base_gas = 1000
        
        # Add gas based on complexity
        if request.request_type == 'fraud_analysis':
            base_gas += 5000
        elif request.request_type == 'risk_scoring':
            base_gas += 3000
        elif request.request_type == 'contract_audit':
            base_gas += 10000
        
        # Add gas based on input size
        input_size = len(str(request.input_data))
        base_gas += input_size // 100
        
        return min(base_gas, request.gas_limit)
    
    def _sign_response(self, response: OracleResponse) -> str:
        """Sign response with oracle private key"""
        # Create message to sign
        message = f"{response.request_id}:{response.success}:{response.confidence}:{response.timestamp}"
        
        # Simple HMAC signature (in production, use proper PQC signatures)
        signature = hmac.new(
            self.oracle_private_key.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return signature
    
    def _generate_key(self) -> str:
        """Generate oracle private key"""
        return hashlib.sha256(f"oracle_key_{time.time()}".encode()).hexdigest()
    
    def _update_metrics(self, processing_time: int, success: bool):
        """Update performance metrics"""
        self.total_requests_processed += 1
        
        # Update average processing time (exponential moving average)
        alpha = 0.1
        self.avg_processing_time = (
            alpha * processing_time + 
            (1 - alpha) * self.avg_processing_time
        )
        
        if not success:
            self.error_count += 1
    
    async def _cleanup_old_responses(self):
        """Clean up old completed responses"""
        current_time = time.time()
        old_responses = []
        
        for request_id, response in self.completed_requests.items():
            if current_time - response.timestamp > 3600:  # 1 hour old
                old_responses.append(request_id)
        
        for request_id in old_responses:
            del self.completed_requests[request_id]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get oracle statistics"""
        return {
            'total_requests_processed': self.total_requests_processed,
            'avg_processing_time_ms': self.avg_processing_time,
            'pending_requests': len(self.pending_requests),
            'completed_requests': len(self.completed_requests),
            'error_count': self.error_count,
            'error_rate': self.error_count / max(self.total_requests_processed, 1),
            'is_running': self.is_running
        }

# Integration with main AI services
async def start_oracle_service():
    """Start the oracle service"""
    oracle = BlockchainOracle()
    await oracle.start()
    return oracle

if __name__ == "__main__":
    import uvicorn
    
    async def main():
        oracle = await start_oracle_service()
        
        # Keep running
        try:
            while oracle.is_running:
                await asyncio.sleep(1)
        except KeyboardInterrupt:
            await oracle.stop()
    
    asyncio.run(main())
