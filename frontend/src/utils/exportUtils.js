/**
 * exportUtils.js
 * Utilities for exporting graph data and reports.
 */

/**
 * Export the SVG network graph as a PNG image.
 * Finds the first <svg> inside the provided container ref.
 */
export function exportGraphAsPNG(containerEl, filename = 'ona-network.png') {
  if (!containerEl) return

  const svgEl = containerEl.querySelector('svg')
  if (!svgEl) { alert('No graph to export'); return }

  const svgData = new XMLSerializer().serializeToString(svgEl)
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    const scale = 2 // retina
    canvas.width = svgEl.width.baseVal.value * scale || 900
    canvas.height = svgEl.height.baseVal.value * scale || 600

    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#06111f'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.scale(scale, scale)
    ctx.drawImage(img, 0, 0)
    URL.revokeObjectURL(url)

    const link = document.createElement('a')
    link.download = filename
    link.href = canvas.toDataURL('image/png')
    link.click()
  }
  img.src = url
}

/**
 * Export graph data as JSON (nodes + edges + metrics).
 */
export function exportGraphAsJSON(graphData, metrics, filename = 'ona-data.json') {
  const payload = {
    exported_at: new Date().toISOString(),
    nodes: graphData?.nodes ?? [],
    edges: graphData?.links ?? [],
    metrics: metrics ?? {},
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = filename
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Export analysis report as Markdown.
 */
export function exportReportAsMarkdown({
  graphData, metrics, snapshotMetrics, pendingChanges,
  fiInterpretation, ocInterpretation, recommendations,
  filename = 'ona-report.md',
}) {
  const now = new Date().toLocaleString()
  const fi = metrics?.frustrationIndex
  const oc = metrics?.organizationalCost

  const lines = [
    '# Organisational Network Analysis Report',
    `**Generated:** ${now}`,
    '',
    '---',
    '',
    '## Network Overview',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Nodes | ${graphData?.nodes?.length ?? 'N/A'} |`,
    `| Edges | ${graphData?.links?.length ?? 'N/A'} |`,
    `| Departments | ${graphData ? [...new Set(graphData.nodes.map(n=>n.department))].length : 'N/A'} |`,
    `| Isolated Nodes | ${metrics?.isolatedNodes ?? 'N/A'} |`,
    '',
    '---',
    '',
    '## Key Metrics',
    '',
    `| Metric | Value | Status |`,
    `|--------|-------|--------|`,
    `| Frustration Index | ${fi?.toFixed(3) ?? 'N/A'} | ${fi == null ? 'N/A' : fi <= 0.3 ? 'Healthy' : fi <= 0.6 ? 'Moderate' : 'Critical'} |`,
    `| Organisational Cost | ${oc?.toFixed(3) ?? 'N/A'} | ${oc == null ? 'N/A' : oc <= 0.3 ? 'Efficient' : oc <= 0.6 ? 'Moderate' : 'Critical'} |`,
    `| Network Density | ${metrics?.networkDensity?.toFixed(4) ?? 'N/A'} | — |`,
    `| Signed Balance | ${metrics?.signedBalance?.toFixed(3) ?? 'N/A'} | — |`,
    `| Avg Path Length | ${metrics?.avgPathLength?.toFixed(2) ?? 'N/A'} | — |`,
    `| Clustering Coefficient | ${metrics?.clusteringCoefficient?.toFixed(3) ?? 'N/A'} | — |`,
    '',
    '---',
    '',
    ...(snapshotMetrics ? [
      '## Before / After Comparison',
      '',
      `| Metric | Before | After | Change |`,
      `|--------|--------|-------|--------|`,
      ...[
        ['Frustration Index', 'frustrationIndex'],
        ['Organisational Cost', 'organizationalCost'],
        ['Network Density', 'networkDensity'],
        ['Signed Balance', 'signedBalance'],
      ].map(([label, key]) => {
        const b = snapshotMetrics[key]
        const a = metrics?.[key]
        const delta = b != null && a != null ? ((a - b) * 100).toFixed(1) : 'N/A'
        return `| ${label} | ${b?.toFixed(3)??'N/A'} | ${a?.toFixed(3)??'N/A'} | ${delta !== 'N/A' ? (parseFloat(delta)>0?'+':'')+delta+'%' : 'N/A'} |`
      }),
      '',
      '---',
      '',
    ] : []),

    ...(pendingChanges?.length ? [
      '## Changes Applied',
      '',
      ...pendingChanges.map((c, i) => `${i+1}. ${c.description}`),
      '',
      '---',
      '',
    ] : []),

    '## Interpretations',
    '',
    '### Frustration Index',
    fiInterpretation ?? '(Not available)',
    '',
    '### Organisational Cost',
    ocInterpretation ?? '(Not available)',
    '',
    '---',
    '',
    ...(recommendations?.length ? [
      '## Recommendations',
      '',
      ...recommendations.map((r, i) =>
        `### ${i+1}. [${r.priority}] ${r.title}\n\n${r.action}\n\n**Metric:** ${r.metric} · **Expected Δ:** ${r.expected_delta > 0 ? '+' : ''}${(r.expected_delta * 100).toFixed(0)}%\n`
      ),
      '---',
      '',
    ] : []),

    '## Signed Edge Analysis',
    '',
    `- Positive edges (+1): **${graphData?.links?.filter(l=>l.sign===1).length ?? 0}**`,
    `- Negative edges (−1): **${graphData?.links?.filter(l=>l.sign===-1).length ?? 0}**`,
    `- Neutral edges (0): **${graphData?.links?.filter(l=>l.sign===0).length ?? 0}**`,
    '',
    '> Edge signs derived from Cross-Parker survey dimensions (Q1–Q4) using composite scoring.',
    '',
    '---',
    '',
    '_Generated by ONA Tool v1.0_',
  ]

  const md = lines.join('\n')
  const blob = new Blob([md], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = filename
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}
