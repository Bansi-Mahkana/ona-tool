"""
signed_network.py

Derives signed edges (+1, -1, 0) from the four Cross-Parker survey dimensions:

  Q1: Advice/information frequency      Scale: 0-5
  Q2: Expertise recognition             Scale: 0-5
  Q3: Information usefulness            Scale: 0-6
  Q4: Knowledge awareness               Scale: 0-6

Sign derivation is based on composite score normalised to 0-5:
  - score >= 3.5  → positive (+1)  — strong, supportive tie
  - score <  2.0  → negative (-1)  — weak/conflicted tie
  - otherwise     → neutral  (0)

This integrates with ONA signed network analysis, enabling Heider's
structural balance theory computation for the frustration index.
"""
import networkx as nx
from typing import Optional


def normalise_q(value: float, max_scale: float = 5.0) -> float:
    """Normalise a survey value to 0-5 scale."""
    return (value / max_scale) * 5.0


def derive_edge_sign(
    q1: Optional[float],
    q2: Optional[float],
    q3: Optional[float],
    q4: Optional[float],
    weight: float = 1.0,
) -> int:
    """
    Derive signed edge label from Cross-Parker survey responses.
    Returns +1, -1, or 0.
    """
    scores = []

    if q1 is not None and q1 >= 0:
        scores.append(q1)                    # Already 0-5

    if q2 is not None and q2 >= 0:
        scores.append(q2)                    # Already 0-5

    if q3 is not None and q3 >= 0:
        scores.append(normalise_q(q3, 6.0)) # 0-6 → 0-5

    if q4 is not None and q4 >= 0:
        scores.append(normalise_q(q4, 6.0)) # 0-6 → 0-5

    if not scores:
        # No survey data: use weight as weak proxy
        if weight >= 4:
            return 1
        elif weight <= 1:
            return -1
        return 0

    avg = sum(scores) / len(scores)

    if avg >= 3.5:
        return 1
    elif avg < 2.0:
        return -1
    return 0


def annotate_signs(G: nx.DiGraph) -> nx.DiGraph:
    """
    Iterates over all edges in G and sets the 'sign' attribute
    based on Cross-Parker survey columns if not already set.
    """
    for u, v, data in G.edges(data=True):
        if data.get("sign", 0) == 0:
            sign = derive_edge_sign(
                data.get("q1"),
                data.get("q2"),
                data.get("q3"),
                data.get("q4"),
                data.get("weight", 1.0),
            )
            G[u][v]["sign"] = sign
    return G


def compute_signed_balance_ratio(G: nx.DiGraph) -> Optional[float]:
    """
    Returns ratio of positive edges to total signed edges.
    Range: 0.0 (all negative) to 1.0 (all positive).
    Returns None if no signed edges exist.
    """
    edges = list(G.edges(data=True))
    positive = sum(1 for _, _, d in edges if d.get("sign") == 1)
    negative = sum(1 for _, _, d in edges if d.get("sign") == -1)
    total = positive + negative

    if total == 0:
        return None
    return round(positive / total, 4)


def find_unbalanced_triangles(G: nx.Graph) -> list:
    """
    Finds all structurally unbalanced triangles (frustrated cycles).
    Per Heider's balance theory:
      - Balanced triangle: 0 or 2 negative edges
      - Frustrated triangle: 1 or 3 negative edges

    Returns list of (u, v, w, neg_count) for frustrated triangles.
    """
    frustrated = []
    UG = G.to_undirected() if G.is_directed() else G

    for triangle in nx.enumerate_all_cliques(UG):
        if len(triangle) != 3:
            continue
        u, v, w = triangle

        neg_count = 0
        for a, b in [(u, v), (v, w), (u, w)]:
            sign = 0
            if G.has_edge(a, b):
                sign = G[a][b].get("sign", 0)
            elif G.has_edge(b, a):
                sign = G[b][a].get("sign", 0)
            if sign == -1:
                neg_count += 1

        if neg_count == 1 or neg_count == 3:
            frustrated.append((u, v, w, neg_count))

    return frustrated
