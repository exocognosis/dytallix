#!/usr/bin/env python3
"""
WebSocket Client for Dytallix Testing
Provides WebSocket connectivity for real-time testing
"""

import asyncio
import websockets
import json
import logging
import time
from datetime import datetime
from typing import Dict, List, Any, Optional, Callable

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DytallixWebSocketClient:
    def __init__(self, url: str = "ws://localhost:3030/ws"):
        self.url = url
        self.websocket = None
        self.connected = False
        self.messages_received = []
        self.connection_start_time = None
        self.message_handlers = {}
        self.stats = {
            "messages_received": 0,
            "messages_sent": 0,
            "connection_attempts": 0,
            "connection_failures": 0,
            "total_bytes_received": 0,
            "total_bytes_sent": 0
        }
    
    async def connect(self, timeout: float = 10.0) -> bool:
        """Connect to the WebSocket server"""
        self.stats["connection_attempts"] += 1
        try:
            logger.info(f"Connecting to WebSocket at {self.url}")
            self.connection_start_time = time.time()
            
            self.websocket = await asyncio.wait_for(
                websockets.connect(self.url),
                timeout=timeout
            )
            
            self.connected = True
            logger.info("WebSocket connection established")
            return True
            
        except asyncio.TimeoutError:
            logger.error(f"WebSocket connection timeout after {timeout}s")
            self.stats["connection_failures"] += 1
            return False
        except Exception as e:
            logger.error(f"WebSocket connection failed: {e}")
            self.stats["connection_failures"] += 1
            return False
    
    async def disconnect(self):
        """Disconnect from the WebSocket server"""
        if self.websocket:
            await self.websocket.close()
            self.connected = False
            logger.info("WebSocket connection closed")
    
    async def send_message(self, message: Dict[str, Any]) -> bool:
        """Send a message to the WebSocket server"""
        if not self.connected or not self.websocket:
            logger.error("Cannot send message: not connected")
            return False
        
        try:
            message_json = json.dumps(message)
            await self.websocket.send(message_json)
            self.stats["messages_sent"] += 1
            self.stats["total_bytes_sent"] += len(message_json.encode())
            logger.debug(f"Sent message: {message}")
            return True
        except Exception as e:
            logger.error(f"Failed to send message: {e}")
            return False
    
    async def receive_message(self, timeout: float = 10.0) -> Optional[Dict[str, Any]]:
        """Receive a single message from the WebSocket server"""
        if not self.connected or not self.websocket:
            logger.error("Cannot receive message: not connected")
            return None
        
        try:
            message_raw = await asyncio.wait_for(
                self.websocket.recv(),
                timeout=timeout
            )
            
            self.stats["messages_received"] += 1
            self.stats["total_bytes_received"] += len(message_raw.encode())
            
            message = json.loads(message_raw)
            message["_received_timestamp"] = time.time()
            self.messages_received.append(message)
            
            logger.debug(f"Received message: {message}")
            
            # Call message handlers
            message_type = message.get("message_type", "unknown")
            if message_type in self.message_handlers:
                await self.message_handlers[message_type](message)
            
            return message
            
        except asyncio.TimeoutError:
            logger.warning(f"Message receive timeout after {timeout}s")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON received: {e}")
            return None
        except Exception as e:
            logger.error(f"Failed to receive message: {e}")
            return None
    
    async def listen_for_messages(self, duration: float = 30.0) -> List[Dict[str, Any]]:
        """Listen for messages for a specified duration"""
        logger.info(f"Listening for messages for {duration}s")
        start_time = time.time()
        messages = []
        
        while time.time() - start_time < duration:
            remaining_time = duration - (time.time() - start_time)
            message = await self.receive_message(timeout=min(1.0, remaining_time))
            if message:
                messages.append(message)
        
        logger.info(f"Received {len(messages)} messages in {duration}s")
        return messages
    
    def add_message_handler(self, message_type: str, handler: Callable):
        """Add a handler for specific message types"""
        self.message_handlers[message_type] = handler
        logger.debug(f"Added handler for message type: {message_type}")
    
    async def subscribe_to_events(self, event_types: List[str]) -> bool:
        """Subscribe to specific event types"""
        subscription_message = {
            "action": "subscribe",
            "event_types": event_types,
            "timestamp": time.time()
        }
        
        success = await self.send_message(subscription_message)
        if success:
            logger.info(f"Subscribed to events: {event_types}")
        return success
    
    async def test_ping_pong(self) -> float:
        """Test WebSocket ping/pong functionality"""
        if not self.connected or not self.websocket:
            return -1.0
        
        try:
            start_time = time.time()
            pong_waiter = await self.websocket.ping()
            await asyncio.wait_for(pong_waiter, timeout=5.0)
            return time.time() - start_time
        except Exception as e:
            logger.error(f"Ping/pong test failed: {e}")
            return -1.0
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        uptime = time.time() - self.connection_start_time if self.connection_start_time else 0
        return {
            "connected": self.connected,
            "uptime_seconds": uptime,
            "messages_received": self.stats["messages_received"],
            "messages_sent": self.stats["messages_sent"],
            "connection_attempts": self.stats["connection_attempts"],
            "connection_failures": self.stats["connection_failures"],
            "total_bytes_received": self.stats["total_bytes_received"],
            "total_bytes_sent": self.stats["total_bytes_sent"],
            "average_message_size_received": (
                self.stats["total_bytes_received"] / max(1, self.stats["messages_received"])
            ),
            "message_rate_per_second": (
                self.stats["messages_received"] / max(1, uptime)
            )
        }
    
    def clear_message_history(self):
        """Clear the message history"""
        self.messages_received.clear()
        logger.info("Message history cleared")

