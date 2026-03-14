import { useNavigate } from 'react-router-dom'
import { Activity, Network, TrendingDown, Users, ArrowRight, Layers, GitBranch } from 'lucide-react'

const FEATURES = [
  {
    icon: Network,
    title: 'Interactive Network Graph',
    desc: 'Force-directed visualisation of your organisational relationships with signed edge support from Cross-Parker survey data.',
    color: '#4fc3f7',
  },
  {
    icon: TrendingDown,
    title: 'Frustration Index',
    desc: 'Quantify structural imbalance in your network using signed graph algorithms rooted in Heider\'s balance theory.',
    color: '#00d4a0',
  },
  {
    icon: Activity,
    title: 'Organisational Cost',
    desc: 'Measure information flow efficiency, bottlenecks, and redundancy across the communication network.',
    color: '#f5a623',
  },
  {
    icon: Users,
    title: 'Drag-and-Drop Experiments',
    desc: 'Move employees between departments and instantly see how structural changes affect your metrics.',
    color: '#a78bfa',
  },
  {
    icon: GitBranch,
    title: 'Signed Network Analysis',
    desc: 'Integrate positive/negative edge signs derived from four Cross-Parker survey dimensions for richer ONA.',
    color: '#fb7185',
  },
  {
    icon: Layers,
    title: 'Before / After Comparison',
    desc: 'Snapshot your current state, apply recommendations, and visualise the impact side-by-side.',
    color: '#34d399',
  },
]

