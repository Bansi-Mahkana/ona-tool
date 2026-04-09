import { useNavigate, useLocation } from 'react-router-dom'
import { Network, Upload, BarChart2, Lightbulb, RotateCcw, Moon, Sun } from 'lucide-react'
import useNetworkStore from '../../store/networkStore'

const NAV_ITEMS = [
  { path: '/', label: 'HOME', icon: Network },
  { path: '/upload', label: 'IMPORT', icon: Upload },
  { path: '/analysis', label: 'ANALYSE', icon: BarChart2 },
  { path: '/recommendations', label: 'OPTIMISE', icon: Lightbulb },
]

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { graphData, reset, theme, toggleTheme } = useNetworkStore()

  return (
    <nav style={{
      display: 'flex', alignItems: 'center',
      padding: '0 24px', height: 52,
      background: 'var(--bg-primary)',
      borderBottom: '1px solid rgba(79,195,247,0.1)',
      backdropFilter: 'blur(12px)',
      position: 'sticky', top: 0, zIndex: 100,
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginRight: 32 }}
        onClick={() => navigate('/')}
      >
        <div style={{
          width: 28, height: 28,
          background: 'linear-gradient(135deg, #4fc3f7, #00d4a0)',
          borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Network size={14} color="var(--bg-primary)" />
        </div>
        <span style={{
          fontFamily: "'Space Mono', monospace", fontWeight: 700,
          fontSize: '0.78rem', color: 'var(--text-primary)', letterSpacing: '0.05em',
        }}>
          ONA<span style={{ color: '#4fc3f7' }}>·</span>TOOL
        </span>
      </div>

      {/* Nav items */}
      <div style={{ display: 'flex', gap: 2 }}>
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path
          const locked = (item.path === '/analysis' || item.path === '/recommendations') && !graphData
          return (
            <button
              key={item.path}
              onClick={() => !locked && navigate(item.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 6, border: 'none', cursor: locked ? 'not-allowed' : 'pointer',
                background: active ? 'rgba(79,195,247,0.1)' : 'transparent',
                color: active ? '#4fc3f7' : locked ? '#2a4a65' : 'var(--text-secondary)',
                fontFamily: "'Space Mono', monospace", fontSize: '0.62rem', letterSpacing: '0.1em',
                transition: 'all 0.15s',
                opacity: locked ? 0.5 : 1,
              }}
            >
              <item.icon size={12} />
              {item.label}
              {active && (
                <span style={{
                  width: 4, height: 4, borderRadius: '50%', background: '#4fc3f7', marginLeft: 2,
                }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Right side */}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
            background: 'transparent', color: 'var(--text-secondary)',
            transition: 'all 0.15s',
          }}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        {graphData && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 99,
            background: 'rgba(0,212,160,0.08)', border: '1px solid rgba(0,212,160,0.2)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d4a0' }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.62rem', color: '#00d4a0' }}>
              {graphData.nodes.length}N · {graphData.links.length}E
            </span>
          </div>
        )}
        {graphData && (
          <button
            onClick={() => { reset(); navigate('/') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,71,87,0.2)',
              background: 'transparent', color: '#ff4757', cursor: 'pointer',
              fontFamily: "'Space Mono', monospace", fontSize: '0.6rem',
              transition: 'all 0.15s',
            }}
          >
            <RotateCcw size={11} /> RESET
          </button>
        )}
      </div>
    </nav>
  )
}
