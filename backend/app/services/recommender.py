"""
recommender.py

Generates data-driven structural recommendations to optimise
Frustration Index and Organisational Cost.

Each recommendation includes:
  - Priority (HIGH / MEDIUM / LOW)
  - Specific action targeting identified structural weakness
  - Expected metric delta
  - Affected nodes
"""
import networkx as nx
from .frustration_index import frustration_breakdown
from .organizational_cost import compute_cost_breakdown
from .frustration_index import compute_frustration_index
from .organizational_cost import compute_organizational_cost


def generate_recommendations(G: nx.DiGraph, metrics: dict) -> list:
    """
    Returns a list of recommendation dicts ordered by priority.
    """
    recs = []
    fi = metrics.get("frustration_index", 0)
    oc = metrics.get("organizational_cost", 0)

    fi_detail = frustration_breakdown(G)
    oc_detail = compute_cost_breakdown(G)

    # ── Frustration Index recommendations ─────────────────────────────────
    if fi > 0.5:
        top_nodes = [x["node"] for x in fi_detail.get("top_frustrated_nodes", [])]
        recs.append({
            "priority": "HIGH",
            "title": "Resolve Frustrated Triangles",
            "action": (
                f"The network has {fi_detail['frustrated_triangles']} frustrated triangle(s) "
                f"out of {fi_detail['total_triangles']} total. "
                f"Focus on nodes: {', '.join(top_nodes[:3]) if top_nodes else 'see graph'}. "
                "Consider restructuring reporting lines or facilitating direct communication between these individuals."
            ),
            "metric": "Frustration Index",
            "expected_delta": -0.15,
            "affected_nodes": top_nodes[:5],
        })

    if fi_detail.get("negative_edges", 0) > 0:
        neg_count = fi_detail["negative_edges"]
        recs.append({
            "priority": "HIGH" if neg_count > 3 else "MEDIUM",
            "title": f"Address {neg_count} Negative Tie(s)",
            "action": (
                f"Found {neg_count} negative edge(s) based on survey responses. "
                "Negative ties (low advice-seeking, low expertise recognition) create structural tension. "
                "Recommend: knowledge-sharing workshops, cross-functional pairing, or mentoring assignments "
                "to convert negative ties to neutral/positive."
            ),
            "metric": "Frustration Index",
            "expected_delta": -round(min(neg_count * 0.04, 0.2), 3),
            "affected_nodes": [],
        })

    # ── Organisational Cost recommendations ───────────────────────────────
    if oc > 0.5:
        bottlenecks = oc_detail.get("top_bottleneck_nodes", [])
        bn_names = [b["node"] for b in bottlenecks]
        recs.append({
            "priority": "HIGH",
            "title": "Reduce Bottleneck Dependency",
            "action": (
                f"Nodes {', '.join(bn_names) if bn_names else 'see graph'} have disproportionately "
                "high betweenness centrality — most information routes through them. "
                "Create direct peer connections between teams that currently communicate only through these nodes. "
                "This will reduce single points of failure and lower organisational cost."
            ),
            "metric": "Organisational Cost",
            "expected_delta": -0.14,
            "affected_nodes": bn_names,
        })

    if oc_detail.get("avg_path_length", 1) > 3.0:
        recs.append({
            "priority": "MEDIUM",
            "title": "Shorten Average Path Length",
            "action": (
                f"Average path length is {oc_detail['avg_path_length']:.2f} hops. "
                "Information takes too long to propagate. "
                "Introduce bridging roles or cross-department communication channels "
                "(e.g., weekly syncs, shared project teams) to create shortcuts in the network."
            ),
            "metric": "Organisational Cost",
            "expected_delta": -0.10,
            "affected_nodes": [],
        })

    # ── Isolated nodes ────────────────────────────────────────────────────
    isolated = oc_detail.get("isolated_nodes", [])
    if isolated:
        recs.append({
            "priority": "MEDIUM",
            "title": f"Integrate {len(isolated)} Isolated Node(s)",
            "action": (
                f"Node(s) {', '.join(isolated[:5])} have no connections. "
                "Assign them to cross-functional project teams or pair them with mentors. "
                "Even 1-2 new connections per isolated node significantly improves density and reduces cost."
            ),
            "metric": "Network Density",
            "expected_delta": 0.07,
            "affected_nodes": isolated[:5],
        })

    # ── Signed balance ────────────────────────────────────────────────────
    signed_balance = metrics.get("signed_balance")
    if signed_balance is not None and signed_balance < 0.6:
        recs.append({
            "priority": "MEDIUM",
            "title": "Improve Structural Balance",
            "action": (
                f"Signed balance ratio is {signed_balance:.2f} (target: ≥0.7). "
                "Per Heider's balance theory, networks tend to stabilise around balanced states. "
                "Low balance indicates social tension. "
                "Recommendation: focus Q2 (expertise recognition) workshops — "
                "improving how employees perceive each other's expertise converts neutral/negative ties to positive."
            ),
            "metric": "Signed Balance",
            "expected_delta": 0.12,
            "affected_nodes": [],
        })

    # ── Healthy fallback ──────────────────────────────────────────────────
    if not recs:
        recs.append({
            "priority": "LOW",
            "title": "Network is Well-Balanced",
            "action": (
                "Current metrics indicate a healthy organisational network. "
                "Frustration Index and Organisational Cost are within acceptable ranges. "
                "Recommendation: run quarterly ONA surveys and monitor for emerging bottlenecks as the org scales."
            ),
            "metric": "All Metrics",
            "expected_delta": 0.0,
            "affected_nodes": [],
        })

    # Sort by priority
    priority_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    recs.sort(key=lambda r: priority_order.get(r["priority"], 3))

    return recs


def simulate_change(G: nx.DiGraph, change: dict) -> dict:
    """
    Apply a set of structural changes to a copy of the graph
    and return the resulting metrics delta.

    change = {
        moves: [{nodeId, newDepartment}],
        add_edges: [{source, target}],
        remove_edges: [{source, target}],
    }
    """
    import copy
    G2 = copy.deepcopy(G)

    # Apply edge changes
    for edge in change.get("add_edges", []):
        src, tgt = edge["source"], edge["target"]
        if not G2.has_edge(src, tgt):
            G2.add_edge(src, tgt, weight=3, sign=0)

    for edge in change.get("remove_edges", []):
        src, tgt = edge["source"], edge["target"]
        if G2.has_edge(src, tgt):
            G2.remove_edge(src, tgt)

    # Apply node moves (update department attribute)
    for move in change.get("moves", []):
        node_id = move["nodeId"]
        new_dept = move["newDepartment"]
        if node_id in G2.nodes:
            G2.nodes[node_id]["department"] = new_dept

    new_fi = compute_frustration_index(G2)
    new_oc = compute_organizational_cost(G2)

    return {
        "frustration_index": new_fi,
        "organizational_cost": new_oc,
    }
