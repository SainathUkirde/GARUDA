// GARUDA – Left panel: advisories, disruption feed, inject & NL buttons
import { useStore } from '../store/useStore'
import { SEVERITY_COLOR } from '../utils/format'
import DisruptModal from './DisruptModal'

const C = {
  bg:      '#0B1220',
  card:    '#111A2E',
  border:  '#1E2D47',
  saffron: '#FF9933',
  green:   '#22C55E',
  yellow:  '#FACC15',
  red:     '#EF4444',
  cyan:    '#38BDF8',
  text:    '#E2E8F0',
  muted:   '#64748B',
  dim:     '#334155',
}

// ── Severity badge ────────────────────────────────────────────────────────────
function SeverityBadge({ sev }) {
  const color = SEVERITY_COLOR[sev] || C.muted
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, color,
      border: `1px solid ${color}44`,
      padding: '1px 6px', letterSpacing: '0.1em', textTransform: 'uppercase',
      background: `${color}12`, borderRadius: 4, flexShrink: 0,
    }}>
      {sev}
    </span>
  )
}

// ── Advisory item ─────────────────────────────────────────────────────────────
function AdvisoryItem({ item, onClick }) {
  const isCrit  = item.level === 'CRITICAL'
  const isHigh  = item.level === 'HIGH'
  const isMed   = item.level === 'MEDIUM'
  const color   = isCrit ? C.red : isHigh ? C.saffron : isMed ? C.yellow : C.cyan
  const bgColor = isCrit ? 'rgba(239,68,68,0.07)' : isHigh ? 'rgba(255,153,51,0.05)' : 'transparent'

  return (
    <div
      className={isCrit ? 'crit-advisory' : ''}
      onClick={onClick}
      style={{
        borderBottom: `1px solid ${C.border}`,
        borderLeft: `3px solid ${color}`,
        padding: '8px 12px',
        cursor: 'pointer',
        background: bgColor,
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = `${color}10`}
      onMouseLeave={e => e.currentTarget.style.background = bgColor}
      title="View predictions panel"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, color, background: `${color}12`,
          border: `1px solid ${color}44`, borderRadius: 4,
          padding: '1px 6px', letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          {item.level}
        </span>
        {item.category && (
          <span style={{ fontSize: 9, color: C.muted }}>{item.category}</span>
        )}
      </div>
      <div style={{ fontSize: 11, color: isCrit ? C.text : isHigh ? C.text : C.text, lineHeight: 1.5, fontWeight: isHigh || isCrit ? 500 : 400 }}>
        {item.text}
      </div>
    </div>
  )
}

// ── Feed item ──────────────────────────────────────────────────────────────────
function FeedItem({ item }) {
  return (
    <div
      className="feed-enter"
      style={{ borderBottom: `1px solid ${C.border}`, padding: '8px 12px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
        <span style={{ fontSize: 9, color: C.muted, fontFamily: 'IBM Plex Mono, monospace' }}>{item.zulu}</span>
        <SeverityBadge sev={item.severity} />
      </div>
      <div style={{ fontSize: 11.5, color: C.text, lineHeight: 1.5 }}>{item.text}</div>
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ label, subtitle, count, accent }) {
  const accentColor = accent ? C.saffron : C.muted
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '7px 12px 6px',
      background: C.bg,
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div>
        <span style={{ fontSize: 10, fontWeight: 600, color: accentColor, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {label}
        </span>
        {subtitle && (
          <div style={{ fontSize: 9, color: C.dim, marginTop: 1 }}>{subtitle}</div>
        )}
      </div>
      {count != null && (
        <span style={{
          fontSize: 10, fontWeight: 700,
          color: count > 0 ? C.saffron : C.dim,
          background: count > 0 ? 'rgba(255,153,51,0.12)' : 'transparent',
          border: count > 0 ? `1px solid rgba(255,153,51,0.3)` : 'none',
          padding: count > 0 ? '1px 7px' : 0,
          borderRadius: 12, minWidth: 20, textAlign: 'center',
        }}>
          {count}
        </span>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function LeftPanel() {
  const disruptions         = useStore(s => s.disruptions)
  const advisories          = useStore(s => s.advisories)
  const showDisruptModal    = useStore(s => s.showDisruptModal)
  const setShowDisruptModal = useStore(s => s.setShowDisruptModal)
  const setShowNLBar        = useStore(s => s.setShowNLBar)
  const setActiveRightTab   = useStore(s => s.setActiveRightTab)

  return (
    <div style={{
      width: 260,
      display: 'flex',
      flexDirection: 'column',
      background: C.card,
      borderRight: `1px solid ${C.border}`,
      minHeight: 0,
      overflow: 'hidden',
      flexShrink: 0,
    }}>

      {/* ── ADVISORIES section ── */}
      <SectionHeader
        label="Advisories"
        subtitle="AI-generated risk warnings"
        count={advisories.length}
        accent
      />
      <div style={{ flexShrink: 0, maxHeight: 145, overflowY: 'auto' }}>
        {advisories.length === 0 ? (
          <div style={{ fontSize: 11, color: C.dim, padding: '10px 12px', fontStyle: 'italic' }}>
            No active advisories
          </div>
        ) : (
          advisories.slice(0, 4).map(a => (
            <AdvisoryItem
              key={a.id}
              item={a}
              onClick={() => setActiveRightTab('pred')}
            />
          ))
        )}
      </div>

      {/* ── DISRUPTION FEED section ── */}
      <SectionHeader
        label="Disruption Feed"
        subtitle="Live events affecting the mission"
        count={disruptions.length}
      />
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {disruptions.length === 0 ? (
          <div style={{ fontSize: 11, color: C.dim, padding: '10px 12px', fontStyle: 'italic' }}>
            No disruptions logged
          </div>
        ) : (
          disruptions.map(d => <FeedItem key={d.id} item={d} />)
        )}
      </div>

      {/* ── Action buttons ── */}
      <div style={{
        flexShrink: 0,
        borderTop: `1px solid ${C.border}`,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        background: C.bg,
      }}>
        {/* Inject Disruption – solid saffron */}
        <button
          id="inject-btn"
          onClick={() => setShowDisruptModal(true)}
          style={{
            width: '100%',
            padding: '9px 0',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#0B1220',
            border: `1px solid ${C.saffron}`,
            background: C.saffron,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.15s',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 2px 8px rgba(255,153,51,0.25)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#FFB347'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(255,153,51,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.background = C.saffron; e.currentTarget.style.boxShadow = '0 2px 8px rgba(255,153,51,0.25)' }}
        >
          <span style={{ fontSize: 14 }}>⚡</span>
          INJECT DISRUPTION
          <span style={{ fontSize: 9, color: 'rgba(11,18,32,0.6)', background: 'rgba(11,18,32,0.15)', borderRadius: 3, padding: '0 5px' }}>I</span>
        </button>

        {/* NL Command – outline style */}
        <button
          onClick={() => setShowNLBar(true)}
          style={{
            width: '100%',
            padding: '8px 0',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: C.cyan,
            border: `1px solid ${C.cyan}44`,
            background: 'rgba(56,189,248,0.06)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.15s',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(56,189,248,0.12)'; e.currentTarget.style.borderColor = `${C.cyan}88` }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(56,189,248,0.06)'; e.currentTarget.style.borderColor = `${C.cyan}44` }}
        >
          <span style={{ fontSize: 13 }}>◎</span>
          NL COMMAND
          <span style={{ fontSize: 9, color: `${C.cyan}88`, border: `1px solid ${C.cyan}44`, padding: '0 4px', borderRadius: 3 }}>M</span>
        </button>
      </div>

      {showDisruptModal && <DisruptModal />}
    </div>
  )
}
