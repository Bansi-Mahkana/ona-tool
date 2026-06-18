# Nexus - ONA (Organizational Network Analysis) Tool

An interactive web application for analysing, visualising, and optimising
organizational networks. 

## Features

- **Interactive signed network graph** — D3 force-directed, with positive/negative/neutral edge colours
- **Hierarchical org view** — department-grouped tree layout
- **Frustration Index (0–1)** — measures structural imbalance via Heider's balance theory (signed triangles)
- **Organisational Cost (0–1)** — measures information flow inefficiency (betweenness centrality, path length)
- **Cross-Parker survey integration** — derives signed edges from 4 ONA survey dimensions (Q1–Q4)
- **Drag-and-drop experimentation** — move employees between departments and see metric changes
- **Before/After comparison** — snapshot current state, apply changes, compare metrics
- **Algorithmic recommendations** — prioritised structural improvement suggestions

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

## Quick Start

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

### Frustration Index (0–1, lower is better)

Measures structural imbalance in the signed network based on Heider's
balance theory. A triangle is **frustrated** if it contains 1 or 3 negative
edges. The index is the ratio of frustrated to total triangles.

```
FI = frustrated_triangles / total_triangles
```

**Interpretation:**
- 0.0–0.3: Healthy — relationships are largely aligned
- 0.3–0.6: Moderate — some social tension present
- 0.6–1.0: Critical — widespread structural imbalance

### Organisational Cost (0–1, lower is better)

Composite measure of information flow inefficiency:

```
OC = 0.35 × betweenness_centralisation
   + 0.30 × normalised_avg_path_length
   + 0.20 × isolation_ratio
   + 0.15 × negative_edge_ratio
```

**Interpretation:**
- 0.0–0.3: Efficient — flat network, equitable load distribution
- 0.3–0.6: Moderate — some bottlenecks, manageable path lengths
- 0.6–1.0: Critical — centralised/fragmented, high coordination cost

### Signed Edge Signs (Cross-Parker)

| Q1–Q4 Average | Edge Sign |
|---------------|-----------|
| ≥ 3.5 | Positive (+1) |
| 2.0–3.4 | Neutral (0) |
| < 2.0 | Negative (−1) |

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
| Styling | Tailwind CSS + custom CSS variables |
| Backend framework | FastAPI |
| Graph algorithms | NetworkX 3.x |
| Data processing | Pandas + NumPy |

---
