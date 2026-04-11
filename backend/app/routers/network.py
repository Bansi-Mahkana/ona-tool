"""
network.py — FastAPI router for graph analysis endpoints.
"""
from fastapi import APIRouter, HTTPException
import networkx as nx
import numpy as np

from ..models.graph_models import GraphIn, MetricsOut, ChangeRequest
from ..services.graph_builder import build_nx_graph, build_undirected
from ..services.signed_network import (
    annotate_signs,
    compute_organizational_positivity,
    compute_organizational_balance,
    compute_hierarchical_metrics,
)
from ..services.frustration_index import compute_frustration_index

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
        
        # New Positivity and Balance metrics
        org_positivity = compute_organizational_positivity(G)
        org_balance = compute_organizational_balance(G)
        h_metrics = compute_hierarchical_metrics(G)

        # ── Centrality measures ───────────────────────────────────────────
        try:
            degree_centrality = {k: round(v, 4) for k, v in nx.degree_centrality(G).items()}
        except Exception:
            degree_centrality = {}

        return MetricsOut(
            frustration_index=frustration_index,
            organizational_positivity=org_positivity,
            organizational_balance=org_balance,
            executive=h_metrics["executive"],
            division=h_metrics["division"],
            group=h_metrics["group"],
            degree_centrality=degree_centrality,
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
        orig_org_positivity = compute_organizational_positivity(G)
        orig_org_balance = compute_organizational_balance(G)

        return {
            "original": {
                "frustration_index": orig_fi, 
                "organizational_positivity": orig_org_positivity,
                "organizational_balance": orig_org_balance
            },
            "after_change": new_metrics,
            "delta": {
                "frustration_index": round(new_metrics.get("frustration_index", orig_fi) - orig_fi, 4),
                "organizational_positivity": round(new_metrics.get("organizational_positivity", orig_org_positivity) - orig_org_positivity, 4),
                "organizational_balance": round(new_metrics.get("organizational_balance", orig_org_balance) - orig_org_balance, 4),
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
