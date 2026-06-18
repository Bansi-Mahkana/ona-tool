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

    const swappable = row.swappable ?? row.is_swappable ?? 1
    
    if (!nodeMap[src]) nodeMap[src] = { id: src, department: deptSrc, label: src, is_swappable: !!swappable }
    if (!nodeMap[tgt]) nodeMap[tgt] = { id: tgt, department: deptTgt, label: tgt, is_swappable: !!swappable }

    // Cross-Parker survey columns
    const q1 = Number(row.q1 ?? -1) // information/advice frequency
    const q2 = Number(row.q2 ?? -1) // expertise recognition
    const q3 = Number(row.q3 ?? -1) // information usefulness
    const q4 = Number(row.q4 ?? -1) // knowledge awareness

    const sign = computeEdgeSign(q1, q2, q3, q4, weight)

    // Only include positive (+1) or negative (-1) edges; skip neutral (0)
    if (sign !== 0) {
      links.push({ source: src, target: tgt, weight, sign, q1, q2, q3, q4 })
    }
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
 * Seedable Pseudo-Random Number Generator (Mulberry32)
 */
function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

/**
 * Generate a sample Cross-Parker format CSV string for download/testing.
 * Uses a seed for deterministic generation.
 */
export function generateSampleCSV(seed = 42) {
  const rnd = mulberry32(seed)
  const nodes = {} // map of id to { level, dept }
  const edges = {} // map of "u|v" to { sign, weight }

  // 1. CREATE HIERARCHY
  const executives = ["0.1", "0.2", "0.3"]
  executives.forEach(exec => {
    nodes[exec] = { level: 0, dept: exec }
    for (let d = 1; d <= 2; d++) {
      const div = `${exec}.${d}`
      nodes[div] = { level: 1, dept: exec }
      for (let g = 1; g <= 2; g++) {
        const grp = `${div}.${g}`
        nodes[grp] = { level: 2, dept: exec }
        for (let e = 1; e <= 3; e++) {
          const emp = `${grp}.${e}`
          nodes[emp] = { level: 3, dept: exec }
        }
      }
    }
  })

  const nodeList = Object.keys(nodes)

  const addEdge = (u, v, sign, weight) => {
    if (u === v) return
    const key1 = `${u}|${v}`
    const key2 = `${v}|${u}`
    if (edges[key1] || edges[key2]) return // prevent duplicates
    edges[key1] = { u, v, sign, weight }
  }

  const hasEdge = (u, v) => !!(edges[`${u}|${v}`] || edges[`${v}|${u}`])

  // 2. HIERARCHY EDGES (STRONG POSITIVE)
  nodeList.forEach(node => {
     const parts = node.split('.')
     if (parts.length === 1 || (parts.length === 2 && parts[0] === '0')) return 
     const parent = parts.slice(0, -1).join('.')
     if (nodes[parent]) {
       addEdge(parent, node, 1, 0.9)
     }
  })

  // 2.1 FORCE EXECUTIVE CONNECTIVITY
  const execNodes = nodeList.filter(n => nodes[n].level === 0)
  for (let i = 0; i < execNodes.length; i++) {
    for (let j = i + 1; j < execNodes.length; j++) {
      addEdge(execNodes[i], execNodes[j], 1, 0.7 + rnd() * 0.3)
    }
  }

  // HELPERS
  const getGroup = (n) => {
    const parts = n.split('.')
    return parts.length >= 3 ? parts.slice(0, 3).join('.') : null
  }

  // 3. EDGE VALIDATION
  const validEdge = (u, v) => {
    const lu = nodes[u].level, lv = nodes[v].level
    const du = nodes[u].dept, dv = nodes[v].dept
    const gap = Math.abs(lu - lv)

    if (gap >= 3) return false // no CEO <-> employee edges
    
    let levelProb = 0.01
    if (gap === 0) levelProb = 0.7
    else if (gap === 1) levelProb = 0.5
    else if (gap === 2) levelProb = 0.2

    const deptProb = (du === dv) ? 0.7 : 0.3
    return rnd() < (levelProb * deptProb)
  }

  // 4. SIGN + WEIGHT LOGIC
  const edgeProperties = (u, v) => {
    const du = nodes[u].dept, dv = nodes[v].dept
    const lu = nodes[u].level, lv = nodes[v].level
    const gap = Math.abs(lu - lv)
    const gu = getGroup(u), gv = getGroup(v)

    let sign, weight
    if (gu && gu === gv) {
      sign = rnd() < 0.3 ? -1 : 1
      weight = 0.6 + rnd() * 0.4
    } else if (du === dv) {
      sign = rnd() < 0.2 ? -1 : 1
      weight = 0.4 + rnd() * 0.4
    } else if (gap <= 1) {
      sign = rnd() < 0.08 ? -1 : 1
      weight = 0.3 + rnd() * 0.4
    } else {
      sign = rnd() < 0.05 ? -1 : 1
      weight = 0.1 + rnd() * 0.4
    }
    return { sign, weight }
  }

  // 4.5 FIXED INTRA-GROUP LOGIC
  nodeList.forEach(node => {
    if (nodes[node].level === 2) {
      const employees = nodeList.filter(n => nodes[n].level === 3 && getGroup(n) === node)
      for (let i = 0; i < employees.length; i++) {
        for (let j = i + 1; j < employees.length; j++) {
          const u = employees[i], v = employees[j]
          if (hasEdge(u, v)) continue
          const props = edgeProperties(u, v)
          addEdge(u, v, props.sign, props.weight)
        }
      }
    }
  })

  // 5. ADD RANDOM EDGES
  for (let i = 0; i < 170; i++) {
    const u = nodeList[Math.floor(rnd() * nodeList.length)]
    const v = nodeList[Math.floor(rnd() * nodeList.length)]
    if (u === v) continue
    if (hasEdge(u, v)) continue
    if (!validEdge(u, v)) continue
    const props = edgeProperties(u, v)
    addEdge(u, v, props.sign, props.weight)
  }

  // 5.5 TRIADIC CLOSURE
  for (let i = 0; i < 170; i++) {
    const u = nodeList[Math.floor(rnd() * nodeList.length)]
    const neighbors = []
    Object.values(edges).forEach(e => {
      if (e.u === u) neighbors.push(e.v)
      if (e.v === u) neighbors.push(e.u)
    })

    if (neighbors.length < 2) continue

    const v = neighbors[Math.floor(rnd() * neighbors.length)]
    let w = neighbors[Math.floor(rnd() * neighbors.length)]
    
    let tries = 0;
    while (v === w && tries < 10) {
      w = neighbors[Math.floor(rnd() * neighbors.length)]
      tries++;
    }
    if (v === w) continue

    if (Math.abs(nodes[v].level - nodes[w].level) >= 2) continue
    if (hasEdge(v, w)) continue

    const sameLevel = nodes[v].level === nodes[w].level
    const sameDept = nodes[v].dept === nodes[w].dept

    let prob = 0.2
    if (sameLevel) prob += 0.2
    if (sameDept) prob += 0.2

    if (rnd() < prob) {
      const props = edgeProperties(v, w)
      if (!hasEdge(v, w)) {
        addEdge(v, w, props.sign, props.weight)
      }
    }
  }

  // Helper to engineer Q answers that perfectly align to our sign logic
  const generateQs = (sign) => {
    let q1, q2, q3, q4;
    while (true) {
        q1 = Math.floor(rnd() * 6) // 0-5
        q2 = Math.floor(rnd() * 6) // 0-5
        q3 = Math.floor(rnd() * 7) // 0-6
        q4 = Math.floor(rnd() * 7) // 0-6
        
        const normQ3 = (q3 / 6) * 5
        const normQ4 = (q4 / 6) * 5
        const avg = (q1 + q2 + normQ3 + normQ4) / 4
        
        if (sign === 1 && avg >= 3.5) break
        if (sign === -1 && avg < 2.0 && avg >= 0) break // >0 avoids all 0 edge case
        if (sign === 0 && avg >= 2.0 && avg < 3.5) break
    }
    return [q1, q2, q3, q4]
  }

  const rows = ['source,target,weight,department_source,department_target,q1,q2,q3,q4']

  Object.values(edges).forEach(e => {
    // scale weight up trivially to fit 1-5 scale often used
    const w = ((e.weight * 4) + 1).toFixed(1)
    const [q1, q2, q3, q4] = generateQs(e.sign)
    // Using the GROUP (Level 2) as the primary department for metric calculations
    const deptSrc = getGroup(e.u) || nodes[e.u].dept
    const deptTgt = getGroup(e.v) || nodes[e.v].dept
    rows.push(`${e.u},${e.v},${w},${deptSrc},${deptTgt},${q1},${q2},${q3},${q4}`)
  })

  return rows.join('\n')
}

