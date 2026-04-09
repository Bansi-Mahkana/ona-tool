import { ArrowRight, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import MetricGauge from '../metrics/MetricGauge'

/**
 * BeforeAfterPanel
 * Shows a clear side-by-side or stacked comparison of metrics
 * before and after structural changes.
 */
export default function BeforeAfterPanel({ before, after, labels = {} }) {
  if (!before || !after) return null

  const METRICS = [
    { key: 'frustrationIndex', label: labels.frustrationIndex || 'Frustration Index', invertedScale: true },
    { key: 'organizationalCost', label: labels.organizationalCost || 'Org Cost', invertedScale: true },
    { key: 'networkDensity', label: labels.networkDensity || 'Density', invertedScale: false },
    { key: 'signedBalance', label: labels.signedBalance || 'Signed Balance', invertedScale: false },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 12,
    }}>
      {METRICS.map((m) => {
        const bVal = before[m.key]
        const aVal = after[m.key]
        if (bVal === null && aVal === null) return null

        const delta = (bVal !== null && aVal !== null) ? aVal - bVal : null
        const improved = delta !== null && (m.invertedScale ? delta < 0 : delta > 0)
        const worsened = delta !== null && (m.invertedScale ? delta > 0 : delta < 0)
        const unchanged = delta !== null && Math.abs(delta) < 0.005

        return (
          <div key={m.key} className="card p-5">
            <p style={{
              fontFamily: "'Space Mono', monospace", fontSize: '0.65rem',
              color: '#4fc3f7', letterSpacing: '0.08em', marginBottom: 16, textAlign: 'center',
            }}>
              {m.label.toUpperCase()}
            </p>

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 12 }}>
              {/* Before */}
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.58rem', color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.08em' }}>
                  BEFORE
                </p>
                <MetricGauge
                  value={bVal}
                  label=""
                  invertedScale={m.invertedScale}
                  size={80}
                />
              </div>

              {/* Arrow + delta */}
              <div style={{ textAlign: 'center', paddingBottom: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
                {delta !== null && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    padding: '2px 6px', borderRadius: 99, marginTop: 2,
                    background: improved ? 'rgba(0,212,160,0.1)' : worsened ? 'rgba(255,71,87,0.1)' : 'rgba(74,109,138,0.1)',
                    border: `1px solid ${improved ? 'rgba(0,212,160,0.3)' : worsened ? 'rgba(255,71,87,0.3)' : 'rgba(74,109,138,0.2)'}`,
                  }}>
                    {improved ? (
                      <TrendingDown size={10} style={{ color: '#00d4a0' }} />
                    ) : worsened ? (
                      <TrendingUp size={10} style={{ color: '#ff4757' }} />
                    ) : (
                      <Minus size={10} style={{ color: 'var(--text-muted)' }} />
                    )}
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem',
                      color: improved ? '#00d4a0' : worsened ? '#ff4757' : 'var(--text-muted)',
                    }}>
                      {delta > 0 ? '+' : ''}{(delta * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>

              {/* After */}
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.58rem', color: improved ? '#00d4a0' : 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.08em' }}>
                  AFTER
                </p>
                <MetricGauge
                  value={aVal}
                  label=""
                  invertedScale={m.invertedScale}
                  size={80}
                  showChange={bVal !== null}
                  previousValue={bVal}
                />
              </div>
            </div>

            {/* Status pill */}
            {delta !== null && (
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <span style={{
                  fontFamily: "'Space Mono', monospace", fontSize: '0.62rem',
                  padding: '3px 10px', borderRadius: 99,
                  background: improved ? 'rgba(0,212,160,0.08)' : worsened ? 'rgba(255,71,87,0.08)' : 'rgba(74,109,138,0.08)',
                  color: improved ? '#00d4a0' : worsened ? '#ff4757' : 'var(--text-muted)',
                  border: `1px solid ${improved ? 'rgba(0,212,160,0.2)' : worsened ? 'rgba(255,71,87,0.2)' : 'rgba(74,109,138,0.15)'}`,
                }}>
                  {unchanged ? 'No change' : improved ? '✓ Improved' : '✗ Worsened'}
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
