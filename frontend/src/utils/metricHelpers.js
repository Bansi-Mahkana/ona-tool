/**
 * Metric helpers for ONA Tool.
 * 
 * NOTE: These are client-side ESTIMATES only.
 * Real values come from the FastAPI backend (NetworkX algorithms).
 * These functions give a quick preview before the API responds.
 */

/**
 * Estimate frustration index from graph structure (0-1).
 * Frustration index in signed networks = proportion of "frustrated" triangles
 * (triangles with an odd number of negative edges — violates balance theory).
 *
 * Without signed edges: we use a proxy based on:
 *  - Ratio of weak ties to total ties
 *  - Presence of isolated nodes
 *  - Low reciprocity
 */
export function estimateFrustrationIndex(nodes, links) {
  if (!nodes?.length || !links?.length) return 0

  const n = nodes.length
  const totalPossibleEdges = n * (n - 1)
  const actualEdges = links.length

  // Density proxy
  const density = actualEdges / totalPossibleEdges

  // Negative edge ratio
  const negativeEdges = links.filter((l) => l.sign === -1).length
  const negRatio = negativeEdges / actualEdges

  // Low density + high negative ratio = high frustration
  const frustration = Math.min(1, negRatio * 0.6 + (1 - density) * 0.4)
  return parseFloat(frustration.toFixed(3))
}

/**
 * Estimate organisational cost (0-1).
 * Proxy: based on average path length and bridging bottlenecks.
 * Higher cost = inefficient information flow.
 */
export function estimateOrganizationalCost(nodes, links) {
  if (!nodes?.length || !links?.length) return 0

  const n = nodes.length
  const density = links.length / (n * (n - 1))

  // Build adjacency for degree calculation
  const degree = {}
  nodes.forEach((nd) => (degree[nd.id] = 0))
  links.forEach((l) => {
    degree[l.source] = (degree[l.source] || 0) + 1
    degree[l.target] = (degree[l.target] || 0) + 1
  })

  // Variance in degree (inequality of connections → higher cost)
  const degrees = Object.values(degree)
  const avgDeg = degrees.reduce((a, b) => a + b, 0) / degrees.length
  const variance = degrees.reduce((a, b) => a + (b - avgDeg) ** 2, 0) / degrees.length
  const normVariance = Math.min(1, variance / (avgDeg ** 2 + 1))

  const cost = Math.min(1, normVariance * 0.5 + (1 - density) * 0.5)
  return parseFloat(cost.toFixed(3))
}

/**
 * Compute network density.
 */
export function computeDensity(nodes, links) {
  const n = nodes?.length || 0
  if (n < 2) return 0
  return parseFloat((links.length / (n * (n - 1))).toFixed(4))
}

/**
 * Count nodes with degree 0 (isolated).
 */
export function countIsolated(nodes, links) {
  const connected = new Set()
  links.forEach((l) => {
    connected.add(l.source)
    connected.add(l.target)
  })
  return nodes.filter((n) => !connected.has(n.id)).length
}

/**
 * Compute signed network balance (0-1, 1 = perfectly balanced).
 * Based on Heider's structural balance theory:
 * A network is balanced if all cycles have an even number of negative edges.
 */
export function computeSignedBalance(links) {
  const positiveEdges = links.filter((l) => l.sign === 1).length
  const negativeEdges = links.filter((l) => l.sign === -1).length
  const total = positiveEdges + negativeEdges
  if (total === 0) return null
  return parseFloat((positiveEdges / total).toFixed(3))
}

/**
 * Get colour for a 0-1 metric value (lower=better for frustration/cost).
 */
export function metricColor(value, invertedScale = true) {
  if (value === null || value === undefined) return 'var(--text-muted)'
  if (invertedScale) {
    if (value <= 0.3) return '#00d4a0'   // green = good
    if (value <= 0.6) return '#f5a623'   // amber = warning
    return '#ff4757'                      // red = bad
  } else {
    if (value >= 0.7) return '#00d4a0'
    if (value >= 0.4) return '#f5a623'
    return '#ff4757'
  }
}

/**
 * Human-readable label for metric score.
 */
export function metricLabel(value, invertedScale = true) {
  if (value === null || value === undefined) return 'N/A'
  if (invertedScale) {
    if (value <= 0.3) return 'Healthy'
    if (value <= 0.6) return 'Moderate'
    return 'Critical'
  } else {
    if (value >= 0.7) return 'Strong'
    if (value >= 0.4) return 'Moderate'
    return 'Weak'
  }
}

/**
 * Generate interpretation text for frustration index.
 */
export function interpretFrustrationIndex(value) {
  if (value === null) return null
  if (value <= 0.2)
    return 'The network exhibits very low structural frustration. Relationships are largely aligned and mutually reinforcing — employees perceive each other as valuable collaborators.'
  if (value <= 0.4)
    return 'Moderate frustration is present. A subset of relationships are asymmetric or conflicted. Some individuals may be expending energy navigating social tensions that impede information flow.'
  if (value <= 0.6)
    return 'High frustration detected. The network contains significant imbalance — many triangles violate Heider\'s balance theory, indicating unstable triadic relationships likely causing friction.'
  return 'Critical frustration level. The network structure is severely imbalanced with predominantly negative or ambivalent connections. Collaboration and information diffusion are likely severely hindered.'
}

/**
 * Generate interpretation text for organisational cost.
 */
export function interpretOrganizationalCost(value) {
  if (value === null) return null
  if (value <= 0.2)
    return 'Organisational cost is minimal. The network is efficient — information reaches most nodes via short paths and connection distribution is equitable.'
  if (value <= 0.4)
    return 'Moderate organisational cost. There are noticeable bottlenecks and uneven degree distribution. Some employees carry disproportionate communication load.'
  if (value <= 0.6)
    return 'High organisational cost. The network has structural inefficiencies — long average paths and high-degree hubs suggest that information gets filtered or delayed through key individuals.'
  return 'Critical organisational cost. The network is highly centralised or fragmented. Removing one or two key connectors could isolate significant parts of the organisation.'
}

/**
 * Generate after-change interpretation by comparing before/after metrics.
 */
export function interpretChange(before, after, metricName) {
  if (!before || !after) return null
  const delta = after - before
  const pct = Math.abs(Math.round(delta * 100))

  if (Math.abs(delta) < 0.01) return 'This change had negligible impact on the metric.'

  const dir = delta < 0 ? 'decreased' : 'increased'
  const implication =
    metricName === 'frustrationIndex'
      ? delta < 0
        ? `This is a positive improvement — the network is becoming more balanced with fewer conflicted triadic relationships.`
        : `This worsens structural balance, suggesting the added/removed connection introduces more asymmetric relationships.`
      : delta < 0
      ? `This is a positive improvement — information can flow more efficiently through the reorganised structure.`
      : `This increases the cost of coordination, possibly due to increased path lengths or over-centralisation.`

  return `The ${metricName === 'frustrationIndex' ? 'Frustration Index' : 'Organisational Cost'} ${dir} by ${pct}%. ${implication}`
}
