// GARUDA – Gantt timeline: one row per aircraft, mission bars by type color
import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { missionColor, ganttPos } from '../utils/format'

const C = {
  bg:     '#0B1220',
  card:   '#111A2E',
  border: '#1E2D47',
  saffron:'#FF9933',
  red:    '#EF4444',
  text:   '#E2E8F0',
  muted:  '#64748B',
  dim:    '#334155',
}

const SCENARIO_START = '2024-10-14T06:00:00Z'
const SCENARIO_HOURS = 8
const HOURS = Array.from({ length: SCENARIO_HOURS + 1 }, (_, i) => i)

// ── Grid ─────────────────────────────────────────────────────────────────────
function HourGrid() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {HOURS.map(h => (
        <div key={h} style={{
          position: 'absolute',
          left: `${(h / SCENARIO_HOURS) * 100}%`,
          top: 0, bottom: 0, width: 1,
          background: h === 0 ? C.border : C.bg,
          opacity: h === 0 ? 1 : 0.7,
        }} />
      ))}
    </div>
  )
}

function HourLabels() {
  const base = new Date(SCENARIO_START)
  return (
    <div style={{ position: 'relative', height: 20 }}>
      {HOURS.map(h => {
        const d   = new Date(base.getTime() + h * 3600000)
        const hh  = String(d.getUTCHours()).padStart(2, '0')
        const pct = (h / SCENARIO_HOURS) * 100
        return (
          <div key={h} style={{
            position: 'absolute',
            left: `${pct}%`,
            transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <div style={{ width: 1, height: 4, background: C.border, marginBottom: 1 }} />
            <span style={{ fontSize: 9, color: C.muted, letterSpacing: '0.04em', whiteSpace: 'nowrap', fontFamily: 'IBM Plex Mono, monospace' }}>
              {hh}00Z
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Current time cursor ───────────────────────────────────────────────────────
function CurrentTimeCursor() {
  const base  = new Date(SCENARIO_START).getTime()
  const total = SCENARIO_HOURS * 3600000
  const pct   = Math.max(0, Math.min(100, ((Date.now() - base) / total) * 100))

  return (
    <div style={{
      position: 'absolute', top: 0, bottom: 0,
      left: `${pct}%`, width: 1,
      background: C.saffron, opacity: 0.9,
      pointerEvents: 'none', zIndex: 10,
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 2,
        fontSize: 7, color: C.saffron, letterSpacing: '0.08em',
        background: C.bg, padding: '0 2px', borderRadius: 2,
        fontFamily: 'IBM Plex Mono, monospace',
      }}>NOW</div>
    </div>
  )
}

// ── Turnaround hatch ──────────────────────────────────────────────────────────
function TurnaroundBlock({ left, width }) {
  if (!width || width === '0%') return null
  return (
    <div style={{
      position: 'absolute', left, width,
      top: 4, height: 'calc(100% - 8px)',
      background: `repeating-linear-gradient(45deg,${C.border} 0px,${C.border} 2px,transparent 2px,transparent 7px)`,
      border: `1px solid ${C.border}`,
      opacity: 0.6, borderRadius: 2,
    }} />
  )
}

// ── Duty limit marker ─────────────────────────────────────────────────────────
function DutyMarker({ dutyEndPct, crewName }) {
  const short = crewName?.split(' ').pop() ?? ''
  return (
    <div style={{
      position: 'absolute', left: `${dutyEndPct}%`,
      top: 0, bottom: 0, width: 1,
      background: C.red, opacity: 0.55,
      pointerEvents: 'none', zIndex: 8,
    }}>
      <div style={{
        position: 'absolute', bottom: '100%', left: 0,
        fontSize: 7, color: C.red, whiteSpace: 'nowrap',
        transform: 'translateX(-50%)', background: C.bg, padding: '0 2px',
        letterSpacing: '0.06em', borderRadius: 2,
        fontFamily: 'IBM Plex Mono, monospace',
      }}>
        {short} DL
      </div>
    </div>
  )
}

// ── Row status dot ────────────────────────────────────────────────────────────
function StatusDot({ status, hasAssignment }) {
  const color = status === 'UNSERVICEABLE' ? C.red
              : hasAssignment              ? C.saffron
              : C.dim
  return (
    <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
  )
}

// ── Mission bar ───────────────────────────────────────────────────────────────
function MissionBar({ assignment, mission, color, acCallsign }) {
  const { left, width } = ganttPos(assignment.start_zulu, assignment.end_zulu, SCENARIO_START)

  const tEndMs = new Date(assignment.end_zulu).getTime() + 30 * 60000
  const turn   = ganttPos(assignment.end_zulu, new Date(tEndMs).toISOString(), SCENARIO_START)

  const isLowConf = assignment.low_conf
  const barBg     = isLowConf ? 'rgba(239,68,68,0.18)' : `${color}18`
  const barBorder = `1px solid ${isLowConf ? C.red : color}`

  return (
    <>
      <div
        className="gantt-bar"
        style={{
          position: 'absolute', left, width,
          top: 5, height: 'calc(100% - 10px)',
          background: barBg, border: barBorder,
          borderRadius: 4, zIndex: 5,
          display: 'flex', alignItems: 'center', overflow: 'hidden',
          cursor: 'default',
        }}
        title={`${acCallsign} – ${mission?.name ?? assignment.mission_id}`}
      >
        <span style={{
          fontSize: 9, color, paddingLeft: 5, whiteSpace: 'nowrap',
          overflow: 'hidden', letterSpacing: '0.04em', fontWeight: 600,
        }}>
          {mission?.name}
        </span>
        {isLowConf && (
          <span style={{
            fontSize: 7, color: C.red, marginLeft: 3,
            border: `1px solid ${C.red}66`, padding: '0 2px', borderRadius: 2,
          }}>LC</span>
        )}
      </div>
      <TurnaroundBlock left={turn.left} width={turn.width} />
    </>
  )
}

// ── Mission type legend ───────────────────────────────────────────────────────
const MISSION_TYPES = [
  { type: 'STRIKE', label: 'Strike',  color: '#FF9933' },
  { type: 'SEAD',   label: 'SEAD',    color: '#EF4444' },
  { type: 'CAS',    label: 'CAS',     color: '#38BDF8' },
  { type: 'ISR',    label: 'ISR',     color: '#22C55E' },
]

// ── Main component ─────────────────────────────────────────────────────────────
const LABEL_W = 96

export default function GanttTimeline() {
  const scenario        = useStore(s => s.scenario)
  const plan            = useStore(s => s.plan)
  const activePlanLabel = useStore(s => s.activePlanLabel)
  const recomputing     = useStore(s => s.recomputing)

  const aircraft  = scenario?.aircraft ?? []
  const crews     = scenario?.crews    ?? []
  const missions  = scenario?.missions ?? []

  const activeOption = plan?.options?.find(o => o.label === activePlanLabel)
  const assignments  = activeOption?.assignments ?? []

  const assignmentsByAc = useMemo(() => {
    const m = {}
    assignments.forEach(a => {
      if (!m[a.aircraft_id]) m[a.aircraft_id] = []
      m[a.aircraft_id].push(a)
    })
    return m
  }, [assignments])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      background: C.bg, borderTop: `1px solid ${C.border}`,
      flex: 1, minHeight: 0,
    }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '0 12px', height: 28,
        borderBottom: `1px solid ${C.border}`, flexShrink: 0,
        gap: 12,
      }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Mission Timeline
        </span>
        {recomputing && (
          <span className="replan-pulse" style={{
            fontSize: 9, color: C.saffron,
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            RECOMPUTING...
          </span>
        )}
        {/* Mission type legend */}
        <div style={{ display: 'flex', gap: 10, marginLeft: 8 }}>
          {MISSION_TYPES.map(mt => (
            <span key={mt.type} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: C.muted }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: mt.color, display: 'inline-block' }} />
              {mt.label}
            </span>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 9, color: C.muted, letterSpacing: '0.06em', fontFamily: 'IBM Plex Mono, monospace' }}>
          {SCENARIO_START.slice(11, 16)}Z — +{SCENARIO_HOURS}H
        </span>
      </div>

      {/* Hour labels */}
      <div style={{ paddingLeft: LABEL_W + 8, paddingRight: 8, flexShrink: 0 }}>
        <HourLabels />
      </div>

      {/* Aircraft rows */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {aircraft.map(ac => {
          const acAssignments = assignmentsByAc[ac.id] || []
          const crew = crews.find(c => acAssignments[0] && c.id === acAssignments[0].crew_id)
          const dutyEndPct = crew
            ? Math.min(100, (crew.max_duty_hrs / SCENARIO_HOURS) * 100)
            : 100

          return (
            <div
              key={ac.id}
              style={{
                display: 'flex', alignItems: 'stretch',
                height: 34,
                borderBottom: `1px solid ${C.border}`,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = C.card}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Callsign label */}
              <div style={{
                width: LABEL_W, flexShrink: 0,
                borderRight: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'center',
                gap: 7, padding: '0 10px',
              }}>
                <StatusDot status={ac.status} hasAssignment={acAssignments.length > 0} />
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  color: ac.status === 'UNSERVICEABLE' ? C.red : C.text,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  letterSpacing: '0.03em',
                }}>
                  {ac.callsign}
                </span>
              </div>

              {/* Timeline area */}
              <div style={{ position: 'relative', flex: 1, height: '100%' }}>
                <HourGrid />
                <CurrentTimeCursor />
                {crew && <DutyMarker dutyEndPct={dutyEndPct} crewName={crew.name} />}
                {acAssignments.map(a => {
                  const m = missions.find(ms => ms.id === a.mission_id)
                  return (
                    <MissionBar
                      key={a.mission_id}
                      assignment={a}
                      mission={m}
                      color={missionColor(m?.type)}
                      acCallsign={ac.callsign}
                    />
                  )
                })}
                {acAssignments.length === 0 && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                    <span style={{ fontSize: 8, color: C.dim, letterSpacing: '0.06em' }}>UNASSIGNED</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
