import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, RefreshCw, GitBranch, FileText, FileJson } from 'lucide-react'
import useNetworkStore from '../store/networkStore'
import MetricGauge from '../components/metrics/MetricGauge'
import BeforeAfterPanel from '../components/metrics/BeforeAfterPanel'
import RecommendationPanel from '../components/recommendations/RecommendationPanel'
import { interpretFrustrationIndex, interpretOrganizationalCost } from '../utils/metricHelpers'
import { exportReportAsMarkdown, exportGraphAsJSON } from '../utils/exportUtils'
import { useNetworkData } from '../hooks/useNetworkData'

export default function Recommendations() {
  const navigate = useNavigate()
  const { metrics, snapshotMetrics, graphData, pendingChanges } = useNetworkStore()
  const { fetchRecommendations, apiStatus } = useNetworkData()

  const [backendRecs, setBackendRecs] = useState(null)
  const [loadingRecs, setLoadingRecs] = useState(false)

  const hasChanges = snapshotMetrics !== null
  const fiInterp = interpretFrustrationIndex(metrics.frustrationIndex)
  const ocInterp = interpretOrganizationalCost(metrics.organizationalCost)

  const loadBackendRecs = async () => {
    setLoadingRecs(true)
    const data = await fetchRecommendations()
    if (data) setBackendRecs(data)
    setLoadingRecs(false)
  }

  // Auto-fetch on mount if backend might be available
  useEffect(() => {
    loadBackendRecs()
  }, [])

  const handleExportMarkdown = () => {
    exportReportAsMarkdown({
      graphData,
      metrics,
      snapshotMetrics,
      pendingChanges,
      fiInterpretation: fiInterp,
      ocInterpretation: ocInterp,
      recommendations: backendRecs?.recommendations,
    })
  }

  const handleExportJSON = () => {
    exportGraphAsJSON(graphData, metrics)
  }

  return (
    <div className="min-h-screen grid-bg" style={{ padding: '28px 20px' }}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
          <button className="btn-secondary" style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem' }} onClick={() => navigate('/analysis')}>
            <ArrowLeft size={12} /> Back
          </button>
          <div>
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', color: '#4a6d8a', letterSpacing: '0.1em' }}>STEP 04</p>
            <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: '1.5rem', color: '#e8f4fd', margin: 0 }}>
              Optimisation Recommendations
            </h1>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button
              className="btn-secondary"
              style={{ padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem' }}
              onClick={loadBackendRecs}
              disabled={loadingRecs}
            >
              <RefreshCw size={12} style={{ animation: loadingRecs ? 'spin 1s linear infinite' : 'none' }} />
              {loadingRecs ? 'Fetching…' : 'Refresh from API'}
            </button>
            <button className="btn-secondary" style={{ padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem' }} onClick={handleExportMarkdown}>
              <FileText size={12} /> Export .md
            </button>
            <button className="btn-secondary" style={{ padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem' }} onClick={handleExportJSON}>
              <FileJson size={12} /> Export .json
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18 }}>

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Backend summary banner */}
            {backendRecs?.summary && (
              <div style={{
                padding: '12px 16px', borderRadius: 10,
                background: 'rgba(0,212,160,0.05)', border: '1px solid rgba(0,212,160,0.2)',
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d4a0', marginTop: 5, flexShrink: 0 }} />
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8rem', color: '#8bacc5', lineHeight: 1.6, margin: 0 }}>
                  {backendRecs.summary}
                </p>
              </div>
            )}

            {/* Before / After comparison */}
            <div className="card p-5">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.68rem', color: '#4fc3f7', letterSpacing: '0.08em', margin: 0 }}>
                  METRIC COMPARISON
                </p>
                {!hasChanges && (
                  <span style={{ marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: '#4a6d8a' }}>
                    Snapshot a state in Analysis to compare →
                  </span>
                )}
              </div>

              {hasChanges ? (
                <BeforeAfterPanel before={snapshotMetrics} after={metrics} />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                  {[
                    { key: 'frustrationIndex', label: 'Frustration Index', invertedScale: true },
                    { key: 'organizationalCost', label: 'Org Cost', invertedScale: true },
                    { key: 'networkDensity', label: 'Density', invertedScale: false },
                    { key: 'signedBalance', label: 'Signed Balance', invertedScale: false },
                  ].map((m) => (
                    <div key={m.key} style={{ display: 'flex', justifyContent: 'center' }}>
                      <MetricGauge value={metrics[m.key]} label={m.label} invertedScale={m.invertedScale} size={100} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Changes log */}
            {pendingChanges.length > 0 && (
              <div className="card p-5">
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: '#f5a623', letterSpacing: '0.1em', marginBottom: 12 }}>
                  CHANGES APPLIED ({pendingChanges.length})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {pendingChanges.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', borderRadius: 6, background: 'rgba(245,166,35,0.04)', border: '1px solid rgba(245,166,35,0.12)' }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: '#4a6d8a', width: 18, textAlign: 'center' }}>{i+1}</span>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.76rem', color: '#e8f4fd' }}>{c.description}</span>
                      <span style={{ marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.58rem', color: '#f5a623', background: 'rgba(245,166,35,0.08)', padding: '1px 6px', borderRadius: 4 }}>{c.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Signed network breakdown */}
            <div className="card p-5" style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.04), rgba(79,195,247,0.02))', borderColor: 'rgba(167,139,250,0.18)' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
                <GitBranch size={13} style={{ color: '#a78bfa' }} />
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: '#a78bfa', letterSpacing: '0.08em', margin: 0 }}>
                  SIGNED NETWORK BREAKDOWN
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
                {[
                  { label: 'Positive', value: graphData?.links?.filter(l=>l.sign===1).length ?? 0, color: '#00d4a0' },
                  { label: 'Negative', value: graphData?.links?.filter(l=>l.sign===-1).length ?? 0, color: '#ff4757' },
                  { label: 'Neutral',  value: graphData?.links?.filter(l=>l.sign===0).length ?? 0,  color: '#4fc3f7' },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign: 'center', padding: 12, borderRadius: 8, background: `${s.color}08`, border: `1px solid ${s.color}18` }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '1.5rem', color: s.color, fontWeight: 700 }}>{s.value}</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.68rem', color: '#4a6d8a', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.74rem', color: '#8bacc5', lineHeight: 1.65, margin: 0 }}>
                Based on Heider's structural balance theory, a network is <em>balanced</em> when every
                triangle has 0 or 2 negative edges. Triangles with 1 or 3 negative edges are
                <b style={{ color: '#ff4757' }}> frustrated</b> — each one contributes to the Frustration Index.
                The backend API enumerates all triangles using NetworkX to compute this precisely.
              </p>
            </div>
          </div>

          {/* Right sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Backend recommendations (if loaded) */}
            {backendRecs?.recommendations?.length > 0 && (
              <div className="card p-4">
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.62rem', color: '#00d4a0', letterSpacing: '0.1em', marginBottom: 10 }}>
                  API RECOMMENDATIONS
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {backendRecs.recommendations.map((rec, i) => {
                    const prioColor = rec.priority === 'HIGH' ? '#ff4757' : rec.priority === 'MEDIUM' ? '#f5a623' : '#00d4a0'
                    return (
                      <div key={i} style={{ padding: 11, borderRadius: 8, background: `${prioColor}07`, border: `1px solid ${prioColor}18` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.68rem', color: '#e8f4fd' }}>{rec.title}</span>
                          <span style={{ marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.56rem', color: prioColor, background: `${prioColor}15`, padding: '1px 5px', borderRadius: 4 }}>
                            {rec.priority}
                          </span>
                        </div>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', color: '#8bacc5', lineHeight: 1.6, margin: '0 0 6px' }}>
                          {rec.action}
                        </p>
                        {rec.expected_delta !== 0 && (
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: '#4a6d8a' }}>Δ {rec.metric}:</span>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: rec.expected_delta < 0 ? '#00d4a0' : '#ff4757' }}>
                              {rec.expected_delta > 0 ? '+' : ''}{(rec.expected_delta * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Client-side interpretation panel */}
            <RecommendationPanel compact={false} />
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
