"""DAG builder for address-contract interactions with sliding window."""
import time
from collections import defaultdict, deque
from typing import Dict, List, Any, Optional, Set, Tuple
import networkx as nx
import logging

logger = logging.getLogger(__name__)


class DAGBuilder:
    """Incremental DAG builder for address-contract interactions."""
    
    def __init__(self, window_seconds: int = 300):
        self.window_seconds = window_seconds
        self.graph = nx.DiGraph()
        self.edge_timestamps = {}  # (src, dst) -> timestamp
        self.node_info = {}  # node -> metadata
        
    def add_transaction(self, tx: Dict[str, Any]):
        """Add a transaction to the DAG."""
        try:
            from_addr = tx.get("from")
            to_addr = tx.get("to")
            value = tx.get("value", 0)
            timestamp = tx.get("timestamp", int(time.time()))
            tx_hash = tx.get("hash", "")
            
            if not from_addr or not to_addr:
                return
                
            # Add nodes if not present
            if from_addr not in self.graph:
                self.graph.add_node(from_addr)
                self.node_info[from_addr] = {
                    "type": "address",
                    "first_seen": timestamp
                }
                
            if to_addr not in self.graph:
                self.graph.add_node(to_addr)
                # Determine if it's a contract (heuristic: has data or value == 0)
                is_contract = bool(tx.get("data", "0x") != "0x" or value == 0)
                self.node_info[to_addr] = {
                    "type": "contract" if is_contract else "address",
                    "first_seen": timestamp
                }
                
            # Add or update edge
            edge_key = (from_addr, to_addr)
            if self.graph.has_edge(from_addr, to_addr):
                # Update existing edge
                edge_data = self.graph[from_addr][to_addr]
                edge_data["weight"] += 1
                edge_data["total_value"] += value
                edge_data["last_tx"] = tx_hash
                edge_data["last_seen"] = timestamp
            else:
                # Add new edge
                self.graph.add_edge(from_addr, to_addr, 
                                  weight=1, 
                                  total_value=value,
                                  first_tx=tx_hash,
                                  last_tx=tx_hash,
                                  first_seen=timestamp,
                                  last_seen=timestamp)
                                  
            self.edge_timestamps[edge_key] = timestamp
            
        except Exception as e:
            logger.error(f"Error adding transaction to DAG: {e}")
            
    def cleanup_old_edges(self):
        """Remove edges older than the sliding window."""
        try:
            current_time = int(time.time())
            cutoff_time = current_time - self.window_seconds
            
            edges_to_remove = []
            for (src, dst), timestamp in self.edge_timestamps.items():
                if timestamp < cutoff_time:
                    edges_to_remove.append((src, dst))
                    
            for src, dst in edges_to_remove:
                if self.graph.has_edge(src, dst):
                    self.graph.remove_edge(src, dst)
                del self.edge_timestamps[(src, dst)]
                
            # Remove isolated nodes
            isolated_nodes = list(nx.isolates(self.graph))
            self.graph.remove_nodes_from(isolated_nodes)
            for node in isolated_nodes:
                if node in self.node_info:
                    del self.node_info[node]
                    
        except Exception as e:
            logger.error(f"Error cleaning up DAG: {e}")
            
    def get_graph_metrics(self) -> Dict[str, float]:
        """Get basic graph metrics."""
        try:
            if self.graph.number_of_nodes() == 0:
                return {}
                
            # Basic metrics
            num_nodes = self.graph.number_of_nodes()
            num_edges = self.graph.number_of_edges()
            
            # Degree metrics
            degrees = dict(self.graph.degree())
            avg_degree = sum(degrees.values()) / num_nodes if num_nodes > 0 else 0
            
            # Density
            density = nx.density(self.graph)
            
            # Components
            num_components = nx.number_weakly_connected_components(self.graph)
            
            # Cycles (expensive, limit to small graphs)
            has_cycles = False
            if num_nodes < 1000:
                try:
                    has_cycles = len(list(nx.simple_cycles(self.graph))) > 0
                except:
                    pass
                    
            return {
                "num_nodes": float(num_nodes),
                "num_edges": float(num_edges),
                "avg_degree": avg_degree,
                "density": density,
                "num_components": float(num_components),
                "has_cycles": float(has_cycles)
            }
            
        except Exception as e:
            logger.error(f"Error computing graph metrics: {e}")
            return {}
            
    def find_multi_hop_paths(self, min_hops: int = 3, max_paths: int = 5) -> List[List[str]]:
        """Find multi-hop paths that could indicate complex flows."""
        try:
            paths = []
            
            # For performance, limit to high-degree nodes
            degrees = dict(self.graph.degree())
            high_degree_nodes = [node for node, degree in degrees.items() if degree >= 3]
            
            if len(high_degree_nodes) < 2:
                return paths
                
            # Sample some source-target pairs
            import random
            for _ in range(min(10, len(high_degree_nodes))):
                source = random.choice(high_degree_nodes)
                targets = [node for node in high_degree_nodes if node != source]
                
                if not targets:
                    continue
                    
                target = random.choice(targets)
                
                try:
                    if nx.has_path(self.graph, source, target):
                        path = nx.shortest_path(self.graph, source, target)
                        if len(path) >= min_hops:
                            paths.append(path)
                            
                        if len(paths) >= max_paths:
                            break
                except:
                    continue
                    
            return paths
            
        except Exception as e:
            logger.error(f"Error finding multi-hop paths: {e}")
            return []
            
    def get_node_neighborhood(self, node: str, k: int = 2) -> Dict[str, Any]:
        """Get k-hop neighborhood of a node."""
        try:
            if node not in self.graph:
                return {}
                
            # Get k-hop neighborhood
            neighbors = set([node])
            for _ in range(k):
                new_neighbors = set()
                for n in neighbors:
                    new_neighbors.update(self.graph.successors(n))
                    new_neighbors.update(self.graph.predecessors(n))
                neighbors.update(new_neighbors)
                
            subgraph = self.graph.subgraph(neighbors)
            
            return {
                "neighbors": list(neighbors),
                "neighborhood_size": len(neighbors),
                "neighborhood_edges": subgraph.number_of_edges(),
                "neighborhood_density": nx.density(subgraph) if len(neighbors) > 1 else 0.0
            }
            
        except Exception as e:
            logger.error(f"Error getting node neighborhood: {e}")
            return {}


# Global DAG instance
dag_builder = DAGBuilder()


def build_interaction_dag(transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Build/update the interaction DAG from transactions."""
    try:
        # Add new transactions
        for tx in transactions:
            dag_builder.add_transaction(tx)
            
        # Cleanup old data
        dag_builder.cleanup_old_edges()
        
        # Return metrics and graph info
        return {
            "metrics": dag_builder.get_graph_metrics(),
            "num_transactions": len(transactions)
        }
        
    except Exception as e:
        logger.error(f"Error building interaction DAG: {e}")
        return {"metrics": {}, "num_transactions": 0}


def find_multi_hop_paths(dag_result: Dict[str, Any], min_hops: int = 3, max_paths: int = 5) -> List[List[str]]:
    """Find multi-hop paths in the current DAG."""
    try:
        return dag_builder.find_multi_hop_paths(min_hops, max_paths)
    except Exception as e:
        logger.error(f"Error finding multi-hop paths: {e}")
        return []