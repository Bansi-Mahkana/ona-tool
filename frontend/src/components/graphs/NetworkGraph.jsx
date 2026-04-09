import { useEffect, useRef, useCallback, useState } from 'react'
import * as d3 from 'd3'
import useNetworkStore from '../../store/networkStore'
import GraphControls from './GraphControls'

const DEPT_COLORS = [
  '#4fc3f7', '#00d4a0', '#f5a623', '#a78bfa', '#fb7185',
  '#34d399', '#fbbf24', '#60a5fa', '#f472b6', '#a3e635',
]

export default function NetworkGraph({ onNodeClick, onEdgeClick, width = 700, height = 500 }) {
  const svgRef = useRef(null)
  const simRef = useRef(null)
  const tooltipRef = useRef(null)
  const zoomRef = useRef(null)
  const svgSelRef = useRef(null)

  const { graphData } = useNetworkStore()

  const [activeDepts, setActiveDepts] = useState(new Set())
  const [showPositive, setShowPositive] = useState(true)
  const [showNegative, setShowNegative] = useState(true)
  const [showNeutral, setShowNeutral] = useState(true)

  // Sync activeDepts when new data arrives
  useEffect(() => {
    if (graphData?.nodes) {
      setActiveDepts(new Set(graphData.nodes.map((n) => n.department)))
    }
  }, [graphData?.nodes?.length])

  const handleZoomIn = useCallback(() => {
    if (svgSelRef.current && zoomRef.current)
      svgSelRef.current.transition().duration(300).call(zoomRef.current.scaleBy, 1.4)
  }, [])

  const handleZoomOut = useCallback(() => {
    if (svgSelRef.current && zoomRef.current)
      svgSelRef.current.transition().duration(300).call(zoomRef.current.scaleBy, 0.7)
  }, [])

  const handleZoomReset = useCallback(() => {
    if (svgSelRef.current && zoomRef.current)
      svgSelRef.current.transition().duration(400).call(zoomRef.current.transform, d3.zoomIdentity)
  }, [])

  const handleToggleDept = useCallback((dept) => {
    setActiveDepts((prev) => {
      const next = new Set(prev)
      next.has(dept) ? next.delete(dept) : next.add(dept)
      return next
    })
  }, [])

  const handleToggleSign = useCallback((sign) => {
    if (sign === 'positive') setShowPositive((v) => !v)
    else if (sign === 'negative') setShowNegative((v) => !v)
    else setShowNeutral((v) => !v)
  }, [])

  const render = useCallback(() => {
    if (!graphData || !svgRef.current) return

    const { nodes, links } = graphData
    const departments = [...new Set(nodes.map((n) => n.department))]
    const colorByDept = {}
    departments.forEach((d, i) => { colorByDept[d] = DEPT_COLORS[i % DEPT_COLORS.length] })

    // Filter nodes and links
    const visibleNodes = nodes.filter((n) => activeDepts.has(n.department))
    const visibleNodeIds = new Set(visibleNodes.map((n) => n.id))
    const visibleLinks = links.filter((l) => {
      const s = typeof l.source === 'object' ? l.source.id : l.source
      const t = typeof l.target === 'object' ? l.target.id : l.target
      if (!visibleNodeIds.has(s) || !visibleNodeIds.has(t)) return false
      if (l.sign === 1 && !showPositive) return false
      if (l.sign === -1 && !showNegative) return false
      if (l.sign === 0 && !showNeutral) return false
      return true
    })

    const svg = d3.select(svgRef.current)
    svgSelRef.current = svg
    svg.selectAll('*').remove()

    const g = svg.append('g')
    const zoom = d3.zoom().scaleExtent([0.2, 5]).on('zoom', (e) => g.attr('transform', e.transform))
    zoomRef.current = zoom
    svg.call(zoom)

    // Arrow markers
    const defs = svg.append('defs')
    ;[
      { id: 'pos', color: '#00d4a0' },
      { id: 'neg', color: '#ff4757' },
      { id: 'neu', color: '#4fc3f7' },
    ].forEach(({ id, color }) => {
      defs.append('marker')
        .attr('id', `arrow-${id}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 22).attr('refY', 0)
        .attr('markerWidth', 5).attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', color)
    })

    // Simulation
    const simNodes = visibleNodes.map((n) => ({ ...n }))
    const nodeById = Object.fromEntries(simNodes.map((n) => [n.id, n]))
    const simLinks = visibleLinks
      .map((l) => ({
        ...l,
        source: typeof l.source === 'object' ? l.source.id : l.source,
        target: typeof l.target === 'object' ? l.target.id : l.target,
      }))
      .filter((l) => nodeById[l.source] && nodeById[l.target])

    const sim = d3.forceSimulation(simNodes)
      .force('link', d3.forceLink(simLinks).id((d) => d.id)
        .distance((l) => {
          const s = nodeById[l.source?.id || l.source]
          const t = nodeById[l.target?.id || l.target]
          return s?.department === t?.department ? 65 : 115
        }).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(22))
      .force('x', d3.forceX(width / 2).strength(0.03))
      .force('y', d3.forceY(height / 2).strength(0.03))
    simRef.current = sim

    // Hull backgrounds (behind everything)
    const hullGroup = g.append('g')

    // Links
    const link = g.append('g').selectAll('line')
      .data(simLinks).join('line')
      .attr('stroke', (d) => d.sign === 1 ? '#00d4a0' : d.sign === -1 ? '#ff4757' : 'rgba(79,195,247,0.45)')
      .attr('stroke-width', (d) => Math.max(1, Math.sqrt(d.weight || 1) * 1.3))
      .attr('stroke-dasharray', (d) => d.sign === -1 ? '6,4' : null)
      .attr('marker-end', (d) => `url(#arrow-${d.sign === 1 ? 'pos' : d.sign === -1 ? 'neg' : 'neu'})`)
      .attr('opacity', 0.7)
      .style('cursor', 'pointer')
      .on('click', (e, d) => { e.stopPropagation(); if (onEdgeClick) onEdgeClick(d) })
      .on('mouseover', (e, d) => {
        const tip = tooltipRef.current
        if (!tip) return
        const s = d.source?.id || d.source
        const t = d.target?.id || d.target
        const sc = d.sign === 1 ? '#00d4a0' : d.sign === -1 ? '#ff4757' : '#4fc3f7'
        const sl = d.sign === 1 ? '✦ Positive' : d.sign === -1 ? '✦ Negative' : '● Neutral'
        const hasQ = [d.q1,d.q2,d.q3,d.q4].some((v) => v != null)
        tip.innerHTML = `
          <div style="font-size:.65rem;color:#4fc3f7;letter-spacing:.1em;margin-bottom:5px">EDGE</div>
          <div style="font-weight:600;color:var(--text-primary);margin-bottom:3px">${s} → ${t}</div>
          <div>Weight: <b style="color:var(--text-primary)">${d.weight ?? 1}</b></div>
          <div>Sign: <b style="color:${sc}">${sl}</b></div>
          ${hasQ ? `<div style="margin-top:5px;font-size:.62rem;color:var(--text-muted)">Q1:${d.q1??'—'} Q2:${d.q2??'—'} Q3:${d.q3??'—'} Q4:${d.q4??'—'}</div>` : ''}
        `
        tip.style.display = 'block'
        tip.style.left = (e.offsetX + 14) + 'px'
        tip.style.top = (e.offsetY - 6) + 'px'
      })
      .on('mouseout', () => { if (tooltipRef.current) tooltipRef.current.style.display = 'none' })

    // Nodes
    const node = g.append('g').selectAll('g')
      .data(simNodes).join('g')
      .style('cursor', 'pointer')
      .call(
        d3.drag()
          .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
          .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y })
          .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null })
      )
      .on('click', (e, d) => { e.stopPropagation(); if (onNodeClick) onNodeClick(d) })
      .on('mouseover', (e, d) => {
        const tip = tooltipRef.current
        if (!tip) return
        const deg = simLinks.filter((l) => {
          const s = l.source?.id || l.source; const t = l.target?.id || l.target
          return s === d.id || t === d.id
        }).length
        tip.innerHTML = `
          <div style="font-size:.65rem;color:#4fc3f7;letter-spacing:.1em;margin-bottom:5px">EMPLOYEE</div>
          <div style="font-weight:700;font-size:.9rem;color:var(--text-primary);margin-bottom:3px">${d.id}</div>
          <div style="color:${colorByDept[d.department]};margin-bottom:3px">${d.department}</div>
          <div style="font-size:.65rem;color:var(--text-muted)">Connections: ${deg}</div>
        `
        tip.style.display = 'block'
        tip.style.left = (e.offsetX + 14) + 'px'
        tip.style.top = (e.offsetY - 6) + 'px'
      })
      .on('mouseout', () => { if (tooltipRef.current) tooltipRef.current.style.display = 'none' })

    node.append('circle')
      .attr('r', 13)
      .attr('fill', (d) => `${colorByDept[d.department]}20`)
      .attr('stroke', (d) => colorByDept[d.department])
      .attr('stroke-width', 2)

    node.append('text')
      .text((d) => d.id.slice(0, 2).toUpperCase())
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('fill', (d) => colorByDept[d.department])
      .attr('font-family', "'Space Mono', monospace").attr('font-size', 8).attr('font-weight', '700')
      .style('pointer-events', 'none')

    node.append('text')
      .text((d) => d.id)
      .attr('y', 22).attr('text-anchor', 'middle')
      .attr('fill', 'var(--text-secondary)').attr('font-family', "'DM Sans', sans-serif").attr('font-size', 9)
      .style('pointer-events', 'none')

    sim.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x).attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x).attr('y2', (d) => d.target.y)
      node.attr('transform', (d) => `translate(${d.x},${d.y})`)

      hullGroup.selectAll('path').remove()
      departments.forEach((dept) => {
        if (!activeDepts.has(dept)) return
        const dpts = simNodes.filter((n) => n.department === dept)
        if (dpts.length < 2) return
        const pts = dpts.flatMap((n) => [
          [n.x-22, n.y-22],[n.x+22, n.y+22],[n.x-22, n.y+22],[n.x+22, n.y-22],
        ])
        const hull = d3.polygonHull(pts)
        if (!hull) return
        hullGroup.append('path')
          .datum(hull)
          .attr('d', d3.line().curve(d3.curveCatmullRomClosed))
          .attr('fill', `${colorByDept[dept]}07`)
          .attr('stroke', `${colorByDept[dept]}22`)
          .attr('stroke-width', 1.5)
          .style('pointer-events', 'none')
      })
    })

    // Legend (top-left)
    const leg = svg.append('g').attr('transform', 'translate(14,14)')
    departments.forEach((dept, i) => {
      const faded = !activeDepts.has(dept)
      const row = leg.append('g').attr('transform', `translate(0,${i * 18})`)
      row.append('circle').attr('r', 5)
        .attr('fill', `${colorByDept[dept]}25`).attr('stroke', colorByDept[dept])
        .attr('stroke-width', 1.5).attr('opacity', faded ? 0.3 : 1)
      row.append('text').text(dept).attr('x', 12).attr('dy', '0.35em')
        .attr('fill', faded ? '#3a5a74' : 'var(--text-secondary)')
        .attr('font-family', "'DM Sans', sans-serif").attr('font-size', 10)
    })

  }, [graphData, activeDepts, showPositive, showNegative, showNeutral, width, height, onNodeClick, onEdgeClick])

  useEffect(() => {
    render()
    return () => { if (simRef.current) simRef.current.stop() }
  }, [render])

  if (!graphData) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontFamily: "'Space Mono', monospace", fontSize: '0.8rem' }}>
        No network data loaded
      </div>
    )
  }

  const departments = [...new Set(graphData.nodes.map((n) => n.department))]

  return (
    <div style={{ position: 'relative', width, height }}>
      <svg ref={svgRef} width={width} height={height} style={{ display: 'block' }} />
      <div ref={tooltipRef} className="graph-tooltip" style={{ display: 'none', position: 'absolute' }} />
      <GraphControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleZoomReset}
        departments={departments}
        activeDepts={activeDepts}
        onToggleDept={handleToggleDept}
        showPositive={showPositive}
        showNegative={showNegative}
        showNeutral={showNeutral}
        onToggleSign={handleToggleSign}
      />
    </div>
  )
}
