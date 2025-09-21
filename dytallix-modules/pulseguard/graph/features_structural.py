"""Structural features from the address-contract DAG."""
import logging
from typing import Dict, List, Any, Set
import networkx as nx
from .dag_builder import dag_builder

logger = logging.getLogger(__name__)


def compute_k_hop_features(node: str, k_values: List[int] = [1, 2, 3]) -> Dict[str, float]:
    """Compute k-hop neighbor counts for a node."""
    try:
        features = {}
        
        if node not in dag_builder.graph:
            return {f"k{k}_neighbors": 0.0 for k in k_values}
            
        # For each k value
        for k in k_values:
            neighbors = set([node])
            
            # Expand k hops
            for _ in range(k):
                new_neighbors = set()
                for n in neighbors:
                    new_neighbors.update(dag_builder.graph.successors(n))
                    new_neighbors.update(dag_builder.graph.predecessors(n))
                neighbors.update(new_neighbors)
                
            # Remove self
            neighbors.discard(node)
            features[f"k{k}_neighbors"] = float(len(neighbors))
            
        return features
        
    except Exception as e:
        logger.error(f"Error computing k-hop features for {node}: {e}")
        return {f"k{k}_neighbors": 0.0 for k in k_values}


def compute_cycle_features(node: str) -> Dict[str, float]:
    """Check if node is part of cycles."""
    try:
        if node not in dag_builder.graph:
            return {"in_cycle": 0.0, "cycle_length": 0.0}
            
        # Get node's local subgraph (2-hop neighborhood)
        neighbors = set([node])
        for _ in range(2):
            new_neighbors = set()
            for n in neighbors:
                new_neighbors.update(dag_builder.graph.successors(n))
                new_neighbors.update(dag_builder.graph.predecessors(n))
            neighbors.update(new_neighbors)
            
        subgraph = dag_builder.graph.subgraph(neighbors)
        
        # Check for cycles involving this node
        in_cycle = False
        min_cycle_length = float('inf')
        
        try:
            # Find cycles in the subgraph
            cycles = list(nx.simple_cycles(subgraph))
            for cycle in cycles:
                if node in cycle:
                    in_cycle = True
                    min_cycle_length = min(min_cycle_length, len(cycle))
        except:
            pass
            
        return {
            "in_cycle": float(in_cycle),
            "cycle_length": float(min_cycle_length) if min_cycle_length != float('inf') else 0.0
        }
        
    except Exception as e:
        logger.error(f"Error computing cycle features for {node}: {e}")
        return {"in_cycle": 0.0, "cycle_length": 0.0}


def compute_centrality_features(node: str) -> Dict[str, float]:
    """Compute centrality measures for a node."""
    try:
        if node not in dag_builder.graph:
            return {"degree_centrality": 0.0, "in_degree": 0.0, "out_degree": 0.0}
            
        graph = dag_builder.graph
        
        # Basic degree measures
        in_degree = graph.in_degree(node)
        out_degree = graph.out_degree(node)
        total_degree = in_degree + out_degree
        
        # Degree centrality (normalized by max possible degree)
        n = graph.number_of_nodes()
        max_degree = n - 1 if n > 1 else 1
        degree_centrality = total_degree / max_degree
        
        return {
            "degree_centrality": float(degree_centrality),
            "in_degree": float(in_degree),
            "out_degree": float(out_degree)
        }
        
    except Exception as e:
        logger.error(f"Error computing centrality features for {node}: {e}")
        return {"degree_centrality": 0.0, "in_degree": 0.0, "out_degree": 0.0}


def compute_community_features(node: str) -> Dict[str, float]:
    """Simple community detection features."""
    try:
        if node not in dag_builder.graph:
            return {"community_id": 0.0, "community_size": 0.0}
            
        # Convert to undirected for community detection
        graph = dag_builder.graph.to_undirected()
        
        if graph.number_of_nodes() < 2:
            return {"community_id": 0.0, "community_size": 1.0}
            
        # Simple connected components as communities
        try:
            components = list(nx.connected_components(graph))
            
            # Find which component the node belongs to
            community_id = 0
            community_size = 1
            
            for i, component in enumerate(components):
                if node in component:
                    community_id = i
                    community_size = len(component)
                    break
                    
            return {
                "community_id": float(community_id),
                "community_size": float(community_size)
            }
            
        except Exception:
            return {"community_id": 0.0, "community_size": 1.0}
            
    except Exception as e:
        logger.error(f"Error computing community features for {node}: {e}")
        return {"community_id": 0.0, "community_size": 1.0}


def compute_all_structural_features(node: str) -> Dict[str, float]:
    """Compute all structural features for a node."""
    try:
        features = {}
        
        # K-hop features
        features.update(compute_k_hop_features(node))
        
        # Cycle features
        features.update(compute_cycle_features(node))
        
        # Centrality features
        features.update(compute_centrality_features(node))
        
        # Community features
        features.update(compute_community_features(node))
        
        return features
        
    except Exception as e:
        logger.error(f"Error computing structural features for {node}: {e}")
        return {}


def compute_transaction_structural_features(transactions: List[Dict[str, Any]]) -> List[Dict[str, float]]:
    """Compute structural features for a list of transactions."""
    try:
        features_list = []
        
        for tx in transactions:
            tx_features = {}
            
            # Features for source address
            from_addr = tx.get("from")
            if from_addr:
                from_features = compute_all_structural_features(from_addr)
                for key, value in from_features.items():
                    tx_features[f"from_{key}"] = value
                    
            # Features for destination address
            to_addr = tx.get("to")
            if to_addr:
                to_features = compute_all_structural_features(to_addr)
                for key, value in to_features.items():
                    tx_features[f"to_{key}"] = value
                    
            # Add transaction-level graph features
            tx_features["graph_density"] = dag_builder.get_graph_metrics().get("density", 0.0)
            tx_features["graph_num_nodes"] = dag_builder.get_graph_metrics().get("num_nodes", 0.0)
            tx_features["graph_num_edges"] = dag_builder.get_graph_metrics().get("num_edges", 0.0)
            
            features_list.append(tx_features)
            
        return features_list
        
    except Exception as e:
        logger.error(f"Error computing transaction structural features: {e}")
        return []