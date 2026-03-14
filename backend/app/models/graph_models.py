from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class EdgeIn(BaseModel):
    source: str
    target: str
    weight: float = 1.0
    sign: int = 0        # +1 positive, -1 negative, 0 neutral
    q1: Optional[float] = None
    q2: Optional[float] = None
    q3: Optional[float] = None
    q4: Optional[float] = None

class NodeIn(BaseModel):
    id: str
    department: str = "Unknown"
    label: Optional[str] = None

class GraphIn(BaseModel):
    nodes: List[NodeIn]
    links: List[EdgeIn]

class MetricsOut(BaseModel):
    frustration_index: float
    organizational_cost: float
    network_density: float
    avg_path_length: Optional[float]
    clustering_coefficient: float
    bridge_count: int
    isolated_nodes: int
    signed_balance: Optional[float]
    degree_centrality: Dict[str, float]
    betweenness_centrality: Dict[str, float]
    eigenvector_centrality: Dict[str, float]

class RecommendationOut(BaseModel):
    priority: str          # HIGH | MEDIUM | LOW
    title: str
    action: str
    metric: str
    expected_delta: float
    affected_nodes: List[str] = []

class RecommendationsOut(BaseModel):
    recommendations: List[RecommendationOut]
    summary: str

class ChangeRequest(BaseModel):
    """Represents a proposed structural change to re-evaluate metrics."""
    moves: List[Dict[str, str]] = []           # [{nodeId, newDepartment}]
    add_edges: List[Dict[str, str]] = []        # [{source, target}]
    remove_edges: List[Dict[str, str]] = []     # [{source, target}]
