from __future__ import annotations
from typing import Dict, List, Tuple, Set

try:
    import networkx as nx  # type: ignore
except Exception:  # pragma: no cover - optional dep
    nx = None  # type: ignore


def build_interaction_dag(txs: List[dict]) -> Dict:
    """Build an address/contract interaction DAG from a batch of txs.
    Nodes: addresses/contracts; Edges: from -> to with attributes value, gas.
    Returns a structure {nodes: set, edges: list[(u,v,attrs)]} and basic metrics.
    """
    nodes: Set[str] = set()
    edges: List[Tuple[str, str, Dict]] = []
    for tx in txs:
        u = (tx.get("from") or tx.get("from_")) or "unknown"
        v = tx.get("to") or "contract_creation"
        nodes.update([u, v])
        edges.append((u, v, {
            "value": float(tx.get("value") or 0.0),
            "gas": int(tx.get("gas") or 0),
            "hash": tx.get("hash"),
        }))
    metrics: Dict[str, float] = {}
    if nx is not None:
        g = nx.DiGraph()
        g.add_nodes_from(list(nodes))
        for u, v, a in edges:
            g.add_edge(u, v, **a)
        try:
            deg = nx.degree_centrality(g)
            metrics["avg_degree_centrality"] = sum(deg.values()) / max(1, len(deg))
            metrics["num_cycles"] = float(sum(1 for _ in nx.simple_cycles(g)))
        except Exception:
            pass
    else:
        # Fallback metrics without networkx
        indeg: Dict[str, int] = {n: 0 for n in nodes}
        outdeg: Dict[str, int] = {n: 0 for n in nodes}
        for u, v, _ in edges:
            outdeg[u] = outdeg.get(u, 0) + 1
            indeg[v] = indeg.get(v, 0) + 1
        if nodes:
            metrics["avg_degree_centrality"] = sum(indeg.values()) / len(nodes)
            metrics["num_cycles"] = 0.0
    return {"nodes": list(nodes), "edges": edges, "metrics": metrics}


def find_multi_hop_paths(dag: Dict, min_hops: int = 3, max_paths: int = 10) -> List[List[str]]:
    """Find multi-hop paths with length >= min_hops. Returns up to max_paths paths."""
    edges = dag.get("edges", [])
    adj: Dict[str, List[str]] = {}
    for u, v, _ in edges:
        adj.setdefault(u, []).append(v)

    paths: List[List[str]] = []
    def dfs(node: str, visited: Set[str], path: List[str]):
        if len(paths) >= max_paths:
            return
        for nxt in adj.get(node, []):
            if nxt in visited:
                continue
            new_path = path + [nxt]
            if len(new_path) - 1 >= min_hops:
                paths.append(new_path)
                if len(paths) >= max_paths:
                    return
            dfs(nxt, visited | {nxt}, new_path)

    for start in list(adj.keys())[:50]:  # limit breadth
        dfs(start, {start}, [start])
        if len(paths) >= max_paths:
            break
    return paths

