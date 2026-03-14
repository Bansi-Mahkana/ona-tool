import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight, PanelRight, Camera, RotateCcw, Network,
  GitBranch, BarChart2, Move, Activity, X,
} from 'lucide-react'
import useNetworkStore from '../store/networkStore'
import NetworkGraph from '../components/graphs/NetworkGraph'
import HierarchyGraph from '../components/graphs/HierarchyGraph'
import CentralityChart from '../components/graphs/CentralityChart'
import MetricGauge from '../components/metrics/MetricGauge'
import RecommendationPanel from '../components/recommendations/RecommendationPanel'
import { interpretFrustrationIndex, interpretOrganizationalCost } from '../utils/metricHelpers'
import { useMetrics } from '../hooks/useMetrics'

const TABS = [
  { id: 'network',   label: 'Network',    icon: Network },
  { id: 'hierarchy', label: 'Hierarchy',  icon: GitBranch },
  { id: 'centrality',label: 'Centrality', icon: Activity },
  { id: 'metrics',   label: 'All Metrics',icon: BarChart2 },
]

const DEPT_COLORS = [
  '#4fc3f7','#00d4a0','#f5a623','#a78bfa','#fb7185',
  '#34d399','#fbbf24','#60a5fa','#f472b6','#a3e635',
]