# Convenience functions for testing
async def test_websocket_connection(url: str = "ws://localhost:3030/ws", 
                                  timeout: float = 10.0) -> Dict[str, Any]:
    """Test basic WebSocket connection"""
    client = DytallixWebSocketClient(url)
    
    # Test connection
    start_time = time.time()
    connected = await client.connect(timeout)
    connection_time = time.time() - start_time
    
    result = {
        "connected": connected,
        "connection_time": connection_time,
        "url": url
    }
    
    if connected:
        # Test ping/pong
        ping_time = await client.test_ping_pong()
        result["ping_time"] = ping_time
        
        # Get stats
        result["stats"] = client.get_connection_stats()
        
        await client.disconnect()
    
    return result

async def test_message_flow(url: str = "ws://localhost:3030/ws", 
                           duration: float = 30.0) -> Dict[str, Any]:
    """Test WebSocket message flow"""
    client = DytallixWebSocketClient(url)
    
    if not await client.connect():
        return {"error": "Failed to connect"}
    
    # Subscribe to events
    await client.subscribe_to_events(["new_block", "new_transaction", "status_update"])
    
    # Listen for messages
    start_time = time.time()
    messages = await client.listen_for_messages(duration)
    actual_duration = time.time() - start_time
    
    # Analyze messages
    message_types = {}
    for msg in messages:
        msg_type = msg.get("message_type", "unknown")
        message_types[msg_type] = message_types.get(msg_type, 0) + 1
    
    stats = client.get_connection_stats()
    await client.disconnect()
    
    return {
        "duration": actual_duration,
        "messages_received": len(messages),
        "message_types": message_types,
        "message_rate": len(messages) / actual_duration if actual_duration > 0 else 0,
        "connection_stats": stats,
        "sample_messages": messages[:5]  # First 5 messages as samples
    }

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Test Dytallix WebSocket")
    parser.add_argument("--url", default="ws://localhost:3030/ws", help="WebSocket URL")
    parser.add_argument("--test", choices=["connection", "messages"], default="connection",
                       help="Type of test to run")
    parser.add_argument("--duration", type=float, default=30.0, 
                       help="Duration for message flow test")
    parser.add_argument("--output", help="JSON output file for results")
    
    args = parser.parse_args()
    
    async def main():
        if args.test == "connection":
            results = await test_websocket_connection(args.url)
        else:
            results = await test_message_flow(args.url, args.duration)
        
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(results, f, indent=2)
            print(f"Results saved to {args.output}")
        else:
            print(json.dumps(results, indent=2))
    
    asyncio.run(main())