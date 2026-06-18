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
import numpy as np
from typing import Optional, List, Dict, Any, Tuple


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
    Sets the 'sign' attribute for all edges and REMOVES neutral (sign 0) edges.
    Ensures 'no interaction' = 'no edge'.
    """
    to_remove = []
    for u, v, data in G.edges(data=True):
        sign = data.get("sign", 0)
        if sign == 0:
            # Try to derive from survey data if missing
            sign = derive_edge_sign(
                data.get("q1"),
                data.get("q2"),
                data.get("q3"),
                data.get("q4"),
                data.get("weight", 1.0),
            )
        
        if sign == 0:
            to_remove.append((u, v))
        else:
            G[u][v]["sign"] = sign
    
    # Purge neutral edges (the user's request: "there is no such thing as a neutral edge")
    G.remove_edges_from(to_remove)
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


def compute_organizational_positivity(G: nx.DiGraph) -> float:
    """Ratio of positive edges to total edges in the whole graph."""
    edges = list(G.edges(data=True))
    total_edges = len(edges)
    if total_edges == 0:
        return 0.0
    positive_edges = sum(1 for _, _, d in edges if d.get("sign") == 1)
    return round(positive_edges / total_edges, 4)


def compute_internal_positivity(G: nx.DiGraph) -> dict:
    """Ratio of positive internal edges to total internal edges per department."""
    internal = {}
    total_internal = {}
    positive_internal = {}

    for u, v, d in G.edges(data=True):
        dept_u = G.nodes[u].get("department", "Unknown")
        dept_v = G.nodes[v].get("department", "Unknown")

        if dept_u == dept_v:
            total_internal[dept_u] = total_internal.get(dept_u, 0) + 1
            if d.get("sign") == 1:
                positive_internal[dept_u] = positive_internal.get(dept_u, 0) + 1

    for dept, total in total_internal.items():
        internal[dept] = round(positive_internal.get(dept, 0) / total, 4) if total > 0 else 0.0

    # Ensure all departments are present
    all_depts = set(nx.get_node_attributes(G, 'department').values())
    for dept in all_depts:
        if dept not in internal:
            internal[dept] = 0.0

    return internal


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
    neg_ratio = n_neg / len(edges) if edges else 0

    degrees = [d for _, d in G.degree()]
    if not degrees:
        return neg_ratio

    avg = np.mean(degrees)
    std = np.std(degrees)
    cv = (std / avg) if avg > 0 else 0

    proxy = 0.5 * neg_ratio + 0.5 * min(cv / 3.0, 1.0)
    return round(min(proxy, 1.0), 4)


def compute_internal_balance(G: nx.DiGraph) -> dict:
    """Ratio of balanced triangles within each department."""
    internal_bal = {}
    all_depts = set(nx.get_node_attributes(G, 'department').values())

    for dept in all_depts:
        # Subgraph of nodes belonging to this department
        nodes = [n for n, d in G.nodes(data=True) if d.get('department') == dept]
        if not nodes:
            internal_bal[dept] = 0.0
            continue
        S = G.subgraph(nodes)
        res = compute_triadic_metrics(S)
        internal_bal[dept] = res["balance_ratio"]

    return internal_bal


def compute_triadic_metrics(G: nx.DiGraph) -> dict:
    """
    Unified function to find all triangles and categorize them.
    Ensures that Balance + Frustration = 1.0.
    """
    UG = G.to_undirected() if G.is_directed() else G
    total_triangles = 0
    balanced_triangles = 0
    frustrated_triangles = 0

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

        total_triangles += 1
        if neg_count == 0 or neg_count == 2:
            balanced_triangles += 1
        else:
            frustrated_triangles += 1

    if total_triangles == 0:
        proxy_fi = _structural_proxy(G)
        return {
            "total": 0,
            "balanced": 0,
            "frustrated": 0,
            "balance_ratio": round(1 - proxy_fi, 4),
            "frustration_ratio": proxy_fi
        }

    return {
        "total": total_triangles,
        "balanced": balanced_triangles,
        "frustrated": frustrated_triangles,
        "balance_ratio": round(balanced_triangles / total_triangles, 4),
        "frustration_ratio": round(frustrated_triangles / total_triangles, 4)
    }


def compute_organizational_balance(G: nx.DiGraph) -> float:
    """Ratio of balanced triangles to total triangles."""
    res = compute_triadic_metrics(G)
    return res["balance_ratio"]


def compute_hierarchical_metrics(G: nx.DiGraph):
    """
    Computes Positivity and Balance at 3 hierarchical levels based on ID depth.
    - 0.X       -> Executive
    - 0.X.Y     -> Division
    - 0.X.Y.Z   -> Group
    """
    results = {
        "executive": {"positivity": {}, "balance": {}},
        "division":  {"positivity": {}, "balance": {}},
        "group":     {"positivity": {}, "balance": {}}
    }
    
    def _get_node_metrics(node_id):
        # We look at the internal relationships of this specific node/unit
        # Or if it has children, the relationships among its children.
        sub_nodes = [n for n in G.nodes() if str(n).startswith(node_id + '.') or str(n) == node_id]
        S = G.subgraph(sub_nodes)
        if not S.edges: return 0.0, 0.0
        
        pos = sum(1 for _, _, d in S.edges(data=True) if d.get("sign") == 1)
        pr = round(pos / len(S.edges), 4)
        br = compute_triadic_metrics(S)["balance_ratio"]
        return pr, br

    for n in G.nodes():
        node_id = str(n)
        dot_count = node_id.count('.')
        
        # Calculate metrics for this unit (it and its children)
        pr, br = _get_node_metrics(node_id)

        if dot_count == 1: # 0.1
            results["executive"]["positivity"][node_id] = pr
            results["executive"]["balance"][node_id] = br
        elif dot_count == 2: # 0.1.1
            results["division"]["positivity"][node_id] = pr
            results["division"]["balance"][node_id] = br
        elif dot_count == 3: # 0.1.1.1 (Group level - stop here)
            results["group"]["positivity"][node_id] = pr
            results["group"]["balance"][node_id] = br

    # Diagnostic
    print(f"[HIERARCHY] Exec: {len(results['executive']['positivity'])}, Div: {len(results['division']['positivity'])}, Group: {len(results['group']['positivity'])}")
    
    return results

from collections import defaultdict

def compute_weighted_organizational_negativity(G: nx.DiGraph, max_level: int = 3) -> tuple[float, dict]:
    """
    Computes overall organizational negativity and node rankings in a single pass.
    Formula: neg_score / total_score
    Weight Factor: 10 ^ (max_level - max(level_u, level_v))
    Returns (overall_score, ranking_dict).
    """
    if not G.edges:
        return 0.0, {}

    total_score = 0.0
    neg_score = 0.0
    node_scores = defaultdict(float)

    for u, v, data in G.edges(data=True):
        sign = data.get('sign', 0)
        edge_weight = data.get('weight', 1.0)

        # Ensure levels exist (default to max_level if missing)
        lu = G.nodes[u].get('level', max_level)
        lv = G.nodes[v].get('level', max_level)

        # Hierarchy importance factor: 10 ** (max_level - max(lu, lv))
        level_factor = 10 ** (max_level - max(lu, lv))

        # FINAL EDGE SCORE
        score = edge_weight * level_factor
        total_score += score

        if sign == -1:
            neg_score += score
            # Accumulate risk for both involved nodes
            node_scores[u] += score
            node_scores[v] += score

    overall = round(neg_score / total_score, 4) if total_score > 0 else 0.0
    
    # DIAGNOSTIC LOGGING (Visible in Uvicorn terminal)
    print(f"\n[NEGATIVITY CALC] Total Weighted Score: {total_score:.2f}")
    print(f"[NEGATIVITY CALC] Neg Weighted Score: {neg_score:.2f}")
    print(f"[NEGATIVITY CALC] Final Ratio: {overall:.4f}")
    print(f"[NEGATIVITY CALC] Ranking Nodes Found: {len(node_scores)}")

    return overall, dict(node_scores)


def compute_node_negativity_ranking(G: nx.DiGraph) -> dict:
    """
    Wraps the comprehensive calculation to return just the ranking.
    """
    _, ranking = compute_weighted_organizational_negativity(G)
    return ranking
