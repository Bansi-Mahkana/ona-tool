import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import useNetworkStore from '../../store/networkStore'

export default function HierarchyGraph({ width = 700, height = 500 }) {
  const svgRef = useRef(null)
  const { hierarchyData } = useNetworkStore()

  useEffect(() => {
    if (!hierarchyData || !svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const margin = { top: 40, right: 60, bottom: 40, left: 60 }
    const innerW = width - margin.left - margin.right
    const innerH = height - margin.top - margin.bottom

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const zoom = d3.zoom().scaleExtent([0.4, 3]).on('zoom', (e) => g.attr('transform', e.transform))
    svg.call(zoom)

    const root = d3.hierarchy(hierarchyData)
    const treeLayout = d3.tree().size([innerW, innerH])
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

    // Nodes
    const node = g.selectAll('.node')
      .data(root.descendants())
      .join('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.x},${d.y})`)

    // Root node (org)
    node.append('circle')
      .attr('r', (d) => d.depth === 0 ? 18 : d.depth === 1 ? 14 : 8)
      .attr('fill', (d) => {
        if (d.depth === 0) return 'rgba(79,195,247,0.15)'
        if (d.depth === 1) return 'rgba(0,212,160,0.12)'
        return 'rgba(167,139,250,0.12)'
      })
      .attr('stroke', (d) => {
        if (d.depth === 0) return '#4fc3f7'
        if (d.depth === 1) return '#00d4a0'
        return '#a78bfa'
      })
      .attr('stroke-width', (d) => d.depth === 0 ? 2.5 : 1.5)

    node.append('text')
      .attr('dy', (d) => d.depth === 2 ? -14 : 0)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', (d) => d.depth === 2 ? undefined : 'central')
      .attr('fill', (d) => d.depth === 0 ? '#4fc3f7' : d.depth === 1 ? '#00d4a0' : '#8bacc5')
      .attr('font-family', (d) => d.depth < 2 ? "'Space Mono', monospace" : "'DM Sans', sans-serif")
      .attr('font-size', (d) => d.depth === 0 ? 10 : d.depth === 1 ? 9 : 8)
      .attr('font-weight', (d) => d.depth < 2 ? 700 : 400)
      .text((d) => {
        if (d.depth === 1) return d.data.name
        if (d.depth === 2) return d.data.name
        return 'ORG'
      })

  }, [hierarchyData, width, height])

  if (!hierarchyData) {
    return (
      <div style={{
        width, height, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#4a6d8a', fontFamily: "'Space Mono', monospace", fontSize: '0.8rem',
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
