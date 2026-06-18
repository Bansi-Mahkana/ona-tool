import React, { useState, useMemo, useEffect } from 'react'
import { Sparkles, GitBranch, AlertCircle, CheckCircle2, UserCheck, ArrowRight, Download, Upload, Zap } from 'lucide-react'
import useNetworkStore from '../store/networkStore'

export default function Optimization() {
  const { 
    graphData, swappableMatrices, updateSwappableMatrixCell, setSwappableMatrices,
    optimizationResults, setOptimizationResults 
  } = useNetworkStore()
  
  const [selectedLevel, setSelectedLevel] = useState(0)
  const [loading, setLoading] = useState(false)

  // Identify nodes at each level
  const levelMap = useMemo(() => {
    if (!graphData) return {}
    const map = {}
    graphData.nodes.forEach(node => {
      const parts = node.id.split('.')
      const level = Math.max(0, parts.length - 2)
      if (!map[level]) map[level] = []
      map[level].push(node)
    })
    return map
  }, [graphData])

  const levels = Object.keys(levelMap).sort((a, b) => a - b)

  // Initialize matrices if empty
  useEffect(() => {
    if (graphData && Object.keys(swappableMatrices).length === 0) {
      const initial = {}
      Object.keys(levelMap).forEach(level => {
        initial[level] = {}
        const nodes = levelMap[level]
        nodes.forEach(u => {
          initial[level][u.id] = {}
          nodes.forEach(v => {
            // Identity is always 1, others 0 by default
            initial[level][u.id][v.id] = u.id === v.id ? 1 : 0
          })
        })
      })
      setSwappableMatrices(initial)
    }
  }, [graphData, levelMap, swappableMatrices, setSwappableMatrices])

  const [matrixScale, setMatrixScale] = useState(1.0)
  const currentNodes = levelMap[selectedLevel] || []
  const currentMatrix = (swappableMatrices || {})[selectedLevel] || {}

  // Dynamic sizes based on scale
  const cellSize = 40 * matrixScale
  const headerWidth = 140 * matrixScale
  const headerHeight = 60 * matrixScale

  const runOptimization = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/optimization/run-swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: graphData.nodes,
          links: graphData.links,
          swappable_matrices: swappableMatrices,
        }),
      })
      const data = await response.json()
      setOptimizationResults(data)
    } catch (err) {
      console.error('Optimization failed', err)
    } finally {
      setLoading(false)
    }
  }

  if (!graphData) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontFamily: "'Space Mono', monospace" }}>
          Please upload hierarchy data first to access optimization tools.
        </p>
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ padding: '24px 40px', maxWidth: 1400, margin: '0 auto' }}>
      <header style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(79,195,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={18} color="#4fc3f7" />
          </div>
          <h1 style={{ fontSize: '1.2rem', fontFamily: "'Space Mono', monospace", fontWeight: 700, letterSpacing: '0.05em' }}>
            SWAPPABLE <span style={{ color: '#4fc3f7' }}>MATRIX</span> DASHBOARD
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: 700, lineHeight: 1.6 }}>
          Define which employees can be structurally relocated. The algorithm will only consider swaps between 
          node pairs marked as <span style={{ color: '#00d4a0' }}>1</span> in their respective level matrix.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        
        {/* Main Workspace */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Level Selector */}
            <div style={{ display: 'flex', gap: 8 }}>
              {levels.map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setSelectedLevel(Number(lvl))}
                  style={{
                    padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                    background: selectedLevel === Number(lvl) ? 'rgba(79,195,247,0.12)' : 'rgba(13,31,51,0.5)',
                    color: selectedLevel === Number(lvl) ? '#4fc3f7' : 'var(--text-muted)',
                    fontFamily: "'Space Mono', monospace", fontSize: '0.65rem',
                    letterSpacing: '0.1em', transition: 'all 0.2s',
                    border: `1px solid ${selectedLevel === Number(lvl) ? 'rgba(79,195,247,0.2)' : 'rgba(255,255,255,0.05)'}`,
                  }}
                >
                  LEVEL {lvl} ({levelMap[lvl].length} NODES)
                </button>
              ))}
            </div>

            {/* Matrix Zoom Slider & Helpers */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
               <button 
                 onClick={() => {
                   const nodes = levelMap[selectedLevel] || []
                   const newMatrix = { ...swappableMatrices[selectedLevel] }
                   nodes.forEach(u => {
                     if (!newMatrix[u.id]) newMatrix[u.id] = {}
                     nodes.forEach(v => {
                       newMatrix[u.id][v.id] = 1
                     })
                   })
                   setSwappableMatrices({ ...swappableMatrices, [selectedLevel]: newMatrix })
                 }}
                 style={{
                   padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(0,212,160,0.3)',
                   background: 'rgba(0,212,160,0.05)', color: '#00d4a0', cursor: 'pointer',
                   fontFamily: "'Space Mono', monospace", fontSize: '0.6rem'
                 }}
               >
                 ENABLE ALL SWAPS
               </button>

               <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(13,31,51,0.3)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.6rem', fontFamily: "'Space Mono', monospace", color: 'var(--text-muted)' }}>ZOOM</span>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="2.5" 
                    step="0.1" 
                    value={matrixScale}
                    onChange={(e) => setMatrixScale(parseFloat(e.target.value))}
                    style={{ width: 100, height: 4, accentColor: '#4fc3f7' }}
                  />
                  <span style={{ fontSize: '0.6rem', fontFamily: "'JetBrains Mono', monospace", color: '#4fc3f7', minWidth: 35 }}>
                    {Math.round(matrixScale * 100)}%
                  </span>
               </div>
            </div>
          </div>

          {/* Matrix Grid Container */}
          <div className="card" style={{ 
            padding: 0, 
            overflow: 'hidden', 
            display: 'flex', 
            flexDirection: 'column', 
            maxHeight: '70vh',
            border: '1px solid var(--border)'
          }}>
            <div style={{ 
              padding: '16px 24px', 
              borderBottom: '1px solid var(--border)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              background: 'var(--bg-secondary)',
              flexShrink: 0
            }}>
               <h3 style={{ fontSize: '0.75rem', fontFamily: "'Space Mono', monospace", color: 'var(--text-muted)' }}>
                 H-LEVEL {selectedLevel} CONNECTIVITY PREFERENCE
               </h3>
               <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn-secondary" style={{ fontSize: '0.6rem', padding: '4px 10px' }}>
                    <Download size={11} style={{ marginRight: 4 }} /> DOWNLOAD FORMAT
                  </button>
                  <button className="btn-secondary" style={{ fontSize: '0.6rem', padding: '4px 10px' }}>
                    <Upload size={11} style={{ marginRight: 4 }} /> IMPORT CSV
                  </button>
               </div>
            </div>

            {/* Scrollable Matrix Area */}
            <div style={{ 
              overflow: 'auto', 
              flex: 1, 
              position: 'relative',
              background: '#08121d' // Slightly darker for matrix area
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: `${headerWidth}px repeat(${currentNodes.length}, ${cellSize}px)`,
                gap: 1,
                width: 'max-content'
              }}>
                <div style={{
                  position: 'sticky', top: 0, left: 0, zIndex: 100,
                  background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)',
                  borderBottom: '1px solid var(--border)', height: headerHeight
                }} />

                {/* Column Headers (Sticky Top) */}
                {currentNodes.map(node => (
                  <div key={node.id} style={{
                    position: 'sticky', top: 0, zIndex: 90,
                    fontSize: `${0.55 * matrixScale}rem`, 
                    color: 'var(--text-muted)', textAlign: 'center', 
                    height: headerHeight,
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                    padding: '8px 2px',
                    background: 'var(--bg-secondary)',
                    borderBottom: '1px solid var(--border)',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden'
                  }}>
                    <span style={{ transform: 'rotate(-45deg)', display: 'block', width: '100%' }}>
                      {node.label || node.id}
                    </span>
                  </div>
                ))}

                {/* Rows */}
                {currentNodes.map(rowNode => (
                  <React.Fragment key={rowNode.id}>
                    {/* Row Header (Sticky Left) */}
                    <div style={{
                      position: 'sticky', left: 0, zIndex: 80,
                      fontSize: `${0.6 * matrixScale}rem`, 
                      padding: '8px 12px', background: 'var(--bg-secondary)',
                      color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace",
                      borderRight: '1px solid var(--border)',
                      height: cellSize,
                      display: 'flex', alignItems: 'center',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden'
                    }}>
                      {rowNode.label || rowNode.id}
                    </div>

                    {/* Matrix Cells */}
                    {currentNodes.map(colNode => {
                      const val = currentMatrix[rowNode.id]?.[colNode.id] ?? 0
                      const isSelf = rowNode.id === colNode.id
                      return (
                        <div
                          key={colNode.id}
                          onClick={() => !isSelf && updateSwappableMatrixCell(selectedLevel, rowNode.id, colNode.id, val === 1 ? 0 : 1)}
                          style={{
                            width: cellSize, height: cellSize,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: isSelf ? 'default' : 'pointer',
                            background: val === 1 ? 'rgba(0,212,160,0.15)' : isSelf ? 'rgba(79,195,247,0.05)' : 'rgba(255,255,255,0.01)',
                            color: val === 1 ? '#00d4a0' : isSelf ? '#4fc3f7' : 'var(--text-muted)',
                            fontFamily: "'Space Mono', monospace", 
                            fontSize: `${0.7 * matrixScale}rem`,
                            border: '0.5px solid rgba(255,255,255,0.03)',
                            transition: 'all 0.1s',
                            opacity: isSelf ? 0.8 : 1
                          }}
                        >
                          {val}
                        </div>
                      )
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Controls & Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card p-5" style={{ background: 'rgba(79,195,247,0.03)' }}>
             <h3 style={{ fontSize: '0.75rem', color: '#4fc3f7', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
               <Zap size={14} /> SIMULATION ENGINE
             </h3>
             <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
               Execute the relocation algorithm to minimize internal volatility by finding optimal swappable pairs.
             </p>
             <button
               onClick={runOptimization}
               disabled={loading}
               style={{
                 width: '100%', padding: '12px', borderRadius: 8, border: 'none',
                 background: 'linear-gradient(135deg, #4fc3f7, #00d4a0)', color: '#0d1f33',
                 fontFamily: "'Space Mono', monospace", fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
                 display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                 opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
               }}
             >
               {loading ? 'CALCULATING...' : <><Sparkles size={16} /> RUN OPTIMIZATION</>}
             </button>
          </div>

          {optimizationResults && (
            <div className="card p-5 fade-in">
              <h3 style={{ fontSize: '0.7rem', color: '#00d4a0', marginBottom: 16, borderBottom: '1px solid rgba(0,212,160,0.2)', paddingBottom: 8 }}>
                OPTIMIZATION RESULTS
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {optimizationResults.swaps.length === 0 ? (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                    No beneficial swaps found within current constraints.
                  </p>
                ) : (
                  optimizationResults.swaps.map((swap, i) => (
                    <div key={i} style={{
                      background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                         <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>SWAP #{i+1}</span>
                         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                           <span style={{ fontSize: '0.62rem', color: '#00d4a0', background: 'rgba(0,212,160,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                             Δ {swap.improvement.toFixed(2)}
                           </span>
                         </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>{swap.node_a}</div>
                          <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>{swap.from_dept_a}</div>
                        </div>
                        <ArrowRight size={14} color="var(--text-muted)" />
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>{swap.node_b}</div>
                          <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>{swap.from_dept_b}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10 }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{swap.from_dept_a} POSITIVITY</span>
                            <span style={{ fontSize: '0.65rem', color: (swap.pos_a_delta || 0) >= 0 ? '#00d4a0' : '#ff5252', fontWeight: 600 }}>
                               {(swap.pos_a_delta || 0) >= 0 ? '+' : ''}{((swap.pos_a_delta || 0) * 100).toFixed(1)}%
                            </span>
                         </div>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{swap.from_dept_b} POSITIVITY</span>
                            <span style={{ fontSize: '0.65rem', color: (swap.pos_b_delta || 0) >= 0 ? '#00d4a0' : '#ff5252', fontWeight: 600 }}>
                               {(swap.pos_b_delta || 0) >= 0 ? '+' : ''}{((swap.pos_b_delta || 0) * 100).toFixed(1)}%
                            </span>
                         </div>
                      </div>
                    </div>
                  ))
                )}
                {optimizationResults.summary && (
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: 8, background: 'rgba(79,195,247,0.05)', padding: 8, borderRadius: 4 }}>
                    {optimizationResults.summary}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
