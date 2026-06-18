import { useEffect, useState } from 'react'
import { metricColor, metricLabel } from '../../utils/metricHelpers'

/**
 * Animated circular gauge for 0-1 metrics.
 * invertedScale: true = lower is better (frustration, cost)
 */
export default function MetricGauge({ value, label, subtitle, invertedScale = true, size = 120, showChange = false, previousValue = null }) {
  const [animated, setAnimated] = useState(0)

  useEffect(() => {
    if (value === null || value === undefined) return
    const timeout = setTimeout(() => setAnimated(value), 100)
    return () => clearTimeout(timeout)
  }, [value])

  const r = (size - 20) / 2
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference * (1 - animated)
  const color = metricColor(value, invertedScale)
  const statusLabel = metricLabel(value, invertedScale)

  const isNA = value === null || value === undefined
  const change = previousValue !== null && !isNA ? value - previousValue : null

  return (
    <div style={{ textAlign: 'center', position: 'relative', display: 'inline-block' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="rgba(79,195,247,0.1)" strokeWidth={8}
        />
        {/* Value arc */}
        {!isNA && (
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={color}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="gauge-ring"
            style={{
              filter: `drop-shadow(0 0 6px ${color}80)`,
            }}
          />
        )}
        {/* Center text */}
        <text
          x={size / 2} y={size / 2 - 6}
          textAnchor="middle" dominantBaseline="middle"
          fill={isNA ? 'var(--text-muted)' : color}
          fontFamily="'Space Mono', monospace"
          fontWeight="700"
          fontSize={size < 100 ? 14 : 18}
        >
          {isNA ? 'N/A' : (value < 0.01 && value > 0 ? value.toFixed(4) : value.toFixed(2))}
        </text>
        <text
          x={size / 2} y={size / 2 + 14}
          textAnchor="middle"
          fill="var(--text-muted)"
          fontFamily="'JetBrains Mono', monospace"
          fontSize={9}
          letterSpacing="0.08em"
        >
          {statusLabel}
        </text>
      </svg>

      <div style={{ marginTop: 8 }}>
        <p style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: '0.72rem',
          color: 'var(--text-primary)',
          letterSpacing: '0.04em',
          marginBottom: 2,
        }}>
          {label}
        </p>
        {subtitle && (
          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: "'DM Sans', sans-serif" }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Change indicator */}
      {showChange && change !== null && (
        <div style={{
          marginTop: 6,
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 8px', borderRadius: 99,
          background: change < 0 ? 'rgba(0,212,160,0.1)' : 'rgba(255,71,87,0.1)',
          border: `1px solid ${change < 0 ? 'rgba(0,212,160,0.3)' : 'rgba(255,71,87,0.3)'}`,
        }}>
          <span style={{
            fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace",
            color: change < 0 ? '#00d4a0' : '#ff4757',
          }}>
            {change > 0 ? '+' : ''}{(change * 100).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  )
}