/**
 * Build hierarchy data from nodes (group by department).
 */
export function buildHierarchy(nodes) {
  const root = { id: 'Organisation', name: 'Organisation', children: [] }
  const nodePool = { 'Organisation': root }

  // Sort nodes by ID length to process parents before children
  const sortedNodes = [...nodes].sort((a, b) => a.id.length - b.id.length)

  sortedNodes.forEach(node => {
    const parts = node.id.split('.')
    if (parts.length === 1 && node.id !== 'Organisation') {
      // Top level nodes directly under ORG
      const n = { id: node.id, name: node.label || node.id, children: [] }
      root.children.push(n)
      nodePool[node.id] = n
      return
    }

    const parentId = parts.slice(0, -1).join('.')
    let parent = nodePool[parentId]
    
    if (!parent) {
      if (parts.length === 2 && (parts[0] === '0' || parts[0] === 'ORG')) {
         parent = root
      } else {
        parent = root
      }
    }

    const newNode = { 
      id: node.id, 
      name: node.label || node.id, 
      department: node.department,
      children: [] 
    }
    parent.children.push(newNode)
    nodePool[node.id] = newNode
  })

  return root
}

/**
 * Parses a square matrix CSV into a nested object format { rowId: { colId: 1|0 } }.
 * Assumes the first column contains row IDs and headers contain column IDs.
 */
export function parseMatrixCSV(rows) {
  const matrix = {}
  if (rows.length === 0) return matrix

  // The first field in meta is usually the "corner" (blank or 'id'), the rest are node IDs.
  // Using PapaParse's result directly is easier here but we receive 'rows' (array of objects).
  
  rows.forEach((row) => {
    // Attempt to find the row ID. It's usually the first key that isn't one of the other column IDs.
    const keys = Object.keys(row)
    const rowId = row[keys[0]] // Heuristic: first column is the row ID
    
    matrix[rowId] = {}
    keys.slice(1).forEach(colId => {
      matrix[rowId][colId] = Number(row[colId]) || 0
    })
  })

  return matrix
}
