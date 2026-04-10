import { Lightbulb, ArrowRight, Users, GitBranch, Zap } from 'lucide-react'
import useNetworkStore from '../../store/networkStore'
import { interpretFrustrationIndex, interpretPositivity, interpretBalance, interpretChange } from '../../utils/metricHelpers'

/**
 * Generates algorithmic recommendations based on current metrics.
 * NOTE: In production, these come from the backend recommender service.
 * These are client-side heuristic suggestions as a preview.
 */
function generateRecommendations(metrics, graphData) {
  const recs = []

  if (metrics.frustrationIndex > 0.5) {
    const negEdges = graphData?.links?.filter((l) => l.sign === -1) || []
    recs.push({
      icon: GitBranch,
      priority: 'HIGH',
      color: '#ff4757',
      title: 'Resolve Negative Ties',
      action: `${negEdges.length} negative relationship(s) detected. Consider facilitating cross-team workshops or knowledge-sharing sessions between conflicted pairs.`,
      metric: 'Frustration Index',
      expectedDelta: -0.12,
    })
  }

  if (metrics.organizationalPositivity !== null && metrics.organizationalPositivity < 0.4) {
    recs.push({
      icon: Users,
      priority: 'HIGH',
      color: '#f5a623',
      title: 'Increase Positivity',
      action: 'The network lacks strong positive ties. Encourage more team-building activities and collaborative projects to foster better relationships.',
      metric: 'Organizational Positivity',
      expectedDelta: 0.15,
    })
  }

  if (metrics.organizationalBalance !== null && metrics.organizationalBalance < 0.6) {
    recs.push({
      icon: GitBranch,
      priority: 'MEDIUM',
      color: '#a78bfa',
      title: 'Improve Structural Balance',
      action: 'The network has poor structural balance per Heider\'s theory. Focus on resolving tensions and converting ambivalent relationships to positive ones.',
      metric: 'Organizational Balance',
      expectedDelta: 0.1,
    })
  }

  if (recs.length === 0) {
    recs.push({
      icon: Lightbulb,
      priority: 'LOW',
      color: '#00d4a0',
      title: 'Network is Healthy',
      action: 'Current metrics indicate a well-balanced, efficient network. Continue monitoring and consider running a quarterly ONA survey to track changes over time.',
      metric: 'All Metrics',
      expectedDelta: 0,
    })
  }

  return recs
}

export default function RecommendationPanel({ compact = false }) {
  const { metrics, graphData, snapshotMetrics, interpretationMode, pendingChanges } = useNetworkStore()
  const recommendations = generateRecommendations(metrics, graphData)

  const fiInterp = interpretationMode === 'after' && snapshotMetrics
    ? interpretChange(snapshotMetrics.frustrationIndex, metrics.frustrationIndex, 'frustrationIndex')
    : interpretFrustrationIndex(metrics.frustrationIndex)

  const posInterp = interpretationMode === 'after' && snapshotMetrics
    ? interpretChange(snapshotMetrics.organizationalPositivity, metrics.organizationalPositivity, 'organizationalPositivity')
    : interpretPositivity(metrics.organizationalPositivity)

  const balInterp = interpretationMode === 'after' && snapshotMetrics
    ? interpretChange(snapshotMetrics.organizationalBalance, metrics.organizationalBalance, 'organizationalBalance')
    : interpretBalance(metrics.organizationalBalance)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Mode toggle */}
      {snapshotMetrics && (
        <div style={{
          display: 'flex', gap: 4,
          background: 'rgba(13,31,51,0.8)', border: '1px solid rgba(79,195,247,0.1)',
          borderRadius: 8, padding: 4,
        }}>
          {['current', 'after'].map((mode) => (
            <button
              key={mode}
              onClick={() => useNetworkStore.getState().setInterpretationMode(mode)}
              style={{
                flex: 1, padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: interpretationMode === mode ? 'rgba(79,195,247,0.12)' : 'transparent',
                color: interpretationMode === mode ? '#4fc3f7' : 'var(--text-muted)',
                fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', letterSpacing: '0.08em',
                textTransform: 'uppercase', transition: 'all 0.2s',
              }}
            >
              {mode === 'current' ? 'Current State' : 'After Changes'}
            </button>
          ))}
        </div>
      )}

      {/* Pending changes list */}
      {pendingChanges.length > 0 && (
        <div style={{
          background: 'rgba(0,212,160,0.05)', border: '1px solid rgba(0,212,160,0.15)',
          borderRadius: 8, padding: 12,
        }}>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: '#00d4a0', letterSpacing: '0.1em', marginBottom: 6 }}>
            PENDING CHANGES ({pendingChanges.length})
          </p>
          {pendingChanges.map((c, i) => (
            <div key={i} style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem',
              color: 'var(--text-secondary)', padding: '2px 0',
            }}>
              • {c.description}
            </div>
          ))}
        </div>
      )}

      {/* Network interpretation */}
      <div className="card p-4">
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: '#4fc3f7', letterSpacing: '0.1em', marginBottom: 10 }}>
          NETWORK INTERPRETATION
        </p>

        {fiInterp && (
          <div className={interpretationMode === 'after' ? 'interpretation-after' : 'interpretation-before'} style={{ marginBottom: 12 }}>
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.63rem', color: 'var(--text-muted)', marginBottom: 4, letterSpacing: '0.06em' }}>
              FRUSTRATION INDEX
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              {fiInterp}
            </p>
          </div>
        )}

        {posInterp && (
          <div className={interpretationMode === 'after' ? 'interpretation-after' : 'interpretation-before'} style={{ marginBottom: 12 }}>
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.63rem', color: 'var(--text-muted)', marginBottom: 4, letterSpacing: '0.06em' }}>
              ORGANISATIONAL POSITIVITY
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              {posInterp}
            </p>
          </div>
        )}

        {balInterp && (
          <div className={interpretationMode === 'after' ? 'interpretation-after' : 'interpretation-before'}>
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.63rem', color: 'var(--text-muted)', marginBottom: 4, letterSpacing: '0.06em' }}>
              ORGANISATIONAL BALANCE
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              {balInterp}
            </p>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {!compact && (
        <div className="card p-4">
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: '#f5a623', letterSpacing: '0.1em', marginBottom: 10 }}>
            RECOMMENDATIONS
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recommendations.map((rec, i) => (
              <div key={i} style={{
                background: `${rec.color}08`,
                border: `1px solid ${rec.color}20`,
                borderRadius: 8, padding: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <rec.icon size={13} style={{ color: rec.color }} />
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: 'var(--text-primary)' }}>
                    {rec.title}
                  </span>
                  <span style={{
                    marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.58rem',
                    color: rec.color, background: `${rec.color}15`, padding: '1px 6px', borderRadius: 4,
                    letterSpacing: '0.08em',
                  }}>
                    {rec.priority}
                  </span>
                </div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 6 }}>
                  {rec.action}
                </p>
                {rec.expectedDelta !== 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                      Expected Δ {rec.metric}:
                    </span>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: '0.62rem',
                      color: rec.expectedDelta < 0 ? '#00d4a0' : '#ff4757',
                    }}>
                      {rec.expectedDelta > 0 ? '+' : ''}{(rec.expectedDelta * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
