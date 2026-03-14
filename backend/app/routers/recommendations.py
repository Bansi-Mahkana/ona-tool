from fastapi import APIRouter, HTTPException
from ..models.graph_models import GraphIn, RecommendationsOut
from ..services.graph_builder import build_nx_graph
from ..services.signed_network import annotate_signs
from ..services.frustration_index import compute_frustration_index
from ..services.organizational_cost import compute_organizational_cost, compute_cost_breakdown
from ..services.signed_network import compute_signed_balance_ratio
from ..services.recommender import generate_recommendations
import networkx as nx

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.post("/", response_model=RecommendationsOut)
async def get_recommendations(graph: GraphIn):
    """
    Generate prioritised structural recommendations for the given graph.
    """
    try:
        nodes = [n.model_dump() for n in graph.nodes]
        links = [l.model_dump() for l in graph.links]

        G = build_nx_graph(nodes, links)
        G = annotate_signs(G)
        UG = G.to_undirected()

        # Compute metrics for recommendation context
        connected = {u for u, v in G.edges()} | {v for u, v in G.edges()}
        isolated = len([n for n in G.nodes() if n not in connected])

        metrics = {
            "frustration_index": compute_frustration_index(G),
            "organizational_cost": compute_organizational_cost(G),
            "network_density": nx.density(G),
            "isolated_nodes": isolated,
            "signed_balance": compute_signed_balance_ratio(G),
        }

        recs = generate_recommendations(G, metrics)

        fi = metrics["frustration_index"]
        oc = metrics["organizational_cost"]
        summary = (
            f"Network analysis complete. "
            f"Frustration Index: {fi:.2f} ({'critical' if fi > 0.6 else 'moderate' if fi > 0.3 else 'healthy'}). "
            f"Organisational Cost: {oc:.2f} ({'critical' if oc > 0.6 else 'moderate' if oc > 0.3 else 'healthy'}). "
            f"{len(recs)} recommendation(s) generated."
        )

        return RecommendationsOut(
            recommendations=[{
                "priority": r["priority"],
                "title": r["title"],
                "action": r["action"],
                "metric": r["metric"],
                "expected_delta": r["expected_delta"],
                "affected_nodes": r.get("affected_nodes", []),
            } for r in recs],
            summary=summary,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