const STEPS = [
  { num: '01', title: 'Upload Dataset', desc: 'Import your CSV with edge list and optional Cross-Parker survey columns.' },
  { num: '02', title: 'Visualise Network', desc: 'Explore the hierarchical graph and examine signed relationships across the org.' },
  { num: '03', title: 'Analyse Metrics', desc: 'Review Frustration Index, Organisational Cost, and structural indicators.' },
  { num: '04', title: 'Act on Insights', desc: 'Apply algorithmic recommendations or experiment with manual reorganisation.' },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen grid-bg relative overflow-hidden">

      {/* Background glow orbs */}
      <div style={{
        position: 'fixed', top: '10%', left: '5%', width: 400, height: 400,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,195,247,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: '10%', right: '5%', width: 500, height: 500,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,160,0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16">

        {/* Hero */}
        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-2 mb-6 animate-fade-up" style={{
            background: 'rgba(79,195,247,0.08)',
            border: '1px solid rgba(79,195,247,0.2)',
            borderRadius: 999,
            padding: '6px 18px',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d4a0', display: 'inline-block' }} />
            <span className="font-code text-xs" style={{ color: '#4fc3f7', letterSpacing: '0.1em' }}>
              NETWORK SCIENCE · ONA TOOL v1.0
            </span>
          </div>

          <h1 className="font-display animate-fade-up delay-100" style={{
            fontSize: 'clamp(2.4rem, 6vw, 4.5rem)',
            lineHeight: 1.1,
            color: '#e8f4fd',
            marginBottom: 24,
          }}>
            Organisational<br />
            <span style={{ color: '#00d4a0' }} className="text-glow-green">Network Analysis</span>
          </h1>

          <p className="font-body animate-fade-up delay-200" style={{
            fontSize: '1.15rem',
            color: '#8bacc5',
            maxWidth: 600,
            margin: '0 auto 48px',
            lineHeight: 1.7,
          }}>
            Uncover hidden dynamics in your organisation. Measure structural frustration,
            information flow costs, and signed relationship quality — then act on algorithmic recommendations.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up delay-300">
            <button
              className="btn-primary"
              onClick={() => navigate('/upload')}
              style={{ padding: '16px 40px', fontSize: '0.9rem' }}
            >
              BEGIN ANALYSIS
              <ArrowRight size={16} style={{ display: 'inline', marginLeft: 10 }} />
            </button>
            <button
              className="btn-secondary"
              onClick={() => navigate('/upload?demo=true')}
              style={{ padding: '16px 28px', fontSize: '0.8rem' }}
            >
              LOAD SAMPLE DATA
            </button>
          </div>
        </div>

        {/* How it works */}
        <div className="mb-24 animate-fade-up delay-400">
          <p className="font-code text-xs mb-8 text-center" style={{ color: '#4a6d8a', letterSpacing: '0.15em' }}>
            HOW IT WORKS
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STEPS.map((step, i) => (
              <div key={i} className="card p-5 relative" style={{ overflow: 'hidden' }}>
                <div className="font-display text-5xl font-bold" style={{
                  color: 'rgba(79,195,247,0.07)',
                  position: 'absolute', top: 8, right: 12, lineHeight: 1,
                }}>
                  {step.num}
                </div>
                <div className="font-code text-xs mb-2" style={{ color: '#00d4a0', letterSpacing: '0.08em' }}>
                  STEP {step.num}
                </div>
                <h3 className="font-display text-sm mb-2" style={{ color: '#e8f4fd' }}>
                  {step.title}
                </h3>
                <p className="font-body text-xs" style={{ color: '#8bacc5', lineHeight: 1.6 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Features grid */}
        <div className="mb-24">
          <p className="font-code text-xs mb-8 text-center" style={{ color: '#4a6d8a', letterSpacing: '0.15em' }}>
            CAPABILITIES
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="card p-6 group" style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="mb-4 inline-flex p-2 rounded-lg" style={{
                  background: `${f.color}14`,
                  border: `1px solid ${f.color}28`,
                }}>
                  <f.icon size={18} style={{ color: f.color }} />
                </div>
                <h3 className="font-display text-sm mb-2" style={{ color: '#e8f4fd' }}>
                  {f.title}
                </h3>
                <p className="font-body text-sm" style={{ color: '#8bacc5', lineHeight: 1.65 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Cross-Parker survey info */}
        <div className="card p-8 mb-12" style={{
          background: 'linear-gradient(135deg, rgba(79,195,247,0.05), rgba(0,212,160,0.03))',
          borderColor: 'rgba(79,195,247,0.2)',
        }}>
          <div className="flex items-center gap-3 mb-6">
            <div style={{
              width: 4, height: 24, background: '#4fc3f7', borderRadius: 2,
            }} />
            <h2 className="font-display text-sm" style={{ color: '#e8f4fd', letterSpacing: '0.05em' }}>
              Cross-Parker Dataset Integration
            </h2>
            <span className="tag" style={{ background: 'rgba(79,195,247,0.1)', color: '#4fc3f7', marginLeft: 'auto' }}>
              SIGNED NETWORKS
            </span>
          </div>
          <p className="font-body text-sm mb-6" style={{ color: '#8bacc5', lineHeight: 1.7 }}>
            This tool supports the famous Cross-Parker dataset's four survey dimensions. 
            When your CSV includes columns <code className="font-code text-xs" style={{ color: '#4fc3f7', background: 'rgba(79,195,247,0.1)', padding: '2px 6px', borderRadius: 4 }}>q1, q2, q3, q4</code>, 
            edges are automatically classified as positive (+), negative (−), or neutral based on a 
            composite scoring model derived from Heider's structural balance theory.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { q: 'Q1', label: 'Advice Frequency', scale: '0–5', desc: 'How often have you turned to this person for information/advice?' },
              { q: 'Q2', label: 'Expertise Recognition', scale: '0–5', desc: 'Does this person have expertise important to your work?' },
              { q: 'Q3', label: 'Information Usefulness', scale: '0–6', desc: 'To what extent does this person provide information you use?' },
              { q: 'Q4', label: 'Knowledge Awareness', scale: '0–6', desc: 'Do you understand this person\'s knowledge and skills?' },
            ].map((item) => (
              <div key={item.q} style={{
                background: 'rgba(13,31,51,0.6)',
                border: '1px solid rgba(79,195,247,0.1)',
                borderRadius: 8,
                padding: '12px 16px',
              }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="tag" style={{ background: 'rgba(0,212,160,0.1)', color: '#00d4a0' }}>
                    {item.q}
                  </span>
                  <span className="font-display text-xs" style={{ color: '#e8f4fd' }}>
                    {item.label}
                  </span>
                  <span className="font-code text-xs ml-auto" style={{ color: '#4a6d8a' }}>
                    Scale {item.scale}
                  </span>
                </div>
                <p className="font-body text-xs" style={{ color: '#8bacc5' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <button
            className="btn-primary"
            onClick={() => navigate('/upload')}
            style={{ padding: '18px 60px', fontSize: '1rem' }}
          >
            START YOUR ANALYSIS
            <ArrowRight size={18} style={{ display: 'inline', marginLeft: 12 }} />
          </button>
          <p className="font-code text-xs mt-4" style={{ color: '#4a6d8a' }}>
            Upload a CSV · No data stored · Results computed locally + via API
          </p>
        </div>

      </div>
    </div>
  )
}
