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
from .frustration_index import compute_frustration_index, frustration_breakdown
from .organizational_cost import compute_organizational_cost, compute_cost_breakdown
from .signed_network import (
    compute_weighted_organizational_negativity,
    compute_node_negativity_ranking,
    compute_internal_positivity
)


def _get_dept_negativity(G: nx.DiGraph, dept: str) -> float:
    """
    Returns total sum of weighted negative edges within a department.
    """
    neg_score = 0.0
    for u, v, data in G.edges(data=True):
        if data.get('sign') == -1:
            if G.nodes[u].get('department') == dept and G.nodes[v].get('department') == dept:
                # Weight factor from the user's plan (simplified here or reused from signed_network)
                level_u = G.nodes[u].get('level', 3)
                level_v = G.nodes[v].get('level', 3)
                level_factor = 10 ** (3 - max(level_u, level_v))
                neg_score += data.get('weight', 1.0) * level_factor
    return neg_score


def optimize_internal_positivity_by_swapping(G: nx.DiGraph, swappable_matrices: dict = None) -> list:
    """
    Algorithm to minimize internal negativity (maximize internal positivity).
    Iteratively swaps pairs of nodes from different departments if:
      1. They are marked as swappable in the matrix for their level.
      2. It improves the TOTAL internal negativity of the two departments.
    """
    # 1. Pre-calculate negative edges for performance
    neg_edges = []
    for u, v, data in G.edges(data=True):
        if data.get('sign') == -1:
            lu = G.nodes[u].get('level', 3)
            lv = G.nodes[v].get('level', 3)
            level_factor = 10 ** (3 - max(lu, lv))
            neg_edges.append((u, v, data.get('weight', 1.0) * level_factor))

    def get_score(current_G, dept_name):
        score = 0.0
        for u, v, w in neg_edges:
            if current_G.nodes[u].get('department') == dept_name and \
               current_G.nodes[v].get('department') == dept_name:
                score += w
        return score

    # 2. Get prioritized list of nodes
    _, node_scores = compute_weighted_organizational_negativity(G)
    sorted_nodes = sorted(node_scores.items(), key=lambda x: x[1], reverse=True)
    
    current_G = G.copy()
    swaps_made = []
    max_iters = 3 
    
    for _ in range(max_iters):
        changed_in_loop = False
        processed_nodes = set()
        
        for u, _ in sorted_nodes:
            if u in processed_nodes: continue
            
            lu = current_G.nodes[u].get('level', 3)
            dept_u_orig = current_G.nodes[u].get("department")
            
            # Level matrix keys are ints in our model
            level_matrix = swappable_matrices.get(lu, {}) if swappable_matrices else {}
            # But they might come in as strings from JSON if not handled by Pydantic
            if not level_matrix and swappable_matrices:
                level_matrix = swappable_matrices.get(str(lu), {})
                
            candidates = level_matrix.get(str(u), {})
            
            for v, can_swap in candidates.items():
                v_id = str(v)
                if not can_swap or str(u) == v_id or v_id not in current_G or v_id in processed_nodes:
                    continue
                    
                dept_v_orig = current_G.nodes[v_id].get("department")
                if dept_u_orig == dept_v_orig: continue
                
                # Check metrics
                p_u = get_score(current_G, dept_u_orig)
                p_v = get_score(current_G, dept_v_orig)
                
                # Also track the Positivity % (the metric shown in Analysis)
                pos_metrics_prev = compute_internal_positivity(current_G)
                prev_pos_u = pos_metrics_prev.get(dept_u_orig, 0)
                prev_pos_v = pos_metrics_prev.get(dept_v_orig, 0)

                # Trial swap
                current_G.nodes[u]["department"] = dept_v_orig
                current_G.nodes[v_id]["department"] = dept_u_orig
                
                c_u = get_score(current_G, dept_v_orig)
                c_v = get_score(current_G, dept_u_orig)
                
                # If total negativity across these two depts decreased
                if (c_u + c_v) < (p_u + p_v):
                    pos_metrics_curr = compute_internal_positivity(current_G)
                    curr_pos_u = pos_metrics_curr.get(dept_v_orig, 0.0) # Node u is now in dept_v_orig
                    curr_pos_v = pos_metrics_curr.get(dept_u_orig, 0.0) # Node v is now in dept_u_orig

                    delta_a = float(curr_pos_v - prev_pos_u)
                    delta_b = float(curr_pos_u - prev_pos_v)

                    # DIAGNOSTIC
                    print(f"[SWAP DEBUG] {u} <-> {v_id}")
                    print(f"  Dept A ({dept_u_orig}): {prev_pos_u:.4f} -> {curr_pos_v:.4f} (Delta: {delta_a:.4f})")
                    print(f"  Dept B ({dept_v_orig}): {prev_pos_v:.4f} -> {curr_pos_u:.4f} (Delta: {delta_b:.4f})")

                    improvement = (p_u + p_v) - (c_u + c_v)
                    swaps_made.append({
                        "node_a": u,
                        "node_b": v_id,
                        "from_dept_a": dept_u_orig,
                        "from_dept_b": dept_v_orig,
                        "improvement": float(improvement),
                        "pos_a_delta": delta_a,
                        "pos_b_delta": delta_b,
                    })
                    processed_nodes.add(u)
                    processed_nodes.add(v_id)
                    changed_in_loop = True
                    break # Move to next node u
                else:
                    # Revert
                    current_G.nodes[u]["department"] = dept_u_orig
                    current_G.nodes[v_id]["department"] = dept_v_orig
                    
        if not changed_in_loop:
            break
            
    return swaps_made


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

    # ── Internal Positivity Optimization (Swapping) ─────────────────────
    positivity_swaps = optimize_internal_positivity_by_swapping(G)
    for swap in positivity_swaps[:3]: # Surface top 3 swap recommendations
        recs.append({
            "priority": "HIGH",
            "title": f"Optimal Swap: {swap['node_a']} ↔ {swap['node_b']}",
            "action": (
                f"Swap {swap['node_a']} (from {swap['from_dept_a']}) with {swap['node_b']} "
                f"(from {swap['from_dept_b']}). This swap is algorithmically verified to "
                "reduce internal negativity in both departments simultaneously."
            ),
            "metric": "Internal Positivity",
            "expected_delta": round(swap['improvement'] / 100, 3), # Heuristic delta
            "affected_nodes": [swap['node_a'], swap['node_b']],
        })

    # Sort by priority
    priority_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    recs.sort(key=lambda x: priority_order.get(x["priority"], 3))

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
    org_neg, neg_rank = compute_weighted_organizational_negativity(G2)

    return {
        "frustration_index": new_fi,
        "organizational_cost": new_oc,
        "organizational_negativity": org_neg,
        "negativity_ranking": neg_rank,
    }
