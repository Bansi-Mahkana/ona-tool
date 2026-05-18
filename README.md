# ONA Tool — Organizational Network Analysis

An interactive web application for analysing, visualising, and optimising
organizational networks. 

## Features

- **Interactive signed network graph** — D3 force-directed, with positive/negative/neutral edge colours
- **Hierarchical org view** — department-grouped tree layout
- **Performance metrics** - Internal Positivity, Organizational Positivity, Internal Balance, Organizational Balance, Level-sensitive Organizational Negativity, and Node-level Negativity Ranking
- **Cross-Parker survey integration** — derives signed edges from 4 ONA survey dimensions (Q1–Q4)
- **Drag-and-drop experimentation** — move employees between departments and see metric changes
- **Before/After comparison** — snapshot current state, apply changes, compare metrics
- **Algorithmic recommendations** — interactive what-if analysis via operations like employee swaps and removals

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
