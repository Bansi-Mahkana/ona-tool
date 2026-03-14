"""
organizational_cost.py

Computes the Organisational Cost metric for an ONA network.

Definition:
  Organisational cost quantifies the inefficiency and friction in information
  diffusion across the network. Higher cost = more effort required for information
  to reach all members.

  Components:
    1. Betweenness centralisation (bottleneck effect)
       - High betweenness variance → few nodes control all information flow
    2. Average normalised path length
       - Long average paths → slow information propagation
    3. Isolation penalty
       - Disconnected nodes → lost information, wasted potential
    4. Negative edge penalty
       - Negative ties create friction, increase effective path costs

  Formula:
    OC = 0.35 * betweenness_centralisation
       + 0.30 * normalised_avg_path_length
       + 0.20 * isolation_ratio
       + 0.15 * negative_edge_ratio

  Result normalised to [0, 1]. Ideal = 0.

References:
  - Freeman (1977): A set of measures of centrality based on betweenness.
  - Borgatti (2005): Centrality and network flow.
  - Cross & Parker (2004): The Hidden Power of Social Networks.
"""
import networkx as nx
import numpy as np
from typing import Optional


def compute_organizational_cost(G: nx.DiGraph) -> float:
    """
    Returns organisational cost in [0, 1].
    0.0 = maximally efficient, 1.0 = maximally costly.
    """
    if len(G.nodes) == 0:
        return 0.0

    UG = G.to_undirected()
    n = len(G.nodes)
    m = len(G.edges)

    # ── 1. Betweenness centralisation ─────────────────────────────────────
    try:
        bc = nx.betweenness_centrality(UG, normalized=True)
        bc_values = list(bc.values())
        max_bc = max(bc_values) if bc_values else 0
        avg_bc = np.mean(bc_values) if bc_values else 0
        # Freeman centralisation: how much does max deviate from average?
        betweenness_centralisation = (max_bc - avg_bc) / max(max_bc, 0.001)
    except Exception:
        betweenness_centralisation = 0.5

    # ── 2. Normalised average path length ─────────────────────────────────
    try:
        if nx.is_connected(UG):
            apl = nx.average_shortest_path_length(UG)
        else:
            # Use largest connected component
            largest_cc = max(nx.connected_components(UG), key=len)
            subgraph = UG.subgraph(largest_cc)
            if len(subgraph) > 1:
                apl = nx.average_shortest_path_length(subgraph)
            else:
                apl = 1.0

        # Theoretical max path length ≈ n-1 for a chain
        norm_apl = min((apl - 1) / max(n - 1, 1), 1.0)
    except Exception:
        norm_apl = 0.5

    # ── 3. Isolation ratio ────────────────────────────────────────────────
    if n > 0:
        connected_nodes = {u for u, v in G.edges()} | {v for u, v in G.edges()}
        isolated = n - len(connected_nodes)
        isolation_ratio = isolated / n
    else:
        isolation_ratio = 0.0

    # ── 4. Negative edge ratio ────────────────────────────────────────────
    if m > 0:
        neg_edges = sum(1 for _, _, d in G.edges(data=True) if d.get("sign") == -1)
        negative_ratio = neg_edges / m
    else:
        negative_ratio = 0.0

    # ── Weighted composite ────────────────────────────────────────────────
    cost = (
        0.35 * betweenness_centralisation +
        0.30 * norm_apl +
        0.20 * isolation_ratio +
        0.15 * negative_ratio
    )

    return round(min(cost, 1.0), 4)


def compute_cost_breakdown(G: nx.DiGraph) -> dict:
    """
    Returns a component-by-component breakdown of organisational cost.
    Used by the recommender to target the highest-cost components.
    """
    UG = G.to_undirected()
    n = len(G.nodes)
    m = len(G.edges)

    # Betweenness
    try:
        bc = nx.betweenness_centrality(UG, normalized=True)
        bc_values = list(bc.values())
        max_bc = max(bc_values) if bc_values else 0
        avg_bc = np.mean(bc_values) if bc_values else 0
        btw_centralisation = (max_bc - avg_bc) / max(max_bc, 0.001)
        top_bottlenecks = sorted(bc.items(), key=lambda x: -x[1])[:3]
    except Exception:
        btw_centralisation = 0.5
        top_bottlenecks = []

    # Avg path length
    try:
        if nx.is_connected(UG):
            apl = nx.average_shortest_path_length(UG)
        else:
            largest_cc = max(nx.connected_components(UG), key=len)
            apl = nx.average_shortest_path_length(UG.subgraph(largest_cc)) if len(largest_cc) > 1 else 1.0
        norm_apl = min((apl - 1) / max(n - 1, 1), 1.0)
    except Exception:
        apl, norm_apl = 1.0, 0.0

    # Isolated
    connected = {u for u, v in G.edges()} | {v for u, v in G.edges()}
    isolated_nodes = [nd for nd in G.nodes() if nd not in connected]

    # Neg edges
    neg_edges = [(u, v) for u, v, d in G.edges(data=True) if d.get("sign") == -1]
    neg_ratio = len(neg_edges) / max(m, 1)

    return {
        "betweenness_centralisation": round(btw_centralisation, 4),
        "normalised_avg_path_length": round(norm_apl, 4),
        "avg_path_length": round(apl, 3),
        "isolation_ratio": round(len(isolated_nodes) / max(n, 1), 4),
        "negative_edge_ratio": round(neg_ratio, 4),
        "top_bottleneck_nodes": [{"node": n, "betweenness": round(bc, 4)} for n, bc in top_bottlenecks],
        "isolated_nodes": isolated_nodes,
        "negative_edges": [{"source": u, "target": v} for u, v in neg_edges[:10]],
    }
