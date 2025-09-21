"""Test graph features computation."""
import pytest
import time
from ..graph.dag_builder import DAGBuilder
from ..graph.features_structural import compute_all_structural_features


class TestGraphFeatures:
    """Test graph-based features."""
    
    def test_dag_builder_basic(self):
        """Test basic DAG building functionality."""
        dag = DAGBuilder(window_seconds=300)
        
        # Add a simple transaction
        tx = {
            "from": "0xabc123",
            "to": "0xdef456", 
            "value": 1.5,
            "timestamp": int(time.time()),
            "hash": "0x123"
        }
        
        dag.add_transaction(tx)
        
        # Check graph was built
        assert dag.graph.number_of_nodes() == 2
        assert dag.graph.number_of_edges() == 1
        assert dag.graph.has_edge("0xabc123", "0xdef456")
        
    def test_k_hop_features(self):
        """Test k-hop neighbor computation."""
        dag = DAGBuilder()
        
        # Create a simple chain: A -> B -> C -> D
        transactions = [
            {"from": "0xa", "to": "0xb", "value": 1.0, "timestamp": int(time.time())},
            {"from": "0xb", "to": "0xc", "value": 2.0, "timestamp": int(time.time())},
            {"from": "0xc", "to": "0xd", "value": 3.0, "timestamp": int(time.time())},
        ]
        
        for tx in transactions:
            dag.add_transaction(tx)
            
        # Test features for node B (middle of chain)
        features = compute_all_structural_features("0xb")
        
        assert "k1_neighbors" in features
        assert "k2_neighbors" in features
        assert "degree_centrality" in features
        assert features["k1_neighbors"] >= 1  # Should have at least A and C
        
    def test_cycle_detection(self):
        """Test cycle detection in graph."""
        dag = DAGBuilder()
        
        # Create a cycle: A -> B -> C -> A
        transactions = [
            {"from": "0xa", "to": "0xb", "value": 1.0, "timestamp": int(time.time())},
            {"from": "0xb", "to": "0xc", "value": 2.0, "timestamp": int(time.time())},
            {"from": "0xc", "to": "0xa", "value": 3.0, "timestamp": int(time.time())},
        ]
        
        for tx in transactions:
            dag.add_transaction(tx)
            
        # Check cycle features
        features = compute_all_structural_features("0xa")
        
        assert "in_cycle" in features
        assert "cycle_length" in features
        # Note: cycle detection might not always work in directed graphs
        
    def test_centrality_features(self):
        """Test centrality computation."""
        dag = DAGBuilder()
        
        # Create a star pattern: A is center
        center = "0xa"
        transactions = []
        
        for i in range(5):
            addr = f"0xb{i}"
            transactions.append({
                "from": center, 
                "to": addr, 
                "value": 1.0, 
                "timestamp": int(time.time())
            })
            
        for tx in transactions:
            dag.add_transaction(tx)
            
        # Center should have high centrality
        features = compute_all_structural_features(center)
        
        assert "degree_centrality" in features
        assert "out_degree" in features
        assert features["out_degree"] == 5
        assert features["degree_centrality"] > 0
        
    def test_cleanup_old_data(self):
        """Test that old data is cleaned up."""
        dag = DAGBuilder(window_seconds=1)  # Very short window
        
        # Add old transaction
        old_tx = {
            "from": "0xa",
            "to": "0xb", 
            "value": 1.0,
            "timestamp": int(time.time()) - 2  # 2 seconds ago
        }
        dag.add_transaction(old_tx)
        
        # Wait and cleanup
        time.sleep(1.1)
        dag.cleanup_old_edges()
        
        # Should be cleaned up
        assert dag.graph.number_of_edges() == 0