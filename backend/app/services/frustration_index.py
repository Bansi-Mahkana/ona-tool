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
from .signed_network import find_unbalanced_triangles
import numpy as np


def compute_frustration_index(G: nx.DiGraph) -> float:
    """
    Returns frustration index in [0, 1].
    0.0 = perfectly balanced, 1.0 = maximally frustrated.
    """
    UG = G.to_undirected()
    all_triangles = list(nx.enumerate_all_cliques(UG))
    triangles = [t for t in all_triangles if len(t) == 3]

    if not triangles:
        return _structural_proxy(G)

    total = len(triangles)
    frustrated = find_unbalanced_triangles(G)

    fi = len(frustrated) / total
    return round(min(fi, 1.0), 4)


def _structural_proxy(G: nx.DiGraph) -> float:
    """
    Fallback when no triangles exist.
    Proxy based on:
      - Ratio of negative edges
      - Degree coefficient of variation (inequality)
    """
    edges = list(G.edges(data=True))
    if not edges:
        return 0.0

    n_neg = sum(1 for _, _, d in edges if d.get("sign") == -1)
    neg_ratio = n_neg / len(edges)

    degrees = [d for _, d in G.degree()]
    if not degrees:
        return neg_ratio

    avg = np.mean(degrees)
    std = np.std(degrees)
    cv = (std / avg) if avg > 0 else 0

    proxy = 0.5 * neg_ratio + 0.5 * min(cv / 3.0, 1.0)
    return round(min(proxy, 1.0), 4)


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
