// GARUDA – App root
// Layout: TOP | [ LEFT | CENTER | RIGHT ] | BOTTOM | FOOTER
import { useEffect, Suspense, lazy, useState } from 'react'
import { useStore } from './store/useStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import TopStrip           from './components/TopStrip'
import LeftPanel          from './components/LeftPanel'
import RightPanel         from './components/RightPanel'
import GanttTimeline      from './components/GanttTimeline'
import PrioritySlider     from './components/PrioritySlider'
import NLCommandBar       from './components/NLCommandBar'
import Footer             from './components/Footer'
import RecomputingOverlay from './components/RecomputingOverlay'

// Lazy-load Leaflet map to avoid SSR issues
const TacticalMap = lazy(() => import('./components/TacticalMap'))

// ── Help overlay ─────────────────────────────────────────────────────────────
function HelpOverlay({ onClose }) {
  const steps = [
    {
      icon: '🗺',
      title: 'View the Tactical Picture',
      desc: 'The map shows aircraft (triangles), airbases (squares), mission targets (diamonds), and SAM threat rings. Routes are colored by mission type.',
    },
    {
      icon: '⚡',
      title: 'Inject a Disruption',
      desc: 'Press I or click "Inject Disruption" to simulate an event (e.g. aircraft unserviceable). The system re-plans in under 1 second and shows a BEFORE → AFTER diff.',
    },
    {
      icon: '✓',
      title: 'Accept or Reject the Plan',
      desc: 'Review the Plan Diff tab on the right. Press A to accept the new plan, or R to reject and revert. Use the A/B/C tabs to compare plan options.',
    },
  ]

  return (
    <div className="help-overlay" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#111A2E',
          border: '1px solid #2A4070',
          borderRadius: 16,
          padding: '28px 32px',
          maxWidth: 540,
          width: '90vw',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#FF9933', letterSpacing: '0.06em' }}>
              GARUDA
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              How to use this dashboard
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: '1px solid #1E2D47', borderRadius: 8,
              color: '#64748B', fontSize: 18, width: 32, height: 32,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#EF4444'; e.currentTarget.style.color = '#EF4444' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E2D47'; e.currentTarget.style.color = '#64748B' }}
          >
            ×
          </button>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {steps.map((s, i) => (
            <div key={i} style={{
              display: 'flex', gap: 14, alignItems: 'flex-start',
              background: '#0B1220', borderRadius: 10, padding: '14px 16px',
              border: '1px solid #1E2D47',
            }}>
              <div style={{
                fontSize: 22, flexShrink: 0,
                width: 40, height: 40,
                background: '#162038', borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#E2E8F0', marginBottom: 4 }}>
                  <span style={{ color: '#FF9933', marginRight: 6 }}>Step {i + 1}.</span>
                  {s.title}
                </div>
                <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Keyboard shortcuts */}
        <div style={{ marginTop: 20, padding: '12px 16px', background: '#0B1220', borderRadius: 10, border: '1px solid #1E2D47' }}>
          <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
            Keyboard Shortcuts
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[['I','Inject'],['A','Accept'],['R','Reject'],['M','NL Command'],['C','Contested'],['Esc','Close']].map(([k, v]) => (
              <span key={k} style={{ fontSize: 11, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{
                  background: '#162038', border: '1px solid #2A4070',
                  borderRadius: 4, padding: '1px 7px',
                  color: '#FF9933', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace',
                }}>
                  {k}
                </span>
                {v}
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 20, width: '100%', padding: '10px 0',
            background: '#FF9933', color: '#0B1220', border: 'none',
            borderRadius: 8, fontWeight: 700, fontSize: 13, letterSpacing: '0.06em',
            cursor: 'pointer', transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#FFB347'}
          onMouseLeave={e => e.currentTarget.style.background = '#FF9933'}
        >
          Got it — let's go
        </button>
      </div>
    </div>
  )
}

// ── App root ─────────────────────────────────────────────────────────────────
export default function App() {
  const initApp    = useStore(s => s.initApp)
  const showNLBar  = useStore(s => s.showNLBar)
  const [showHelp, setShowHelp] = useState(false)

  useKeyboardShortcuts()

  useEffect(() => {
    initApp().catch(() => {})
  }, [])

  return (
    <div
      style={{ flex: 1, display:'flex', flexDirection:'column', overflow:'hidden', background:'#0B1220', minHeight: 0 }}
    >
      {/* Help overlay */}
      {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}

      {/* TOP STRIP */}
      <TopStrip onHelpClick={() => setShowHelp(true)} />

      {/* CENTER ROW – left | map+gantt | right */}
      <div className="flex flex-1 min-h-0" style={{ overflow: 'hidden', minHeight: 0 }}>
        <LeftPanel />

        {/* Map + controls column */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0 relative">

          {/* Tactical map fills remaining space */}
          <div className="flex-1 relative min-h-0">
            <Suspense fallback={
              <div className="flex items-center justify-center h-full"
                   style={{ color:'#64748B', fontSize:12, fontFamily:'Inter,sans-serif', letterSpacing:'0.08em' }}>
                LOADING MAP...
              </div>
            }>
              <TacticalMap />
            </Suspense>
            <RecomputingOverlay />
          </div>

          {/* Priority ↔ Risk slider */}
          <PrioritySlider />

          {/* NL command bar slides up from bottom when active */}
          {showNLBar && <NLCommandBar />}

          {/* Gantt timeline */}
          <div style={{ height: 260, borderTop: '1px solid #1E2D47', overflow: 'hidden' }}>
            <GanttTimeline />
          </div>
        </div>

        <RightPanel />
      </div>

      <Footer />
    </div>
  )
}
