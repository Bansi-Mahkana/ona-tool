from fastapi import APIRouter, HTTPException
from ..models.graph_models import OptimizationRequest, OptimizationOut, SwapOutcome
from ..services.graph_builder import build_nx_graph
from ..services.signed_network import annotate_signs
from ..services.recommender import optimize_internal_positivity_by_swapping

router = APIRouter(prefix="/optimization", tags=["optimization"])

@router.post("/run-swap", response_model=OptimizationOut)
async def run_swap_optimization(req: OptimizationRequest):
    """
    Executes the Internal Positivity Maximization algorithm.
    Takes the current graph and the level-specific swappable matrices.
    """
    try:
        # 1. Build Graph
        nodes = [n.model_dump() for n in req.nodes]
        links = [l.model_dump() for l in req.links]
        
        G = build_nx_graph(nodes, links)
        G = annotate_signs(G)
        
        # 2. Run Algorithm
        swaps = optimize_internal_positivity_by_swapping(G, req.swappable_matrices)
        
        # 3. Format Response
        out = []
        for s in swaps:
            out.append(SwapOutcome(
                node_a=str(s["node_a"]),
                node_b=str(s["node_b"]),
                from_dept_a=s["from_dept_a"],
                from_dept_b=s["from_dept_b"],
                improvement=float(s["improvement"]),
                pos_a_delta=float(s.get("pos_a_delta", 0)),
                pos_b_delta=float(s.get("pos_b_delta", 0)),
            ))
            
        summary = f"Optimization complete. {len(swaps)} swap(s) recommended to maximize internal positivity."
        
        return OptimizationOut(swaps=out, summary=summary)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")
