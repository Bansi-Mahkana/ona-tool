"""
frustration_index.py

Computes the Frustration Index for a signed ONA network.

Definition:
  The frustration index (also called the "line index of balance") measures
  the minimum number of edges that need to be removed or flipped to make
  the network structurally balanced (per Heider's balance theory).

  Normalised to [0, 1]:
    FI = frustrated_triangles / total_triangles

  Where:
    - frustrated triangle: a triangle with 1 or 3 negative edges
    - balanced triangle:   a triangle with 0 or 2 negative edges

  If no signed edges or no triangles exist, we fall back to a
  structural proxy based on degree inequality and negative edge ratio.

References:
  - Harary (1953): On the notion of balance of a signed graph.
  - Zaslavsky (1982): Signed graphs.
  - Figueiredo & Frota (2014): The node deletion problem on cographs.
"""
import networkx as nx
from typing import Tuple
from .signed_network import find_unbalanced_triangles, compute_triadic_metrics, _structural_proxy
import numpy as np


def compute_frustration_index(G: nx.DiGraph) -> float:
    """
    Returns frustration index in [0, 1].
    0.0 = perfectly balanced, 1.0 = maximally frustrated.
    """
    res = compute_triadic_metrics(G)
    return res["frustration_ratio"]


def frustration_breakdown(G: nx.DiGraph) -> dict:
    """
    Returns a detailed breakdown of the frustration analysis.
    Useful for explanation in the recommendations engine.
    """
    UG = G.to_undirected()
    all_triangles = [t for t in nx.enumerate_all_cliques(UG) if len(t) == 3]
    frustrated = find_unbalanced_triangles(G)

    edges = list(G.edges(data=True))
    pos = sum(1 for _, _, d in edges if d.get("sign") == 1)
    neg = sum(1 for _, _, d in edges if d.get("sign") == -1)
    neu = sum(1 for _, _, d in edges if d.get("sign") == 0)

    # Most frustrated nodes (appear in most frustrated triangles)
    node_frustration = {}
    for tri in frustrated:
        for node in tri[:3]:
            node_frustration[node] = node_frustration.get(node, 0) + 1

    top_frustrated = sorted(node_frustration.items(), key=lambda x: -x[1])[:5]

    return {
        "total_triangles": len(all_triangles),
        "frustrated_triangles": len(frustrated),
        "balanced_triangles": len(all_triangles) - len(frustrated),
        "positive_edges": pos,
        "negative_edges": neg,
        "neutral_edges": neu,
        "top_frustrated_nodes": [{"node": n, "count": c} for n, c in top_frustrated],
    }
