# ONA Tool — Dataset Format Guide

## Supported Format: CSV Edge List

Each row represents a directed relationship (edge) from one person to another.

### Required Columns

| Column | Description | Example |
|--------|-------------|---------|
| `source` | Name/ID of the relationship originator | `Alice` |
| `target` | Name/ID of the relationship recipient | `Bob` |

### Optional Columns

| Column | Description | Scale | Notes |
|--------|-------------|-------|-------|
| `weight` | Strength of the relationship | Any positive number | Defaults to 1 if omitted |
| `department_source` | Department of source person | Text | Used for org hierarchy view |
| `department_target` | Department of target person | Text | Defaults to `department_source` if omitted |
| `q1` | Cross-Parker Q1: Advice frequency | 0–5 | 0=Don't know, 5=Very Often |
| `q2` | Cross-Parker Q2: Expertise recognition | 0–5 | 0=Don't know, 5=Strongly Agree |
| `q3` | Cross-Parker Q3: Information usefulness | 0–6 | 0=Never met, 6=Very Frequently |
| `q4` | Cross-Parker Q4: Knowledge awareness | 0–6 | 0=Never met, 6=Strongly Agree |

### Column Name Aliases

The tool accepts many common column name variants:

| Canonical | Also accepted |
|-----------|---------------|
| `source` | `from`, `src`, `node_a`, `person_a` |
| `target` | `to`, `dest`, `node_b`, `person_b` |
| `weight` | `value`, `strength`, `frequency` |
| `department_source` | `dept_source`, `department`, `dept`, `team` |

---

## Cross-Parker Survey Questions (Background)

These four questions come from the well-known Cross & Parker (2004) dataset on
Organisational Network Analysis:

**Q1 — Advice/Information Frequency**
> "Please indicate how often you have turned to this person for information or
> advice on work-related topics in the past three months."
>
> Scale: 0 (Do Not Know) · 1 (Never) · 2 (Seldom) · 3 (Sometimes) · 4 (Often) · 5 (Very Often)

**Q2 — Expertise Recognition**
> "In general, this person has expertise in areas that are important in the kind
> of work I do."
>
> Scale: 0 (Do Not Know) · 1 (Strongly Disagree) · 2 (Disagree) · 3 (Neutral) · 4 (Agree) · 5 (Strongly Agree)

**Q3 — Information Usefulness**
> "Please indicate the extent to which the people listed below provide you with
> information you use to accomplish your work."
>
> Scale: 0 (Never Met) · 1 (Very Infrequently) · 2 (Infrequently) · 3 (Somewhat Infrequently) · 4 (Somewhat Frequently) · 5 (Frequently) · 6 (Very Frequently)

**Q4 — Knowledge Awareness**
> "I understand this person's knowledge and skills."
>
> Scale: 0 (Never Met) · 1 (Strongly Disagree) · 2 (Disagree) · 3 (Somewhat Disagree) · 4 (Somewhat Agree) · 5 (Agree) · 6 (Strongly Agree)

---

## Signed Edge Derivation

When Q1–Q4 columns are present, the tool automatically assigns edge signs:

| Composite Score | Sign | Meaning |
|-----------------|------|---------|
| ≥ 3.5 | **+1 (Positive)** | Strong, supportive tie — displayed as solid green |
| < 2.0 | **−1 (Negative)** | Weak/conflicted tie — displayed as dashed red |
| 2.0–3.4 | **0 (Neutral)** | Ambivalent tie — displayed as solid blue |

Q3 and Q4 (0–6 scale) are normalised to 0–5 before scoring.

---

## Example File

```csv
source,target,weight,department_source,department_target,q1,q2,q3,q4
Alice,Bob,4,Engineering,Engineering,4,4,5,5
Alice,Carol,3,Engineering,Product,3,4,4,4
Bob,Alice,5,Engineering,Engineering,5,5,6,6
Carol,David,1,Product,Finance,0,1,1,1
```

See `cross_parker_sample.csv` for a full 15-person, 5-department example.

---

## Tips

- **No duplicate edges** in the same direction (Alice→Bob can coexist with Bob→Alice)
- **Minimum recommended size**: 5 nodes, 10 edges for meaningful metrics
- **Frustration Index** requires triangles — at least 3 nodes with bidirectional connections
- The tool works without Q1–Q4 columns; it simply won't show signed edge analysis
