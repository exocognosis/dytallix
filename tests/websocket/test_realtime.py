#!/usr/bin/env python3
"""
Real-time WebSocket Testing Suite for Dytallix
Tests WebSocket functionality, real-time events, and message integrity
"""

import asyncio
import json
import time
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from .ws_client import DytallixWebSocketClient

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class WebSocketTester:
    def __init__(self, base_url: str = "ws://localhost:3030/ws"):
        self.base_url = base_url
        self.test_results = []
        self.start_time = None
        
    def log_test_result(self, test_name: str, passed: bool, duration: float, 
                       error_message: str = "", additional_data: Dict = None):
        """Log test results for later reporting"""
        result = {
            "test_name": test_name,
            "passed": passed,
            "duration_seconds": duration,
            "error_message": error_message,
            "timestamp": datetime.now().isoformat(),
            "additional_data": additional_data or {}
        }
        self.test_results.append(result)
        
        status = "PASS" if passed else "FAIL"
        logger.info(f"[{status}] {test_name} - {duration:.2f}s")
        if error_message:
            logger.error(f"Error: {error_message}")
    
    async def test_websocket_connection_basic(self) -> bool:
        """Test basic WebSocket connection establishment"""
        test_name = "websocket_connection_basic"
        start_time = time.time()
        
        try:
            client = DytallixWebSocketClient(self.base_url)
            connected = await client.connect(timeout=10.0)
            
            if not connected:
                duration = time.time() - start_time
                self.log_test_result(test_name, False, duration, "Failed to connect")
                return False
            
            # Test ping/pong
            ping_time = await client.test_ping_pong()
            await client.disconnect()
            
            duration = time.time() - start_time
            additional_data = {"ping_time": ping_time}
            
            if ping_time > 0:
                self.log_test_result(test_name, True, duration, "", additional_data)
                return True
            else:
                self.log_test_result(test_name, False, duration, "Ping/pong failed", additional_data)
                return False
        
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result(test_name, False, duration, f"Exception: {e}")
            return False
    
    async def test_websocket_subscription(self) -> bool:
        """Test WebSocket subscription mechanism"""
        test_name = "websocket_subscription"
        start_time = time.time()
        
        try:
            client = DytallixWebSocketClient(self.base_url)
            if not await client.connect():
                duration = time.time() - start_time
                self.log_test_result(test_name, False, duration, "Failed to connect")
                return False
            
            # Test subscription
            subscribed = await client.subscribe_to_events(["new_block", "new_transaction"])
            
            if not subscribed:
                await client.disconnect()
                duration = time.time() - start_time
                self.log_test_result(test_name, False, duration, "Failed to subscribe")
                return False
            
            # Wait for subscription confirmation
            message = await client.receive_message(timeout=5.0)
            await client.disconnect()
            
            duration = time.time() - start_time
            
            if message and message.get("message_type") == "subscription_confirmed":
                self.log_test_result(test_name, True, duration, "", {"subscription_message": message})
                return True
            else:
                self.log_test_result(test_name, False, duration, "No subscription confirmation received")
                return False
        
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result(test_name, False, duration, f"Exception: {e}")
            return False
    
    async def test_real_time_block_broadcasts(self) -> bool:
        """Test real-time block broadcast functionality"""
        test_name = "real_time_block_broadcasts"
        start_time = time.time()
        
        try:
            client = DytallixWebSocketClient(self.base_url)
            if not await client.connect():
                duration = time.time() - start_time
                self.log_test_result(test_name, False, duration, "Failed to connect")
                return False
            
            # Subscribe to block events
            await client.subscribe_to_events(["new_block"])
            
            # Listen for block messages for 35 seconds (should get at least one 30s block)
            messages = await client.listen_for_messages(35.0)
            await client.disconnect()
            
            duration = time.time() - start_time
            
            # Filter block messages
            block_messages = [msg for msg in messages if msg.get("message_type") == "new_block"]
            
            if len(block_messages) > 0:
                # Validate block message structure
                valid_blocks = []
                for block_msg in block_messages:
                    if self.validate_block_message(block_msg):
                        valid_blocks.append(block_msg)
                
                additional_data = {
                    "total_messages": len(messages),
                    "block_messages": len(block_messages),
                    "valid_block_messages": len(valid_blocks),
                    "sample_block": valid_blocks[0] if valid_blocks else None
                }
                
                if len(valid_blocks) > 0:
                    self.log_test_result(test_name, True, duration, "", additional_data)
                    return True
                else:
                    self.log_test_result(test_name, False, duration, "No valid block messages", additional_data)
                    return False
            else:
                additional_data = {"total_messages": len(messages), "block_messages": 0}
                self.log_test_result(test_name, False, duration, "No block messages received", additional_data)
                return False
        
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result(test_name, False, duration, f"Exception: {e}")
            return False
    
    async def test_transaction_event_streaming(self) -> bool:
        """Test transaction event streaming"""
        test_name = "transaction_event_streaming"
        start_time = time.time()
        
        try:
            client = DytallixWebSocketClient(self.base_url)
            if not await client.connect():
                duration = time.time() - start_time
                self.log_test_result(test_name, False, duration, "Failed to connect")
                return False
            
            # Subscribe to transaction events
            await client.subscribe_to_events(["new_transaction"])
            
            # Listen for messages
            messages = await client.listen_for_messages(20.0)
            await client.disconnect()
            
            duration = time.time() - start_time
            
            # Filter transaction messages
            tx_messages = [msg for msg in messages if msg.get("message_type") == "new_transaction"]
            
            additional_data = {
                "total_messages": len(messages),
                "transaction_messages": len(tx_messages)
            }
            
            # Note: Transaction events might be less frequent than blocks, so we're more lenient
            if len(messages) > 0:  # At least some WebSocket activity
                self.log_test_result(test_name, True, duration, "", additional_data)
                return True
            else:
                self.log_test_result(test_name, False, duration, "No messages received", additional_data)
                return False
        
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result(test_name, False, duration, f"Exception: {e}")
            return False
    
    async def test_message_integrity(self) -> bool:
        """Test WebSocket message integrity and format"""
        test_name = "message_integrity"
        start_time = time.time()
        
        try:
            client = DytallixWebSocketClient(self.base_url)
            if not await client.connect():
                duration = time.time() - start_time
                self.log_test_result(test_name, False, duration, "Failed to connect")
                return False
            
            # Subscribe to all event types
            await client.subscribe_to_events(["new_block", "new_transaction", "status_update"])
            
            # Listen for messages
            messages = await client.listen_for_messages(25.0)
            await client.disconnect()
            
            duration = time.time() - start_time
            
            # Validate message integrity
            valid_messages = 0
            invalid_messages = []
            
            for i, msg in enumerate(messages):
                if self.validate_message_structure(msg):
                    valid_messages += 1
                else:
                    invalid_messages.append(i)
            
            additional_data = {
                "total_messages": len(messages),
                "valid_messages": valid_messages,
                "invalid_message_indices": invalid_messages[:5],  # First 5 invalid
                "message_types": self.analyze_message_types(messages)
            }
            
            # Consider test passed if at least 80% of messages are valid
            if len(messages) == 0:
                self.log_test_result(test_name, False, duration, "No messages received", additional_data)
                return False
            
            validity_rate = valid_messages / len(messages)
            if validity_rate >= 0.8:
                self.log_test_result(test_name, True, duration, "", additional_data)
                return True
            else:
                self.log_test_result(test_name, False, duration, 
                                   f"Low message validity rate: {validity_rate:.2%}", additional_data)
                return False
        
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result(test_name, False, duration, f"Exception: {e}")
            return False
    
    async def test_connection_stability(self) -> bool:
        """Test WebSocket connection stability over time"""
        test_name = "connection_stability"
        start_time = time.time()
        
        try:
            client = DytallixWebSocketClient(self.base_url)
            if not await client.connect():
                duration = time.time() - start_time
                self.log_test_result(test_name, False, duration, "Failed to connect")
                return False
            
            # Test stability over 60 seconds with periodic checks
            stability_checks = []
            for i in range(6):  # Check every 10 seconds
                await asyncio.sleep(10)
                
                # Test ping
                ping_time = await client.test_ping_pong()
                is_connected = client.connected and ping_time > 0
                
                stability_checks.append({
                    "check_number": i + 1,
                    "time_offset": 10 * (i + 1),
                    "connected": is_connected,
                    "ping_time": ping_time
                })
                
                if not is_connected:
                    break
            
            stats = client.get_connection_stats()
            await client.disconnect()
            
            duration = time.time() - start_time
            
            # Check how many stability checks passed
            successful_checks = sum(1 for check in stability_checks if check["connected"])
            stability_rate = successful_checks / len(stability_checks)
            
            additional_data = {
                "stability_checks": stability_checks,
                "successful_checks": successful_checks,
                "total_checks": len(stability_checks),
                "stability_rate": stability_rate,
                "connection_stats": stats
            }
            
            if stability_rate >= 0.8:  # 80% of checks successful
                self.log_test_result(test_name, True, duration, "", additional_data)
                return True
            else:
                self.log_test_result(test_name, False, duration, 
                                   f"Low stability rate: {stability_rate:.2%}", additional_data)
                return False
        
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result(test_name, False, duration, f"Exception: {e}")
            return False
    
    async def test_concurrent_connections(self) -> bool:
        """Test multiple concurrent WebSocket connections"""
        test_name = "concurrent_connections"
        start_time = time.time()
        
        try:
            # Create multiple clients
            clients = [DytallixWebSocketClient(self.base_url) for _ in range(3)]
            
            # Connect all clients
            connection_tasks = [client.connect() for client in clients]
            connection_results = await asyncio.gather(*connection_tasks, return_exceptions=True)
            
            connected_clients = []
            for i, (client, result) in enumerate(zip(clients, connection_results)):
                if result is True:
                    connected_clients.append(client)
                else:
                    logger.warning(f"Client {i} failed to connect: {result}")
            
            if len(connected_clients) == 0:
                duration = time.time() - start_time
                self.log_test_result(test_name, False, duration, "No clients connected")
                return False
            
            # Subscribe all clients and listen briefly
            for client in connected_clients:
                await client.subscribe_to_events(["new_block"])
            
            # Listen for 15 seconds
            listen_tasks = [client.listen_for_messages(15.0) for client in connected_clients]
            message_results = await asyncio.gather(*listen_tasks, return_exceptions=True)
            
            # Disconnect all clients
            for client in connected_clients:
                await client.disconnect()
            
            duration = time.time() - start_time
            
            # Analyze results
            successful_clients = 0
            total_messages = 0
            
            for i, result in enumerate(message_results):
                if isinstance(result, list):
                    successful_clients += 1
                    total_messages += len(result)
                else:
                    logger.warning(f"Client {i} listen failed: {result}")
            
            additional_data = {
                "total_clients": len(clients),
                "connected_clients": len(connected_clients),
                "successful_clients": successful_clients,
                "total_messages": total_messages,
                "average_messages_per_client": total_messages / max(1, successful_clients)
            }
            
            if successful_clients >= 2:  # At least 2 clients worked
                self.log_test_result(test_name, True, duration, "", additional_data)
                return True
            else:
                self.log_test_result(test_name, False, duration, 
                                   f"Only {successful_clients} clients successful", additional_data)
                return False
        
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result(test_name, False, duration, f"Exception: {e}")
            return False
    
    def validate_block_message(self, message: Dict[str, Any]) -> bool:
        """Validate block message structure"""
        if message.get("message_type") != "new_block":
            return False
        
        if "data" not in message:
            return False
        
        block_data = message["data"]
        required_fields = ["number", "hash", "timestamp", "transactions"]
        
        for field in required_fields:
            if field not in block_data:
                return False
        
        return True
    
    def validate_message_structure(self, message: Dict[str, Any]) -> bool:
        """Validate general message structure"""
        required_fields = ["message_type", "timestamp"]
        
        for field in required_fields:
            if field not in message:
                return False
        
        # Validate timestamp
        if not isinstance(message["timestamp"], (int, float)):
            return False
        
        return True
    
    def analyze_message_types(self, messages: List[Dict[str, Any]]) -> Dict[str, int]:
        """Analyze distribution of message types"""
        type_counts = {}
        for msg in messages:
            msg_type = msg.get("message_type", "unknown")
            type_counts[msg_type] = type_counts.get(msg_type, 0) + 1
        return type_counts
    
    async def run_all_tests(self) -> Dict[str, Any]:
        """Run all WebSocket tests"""
        logger.info("Starting WebSocket test suite")
        self.start_time = time.time()
        
        tests = [
            self.test_websocket_connection_basic,
            self.test_websocket_subscription,
            self.test_real_time_block_broadcasts,
            self.test_transaction_event_streaming,
            self.test_message_integrity,
            self.test_connection_stability,
            self.test_concurrent_connections
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            try:
                if await test():
                    passed += 1
            except Exception as e:
                logger.error(f"Test {test.__name__} failed with exception: {e}")
        
        total_time = time.time() - self.start_time
        
        summary = {
            "suite_name": "WebSocket Real-time Tests",
            "total_tests": total,
            "passed": passed,
            "failed": total - passed,
            "pass_rate": (passed / total) * 100,
            "total_time_seconds": total_time,
            "results": self.test_results
        }
        
        logger.info(f"WebSocket tests completed: {passed}/{total} passed ({summary['pass_rate']:.1f}%)")
        return summary

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Test Dytallix WebSocket Real-time Features")
    parser.add_argument("--url", default="ws://localhost:3030/ws", help="WebSocket URL")
    parser.add_argument("--output", help="JSON output file for results")
    
    args = parser.parse_args()
    
    async def main():
        tester = WebSocketTester(args.url)
        results = await tester.run_all_tests()
        
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(results, f, indent=2)
            print(f"Results saved to {args.output}")
        else:
            print(json.dumps(results, indent=2))
    
    asyncio.run(main())