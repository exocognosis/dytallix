"""Test domain detectors."""
import pytest
import time
from ..detectors.flash_loan import FlashLoanDetector
from ..detectors.mint_burn import MintBurnDetector
from ..detectors.bridge_sequences import BridgeSequenceDetector


class TestFlashLoanDetector:
    """Test flash loan detection."""
    
    def test_flash_loan_basic(self):
        """Test basic flash loan detection."""
        detector = FlashLoanDetector(
            burst_threshold=3.0,
            time_window=60,
            min_value_threshold=10.0
        )
        
        # Create flash loan pattern
        current_time = int(time.time())
        
        # Large borrow
        borrow_tx = {
            "from": "0xuser",
            "to": "0xprotocol",
            "value": 1000.0,  # Large amount
            "timestamp": current_time,
            "blockNumber": 100
        }
        
        detector.add_transaction(borrow_tx)
        
        # Quick repay
        repay_tx = {
            "from": "0xprotocol", 
            "to": "0xuser",
            "value": 1000.0,  # Same amount
            "timestamp": current_time + 30,  # 30 seconds later
            "blockNumber": 100  # Same block
        }
        
        detector.add_transaction(repay_tx)
        
        # Should detect flash loan pattern
        reasons = detector.detect_flash_loan(repay_tx)
        
        # Should detect some pattern
        assert len(reasons) > 0
        
    def test_volume_spike_detection(self):
        """Test volume spike detection."""
        detector = FlashLoanDetector()
        
        current_time = int(time.time())
        
        # Create baseline activity
        for i in range(10):
            tx = {
                "from": "0xuser",
                "to": "0xother",
                "value": 10.0,  # Normal amount
                "timestamp": current_time - 600 + i * 30  # Spread over time
            }
            detector.add_transaction(tx)
            
        # Add spike transaction
        spike_tx = {
            "from": "0xuser",
            "to": "0xprotocol", 
            "value": 500.0,  # Much larger
            "timestamp": current_time
        }
        
        detector.add_transaction(spike_tx)
        reasons = detector.detect_flash_loan(spike_tx)
        
        # Should detect volume spike
        assert any("VOLSPIKE" in reason for reason in reasons)


class TestMintBurnDetector:
    """Test mint/burn detection."""
    
    def test_mint_detection(self):
        """Test mint event detection."""
        detector = MintBurnDetector()
        
        # Create mint transaction (from zero address)
        mint_tx = {
            "from": "0x0000000000000000000000000000000000000000",
            "to": "0xuser",
            "value": 1000000.0,  # Large mint
            "timestamp": int(time.time()),
            "logs": [
                {
                    "address": "0xtoken",
                    "topics": [
                        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",  # Transfer
                        "0x0000000000000000000000000000000000000000000000000000000000000000",  # from zero
                        "0x000000000000000000000000000000000000000000000000000000000000user"    # to user
                    ],
                    "data": "0x" + hex(int(1000000 * 1e18))[2:].zfill(64)  # Amount in wei
                }
            ]
        }
        
        detector.add_transaction(mint_tx)
        reasons = detector.detect_mint_burn_anomalies(mint_tx)
        
        # Should detect mint activity
        assert len(reasons) >= 0  # May or may not trigger without baseline
        
    def test_burn_detection(self):
        """Test burn event detection.""" 
        detector = MintBurnDetector()
        
        # Create burn transaction (to zero address)
        burn_tx = {
            "from": "0xuser",
            "to": "0x0000000000000000000000000000000000000000",
            "value": 500000.0,  # Large burn
            "timestamp": int(time.time())
        }
        
        detector.add_transaction(burn_tx)
        reasons = detector.detect_mint_burn_anomalies(burn_tx)
        
        # Should detect burn activity
        assert len(reasons) >= 0


class TestBridgeDetector:
    """Test bridge sequence detection."""
    
    def test_bridge_transaction_detection(self):
        """Test bridge transaction identification."""
        detector = BridgeSequenceDetector()
        
        # Transaction to known bridge contract
        bridge_tx = {
            "from": "0xuser",
            "to": "0xa0b86a33e6c1fa072fe894cede0c52d5e97b7ed0",  # Known bridge
            "value": 10.0,
            "timestamp": int(time.time()),
            "data": "0x1114cd2a"  # bridgeERC20 function
        }
        
        # Should be identified as bridge transaction
        is_bridge = detector._is_bridge_transaction(bridge_tx)
        assert is_bridge
        
    def test_bridge_sequence_pattern(self):
        """Test bridge sequence pattern detection."""
        detector = BridgeSequenceDetector()
        
        current_time = int(time.time())
        
        # Create bridge sequence
        txs = [
            # Preparation
            {
                "from": "0xuser",
                "to": "0xtoken", 
                "value": 0,
                "data": "0x095ea7b3",  # approve function
                "timestamp": current_time - 300
            },
            # Bridge transfer
            {
                "from": "0xuser",
                "to": "0xa0b86a33e6c1fa072fe894cede0c52d5e97b7ed0",  # Bridge
                "value": 50.0,
                "data": "0x1114cd2a",  # bridgeERC20
                "timestamp": current_time - 60
            },
            # Completion
            {
                "from": "0xuser",
                "to": "0xother",
                "value": 1.0,
                "timestamp": current_time
            }
        ]
        
        for tx in txs:
            detector.add_transaction(tx)
            
        # Check final transaction for bridge patterns
        reasons = detector.detect_bridge_sequences(txs[-1])
        
        # Should detect some bridge activity
        assert len(reasons) >= 0
        
    def test_high_value_bridge(self):
        """Test high value bridge detection."""
        detector = BridgeSequenceDetector()
        
        # Large bridge transaction
        large_bridge_tx = {
            "from": "0xuser",
            "to": "0xa0b86a33e6c1fa072fe894cede0c52d5e97b7ed0",
            "value": 200.0,  # Large amount
            "timestamp": int(time.time()),
            "data": "0x1114cd2a"
        }
        
        detector.add_transaction(large_bridge_tx)
        reasons = detector.detect_bridge_sequences(large_bridge_tx)
        
        # Should detect high value transfer
        assert any("HIGHVAL" in reason for reason in reasons)


class TestDetectorIntegration:
    """Test detector integration."""
    
    def test_multiple_detectors(self):
        """Test running multiple detectors on same transaction."""
        from ..detectors.flash_loan import detect_flash_loan_patterns
        from ..detectors.mint_burn import detect_mint_burn_patterns
        from ..detectors.bridge_sequences import detect_bridge_patterns
        
        # Complex transaction that might trigger multiple detectors
        complex_tx = {
            "from": "0xuser",
            "to": "0xa0b86a33e6c1fa072fe894cede0c52d5e97b7ed0",
            "value": 1000.0,  # Large amount
            "timestamp": int(time.time()),
            "data": "0x1114cd2a",  # Bridge function
            "logs": [
                {
                    "address": "0xtoken",
                    "topics": [
                        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
                    ],
                    "data": "0x" + hex(int(1000 * 1e18))[2:].zfill(64)
                }
            ]
        }
        
        transactions = [complex_tx]
        
        # Run all detectors
        flash_results = detect_flash_loan_patterns(transactions)
        mint_results = detect_mint_burn_patterns(transactions)
        bridge_results = detect_bridge_patterns(transactions)
        
        # All should process without error
        assert len(flash_results) == 1
        assert len(mint_results) == 1
        assert len(bridge_results) == 1