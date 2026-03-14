import Papa from 'papaparse'

/**
 * Parse a CSV file into rows.
 * Supports two formats:
 *  1. Edge list: source, target, weight, [q1, q2, q3, q4, department_source, department_target]
 *  2. Adjacency matrix (square)
 */
export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (result) => resolve(result),
      error: (err) => reject(err),
    })
  })
}

/**
 * Build graph data { nodes, links } from parsed CSV rows.
 * Expected columns: source, target, weight, department_source, department_target
 * Optional Cross-Parker columns: q1, q2, q3, q4
 */
export function buildGraphFromEdgeList(rows) {
  const nodeMap = {}
  const links = []

  rows.forEach((row) => {
    const src = String(row.source || row.Source || row.FROM || row.from)
    const tgt = String(row.target || row.Target || row.TO || row.to)
    const weight = Number(row.weight || row.Weight || row.value || 1)
    const deptSrc = row.department_source || row.dept_source || row.dept || 'Unknown'
    const deptTgt = row.department_target || row.dept_target || row.dept || 'Unknown'

    if (!nodeMap[src]) nodeMap[src] = { id: src, department: deptSrc, label: src }
    if (!nodeMap[tgt]) nodeMap[tgt] = { id: tgt, department: deptTgt, label: tgt }

    // Cross-Parker survey columns
    const q1 = Number(row.q1 ?? -1) // information/advice frequency
    const q2 = Number(row.q2 ?? -1) // expertise recognition
    const q3 = Number(row.q3 ?? -1) // information usefulness
    const q4 = Number(row.q4 ?? -1) // knowledge awareness

    const sign = computeEdgeSign(q1, q2, q3, q4, weight)

    links.push({ source: src, target: tgt, weight, sign, q1, q2, q3, q4 })
  })

  return {
    nodes: Object.values(nodeMap),
    links,
  }
}

/**
 * Derive signed edge from Cross-Parker survey answers.
 *
 * Sign logic (based on ONA signed network theory):
 *  - Q1 (advice frequency): if 0 → unknown, skip. ≥4 → positive signal
 *  - Q2 (expertise recognition): ≥4 → positive
 *  - Q3 (information usefulness): ≥4 → positive
 *  - Q4 (knowledge awareness): ≥4 → positive
 *
 * Positive sign (+1): avg ≥ 3.5 across answered questions
 * Negative sign (-1): avg < 2.0 AND at least one answer given
 * Neutral (0): otherwise
 *
 * Returns: +1 | -1 | 0
 */
export function computeEdgeSign(q1, q2, q3, q4, weight = 1) {
  const answered = [q1, q2, q3, q4].filter((v) => v >= 0)
  if (answered.length === 0) return 0

  // Normalise q3 (0-6 scale) and q4 (0-6 scale) to 0-5
  const normalise = (v, maxScale) => (v / maxScale) * 5

  const scores = []
  if (q1 >= 0) scores.push(q1)                         // 0-5
  if (q2 >= 0) scores.push(q2)                         // 0-5
  if (q3 >= 0) scores.push(normalise(q3, 6))            // 0-6 → 0-5
  if (q4 >= 0) scores.push(normalise(q4, 6))            // 0-6 → 0-5

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length

  if (avg >= 3.5) return 1
  if (avg < 2.0 && scores.length > 0) return -1
  return 0
}

/**
 * Generate a sample Cross-Parker format CSV string for download/testing.
 */
export function generateSampleCSV() {
  const departments = ['Engineering', 'Marketing', 'Finance', 'HR', 'Product']
  const names = [
    'Alice', 'Bob', 'Carol', 'David', 'Eve',
    'Frank', 'Grace', 'Henry', 'Iris', 'James',
    'Karen', 'Leo', 'Maya', 'Noah', 'Olivia',
  ]

  const rows = ['source,target,weight,department_source,department_target,q1,q2,q3,q4']
  const deptOf = {}
  names.forEach((n) => {
    deptOf[n] = departments[Math.floor(Math.random() * departments.length)]
  })

  // Generate ~40 edges
  for (let i = 0; i < 45; i++) {
    const src = names[Math.floor(Math.random() * names.length)]
    let tgt = names[Math.floor(Math.random() * names.length)]
    if (src === tgt) continue
    const w = Math.floor(Math.random() * 5) + 1
    const q1 = Math.floor(Math.random() * 6)
    const q2 = Math.floor(Math.random() * 6)
    const q3 = Math.floor(Math.random() * 7)
    const q4 = Math.floor(Math.random() * 7)
    rows.push(`${src},${tgt},${w},${deptOf[src]},${deptOf[tgt]},${q1},${q2},${q3},${q4}`)
  }

  return rows.join('\n')
}

/**
 * Build hierarchy data from nodes (group by department).
 */
export function buildHierarchy(nodes) {
  const deptMap = {}
  nodes.forEach((n) => {
    const dept = n.department || 'Unknown'
    if (!deptMap[dept]) deptMap[dept] = []
    deptMap[dept].push(n)
  })

  return {
    id: 'Organisation',
    name: 'Organisation',
    children: Object.entries(deptMap).map(([dept, members]) => ({
      id: dept,
      name: dept,
      children: members.map((m) => ({ id: m.id, name: m.label || m.id })),
    })),
  }
}
