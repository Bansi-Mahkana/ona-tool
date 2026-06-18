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

export function estimateOrganizationalPositivity(links) {
  if (!links || links.length === 0) return null
  const pos = links.filter(l => l.sign === 1).length
  return parseFloat((pos / links.length).toFixed(4))
}

export function estimateOrganizationalNegativity(links) {
  if (!links || links.length === 0) return 0
  const neg = links.filter(l => l.sign === -1).length
  return parseFloat((neg / links.length).toFixed(4))
}

export function estimateInternalPositivity(nodes, links) {
  if (!nodes || !links) return null
  const internal = {}
  const nodeDept = {}
  nodes.forEach((n) => { nodeDept[n.id] = n.department || 'Unknown' })

  const total = {}
  const pos = {}

  nodes.forEach((n) => {
    const d = n.department || 'Unknown'
    internal[d] = 0; total[d] = 0; pos[d] = 0;
  })

  links.forEach((l) => {
    const src = typeof l.source === 'object' ? l.source.id : l.source
    const tgt = typeof l.target === 'object' ? l.target.id : l.target
    const d = nodeDept[src]
    if (d && d === nodeDept[tgt]) {
      total[d]++
      if (l.sign === 1) pos[d]++
    }
  })

  Object.keys(total).forEach((d) => {
    internal[d] = total[d] > 0 ? parseFloat((pos[d] / total[d]).toFixed(4)) : 0
  })

  return internal
}

export function estimateOrganizationalBalance(nodes, links) {
  return parseFloat((1 - estimateFrustrationIndex(nodes, links)).toFixed(4))
}

export function estimateInternalBalance(nodes, links) {
  return estimateInternalPositivity(nodes, links) // Very rough proxy
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
 * Generate interpretation text for positivity/balance.
 */
export function interpretPositivity(value) {
  if (value === null) return null
  if (value >= 0.7) return 'High positivity. Most ties are supportive and collaborative.'
  if (value >= 0.4) return 'Moderate positivity. A mix of supportive, neutral, and conflicted ties.'
  return 'Low positivity. The network lacks strong collaborative ties, potentially hindering effectiveness.'
}

export function interpretBalance(value) {
  if (value === null) return null
  if (value >= 0.7) return 'High balance. Triadic relationships are mostly stable and harmonious.'
  if (value >= 0.4) return 'Moderate balance. Some conflicted or unstable triads exist.'
  return 'Low balance. Many unstable triangles, indicating high structural tension and conflict.'
}

export function interpretNegativity(value) {
  if (value === null) return null
  if (value <= 0.15) return 'Low organizational negativity. Social friction is minimal and contained.'
  if (value <= 0.35) return 'Moderate negativity. Some pockets of friction detected, likely in lower layers.'
  if (value <= 0.55) return 'High negativity. Significant friction is affecting organizational performance.'
  return 'Critical negativity level. Widespread social friction, likely involving leadership/executive tiers.'
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
  
  let implication = ''
  if (metricName === 'frustration_index' || metricName === 'organizational_negativity') {
    implication = delta < 0 
      ? `This is a positive improvement — structural friction and negativity are subsiding.`
      : `This increases organizational friction or negativity, which could impede performance.`
  } else {
    implication = delta > 0
      ? `This is a positive improvement — the metric increased.`
      : `This is a negative outcome — the metric decreased.`
  }

  const nameMap = {
    'frustration_index': 'Frustration Index',
    'organizational_positivity': 'Org Positivity',
    'organizational_balance': 'Org Balance',
    'organizational_negativity': 'Org Negativity'
  }
  const legibleName = nameMap[metricName] || metricName
  return `The ${legibleName} ${dir} by ${pct}%. ${implication}`
}
