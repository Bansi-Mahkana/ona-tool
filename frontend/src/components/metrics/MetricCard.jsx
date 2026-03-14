import MetricGauge from './MetricGauge'
import { metricColor } from '../../utils/metricHelpers'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'

export default function MetricCard({
  label, value, previousValue = null, invertedScale = true,
  interpretation, subtitle, size = 'normal',
}) {
  const isSmall = size === 'small'
  const gaugeSize = isSmall ? 90 : 120
  const showChange = previousValue !== null && value !== null
  const change = showChange ? value - previousValue : null

  const changeGood = change !== null && (invertedScale ? change < 0 : change > 0)

  return (
    <div className="card p-5" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
    }}>
      <MetricGauge
        value={value}
        label={label}
        subtitle={subtitle}
        invertedScale={invertedScale}
        size={gaugeSize}
        showChange={showChange}
        previousValue={previousValue}
      />

      {showChange && change !== null && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 99,
          background: changeGood ? 'rgba(0,212,160,0.08)' : 'rgba(255,71,87,0.08)',
          border: `1px solid ${changeGood ? 'rgba(0,212,160,0.25)' : 'rgba(255,71,87,0.25)'}`,
        }}>
          {changeGood
            ? <TrendingDown size={12} style={{ color: '#00d4a0' }} />
            : <TrendingUp size={12} style={{ color: '#ff4757' }} />}
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.65rem',
            color: changeGood ? '#00d4a0' : '#ff4757',
          }}>
            {changeGood ? 'Improved' : 'Worsened'} {Math.abs(change * 100).toFixed(1)}%
          </span>
        </div>
      )}

      {interpretation && (
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '0.72rem',
          color: '#8bacc5',
          lineHeight: 1.65,
          textAlign: 'center',
          padding: '0 4px',
        }}>
          {interpretation}
        </p>
      )}
    </div>
  )
}
