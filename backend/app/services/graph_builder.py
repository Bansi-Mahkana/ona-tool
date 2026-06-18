"""
graph_builder.py
Builds a NetworkX DiGraph (directed, weighted, signed) from the parsed graph payload.
Supports both regular ONA graphs and signed networks (Cross-Parker integration).
"""
import networkx as nx
from typing import List, Dict, Any


def build_nx_graph(nodes: List[dict], links: List[dict]) -> nx.DiGraph:
    """
    Constructs a directed, weighted NetworkX graph.
    Each edge stores: weight, sign, q1, q2, q3, q4 attributes.
    Each node stores: department, label attributes.
    """
    G = nx.DiGraph()

    for node in nodes:
        node_id = node["id"]
        # Auto-calculate level based on ID prefix depth (0.1.1.1 -> Level 2)
        parts = str(node_id).split('.')
        level = max(0, len(parts) - 2)
        
        G.add_node(
            node_id,
            department=node.get("department", "Unknown"),
            label=node.get("label", node_id),
            level=level,
            is_swappable=node.get("is_swappable", True), # True by default
        )

    for link in links:
        src = link["source"] if isinstance(link["source"], str) else link["source"]["id"]
        tgt = link["target"] if isinstance(link["target"], str) else link["target"]["id"]
        G.add_edge(
            src, tgt,
            weight=link.get("weight", 1.0),
            sign=link.get("sign", 0),
            q1=link.get("q1"),
            q2=link.get("q2"),
            q3=link.get("q3"),
            q4=link.get("q4"),
        )

    return G


def build_undirected(G: nx.DiGraph) -> nx.Graph:
    """
    Returns an undirected version of the graph.
    Used for algorithms that require undirected input (e.g., bridges, clustering).
    """
    return G.to_undirected()


def build_signed_graph(G: nx.DiGraph):
    """
    Returns two subgraphs:
      - G_pos: only positive edges (sign == +1)
      - G_neg: only negative edges (sign == -1)
    These are used for signed network analysis (frustration index, balance).
    """
    G_pos = nx.DiGraph()
    G_neg = nx.DiGraph()

    for n, data in G.nodes(data=True):
        G_pos.add_node(n, **data)
        G_neg.add_node(n, **data)

    for u, v, data in G.edges(data=True):
        sign = data.get("sign", 0)
        if sign == 1:
            G_pos.add_edge(u, v, **data)
        elif sign == -1:
            G_neg.add_edge(u, v, **data)

    return G_pos, G_neg
