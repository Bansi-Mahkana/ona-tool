import { useState } from 'react'
import { ZoomIn, ZoomOut, Maximize2, Filter, Eye, EyeOff } from 'lucide-react'

/**
 * GraphControls — toolbar for the network graph panel.
 * Props:
 *  onZoomIn, onZoomOut, onReset — forwarded to D3 zoom
 *  departments — list of dept strings
 *  activeDepts — Set of currently visible depts
 *  onToggleDept — (dept) => void
 *  showPositive, showNegative, showNeutral — edge sign visibility
 *  onToggleSign — ('positive'|'negative'|'neutral') => void
 */
export default function GraphControls({
  onZoomIn, onZoomOut, onReset,
  departments = [],
  activeDepts = new Set(),
  onToggleDept,
  showPositive = true,
  showNegative = true,
  showNeutral = true,
  onToggleSign,
}) {
  const [filterOpen, setFilterOpen] = useState(false)

  const DEPT_COLORS = [
    '#4fc3f7', '#00d4a0', '#f5a623', '#a78bfa', '#fb7185',
    '#34d399', '#fbbf24', '#60a5fa', '#f472b6', '#a3e635',
  ]

  const SIGN_FILTERS = [
    { key: 'positive', label: '+ Positive', color: '#00d4a0', active: showPositive },
    { key: 'negative', label: '− Negative', color: '#ff4757', active: showNegative },
    { key: 'neutral',  label: '● Neutral',  color: '#4fc3f7', active: showNeutral },
  ]

  return (
    <div style={{
      position: 'absolute', bottom: 16, left: 16,
      display: 'flex', flexDirection: 'column', gap: 8, zIndex: 20,
    }}>
      {/* Zoom controls */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 2,
        background: 'rgba(8,22,42,0.9)', border: '1px solid rgba(79,195,247,0.15)',
        borderRadius: 8, padding: 4, backdropFilter: 'blur(8px)',
      }}>
        {[
          { icon: ZoomIn, action: onZoomIn, label: 'Zoom in' },
          { icon: ZoomOut, action: onZoomOut, label: 'Zoom out' },
          { icon: Maximize2, action: onReset, label: 'Reset view' },
        ].map(({ icon: Icon, action, label }) => (
          <button
            key={label}
            title={label}
            onClick={action}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#8bacc5', padding: '5px 7px', borderRadius: 5, lineHeight: 0,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#4fc3f7'}
            onMouseLeave={e => e.currentTarget.style.color = '#8bacc5'}
          >
            <Icon size={14} />
          </button>
        ))}
      </div>

      {/* Filter toggle */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setFilterOpen(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: filterOpen ? 'rgba(79,195,247,0.12)' : 'rgba(8,22,42,0.9)',
            border: `1px solid ${filterOpen ? 'rgba(79,195,247,0.4)' : 'rgba(79,195,247,0.15)'}`,
            borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
            color: filterOpen ? '#4fc3f7' : '#8bacc5',
            fontFamily: "'Space Mono', monospace", fontSize: '0.62rem',
            backdropFilter: 'blur(8px)', transition: 'all 0.15s',
          }}
        >
          <Filter size={12} /> FILTER
        </button>

        {filterOpen && (
          <div style={{
            position: 'absolute', bottom: 'calc(100% + 8px)', left: 0,
            background: 'rgba(8,22,42,0.96)', border: '1px solid rgba(79,195,247,0.2)',
            borderRadius: 10, padding: 12, minWidth: 180,
            backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}>
            {/* Edge signs */}
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', color: '#4a6d8a', letterSpacing: '0.1em', marginBottom: 8 }}>
              EDGE SIGNS
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
              {SIGN_FILTERS.map(({ key, label, color, active }) => (
                <button
                  key={key}
                  onClick={() => onToggleSign && onToggleSign(key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: active ? `${color}10` : 'transparent',
                    border: `1px solid ${active ? `${color}30` : 'transparent'}`,
                    borderRadius: 5, padding: '5px 8px', cursor: 'pointer',
                    color: active ? color : '#4a6d8a',
                    fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem',
                    transition: 'all 0.15s', textAlign: 'left', width: '100%',
                  }}
                >
                  {active ? <Eye size={11} /> : <EyeOff size={11} />}
                  {label}
                </button>
              ))}
            </div>

            {/* Departments */}
            {departments.length > 0 && (
              <>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', color: '#4a6d8a', letterSpacing: '0.1em', marginBottom: 8 }}>
                  DEPARTMENTS
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {departments.map((dept, i) => {
                    const color = DEPT_COLORS[i % DEPT_COLORS.length]
                    const active = activeDepts.has(dept)
                    return (
                      <button
                        key={dept}
                        onClick={() => onToggleDept && onToggleDept(dept)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          background: active ? `${color}10` : 'transparent',
                          border: `1px solid ${active ? `${color}25` : 'transparent'}`,
                          borderRadius: 5, padding: '5px 8px', cursor: 'pointer',
                          color: active ? color : '#4a6d8a',
                          fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem',
                          transition: 'all 0.15s', textAlign: 'left', width: '100%',
                        }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: active ? color : '#2a4a65', flexShrink: 0 }} />
                        {dept}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
