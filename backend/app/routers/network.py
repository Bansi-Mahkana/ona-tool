"""
network.py — FastAPI router for graph analysis endpoints.
"""
from fastapi import APIRouter, HTTPException
import networkx as nx
import numpy as np

from ..models.graph_models import GraphIn, MetricsOut, ChangeRequest
from ..services.graph_builder import build_nx_graph, build_undirected
from ..services.signed_network import annotate_signs, compute_signed_balance_ratio
from ..services.frustration_index import compute_frustration_index
from ..services.organizational_cost import compute_organizational_cost

router = APIRouter(prefix="/network", tags=["network"])


@router.post("/metrics", response_model=MetricsOut)
async def compute_metrics(graph: GraphIn):
    """
    Full metric computation for the uploaded graph.
    Accepts nodes + edges, returns all ONA metrics.
    """
    try:
        nodes = [n.model_dump() for n in graph.nodes]
        links = [l.model_dump() for l in graph.links]

        G = build_nx_graph(nodes, links)
        G = annotate_signs(G)
        UG = build_undirected(G)

        # ── Core metrics ──────────────────────────────────────────────────
        frustration_index = compute_frustration_index(G)
        organizational_cost = compute_organizational_cost(G)
        network_density = nx.density(G)

        # Average path length (largest connected component)
        avg_path_length = None
        try:
            if nx.is_connected(UG):
                avg_path_length = round(nx.average_shortest_path_length(UG), 4)
            else:
                largest_cc = max(nx.connected_components(UG), key=len)
                sub = UG.subgraph(largest_cc)
                if len(sub) > 1:
                    avg_path_length = round(nx.average_shortest_path_length(sub), 4)
        except Exception:
            pass

        # Clustering coefficient
        try:
            clustering = round(nx.average_clustering(UG), 4)
        except Exception:
            clustering = 0.0

        # Bridges
        try:
            bridge_count = len(list(nx.bridges(UG)))
        except Exception:
            bridge_count = 0

        # Isolated nodes
        connected_nodes = {u for u, v in G.edges()} | {v for u, v in G.edges()}
        isolated_nodes = len([n for n in G.nodes() if n not in connected_nodes])

        # Signed balance
        signed_balance = compute_signed_balance_ratio(G)

        # ── Centrality measures ───────────────────────────────────────────
        try:
            degree_centrality = {k: round(v, 4) for k, v in nx.degree_centrality(G).items()}
        except Exception:
            degree_centrality = {}

        try:
            betweenness_centrality = {k: round(v, 4) for k, v in nx.betweenness_centrality(UG, normalized=True).items()}
        except Exception:
            betweenness_centrality = {}

        try:
            eigenvector_centrality = {k: round(v, 4) for k, v in nx.eigenvector_centrality(UG, max_iter=200).items()}
        except Exception:
            eigenvector_centrality = {}

        return MetricsOut(
            frustration_index=frustration_index,
            organizational_cost=organizational_cost,
            network_density=round(network_density, 4),
            avg_path_length=avg_path_length,
            clustering_coefficient=clustering,
            bridge_count=bridge_count,
            isolated_nodes=isolated_nodes,
            signed_balance=signed_balance,
            degree_centrality=degree_centrality,
            betweenness_centrality=betweenness_centrality,
            eigenvector_centrality=eigenvector_centrality,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/simulate")
async def simulate_change(graph: GraphIn, change: ChangeRequest):
    """
    Simulate a structural change (move nodes, add/remove edges)
    and return the resulting metric deltas.
    """
    try:
        nodes = [n.model_dump() for n in graph.nodes]
        links = [l.model_dump() for l in graph.links]
        G = build_nx_graph(nodes, links)
        G = annotate_signs(G)

        from ..services.recommender import simulate_change as _sim
        change_dict = change.model_dump()
        new_metrics = _sim(G, change_dict)

        # Original metrics for comparison
        orig_fi = compute_frustration_index(G)
        orig_oc = compute_organizational_cost(G)

        return {
            "original": {"frustration_index": orig_fi, "organizational_cost": orig_oc},
            "after_change": new_metrics,
            "delta": {
                "frustration_index": round(new_metrics["frustration_index"] - orig_fi, 4),
                "organizational_cost": round(new_metrics["organizational_cost"] - orig_oc, 4),
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
