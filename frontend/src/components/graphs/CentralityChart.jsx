import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts'
import useNetworkStore from '../../store/networkStore'
import * as d3 from 'd3'

const DEPT_COLORS = [
  '#4fc3f7','#00d4a0','#f5a623','#a78bfa','#fb7185',
  '#34d399','#fbbf24','#60a5fa','#f472b6','#a3e635',
]

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-secondary)', border: '1px solid rgba(79,195,247,0.25)',
      borderRadius: 8, padding: '10px 14px',
      fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem',
    }}>
      <div style={{ color: '#4fc3f7', marginBottom: 6, letterSpacing: '0.05em' }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <b style={{ color: 'var(--text-primary)' }}>{typeof p.value === 'number' ? p.value.toFixed(4) : p.value}</b>
        </div>
      ))}
    </div>
  )
}

export default function CentralityChart({ metric = 'betweenness' }) {
  const { graphData, metrics, setSelectedNode, setActiveTab } = useNetworkStore()

  const chartData = useMemo(() => {
    if (!graphData?.nodes) return []

    const departments = [...new Set(graphData.nodes.map((n) => n.department))]
    const deptIndex = Object.fromEntries(departments.map((d, i) => [d, i]))

    // Build degree map from links
    const degreeMap = {}
    graphData.nodes.forEach((n) => { degreeMap[n.id] = 0 })
    graphData.links.forEach((l) => {
      const s = typeof l.source === 'object' ? l.source.id : l.source
      const t = typeof l.target === 'object' ? l.target.id : l.target
      degreeMap[s] = (degreeMap[s] || 0) + 1
      degreeMap[t] = (degreeMap[t] || 0) + 1
    })

    // Build betweenness proxy: use stored centrality if available, else degree normalised
    const betweennessMap = metrics?.betweennessCentrality || {}
    const degCentMap = metrics?.degreeCentrality || {}
    const n = graphData.nodes.length

    return graphData.nodes
      .map((node) => ({
        name: node.id,
        department: node.department,
        deptIdx: deptIndex[node.department] || 0,
        betweenness: betweennessMap[node.id] ?? (degreeMap[node.id] / Math.max(n - 1, 1)),
        degree: degCentMap[node.id] ?? (degreeMap[node.id] / Math.max(n - 1, 1)),
        negativity: metrics?.negativity_ranking?.[node.id] ?? 0,
        rawDegree: degreeMap[node.id] || 0,
      }))
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, 15) // Top 15 for readability
  }, [graphData, metrics, metric])

  if (!chartData.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)', fontFamily: "'Space Mono', monospace", fontSize: '0.8rem' }}>
        No centrality data available
      </div>
    )
  }

  const maxVal = Math.max(...chartData.map((d) => d[metric]))

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
          <XAxis
            dataKey="name"
            tick={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fill: 'var(--text-secondary)' }}
            angle={-40} textAnchor="end" interval={0}
            axisLine={{ stroke: 'rgba(79,195,247,0.15)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: 'var(--text-muted)' }}
            axisLine={false} tickLine={false}
            domain={[0, maxVal * 1.15]}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(79,195,247,0.05)' }} />
          <Bar 
            dataKey={metric} 
            name={
              metric === 'betweenness' ? 'Betweenness Centrality' : 
              metric === 'degree' ? 'Degree Centrality' : 'Negativity Score'
            } 
            radius={[3,3,0,0]}
            onClick={(data) => {
              setSelectedNode(graphData.nodes.find(n => n.id === data.name));
              setActiveTab('network');
            }}
            style={{ cursor: 'pointer' }}
          >
            {chartData.map((entry, index) => (
              <Cell key={index} fill={DEPT_COLORS[entry.deptIdx % DEPT_COLORS.length]} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Top 3 highlight cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 16 }}>
        {chartData.slice(0, 3).map((d, i) => (
          <div 
            key={d.name} 
            onClick={() => {
              setSelectedNode(graphData.nodes.find(n => n.id === d.name));
              setActiveTab('network');
            }}
            style={{
              background: `${DEPT_COLORS[d.deptIdx % DEPT_COLORS.length]}08`,
              border: `1px solid ${DEPT_COLORS[d.deptIdx % DEPT_COLORS.length]}25`,
              borderRadius: 8, padding: '10px 14px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = `${DEPT_COLORS[d.deptIdx % DEPT_COLORS.length]}12`}
            onMouseLeave={e => e.currentTarget.style.background = `${DEPT_COLORS[d.deptIdx % DEPT_COLORS.length]}08`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: '0.65rem',
                color: DEPT_COLORS[d.deptIdx % DEPT_COLORS.length],
                background: `${DEPT_COLORS[d.deptIdx % DEPT_COLORS.length]}15`,
                padding: '1px 6px', borderRadius: 4,
              }}>
                #{i + 1}
              </span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.72rem', color: 'var(--text-primary)' }}>
                {d.name}
              </span>
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4 }}>
              {d.department}
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: metric === 'negativity' ? '#ff4757' : DEPT_COLORS[d.deptIdx % DEPT_COLORS.length] }}>
              {d[metric].toFixed(4)}
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Degree: {d.rawDegree} connections
            </div>
          </div>
        ))}
      </div>

      {metric === 'betweenness' && (
        <p style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', color: 'var(--text-muted)',
          marginTop: 14, lineHeight: 1.65, padding: '10px 14px',
          background: 'rgba(79,195,247,0.03)', borderRadius: 6,
          border: '1px solid rgba(79,195,247,0.08)',
        }}>
          <b style={{ color: 'var(--text-secondary)' }}>Betweenness centrality</b> measures how often a node appears on
          the shortest path between other nodes. High values indicate bottlenecks — removing or
          overloading these individuals could fragment the network.
        </p>
      )}
    </div>
  )
}