export default function Analysis() {
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const [dims, setDims] = useState({ width: 700, height: 480 })
  const [centralityMetric, setCentralityMetric] = useState('betweenness')

  // Auto-recalculate metrics when graph changes
  useMetrics()

  const {
    graphData, metrics, snapshotMetrics, activeTab, sidebarOpen,
    selectedNode, selectedEdge,
    setActiveTab, toggleSidebar, snapshotCurrentMetrics,
    clearPendingChanges, pendingChanges, fileName,
    moveEmployee, setSelectedNode, setSelectedEdge,
  } = useNetworkStore()

  useEffect(() => {
    if (!graphData) navigate('/upload')
  }, [graphData, navigate])

  useEffect(() => {
    const obs = new ResizeObserver(([entry]) => {
      const { width } = entry.contentRect
      setDims({ width: Math.floor(width), height: Math.floor(width * 0.62) })
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // Compute per-node connection details for selected node panel
  const nodeConnections = useMemo(() => {
    if (!selectedNode || !graphData) return { outgoing: [], incoming: [] }
    const outgoing = graphData.links
      .filter((l) => (typeof l.source === 'object' ? l.source.id : l.source) === selectedNode.id)
      .map((l) => ({ node: typeof l.target === 'object' ? l.target.id : l.target, weight: l.weight, sign: l.sign }))
    const incoming = graphData.links
      .filter((l) => (typeof l.target === 'object' ? l.target.id : l.target) === selectedNode.id)
      .map((l) => ({ node: typeof l.source === 'object' ? l.source.id : l.source, weight: l.weight, sign: l.sign }))
    return { outgoing, incoming }
  }, [selectedNode, graphData])

  const departments = useMemo(
    () => graphData ? [...new Set(graphData.nodes.map((n) => n.department))] : [],
    [graphData]
  )
  const deptColorMap = useMemo(() => {
    const m = {}
    departments.forEach((d, i) => { m[d] = DEPT_COLORS[i % DEPT_COLORS.length] })
    return m
  }, [departments])

  const allMetrics = [
    { key: 'frustrationIndex',    label: 'Frustration Index', subtitle: 'Signed balance',  invertedScale: true  },
    { key: 'organizationalCost',  label: 'Org Cost',          subtitle: 'Flow efficiency', invertedScale: true  },
    { key: 'networkDensity',      label: 'Density',           subtitle: 'Connectedness',   invertedScale: false },
    { key: 'signedBalance',       label: 'Signed Balance',    subtitle: 'Heider balance',  invertedScale: false },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>

      {/* ── Main panel ─────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Top toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          padding: '10px 16px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)', flexShrink: 0,
        }}>
          <div style={{ marginRight: 8 }}>
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.62rem', color: '#4a6d8a', letterSpacing: '0.1em' }}>ANALYSIS</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.82rem', color: '#e8f4fd' }}>
              {fileName || 'Network Dataset'}
            </p>
          </div>

          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 2 }}>
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: activeTab === tab.id ? 'rgba(79,195,247,0.12)' : 'transparent',
                color: activeTab === tab.id ? '#4fc3f7' : '#4a6d8a',
                fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', letterSpacing: '0.06em',
                transition: 'all 0.15s',
              }}>
                <tab.icon size={12} /> {tab.label}
              </button>
            ))}
          </div>

          {/* Right actions */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {pendingChanges.length > 0 && (
              <>
                <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.66rem', display: 'flex', alignItems: 'center', gap: 5 }} onClick={clearPendingChanges}>
                  <RotateCcw size={11} /> Reset
                </button>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.62rem', color: '#f5a623', background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)', padding: '2px 8px', borderRadius: 99 }}>
                  {pendingChanges.length} change{pendingChanges.length > 1 ? 's' : ''}
                </span>
              </>
            )}
            {!snapshotMetrics ? (
              <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.66rem', display: 'flex', alignItems: 'center', gap: 5 }} onClick={snapshotCurrentMetrics}>
                <Camera size={11} /> Snapshot
              </button>
            ) : (
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.62rem', color: '#00d4a0', background: 'rgba(0,212,160,0.08)', border: '1px solid rgba(0,212,160,0.2)', padding: '2px 8px', borderRadius: 99 }}>
                ● Snapshot saved
              </span>
            )}
            <button className="btn-primary" style={{ padding: '6px 16px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 5 }} onClick={() => navigate('/recommendations')}>
              Recommendations <ChevronRight size={12} />
            </button>
            <button onClick={toggleSidebar} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: sidebarOpen ? '#4fc3f7' : '#4a6d8a', cursor: 'pointer', padding: '5px 7px' }}>
              <PanelRight size={13} />
            </button>
          </div>
        </div>

        {/* Metric strip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 0,
          background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
          padding: '8px 16px', overflowX: 'auto', flexShrink: 0,
        }}>
          {allMetrics.map((m) => (
            <div key={m.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 90, padding: '0 12px', borderRight: '1px solid rgba(79,195,247,0.08)' }}>
              <MetricGauge
                value={metrics[m.key]}
                label={m.label}
                invertedScale={m.invertedScale}
                size={68}
                showChange={snapshotMetrics !== null}
                previousValue={snapshotMetrics?.[m.key] ?? null}
              />
            </div>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 20, alignItems: 'center', paddingLeft: 20 }}>
            {[
              { l: 'NODES',   v: graphData?.nodes?.length },
              { l: 'EDGES',   v: graphData?.links?.length },
              { l: 'ISOLATED',v: metrics.isolatedNodes },
              { l: 'DEPTS',   v: departments.length },
            ].map((s) => (
              <div key={s.l} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '1rem', color: '#4fc3f7', fontWeight: 700 }}>{s.v ?? '—'}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.58rem', color: '#4a6d8a', letterSpacing: '0.1em' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Graph / content area */}
        <div ref={containerRef} style={{ flex: 1, overflow: 'auto', padding: 16 }}>

          {/* ── Network tab ── */}
          {activeTab === 'network' && (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Network size={12} style={{ color: '#4fc3f7' }} />
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.62rem', color: '#4a6d8a', letterSpacing: '0.08em' }}>
                  FORCE-DIRECTED GRAPH · drag nodes · scroll to zoom · use filter panel (bottom-left)
                </span>
              </div>
              <NetworkGraph
                width={dims.width - 2}
                height={dims.height}
                onNodeClick={setSelectedNode}
                onEdgeClick={setSelectedEdge}
              />
            </div>
          )}

          {/* ── Hierarchy tab ── */}
          {activeTab === 'hierarchy' && (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.62rem', color: '#4a6d8a', letterSpacing: '0.08em' }}>
                  ORG HIERARCHY · grouped by department · scroll to zoom
                </span>
              </div>
              <HierarchyGraph width={dims.width - 2} height={dims.height} />
            </div>
          )}

          {/* ── Centrality tab ── */}
          {activeTab === 'centrality' && (
            <div>
              <div className="card p-5 mb-4">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <Activity size={14} style={{ color: '#4fc3f7' }} />
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.68rem', color: '#4fc3f7', letterSpacing: '0.08em' }}>
                    CENTRALITY ANALYSIS
                  </span>
                  {/* Metric selector */}
                  <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                    {[
                      { id: 'betweenness', label: 'Betweenness' },
                      { id: 'degree', label: 'Degree' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setCentralityMetric(opt.id)}
                        style={{
                          padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                          background: centralityMetric === opt.id ? 'rgba(79,195,247,0.12)' : 'transparent',
                          color: centralityMetric === opt.id ? '#4fc3f7' : '#4a6d8a',
                          fontFamily: "'Space Mono', monospace", fontSize: '0.62rem', letterSpacing: '0.06em',
                          transition: 'all 0.15s',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <CentralityChart metric={centralityMetric} />
              </div>

              {/* Signed edge summary */}
              <div className="card p-5">
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: '#a78bfa', letterSpacing: '0.1em', marginBottom: 14 }}>
                  SIGNED EDGE SUMMARY
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Positive',  value: graphData?.links?.filter(l=>l.sign===1).length ?? 0,  color: '#00d4a0', desc: 'Strong collaborative ties' },
                    { label: 'Negative',  value: graphData?.links?.filter(l=>l.sign===-1).length ?? 0, color: '#ff4757', desc: 'Conflicted or weak ties' },
                    { label: 'Neutral',   value: graphData?.links?.filter(l=>l.sign===0).length ?? 0,  color: '#4fc3f7', desc: 'Ambivalent relationships' },
                  ].map((s) => (
                    <div key={s.label} style={{ textAlign: 'center', padding: '14px', borderRadius: 10, background: `${s.color}07`, border: `1px solid ${s.color}18` }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '1.8rem', color: s.color, fontWeight: 700 }}>{s.value}</div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: '#8bacc5', marginTop: 2 }}>{s.label}</div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.68rem', color: '#4a6d8a', marginTop: 4 }}>{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── All Metrics tab ── */}
          {activeTab === 'metrics' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
              {allMetrics.map((m) => {
                const val = metrics[m.key]
                const prev = snapshotMetrics?.[m.key] ?? null
                const interp = m.key === 'frustrationIndex'
                  ? interpretFrustrationIndex(val)
                  : m.key === 'organizationalCost'
                  ? interpretOrganizationalCost(val)
                  : null
                return (
                  <div key={m.key} className="card p-5" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <MetricGauge
                      value={val}
                      label={m.label}
                      subtitle={m.subtitle}
                      invertedScale={m.invertedScale}
                      size={100}
                      showChange={prev !== null}
                      previousValue={prev}
                    />
                    {interp && (
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', color: '#8bacc5', lineHeight: 1.6, textAlign: 'center' }}>
                        {interp}
                      </p>
                    )}
                  </div>
                )
              })}

              {/* Network stats card */}
              <div className="card p-5" style={{ gridColumn: '1 / -1' }}>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: '#4fc3f7', letterSpacing: '0.1em', marginBottom: 14 }}>
                  FULL NETWORK STATISTICS
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                  {[
                    { label: 'Nodes',              value: graphData?.nodes?.length },
                    { label: 'Edges',              value: graphData?.links?.length },
                    { label: 'Isolated Nodes',     value: metrics.isolatedNodes },
                    { label: 'Departments',        value: departments.length },
                    { label: 'Network Density',    value: metrics.networkDensity?.toFixed(4) },
                    { label: 'Avg Path Length',    value: metrics.avgPathLength ? metrics.avgPathLength.toFixed(2) : '(backend)' },
                    { label: 'Clustering Coeff.',  value: metrics.clusteringCoefficient ? metrics.clusteringCoefficient.toFixed(3) : '(backend)' },
                    { label: 'Bridge Edges',       value: metrics.bridgeCount ?? '(backend)' },
                    { label: 'Signed Balance',     value: metrics.signedBalance?.toFixed(3) ?? 'N/A' },
                    { label: 'Positive Edges',     value: graphData?.links?.filter(l=>l.sign===1).length ?? 0 },
                    { label: 'Negative Edges',     value: graphData?.links?.filter(l=>l.sign===-1).length ?? 0 },
                    { label: 'Neutral Edges',      value: graphData?.links?.filter(l=>l.sign===0).length ?? 0 },
                  ].map((s) => (
                    <div key={s.label} style={{ background: 'rgba(13,31,51,0.8)', border: '1px solid rgba(79,195,247,0.08)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.95rem', color: '#4fc3f7', fontWeight: 700 }}>{s.value ?? '—'}</div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.68rem', color: '#4a6d8a', marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Selected node detail panel ── */}
          {selectedNode && (
            <div className="card mt-4 p-5" style={{ borderColor: 'rgba(0,212,160,0.3)', background: 'rgba(0,212,160,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', color: '#00d4a0', letterSpacing: '0.1em', marginBottom: 4 }}>
                    SELECTED EMPLOYEE
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${deptColorMap[selectedNode.department]}20`, border: `2px solid ${deptColorMap[selectedNode.department]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: '0.72rem', color: deptColorMap[selectedNode.department] }}>
                      {selectedNode.id.slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <h3 style={{ fontFamily: "'Space Mono', monospace", fontSize: '1rem', color: '#e8f4fd', margin: 0 }}>{selectedNode.id}</h3>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.78rem', color: deptColorMap[selectedNode.department], margin: 0 }}>{selectedNode.department}</p>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedNode(null)} style={{ background: 'transparent', border: 'none', color: '#4a6d8a', cursor: 'pointer', padding: 4 }}>
                  <X size={14} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {/* Stats */}
                <div>
                  <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', color: '#4a6d8a', letterSpacing: '0.08em', marginBottom: 8 }}>CONNECTIONS</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {[
                      { label: 'Outgoing', value: nodeConnections.outgoing.length, color: '#4fc3f7' },
                      { label: 'Incoming', value: nodeConnections.incoming.length, color: '#00d4a0' },
                    ].map((s) => (
                      <div key={s.label} style={{ textAlign: 'center', flex: 1, background: 'rgba(13,31,51,0.6)', border: '1px solid rgba(79,195,247,0.1)', borderRadius: 6, padding: '8px 4px' }}>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '1.2rem', color: s.color, fontWeight: 700 }}>{s.value}</div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.65rem', color: '#4a6d8a' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Outgoing */}
                <div>
                  <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', color: '#4a6d8a', letterSpacing: '0.08em', marginBottom: 8 }}>OUTGOING TIES</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 80, overflowY: 'auto' }}>
                    {nodeConnections.outgoing.slice(0, 6).map((c) => (
                      <div key={c.node} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.sign===1?'#00d4a0':c.sign===-1?'#ff4757':'#4fc3f7', flexShrink: 0 }} />
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', color: '#8bacc5' }}>{c.node}</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: '#4a6d8a', marginLeft: 'auto' }}>w:{c.weight??1}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Move department */}
                <div>
                  <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', color: '#4a6d8a', letterSpacing: '0.08em', marginBottom: 8 }}>
                    MOVE TO DEPT
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {departments.filter((d) => d !== selectedNode.department).map((dept) => (
                      <button
                        key={dept}
                        className="btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '0.62rem', display: 'flex', alignItems: 'center', gap: 4 }}
                        onClick={() => { moveEmployee(selectedNode.id, dept); setSelectedNode(null) }}
                      >
                        <Move size={9} /> {dept}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Selected edge detail panel ── */}
          {selectedEdge && !selectedNode && (
            <div className="card mt-4 p-5" style={{ borderColor: 'rgba(79,195,247,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', color: '#4fc3f7', letterSpacing: '0.1em' }}>
                  SELECTED EDGE
                </p>
                <button onClick={() => setSelectedEdge(null)} style={{ background: 'transparent', border: 'none', color: '#4a6d8a', cursor: 'pointer' }}>
                  <X size={13} />
                </button>
              </div>
              <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                <div>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.9rem', color: '#e8f4fd' }}>
                    {typeof selectedEdge.source === 'object' ? selectedEdge.source.id : selectedEdge.source}
                  </span>
                  <span style={{ color: '#4a6d8a', margin: '0 8px' }}>→</span>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.9rem', color: '#e8f4fd' }}>
                    {typeof selectedEdge.target === 'object' ? selectedEdge.target.id : selectedEdge.target}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  {[
                    { label: 'Weight', value: selectedEdge.weight ?? 1, color: '#4fc3f7' },
                    { label: 'Sign', value: selectedEdge.sign === 1 ? '+ Positive' : selectedEdge.sign === -1 ? '− Negative' : '● Neutral', color: selectedEdge.sign===1?'#00d4a0':selectedEdge.sign===-1?'#ff4757':'#4fc3f7' },
                  ].map((s) => (
                    <div key={s.label}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: '#4a6d8a', marginBottom: 2 }}>{s.label}</div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.82rem', color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                  {[selectedEdge.q1, selectedEdge.q2, selectedEdge.q3, selectedEdge.q4].some((v) => v != null) && (
                    ['Q1','Q2','Q3','Q4'].map((q, i) => {
                      const val = [selectedEdge.q1,selectedEdge.q2,selectedEdge.q3,selectedEdge.q4][i]
                      return val != null ? (
                        <div key={q}>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: '#4a6d8a', marginBottom: 2 }}>{q}</div>
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.82rem', color: '#8bacc5' }}>{val}</div>
                        </div>
                      ) : null
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Sidebar ─────────────────────────────────────── */}
      {sidebarOpen && (
        <div style={{
          width: 290, flexShrink: 0, overflow: 'auto',
          borderLeft: '1px solid var(--border)', background: 'var(--bg-secondary)', padding: 14,
        }}>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', color: '#4a6d8a', letterSpacing: '0.12em', marginBottom: 14 }}>
            INTERPRETATION & ACTIONS
          </p>
          <RecommendationPanel compact={false} />
        </div>
      )}
    </div>
  )
}
