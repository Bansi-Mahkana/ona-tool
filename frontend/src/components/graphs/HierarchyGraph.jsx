import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import useNetworkStore from '../../store/networkStore'

const DEPT_COLORS = [
  '#4fc3f7', '#00d4a0', '#f5a623', '#a78bfa', '#fb7185',
  '#34d399', '#fbbf24', '#60a5fa', '#f472b6', '#a3e635',
]

export default function HierarchyGraph({ width = 700, height = 500 }) {
  const svgRef = useRef(null)
  const { hierarchyData, graphData } = useNetworkStore()

  useEffect(() => {
    if (!hierarchyData || !svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const margin = { top: 40, right: 60, bottom: 40, left: 60 }
    const innerW = width - margin.left - margin.right
    const innerH = height - margin.top - margin.bottom

    // Build department color mapping from graphData to match Network tab
    const allDepts = graphData ? [...new Set(graphData.nodes.map(n => n.department))] : []
    const colorByDept = {}
    allDepts.forEach((d, i) => { colorByDept[d] = DEPT_COLORS[i % DEPT_COLORS.length] })

    const g = svg.append('g').attr('transform', `translate(${width / 2},${margin.top})`)

    const zoom = d3.zoom().scaleExtent([0.1, 4]).on('zoom', (e) => g.attr('transform', e.transform))
    svg.call(zoom)

    const root = d3.hierarchy(hierarchyData)
    const treeLayout = d3.tree().nodeSize([47, 200])
    treeLayout(root)

    // Links
    g.selectAll('.link')
      .data(root.links())
      .join('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', 'rgba(79,195,247,0.2)')
      .attr('stroke-width', 1.5)
      .attr('d', d3.linkVertical().x((d) => d.x).y((d) => d.y))

    // Helper to get color for a hierarchy node
    const getNodeColor = (d) => {
      // Root is always neutral
      if (d.depth === 0) return '#4fc3f7'
      return colorByDept[d.data.department] || '#4fc3f7'
    }

    // Nodes
    const nodeData = root.descendants()
    const node = g.selectAll('.node')
      .data(nodeData)
      .join('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.x},${d.y})`)

    node.append('circle')
      .attr('r', (d) => Math.max(5, 18 - d.depth * 3))
      .attr('fill', (d) => `${getNodeColor(d)}20`)
      .attr('stroke', (d) => getNodeColor(d))
      .attr('stroke-width', (d) => Math.max(1, 2.5 - d.depth * 0.5))

    node.append('text')
      .attr('dy', 5)
      .attr('y', (d) => d.children ? -27 : 27)
      .attr('text-anchor', 'middle')
      .attr('fill', (d) => getNodeColor(d))
      .attr('font-family', "'Space Mono', monospace")
      .attr('font-size', (d) => Math.max(7, 9 - d.depth))
      .attr('font-weight', (d) => d.depth < 2 ? 700 : 400)
      .style('pointer-events', 'none')
      .text((d) => d.depth === 0 ? 'ORG' : d.data.name)

  }, [hierarchyData, width, height])

  if (!hierarchyData) {
    return (
      <div style={{
        width, height, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', fontFamily: "'Space Mono', monospace", fontSize: '0.8rem',
      }}>
        No hierarchy data
      </div>
    )
  }

  return (
    <svg ref={svgRef} width={width} height={height}
      style={{ background: 'transparent', display: 'block' }}
    />
  )
}
