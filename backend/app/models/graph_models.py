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

class TieredMetrics(BaseModel):
    positivity: Dict[str, float]
    balance: Dict[str, float]

class MetricsOut(BaseModel):
    frustration_index: float
    organizational_positivity: float
    organizational_balance: float
    # Hierarchical tiers
    executive: TieredMetrics
    division: TieredMetrics
    group: TieredMetrics
    degree_centrality: Dict[str, float]
    organizational_negativity: float
    negativity_ranking: Dict[str, float]
    internal_positivity: Dict[str, float]
    internal_balance: Dict[str, float]

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


class SwappableMatrix(BaseModel):
    level: int
    matrix: Dict[str, Dict[str, int]]  # {nodeId_u: {nodeId_v: 0|1}}


class OptimizationRequest(BaseModel):
    nodes: List[NodeIn]
    links: List[EdgeIn]
    swappable_matrices: Dict[int, Dict[str, Dict[str, int]]] # level -> matrix


class SwapOutcome(BaseModel):
    node_a: str
    node_b: str
    from_dept_a: str
    from_dept_b: str
    improvement: float
    pos_a_delta: float = 0.0
    pos_b_delta: float = 0.0


class OptimizationOut(BaseModel):
    swaps: List[SwapOutcome]
    summary: str
