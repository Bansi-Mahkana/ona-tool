# ONA Tool — Organisational Network Analysis

An interactive web application for analysing, visualising, and optimising
organisational networks. Built for the **Network Science** course.

## Features

- **Interactive signed network graph** — D3 force-directed, with positive/negative edge colours (neutral edges are filtered)
- **Hierarchical org view** — department-grouped tree layout with level-based weighting
- **Frustration Index (0–1)** — measures structural imbalance via Heider's balance theory
- **Weighted Organisational Negativity (0–1)** — measures hierarchical risk by weighting negative interactions at higher levels
- **Organisational Cost (0–1)** — measures information flow inefficiency (bottlenecks, path length, isolation)
- **Cross-Parker survey integration** — derives signed edges (+1, -1) from survey dimensions
- **Drag-and-drop experimentation** — move employees between departments and see metric changes
- **Before/After comparison** — snapshot current state, apply changes, compare metrics
- **Algorithmic recommendations** — prioritised structural improvement suggestions based on negativity and cost

---

## Project Structure

```
ona-tool/
├── frontend/           React + Vite + D3.js + Zustand
│   └── src/
│       ├── pages/          Landing · Upload · Analysis · Recommendations
│       ├── components/     NetworkGraph · HierarchyGraph · MetricGauge · RecommendationPanel
│       ├── store/          Zustand global state
│       ├── hooks/          useNetworkData (backend integration)
│       └── utils/          csvParser · metricHelpers
│
├── backend/            FastAPI + NetworkX + Pandas
│   └── app/
│       ├── routers/        /api/network · /api/metrics · /api/recommendations
│       ├── services/       graph_builder · signed_network · frustration_index
│       │                   organizational_cost · recommender
│       └── models/         Pydantic schemas
│
├── sample_data/
│   ├── cross_parker_sample.csv    15-person, 5-dept example with Q1–Q4
│   └── README.md                  Dataset format documentation
│
└── docker-compose.yml
```

---

## Quick Start (Without Docker)

### 1. Backend

```bash
cd ona-tool/backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate          # macOS/Linux
# venv\Scripts\activate           # Windows

pip install -r requirements.txt

uvicorn app.main:app --reload --port 8000
# API docs: http://localhost:8000/docs
```

### 2. Frontend

```bash
cd ona-tool/frontend

npm install
npm run dev
# App: http://localhost:3000
```

The frontend works **fully offline** (client-side metric estimates).
When the backend is running, it automatically upgrades estimates to
full NetworkX results in the background.

---

## Quick Start (With Docker)

```bash
cd ona-tool
docker-compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000/docs
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/metrics/upload-csv` | Upload CSV, get full metrics |
| `POST` | `/api/network/metrics` | Compute metrics from JSON graph |
| `POST` | `/api/network/simulate` | Simulate structural change, get metric delta |
| `POST` | `/api/recommendations/` | Get prioritised recommendations |
| `GET`  | `/api/health` | Health check |

Full interactive docs at `http://localhost:8000/docs` (Swagger UI).

---

## Metrics Reference

### Weighted Organisational Negativity (0–1, lower is better)

The primary metric for hierarchical risk. It weights every interaction based on the seniority of the participants (defined by their `level` in the hierarchy).

```
Score(u, v) = edge_weight * 10^(max_level - max(level_u, level_v))
WON = sum(Scores of Negative Edges) / sum(Scores of All Edges)
```

Negative edges at the Executive level (e.g., Level 0) are weighted significantly more than those at the Group level (e.g., Level 3).

### Frustration Index (0–1, lower is better)

Measures structural imbalance in the signed network based on Heider's balance theory. A triangle is **frustrated** if it contains 1 or 3 negative edges. The index is the ratio of frustrated to total triangles. Note that neutral edges are removed prior to this calculation, treating only functional positive/negative ties.

```
FI = frustrated_triangles / total_triangles
```

### Signed Edge Signs (Cross-Parker)

The tool operates on a binary sign system for finalized analysis. "There is no such thing as a neutral edge"—ambivalent interactions are removed to focus on active structural components.

| Composite Score | Edge Sign | Status |
|---------------|-----------|--------|
| ≥ 3.5 | Positive (+1) | Active Tie |
| < 2.0 | Negative (−1) | Conflict Tie |
| 2.0–3.4 | Neutral (0) | **Filtered Out** |

---

## CSV Format

See `sample_data/README.md` for full documentation.

Minimum required columns: `source`, `target`
Optional: `weight`, `department_source`, `department_target`, `q1`, `q2`, `q3`, `q4`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 18 + Vite |
| Graph visualisation | D3.js v7 |
| State management | Zustand |
| Routing | React Router v6 |
| CSV parsing | PapaParse |
| Styling | Tailwind CSS + custom CSS variables |
| Backend framework | FastAPI |
| Graph algorithms | NetworkX 3.x |
| Data processing | Pandas + NumPy |
| Containerisation | Docker + docker-compose |

---

## References

- Cross, R. & Parker, A. (2004). *The Hidden Power of Social Networks*. Harvard Business School Press.
- Harary, F. (1953). On the notion of balance of a signed graph. *Michigan Mathematical Journal*.
- Freeman, L.C. (1977). A set of measures of centrality based on betweenness. *Sociometry*.
- Borgatti, S.P. (2005). Centrality and network flow. *Social Networks*.
- Heider, F. (1946). Attitudes and cognitive organisation. *Journal of Psychology*.
