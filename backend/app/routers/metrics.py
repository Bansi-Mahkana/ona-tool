from fastapi import APIRouter, UploadFile, File, HTTPException
from io import StringIO
import pandas as pd
import networkx as nx

from ..models.graph_models import GraphIn, MetricsOut
from ..services.graph_builder import build_nx_graph
from ..services.signed_network import (
    annotate_signs,
    compute_organizational_positivity,
    compute_internal_positivity,
    compute_organizational_balance,
    compute_internal_balance,
)
from ..services.frustration_index import compute_frustration_index, frustration_breakdown

router = APIRouter(prefix="/metrics", tags=["metrics"])


def _derive_sign(row) -> int:
    """Derive edge sign from Cross-Parker columns in a CSV row."""
    scores = []
    if "q1" in row and pd.notna(row["q1"]) and row["q1"] >= 0:
        scores.append(float(row["q1"]))
    if "q2" in row and pd.notna(row["q2"]) and row["q2"] >= 0:
        scores.append(float(row["q2"]))
    if "q3" in row and pd.notna(row["q3"]) and row["q3"] >= 0:
        scores.append(float(row["q3"]) / 6.0 * 5.0)
    if "q4" in row and pd.notna(row["q4"]) and row["q4"] >= 0:
        scores.append(float(row["q4"]) / 6.0 * 5.0)
    if not scores:
        return 0
    avg = sum(scores) / len(scores)
    if avg >= 3.5:
        return 1
    elif avg < 2.0:
        return -1
    return 0


@router.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    """
    Accept a CSV file, parse it, compute all metrics and return them.
    Also returns the graph data (nodes + edges) for the frontend.
    """
    try:
        contents = await file.read()
        df = pd.read_csv(StringIO(contents.decode("utf-8")))
        df.columns = [c.strip().lower() for c in df.columns]

        # Normalise column names
        col_map = {}
        for alias, canonical in [
            (["source", "from", "src"], "source"),
            (["target", "to", "tgt", "dest"], "target"),
            (["weight", "value", "strength"], "weight"),
            (["department_source", "dept_source", "dept"], "department_source"),
            (["department_target", "dept_target"], "department_target"),
        ]:
            for a in alias:
                if a in df.columns:
                    col_map[a] = canonical
                    break
        df = df.rename(columns=col_map)

        if "source" not in df.columns or "target" not in df.columns:
            raise HTTPException(400, "CSV must contain 'source' and 'target' columns.")

        if "weight" not in df.columns:
            df["weight"] = 1.0

        # Build node/edge lists
        node_map = {}
        edges = []
        for _, row in df.iterrows():
            src = str(row["source"])
            tgt = str(row["target"])
            dept_src = str(row.get("department_source", "Unknown"))
            dept_tgt = str(row.get("department_target", dept_src))

            if src not in node_map:
                node_map[src] = {"id": src, "department": dept_src, "label": src}
            if tgt not in node_map:
                node_map[tgt] = {"id": tgt, "department": dept_tgt, "label": tgt}

            sign = _derive_sign(row)
            edges.append({
                "source": src, "target": tgt,
                "weight": float(row.get("weight", 1)),
                "sign": sign,
                "q1": float(row["q1"]) if "q1" in row and pd.notna(row["q1"]) else None,
                "q2": float(row["q2"]) if "q2" in row and pd.notna(row["q2"]) else None,
                "q3": float(row["q3"]) if "q3" in row and pd.notna(row["q3"]) else None,
                "q4": float(row["q4"]) if "q4" in row and pd.notna(row["q4"]) else None,
            })

        nodes = list(node_map.values())
        G = build_nx_graph(nodes, edges)
        G = annotate_signs(G)
        UG = G.to_undirected()

        # Compute metrics
        fi = compute_frustration_index(G)
        
        org_positivity = compute_organizational_positivity(G)
        org_balance = compute_organizational_balance(G)
        int_positivity = compute_internal_positivity(G)
        int_balance = compute_internal_balance(G)

        fi_detail = frustration_breakdown(G)

        try:
            dc = {k: round(v, 4) for k, v in nx.degree_centrality(G).items()}
        except Exception:
            dc = {}

        return {
            "graph": {"nodes": nodes, "links": edges},
            "metrics": {
                "frustration_index": fi,
                "organizational_positivity": org_positivity,
                "organizational_balance": org_balance,
                "internal_positivity": int_positivity,
                "internal_balance": int_balance,
                "degree_centrality": dc,
            },
            "details": {
                "frustration": fi_detail,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing CSV: {str(e)}")
