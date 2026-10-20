// GARUDA – Top strip: branding, resource bars, replan, status, contested, clock
import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { zuluClock } from '../utils/format'

const C = {
  bg:       '#0B1220',
  card:     '#111A2E',
  border:   '#1E2D47',
  saffron:  '#FF9933',
  green:    '#22C55E',
  yellow:   '#FACC15',
  red:      '#EF4444',
  text:     '#E2E8F0',
  muted:    '#64748B',
}

function Divider() {
  return <div style={{ width: 1, alignSelf: 'stretch', background: C.border, margin: '0 4px' }} />
}

// ── Resource bar with icon + progress ────────────────────────────────────────
function ResourceBar({ icon, label, tooltip, ready, total, color }) {
  const pct      = total ? Math.round((ready / total) * 100) : 0
  const barColor = pct === 100 ? C.green : pct < 50 ? C.red : (color || C.saffron)
  return (
    <div
      title={tooltip}
      style={{ display: 'flex', alignItems: 'center', gap: 7, position: 'relative', cursor: 'default' }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 9, color: C.muted, letterSpacing: '0.12em', textTransform: 'uppercase', lineHeight: 1, marginBottom: 3 }}>
          {label}
        </div>
        {/* Progress bar */}
        <div style={{ width: 48, height: 3, background: C.border, borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${pct}%`, background: barColor,
            borderRadius: 2, transition: 'width 0.4s ease',
          }} />
        </div>
      </div>
      <span style={{ fontSize: 13, color: barColor, fontWeight: 700, minWidth: 28, fontVariantNumeric: 'tabular-nums' }}>
        {ready}
        <span style={{ fontSize: 10, color: C.muted, fontWeight: 400 }}>/{total}</span>
      </span>
    </div>
  )
}

export default function TopStrip({ onHelpClick }) {
  const [clock, setClock] = useState(zuluClock())
  const scenario        = useStore(s => s.scenario)
  const online          = useStore(s => s.online)
  const offline         = useStore(s => s.offline)
  const waking          = useStore(s => s.waking)
  const contested       = useStore(s => s.contested)
  const sources         = useStore(s => s.sources)
  const toggleContested = useStore(s => s.toggleContested)
  const generatePlan    = useStore(s => s.generatePlan)
  const recomputing     = useStore(s => s.recomputing)

  useEffect(() => {
    const t = setInterval(() => setClock(zuluClock()), 1000)
    return () => clearInterval(t)
  }, [])

  const aircraft = scenario?.aircraft ?? []
  const crews    = scenario?.crews    ?? []
  const weapons  = scenario?.weapons  ?? []

  const acReady = aircraft.filter(a => a.status === 'READY').length
  const crReady = crews.filter(c => c.available !== false).length
  const wpTotal = weapons.reduce((s, w) => s + w.count, 0)

  return (
    <div style={{
      minHeight: 52,
      background: C.bg,
      borderBottom: `1px solid ${C.border}`,
      display: 'flex',
      alignItems: 'center',
      padding: '6px 14px',
      gap: 0,
      flexShrink: 0,
      boxShadow: '0 1px 0 rgba(255,153,51,0.08)',
      overflow: 'visible',
    }}>

      {/* ── GARUDA branding ── */}
      <div style={{ paddingRight: 16, flexShrink: 0 }}>
        <div style={{
          fontSize: 16, color: C.saffron, fontWeight: 800,
          letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: 1.1,
        }}>
          GARUDA
        </div>
        <div style={{ fontSize: 9, color: C.muted, letterSpacing: '0.1em', lineHeight: 1.3, whiteSpace: 'nowrap' }}>
          {scenario?.name ?? 'LOADING...'}
        </div>
      </div>

      <Divider />

      {/* ── Resource bars ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '0 16px' }}>
        <ResourceBar icon="✈" label="Aircraft" tooltip="Ready aircraft / total" ready={acReady} total={aircraft.length} color={C.saffron} />
        <ResourceBar icon="👤" label="Crew"     tooltip="Available crew / total" ready={crReady} total={crews.length}    color={C.saffron} />
        <ResourceBar icon="🎯" label="Weapons"  tooltip="Total weapon rounds"    ready={wpTotal} total={wpTotal}         color="#38BDF8" />
      </div>

      <Divider />

      {/* ── REPLAN button ── */}
      <div style={{ padding: '0 14px' }}>
        <button
          onClick={generatePlan}
          disabled={recomputing}
          title="Re-run CP-SAT optimiser and generate plans A/B/C"
          style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: recomputing ? C.saffron : '#0B1220',
            border: `1px solid ${C.saffron}`,
            background: recomputing ? 'rgba(255,153,51,0.12)' : C.saffron,
            padding: '6px 16px',
            borderRadius: 8,
            cursor: recomputing ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: recomputing ? 'none' : '0 2px 8px rgba(255,153,51,0.25)',
          }}
          onMouseEnter={e => { if (!recomputing) { e.currentTarget.style.background = '#FFB347'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(255,153,51,0.4)' } }}
          onMouseLeave={e => { if (!recomputing) { e.currentTarget.style.background = C.saffron; e.currentTarget.style.boxShadow = '0 2px 8px rgba(255,153,51,0.25)' } }}
        >
          {recomputing ? (
            <span className="replan-pulse">⟳ RECOMPUTING</span>
          ) : '▶ REPLAN'}
        </button>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* ── Status badges ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 12 }}>
        {waking && (
          <span className="replan-pulse" style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
            color: C.yellow, border: `1px solid ${C.yellow}44`,
            background: 'rgba(250,204,21,0.08)',
            padding: '3px 10px', borderRadius: 6,
          }}>
            ◌ WAKING SERVER…
          </span>
        )}
        {offline && !waking && (
          <span style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
            color: C.yellow, border: `1px solid ${C.yellow}44`,
            background: 'rgba(250,204,21,0.08)',
            padding: '3px 10px', borderRadius: 6,
          }}>
            ⊘ OFFLINE SIM
          </span>
        )}
        {online && !offline && (
          <span style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
            color: C.green, border: `1px solid ${C.green}44`,
            background: 'rgba(34,197,94,0.08)',
            padding: '3px 10px', borderRadius: 6,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <span className="live-dot" style={{
              display: 'inline-block', width: 7, height: 7,
              borderRadius: '50%', background: C.green,
            }} />
            LINK LIVE
          </span>
        )}
      </div>

      <Divider />

      {/* ── CONTESTED toggle ── */}
      <div style={{ padding: '0 12px' }}>
        <button
          onClick={toggleContested}
          title="Toggle contested environment mode  [C]"
          style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: contested ? C.red : C.muted,
            border: `1px solid ${contested ? C.red : C.border}`,
            background: contested ? 'rgba(239,68,68,0.1)' : 'transparent',
            padding: '5px 12px',
            borderRadius: 8,
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
          onMouseEnter={e => { if (!contested) { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red } }}
          onMouseLeave={e => { if (!contested) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted } }}
        >
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: contested ? C.red : 'transparent',
            border: `1.5px solid ${contested ? C.red : C.muted}`,
            display: 'inline-block', flexShrink: 0,
          }} />
          CONTESTED
          {/* Source mini-badges when active */}
          {contested && sources.slice(0, 3).map(s => {
            const c = s.status === 'LOST' ? C.red : s.status === 'DEGRADED' ? C.yellow : C.green
            return (
              <span key={s.source} style={{
                fontSize: 7, color: c, border: `1px solid ${c}44`,
                padding: '0 4px', lineHeight: '14px', letterSpacing: '0.06em',
                borderRadius: 3, background: `${c}12`,
              }}>
                {s.source.slice(0, 3).toUpperCase()}
              </span>
            )
          })}
        </button>
      </div>

      <Divider />

      {/* ── Zulu clock ── */}
      <div style={{ paddingLeft: 12, minWidth: 160, textAlign: 'right' }}>
        <div style={{ fontSize: 8, color: C.muted, letterSpacing: '0.18em', textTransform: 'uppercase', lineHeight: 1, marginBottom: 2 }}>
          ZULU TIME
        </div>
        <div style={{
          fontSize: 13, color: C.text, fontWeight: 700,
          letterSpacing: '0.06em', lineHeight: 1.3,
          fontVariantNumeric: 'tabular-nums',
          fontFamily: 'IBM Plex Mono, monospace',
        }}>
          {clock}
        </div>
      </div>

      <Divider />

      {/* ── Help button ── */}
      <div style={{ paddingLeft: 10 }}>
        <button
          onClick={onHelpClick}
          title="How to use GARUDA"
          style={{
            width: 30, height: 30,
            borderRadius: '50%',
            background: 'transparent',
            border: `1px solid ${C.border}`,
            color: C.muted,
            fontSize: 13, fontWeight: 700,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.saffron; e.currentTarget.style.color = C.saffron; e.currentTarget.style.background = 'rgba(255,153,51,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; e.currentTarget.style.background = 'transparent' }}
        >
          ?
        </button>
      </div>

    </div>
  )
}
