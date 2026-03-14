"""
csv_handler.py — utility helpers for CSV ingestion on the backend.
"""
import pandas as pd
from io import StringIO
from typing import Tuple, List, Dict


COLUMN_ALIASES = {
    "source": ["source", "src", "from", "node_a", "person_a"],
    "target": ["target", "tgt", "to", "dest", "node_b", "person_b"],
    "weight": ["weight", "value", "strength", "frequency", "intensity"],
    "department_source": ["department_source", "dept_source", "dept_a", "department", "dept", "team"],
    "department_target": ["department_target", "dept_target", "dept_b"],
    "q1": ["q1", "advice_freq", "information_frequency"],
    "q2": ["q2", "expertise", "expertise_recognition"],
    "q3": ["q3", "info_usefulness", "information_usefulness"],
    "q4": ["q4", "knowledge_awareness", "knowledge"],
}


def normalise_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Rename columns to canonical names using alias mapping."""
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    rename = {}
    for canonical, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            if alias in df.columns and canonical not in df.columns:
                rename[alias] = canonical
                break
    return df.rename(columns=rename)


def validate_dataframe(df: pd.DataFrame) -> Tuple[bool, str]:
    """Check required columns exist and data is non-empty."""
    if df.empty:
        return False, "CSV file is empty."
    if "source" not in df.columns:
        return False, "Missing required column: 'source' (or alias: from, src, node_a)."
    if "target" not in df.columns:
        return False, "Missing required column: 'target' (or alias: to, dest, node_b)."
    return True, ""


def df_to_graph_payload(df: pd.DataFrame, sign_fn) -> Tuple[List[Dict], List[Dict]]:
    """
    Convert a normalised DataFrame to nodes/edges lists.
    sign_fn(row) -> int: derives sign from row data.
    """
    node_map = {}
    edges = []

    for _, row in df.iterrows():
        src = str(row["source"]).strip()
        tgt = str(row["target"]).strip()
        if not src or not tgt or src == tgt:
            continue

        dept_src = str(row.get("department_source", "Unknown")).strip()
        dept_tgt = str(row.get("department_target", dept_src)).strip()

        if src not in node_map:
            node_map[src] = {"id": src, "department": dept_src, "label": src}
        if tgt not in node_map:
            node_map[tgt] = {"id": tgt, "department": dept_tgt, "label": tgt}

        try:
            weight = float(row.get("weight", 1))
        except (ValueError, TypeError):
            weight = 1.0

        def safe_q(col):
            val = row.get(col)
            if val is None or (isinstance(val, float) and pd.isna(val)):
                return None
            try:
                return float(val)
            except (ValueError, TypeError):
                return None

        sign = sign_fn(row)

        edges.append({
            "source": src,
            "target": tgt,
            "weight": weight,
            "sign": sign,
            "q1": safe_q("q1"),
            "q2": safe_q("q2"),
            "q3": safe_q("q3"),
            "q4": safe_q("q4"),
        })

    return list(node_map.values()), edges
