#!/usr/bin/env python3
"""
Locust-based Load Testing for Dytallix Testnet
Simulates high-volume transaction throughput and WebSocket connections
"""

import json
import random
import time
import uuid
from typing import Dict, Any, Optional
import logging

from locust import HttpUser, task, between, events
from locust.contrib.fasthttp import FastHttpUser

# Optional WebSocket support
try:
    import websocket
    HAS_WEBSOCKET = True
except ImportError:
    HAS_WEBSOCKET = False
    logging.warning("WebSocket support not available - install websocket-client for WebSocket testing")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DytallixTestnetUser(FastHttpUser):
    """
    Locust user class for Dytallix testnet load testing
    Simulates realistic user behavior with transaction submission and monitoring
    """
    
    # Wait time between tasks (1-3 seconds to simulate realistic usage)
    wait_time = between(1, 3)
    
    # Testnet API configuration
    host = "https://testnet-api.dytallix.io"
    
    def on_start(self):
        """Initialize user session and authenticate if needed"""
        self.session_id = str(uuid.uuid4())
        self.transaction_count = 0
        self.websocket_conn = None
        
        # Initialize WebSocket connection for real-time monitoring
        if HAS_WEBSOCKET:
            try:
                self.connect_websocket()
            except Exception as e:
                logger.warning(f"Failed to connect WebSocket: {e}")
        else:
            logger.info("WebSocket support not available - skipping WebSocket connection")
    
    def on_stop(self):
        """Clean up resources when user stops"""
        if self.websocket_conn:
            try:
                self.websocket_conn.close()
            except:
                pass
    
    def connect_websocket(self):
        """Connect to WebSocket for real-time updates"""
        ws_url = "wss://testnet-api.dytallix.io/ws"
        
        def on_message(ws, message):
            # Process real-time messages
            try:
                data = json.loads(message)
                logger.debug(f"WebSocket message: {data}")
            except:
                pass
        
        def on_error(ws, error):
            logger.warning(f"WebSocket error: {error}")
        
        self.websocket_conn = websocket.WebSocketApp(
            ws_url,
            on_message=on_message,
            on_error=on_error
        )
    
    @task(5)
    def get_status(self):
        """Check node status - high frequency task"""
        with self.client.get("/status", catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                if "status" in data:
                    response.success()
                else:
                    response.failure("Missing status field")
            else:
                response.failure(f"Status check failed: {response.status_code}")
    
    @task(4)
    def get_blocks(self):
        """Fetch recent blocks"""
        limit = random.randint(1, 10)
        with self.client.get(f"/blocks?limit={limit}", catch_response=True) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    if isinstance(data, list):
                        response.success()
                    else:
                        response.failure("Invalid blocks format")
                except:
                    response.failure("Invalid JSON response")
            else:
                response.failure(f"Blocks fetch failed: {response.status_code}")
    
    @task(4)
    def get_transactions(self):
        """Fetch recent transactions"""
        limit = random.randint(1, 20)
        with self.client.get(f"/transactions?limit={limit}", catch_response=True) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    if isinstance(data, list):
                        response.success()
                    else:
                        response.failure("Invalid transactions format")
                except:
                    response.failure("Invalid JSON response")
            else:
                response.failure(f"Transactions fetch failed: {response.status_code}")
    
    @task(3)
    def get_peers(self):
        """Check peer connectivity"""
        with self.client.get("/peers", catch_response=True) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    if "peers" in data or isinstance(data, list):
                        response.success()
                    else:
                        response.failure("Invalid peers format")
                except:
                    response.failure("Invalid JSON response")
            else:
                response.failure(f"Peers check failed: {response.status_code}")
    
    @task(3)
    def get_network_stats(self):
        """Fetch network statistics"""
        with self.client.get("/stats", catch_response=True) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    if "network" in data or "transactions_per_second" in data:
                        response.success()
                    else:
                        response.failure("Invalid stats format")
                except:
                    response.failure("Invalid JSON response")
            else:
                response.failure(f"Stats fetch failed: {response.status_code}")
    
    @task(2)
    def submit_transaction(self):
        """Submit a test transaction"""
        self.transaction_count += 1
        
        # Generate test transaction data
        transaction_data = {
            "from": f"test_user_{self.session_id}",
            "to": f"test_recipient_{random.randint(1, 1000)}",
            "amount": random.randint(1, 10000),
            "fee": random.randint(1, 100),
            "nonce": self.transaction_count,
            "timestamp": time.time(),
            "type": "transfer",
            "pqc_signature": self.generate_mock_pqc_signature()
        }
        
        with self.client.post("/submit", 
                             json=transaction_data, 
                             catch_response=True) as response:
            if response.status_code in [200, 201, 202]:
                try:
                    data = response.json()
                    if "transaction_id" in data or "hash" in data:
                        response.success()
                        # Track successful transaction submission
                        events.request.fire(
                            request_type="TRANSACTION", 
                            name="submit_success",
                            response_time=response.elapsed.total_seconds() * 1000,
                            response_length=len(response.content)
                        )
                    else:
                        response.failure("Missing transaction ID")
                except:
                    response.failure("Invalid JSON response")
            else:
                response.failure(f"Transaction submission failed: {response.status_code}")
    
    @task(1)
    def check_balance(self):
        """Check balance for a test address"""
        test_address = f"test_address_{random.randint(1, 100)}"
        with self.client.get(f"/balance/{test_address}", catch_response=True) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    if "balance" in data:
                        response.success()
                    else:
                        response.failure("Missing balance field")
                except:
                    response.failure("Invalid JSON response")
            elif response.status_code == 404:
                # Address not found is acceptable
                response.success()
            else:
                response.failure(f"Balance check failed: {response.status_code}")
    
    @task(1)
    def get_transaction_details(self):
        """Fetch details for a specific transaction"""
        # Use a mock transaction hash
        tx_hash = f"mock_tx_hash_{random.randint(1, 1000)}"
        with self.client.get(f"/transaction/{tx_hash}", catch_response=True) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    if "hash" in data or "transaction_id" in data:
                        response.success()
                    else:
                        response.failure("Invalid transaction format")
                except:
                    response.failure("Invalid JSON response")
            elif response.status_code == 404:
                # Transaction not found is acceptable for random hashes
                response.success()
            else:
                response.failure(f"Transaction fetch failed: {response.status_code}")
    
    def generate_mock_pqc_signature(self) -> Dict[str, Any]:
        """Generate mock PQC signature for testing"""
        algorithms = ["dilithium5", "falcon1024", "sphincs256"]
        algorithm = random.choice(algorithms)
        
        return {
            "algorithm": algorithm,
            "signature": f"mock_signature_{algorithm}_{uuid.uuid4().hex[:16]}",
            "public_key": f"mock_pubkey_{algorithm}_{uuid.uuid4().hex[:32]}",
            "timestamp": time.time()
        }

class WebSocketStressUser(HttpUser):
    """
    Specialized user for WebSocket connection stress testing
    Maintains persistent WebSocket connections and monitors real-time data
    """
    
    wait_time = between(0.5, 2)
    host = "https://testnet-api.dytallix.io"
    
    def on_start(self):
        """Initialize WebSocket connections"""
        self.websocket_connections = []
        self.connected_sockets = 0
        self.target_connections = random.randint(1, 5)  # Each user maintains 1-5 connections
        
        for i in range(self.target_connections):
            try:
                self.create_websocket_connection(i)
            except Exception as e:
                logger.warning(f"Failed to create WebSocket connection {i}: {e}")
    
    def on_stop(self):
        """Clean up WebSocket connections"""
        for ws in self.websocket_connections:
            try:
                ws.close()
            except:
                pass
    
    def create_websocket_connection(self, connection_id: int):
        """Create a single WebSocket connection"""
        ws_url = "wss://testnet-api.dytallix.io/ws"
        
        def on_open(ws):
            self.connected_sockets += 1
            logger.debug(f"WebSocket {connection_id} connected")
            
            # Send subscription messages
            ws.send(json.dumps({
                "type": "subscribe",
                "channels": ["blocks", "transactions", "network_stats"]
            }))
        
        def on_message(ws, message):
            try:
                data = json.loads(message)
                # Track WebSocket message received
                events.request.fire(
                    request_type="WEBSOCKET",
                    name="message_received",
                    response_time=0,
                    response_length=len(message)
                )
            except:
                pass
        
        def on_error(ws, error):
            logger.warning(f"WebSocket {connection_id} error: {error}")
            events.request.fire(
                request_type="WEBSOCKET",
                name="connection_error",
                response_time=0,
                response_length=0,
                exception=Exception(str(error))
            )
        
        def on_close(ws, close_status_code, close_reason):
            self.connected_sockets -= 1
            logger.debug(f"WebSocket {connection_id} closed: {close_reason}")
        
        ws = websocket.WebSocketApp(
            ws_url,
            on_open=on_open,
            on_message=on_message,
            on_error=on_error,
            on_close=on_close
        )
        
        self.websocket_connections.append(ws)
        
        # Start WebSocket in a separate thread
        import threading
        thread = threading.Thread(target=ws.run_forever)
        thread.daemon = True
        thread.start()
    
    @task
    def monitor_connections(self):
        """Monitor WebSocket connection health"""
        # Check if we need to reconnect any failed connections
        if self.connected_sockets < self.target_connections:
            try:
                missing_connections = self.target_connections - self.connected_sockets
                for i in range(missing_connections):
                    self.create_websocket_connection(len(self.websocket_connections) + i)
            except Exception as e:
                logger.warning(f"Failed to reconnect WebSocket: {e}")
        
        # Simulate some HTTP requests to maintain load
        self.client.get("/status")

class HighVolumeTransactionUser(FastHttpUser):
    """
    User focused specifically on high-volume transaction submission
    Targets 1000+ TPS goal
    """
    
    wait_time = between(0.1, 0.5)  # Very aggressive timing
    host = "https://testnet-api.dytallix.io"
    
    @task(10)
    def rapid_transaction_submission(self):
        """Submit transactions as fast as possible"""
        transaction_data = {
            "from": f"high_volume_user_{uuid.uuid4().hex[:8]}",
            "to": f"recipient_{random.randint(1, 1000)}",
            "amount": random.randint(1, 1000),
            "fee": 10,
            "nonce": int(time.time() * 1000000) % 1000000,  # Microsecond-based nonce
            "type": "transfer"
        }
        
        self.client.post("/submit", json=transaction_data)
    
    @task(1)
    def check_status(self):
        """Occasionally check system status"""
        self.client.get("/status")

# Custom event handlers for detailed metrics
@events.request.on
def request_handler(request_type, name, response_time, response_length, exception, **kwargs):
    """Custom request handler for detailed metrics collection"""
    if exception:
        logger.debug(f"Request failed: {request_type} {name} - {exception}")
    else:
        logger.debug(f"Request success: {request_type} {name} - {response_time}ms")

@events.test_start.on
def on_test_start(environment, **kwargs):
    """Initialize test environment"""
    logger.info("🚀 Starting Dytallix Testnet Load Test")
    logger.info(f"Target host: {environment.host}")
    logger.info(f"User count: {environment.runner.target_user_count}")

@events.test_stop.on
def on_test_stop(environment, **kwargs):
    """Finalize test and save results"""
    logger.info("🏁 Dytallix Testnet Load Test Completed")
    
    # Save detailed test results
    stats = environment.runner.stats
    
    results = {
        "test_duration": time.time() - environment.runner.start_time,
        "total_requests": stats.total.num_requests,
        "failed_requests": stats.total.num_failures,
        "requests_per_second": stats.total.current_rps,
        "average_response_time": stats.total.avg_response_time,
        "max_response_time": stats.total.max_response_time,
        "min_response_time": stats.total.min_response_time,
        "endpoints": {}
    }
    
    # Collect per-endpoint statistics
    for name, entry in stats.entries.items():
        if entry.num_requests > 0:
            results["endpoints"][name] = {
                "requests": entry.num_requests,
                "failures": entry.num_failures,
                "avg_response_time": entry.avg_response_time,
                "min_response_time": entry.min_response_time,
                "max_response_time": entry.max_response_time,
                "requests_per_second": entry.current_rps,
                "failure_rate": entry.num_failures / entry.num_requests if entry.num_requests > 0 else 0
            }
    
    # Save results to file
    results_file = f"locust_results_{int(time.time())}.json"
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    logger.info(f"📊 Test results saved to: {results_file}")
    logger.info(f"📈 Total RPS achieved: {stats.total.current_rps:.2f}")
    logger.info(f"⏱️ Average response time: {stats.total.avg_response_time:.2f}ms")
    logger.info(f"✅ Success rate: {((stats.total.num_requests - stats.total.num_failures) / stats.total.num_requests * 100):.2f}%")

if __name__ == "__main__":
    # This file can be run directly with Locust
    # Example: locust -f locust_load_test.py --host=https://testnet-api.dytallix.io
    pass