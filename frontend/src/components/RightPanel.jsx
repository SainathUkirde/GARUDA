// GARUDA – Right panel: plan A/B/C, robustness, tabbed content
import { useStore } from '../store/useStore'
import NegotiationPanel from './NegotiationPanel'
import RobustnessPanel  from './RobustnessPanel'
import PredictionsPanel from './PredictionsPanel'

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

// ── Robustness mini-bar ───────────────────────────────────────────────────────
function RobustnessBar({ label, score, histogram, active, isBest }) {
  const color = (score ?? 0) >= 80 ? C.green : (score ?? 0) >= 60 ? C.yellow : C.red
  const maxBin = histogram?.length ? Math.max(...histogram, 0.001) : 0.001
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: active ? C.saffron : C.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Plan {label}{active ? ' ●' : ''}
          </span>
          {isBest && (
            <span style={{
              fontSize: 8, fontWeight: 700, color: C.green,
              background: 'rgba(34,197,94,0.12)', border: `1px solid rgba(34,197,94,0.3)`,
              borderRadius: 4, padding: '1px 5px', letterSpacing: '0.06em',
            }}>
              ★ RECOMMENDED
            </span>
          )}
        </div>
        <span style={{ fontSize: 14, color, fontWeight: 700 }}>
          {score?.toFixed(0) ?? '--'}<span style={{ fontSize: 10, color: `${color}88` }}>%</span>
        </span>
      </div>
      {/* Histogram bins */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 14, marginBottom: 4 }}>
        {(histogram ?? []).map((v, i) => (
          <div key={i} style={{
            flex: 1, background: color, opacity: 0.5,
            height: `${Math.round((v / maxBin) * 100)}%`,
            minHeight: 1, minWidth: 1, borderRadius: 1,
          }} />
        ))}
      </div>
      {/* Fill bar */}
      <div style={{ height: 3, background: C.border, position: 'relative', borderRadius: 2 }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${Math.min(100, score ?? 0)}%`,
          background: color, borderRadius: 2,
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  )
}

// ── Diff line ────────────────────────────────────────────────────────────────
function DiffLine({ diff }) {
  const confColor = diff.low_conf ? C.red
                  : (diff.confidence ?? 1) >= 0.9 ? C.green : C.yellow
  return (
    <div
      className="diff-enter"
      style={{ borderBottom: `1px solid ${C.border}`, padding: '9px 12px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: C.text, fontWeight: 600, letterSpacing: '0.04em' }}>
          {diff.mission_id}
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, color: confColor,
          border: `1px solid ${confColor}44`,
          padding: '1px 7px', letterSpacing: '0.08em', background: `${confColor}0d`,
          borderRadius: 4,
        }}>
          {diff.low_conf ? 'LOW CONF' : `${((diff.confidence ?? 1) * 100).toFixed(0)}%`}
        </span>
      </div>
      {/* Before → After */}
      <div style={{ fontSize: 11, marginBottom: 4, lineHeight: 1.45 }}>
        <span style={{ color: C.red }}>{diff.before}</span>
        <span style={{ color: C.muted, margin: '0 8px' }}>→</span>
        <span style={{ color: C.green }}>{diff.after}</span>
      </div>
      {/* Reason */}
      <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.45, borderLeft: `2px solid ${C.border}`, paddingLeft: 8 }}>
        {diff.reason}
      </div>
    </div>
  )
}

// ── Plan DIFF panel ───────────────────────────────────────────────────────────
function DiffPanel() {
  const pendingDiff = useStore(s => s.pendingDiff)
  const diff        = useStore(s => s.diff)
  const acceptDiff  = useStore(s => s.acceptDiff)
  const rejectDiff  = useStore(s => s.rejectDiff)
  const activeDiff  = pendingDiff || diff

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '7px 12px 6px', background: C.bg, borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <div>
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: pendingDiff ? C.saffron : C.muted,
            letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>
            {pendingDiff ? '● PENDING DIFF' : 'Plan Diff'}
          </span>
          <div style={{ fontSize: 9, color: C.dim }}>Before → After comparison</div>
        </div>
        {activeDiff && (
          <span style={{
            fontSize: 10, color: C.muted,
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: '1px 8px',
          }}>
            {activeDiff.diffs?.length ?? 0} changes
          </span>
        )}
      </div>

      {/* Disruption summary */}
      {activeDiff?.disruption_summary && (
        <div style={{
          padding: '7px 12px', fontSize: 10, color: C.muted,
          borderBottom: `1px solid ${C.border}`, background: C.bg, flexShrink: 0,
        }}>
          {activeDiff.disruption_summary}
        </div>
      )}

      {/* Diff lines */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {activeDiff?.diffs?.map((d, i) => <DiffLine key={i} diff={d} />)}
        {!activeDiff?.diffs?.length && (
          <div style={{ fontSize: 11, color: C.dim, padding: '14px 12px', fontStyle: 'italic' }}>
            No pending changes
          </div>
        )}
      </div>

      {/* Accept / Reject */}
      {pendingDiff && (
        <div style={{
          flexShrink: 0, borderTop: `1px solid ${C.border}`,
          display: 'flex', gap: 8, padding: 12, background: C.bg,
        }}>
          {/* ACCEPT – solid green */}
          <button
            onClick={acceptDiff}
            style={{
              flex: 1, padding: '9px 0',
              fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: '#0B1220', border: `1px solid ${C.green}`,
              background: C.green, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'all 0.15s',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: '0 2px 8px rgba(34,197,94,0.25)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#4ADE80'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(34,197,94,0.4)' }}
            onMouseLeave={e => { e.currentTarget.style.background = C.green; e.currentTarget.style.boxShadow = '0 2px 8px rgba(34,197,94,0.25)' }}
          >
            ✓ ACCEPT
            <span style={{ fontSize: 9, color: 'rgba(11,18,32,0.5)', background: 'rgba(11,18,32,0.15)', borderRadius: 3, padding: '0 4px' }}>A</span>
          </button>
          {/* REJECT – solid red */}
          <button
            onClick={rejectDiff}
            style={{
              flex: 1, padding: '9px 0',
              fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: '#0B1220', border: `1px solid ${C.red}`,
              background: C.red, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'all 0.15s',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: '0 2px 8px rgba(239,68,68,0.25)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F87171'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(239,68,68,0.4)' }}
            onMouseLeave={e => { e.currentTarget.style.background = C.red; e.currentTarget.style.boxShadow = '0 2px 8px rgba(239,68,68,0.25)' }}
          >
            ✕ REJECT
            <span style={{ fontSize: 9, color: 'rgba(11,18,32,0.5)', background: 'rgba(11,18,32,0.15)', borderRadius: 3, padding: '0 4px' }}>R</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ── Metrics panel ─────────────────────────────────────────────────────────────
function MetricsPanel() {
  const metrics  = useStore(s => s.metrics)
  const plan     = useStore(s => s.plan)
  const undoPlan = useStore(s => s.undoPlan)
  const history  = useStore(s => s.planHistory)

  const rows = [
    { label: 'Manual Plan Time',  val: metrics.planningTimeManual,                         highlight: false },
    { label: 'System Plan Time',  val: metrics.planningTimeSystem,                         highlight: true  },
    { label: 'Mission Coverage',  val: `${metrics.missionsCovered}/${metrics.missionsTotal ?? 8}`, highlight: true  },
    { label: 'Utilisation',       val: metrics.utilisationAfter ?? metrics.utilisationBefore, highlight: false },
    { label: 'Replan Time',       val: metrics.replanTime,                                 highlight: true  },
    { label: 'Plan ID',           val: plan?.plan_id ?? '--',                              highlight: false },
  ]

  return (
    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '6px 0' }}>
      {rows.map(r => (
        <div key={r.label} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 12px', borderBottom: `1px solid ${C.border}`,
        }}>
          <span style={{ fontSize: 10, color: C.muted, letterSpacing: '0.06em' }}>
            {r.label}
          </span>
          <span style={{ fontSize: 11, color: r.highlight ? C.green : C.text, fontWeight: r.highlight ? 600 : 400 }}>
            {r.val || '—'}
          </span>
        </div>
      ))}

      {history.length > 0 && (
        <div style={{ padding: 12 }}>
          <button
            onClick={undoPlan}
            style={{
              width: '100%', padding: '8px 0',
              fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: C.muted, border: `1px solid ${C.border}`,
              background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
              borderRadius: 8, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.saffron; e.currentTarget.style.color = C.saffron }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}
          >
            Undo Last Accept ({history.length} in history)
          </button>
        </div>
      )}
    </div>
  )
}

// ── History panel ─────────────────────────────────────────────────────────────
function HistoryPanel() {
  const history  = useStore(s => s.planHistory)
  const undoPlan = useStore(s => s.undoPlan)

  if (!history.length) return (
    <div style={{ fontSize: 11, color: C.dim, padding: '14px 12px', fontStyle: 'italic' }}>
      No plan history yet
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {history.map((snap, i) => (
          <div key={i} style={{ borderBottom: `1px solid ${C.border}`, padding: '9px 12px' }}>
            <div style={{ fontSize: 11, color: C.text, marginBottom: 3, fontWeight: 500 }}>{snap.label}</div>
            <div style={{ fontSize: 10, color: C.muted }}>
              {snap.plan?.options?.find(o => o.label === snap.plan.best_option)?.missions_covered ?? '--'} missions covered
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: 12, flexShrink: 0, background: C.bg }}>
        <button
          onClick={undoPlan}
          style={{
            width: '100%', padding: '8px 0',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: C.saffron, border: `1px solid ${C.saffron}`,
            background: 'rgba(255,153,51,0.08)', cursor: 'pointer', fontFamily: 'inherit',
            borderRadius: 8, transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,153,51,0.14)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,153,51,0.08)'}
        >
          Restore Previous Plan
        </button>
      </div>
    </div>
  )
}

// ── Negotiation log panel ─────────────────────────────────────────────────────
const ACTION_COLORS = { BID: C.green, VETO: C.red, AWARD: C.saffron, RESOLVE: C.cyan }

function NegLogPanel() {
  const negLog         = useStore(s => s.negLog)
  const runNegotiation = useStore(s => s.runNegotiation)
  const recomputing    = useStore(s => s.recomputing)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '7px 12px 6px', background: C.bg, borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <div>
          <span style={{ fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Negotiation Log
          </span>
          <div style={{ fontSize: 9, color: C.dim }}>Agent bid/veto/award stream</div>
        </div>
        <button
          onClick={runNegotiation}
          disabled={recomputing}
          style={{
            fontSize: 10, fontWeight: 700, padding: '4px 12px', letterSpacing: '0.08em', textTransform: 'uppercase',
            color: '#0B1220', border: `1px solid ${C.saffron}`,
            background: C.saffron, cursor: 'pointer', fontFamily: 'inherit',
            borderRadius: 6, transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#FFB347'}
          onMouseLeave={e => e.currentTarget.style.background = C.saffron}
        >
          {recomputing ? '...' : '▶ RUN'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {negLog.length === 0 && (
          <div style={{ fontSize: 11, color: C.dim, padding: '14px 12px', fontStyle: 'italic' }}>
            Press RUN to start agent negotiation
          </div>
        )}
        {negLog.map((entry, i) => {
          const ac = ACTION_COLORS[entry.action] || C.muted
          return (
            <div
              key={i}
              className="log-enter"
              style={{ borderBottom: `1px solid ${C.border}`, padding: '8px 12px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, color: ac,
                  border: `1px solid ${ac}44`,
                  padding: '1px 6px', letterSpacing: '0.1em', textTransform: 'uppercase',
                  background: `${ac}12`, borderRadius: 4,
                }}>
                  {entry.action}
                </span>
                <span style={{ fontSize: 10, color: C.text, fontWeight: 600 }}>{entry.agent}</span>
                <span style={{ fontSize: 10, color: C.muted, marginLeft: 'auto' }}>{entry.mission_id}</span>
              </div>
              <div style={{ fontSize: 10, color: C.text, lineHeight: 1.45 }}>{entry.reason}</div>
              {entry.score > 0 && (
                <div style={{ fontSize: 9, color: C.dim, marginTop: 2 }}>score: {entry.score.toFixed(2)}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Tab definitions ───────────────────────────────────────────────────────────
// ── ATO Export panel ──────────────────────────────────────────────────────────
function ExportPanel() {
  const plan            = useStore(s => s.plan)
  const activePlanLabel = useStore(s => s.activePlanLabel)
  const scenario        = useStore(s => s.scenario)

  const activeOption = plan?.options?.find(o => o.label === activePlanLabel) ?? plan?.options?.[0]
  const assignments  = activeOption?.assignments ?? []
  const zuluNow = () => new Date().toISOString().replace('T', ' ').slice(0, 19) + 'Z'

  // ── CSV export ──
  function exportCSV() {
    const headers = ['Mission ID', 'Aircraft', 'Crew', 'Weapons', 'Role', 'Start (Z)', 'End (Z)', 'Risk', 'Confidence']
    const rows = assignments.map(a => [
      a.mission_id ?? '',
      a.aircraft_id ?? '',
      a.crew_id ?? '',
      (a.weapons ?? []).join(' | '),
      a.role ?? '',
      a.start_zulu ?? '',
      a.end_zulu ?? '',
      a.risk_score != null ? (a.risk_score * 100).toFixed(0) + '%' : '',
      a.confidence != null ? (a.confidence * 100).toFixed(0) + '%' : '',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `GARUDA_ATO_Plan${activePlanLabel}_${zuluNow().replace(/[: ]/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── PDF export (print) ──
  function exportPDF() {
    const scenarioName = scenario?.name ?? 'EXERCISE IRON MONSOON'
    const planId       = plan?.plan_id ?? '--'
    const rob          = activeOption?.robustness_score?.toFixed(0) ?? '--'
    const risk         = activeOption?.risk_score != null ? (activeOption.risk_score * 100).toFixed(0) : '--'
    const covered      = activeOption?.missions_covered ?? '--'

    const rows = assignments.map(a => `
      <tr>
        <td>${a.mission_id ?? ''}</td>
        <td>${a.aircraft_id ?? ''}</td>
        <td>${a.crew_id ?? ''}</td>
        <td>${(a.weapons ?? []).join(', ')}</td>
        <td>${a.role ?? ''}</td>
        <td>${a.start_zulu ?? ''}</td>
        <td>${a.end_zulu ?? ''}</td>
        <td>${a.risk_score != null ? (a.risk_score * 100).toFixed(0) + '%' : ''}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
<title>GARUDA ATO – Plan ${activePlanLabel}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a1a1a; margin: 24px; }
  h1   { font-size: 18px; margin: 0 0 4px; letter-spacing: 0.05em; }
  .meta { font-size: 11px; color: #555; margin-bottom: 18px; }
  .badge { display:inline-block; background:#FF9933; color:#fff; font-weight:700;
           padding:2px 10px; border-radius:4px; font-size:11px; margin-left:8px; }
  table { width:100%; border-collapse:collapse; margin-top:8px; }
  th { background:#0B1220; color:#fff; padding:7px 8px; font-size:10px;
       text-transform:uppercase; letter-spacing:0.07em; text-align:left; }
  td { padding:6px 8px; border-bottom:1px solid #e5e7eb; font-size:11px; }
  tr:nth-child(even) td { background:#f7f8fa; }
  .stats { display:flex; gap:24px; margin-bottom:16px; }
  .stat  { background:#f7f8fa; border:1px solid #e5e7eb; border-radius:6px; padding:8px 16px; }
  .stat-val { font-size:22px; font-weight:700; color:#0B1220; }
  .stat-lbl { font-size:10px; color:#888; text-transform:uppercase; letter-spacing:0.06em; }
  .footer { margin-top:24px; font-size:10px; color:#aaa; border-top:1px solid #e5e7eb; padding-top:8px; }
  @media print { body { margin: 12px; } }
</style>
</head>
<body>
<h1>GARUDA <span class="badge">PLAN ${activePlanLabel}</span></h1>
<div class="meta">
  <strong>${scenarioName}</strong> &nbsp;·&nbsp;
  Plan ID: ${planId} &nbsp;·&nbsp;
  Generated: ${zuluNow()} &nbsp;·&nbsp;
  Classification: UNCLASSIFIED // EXERCISE
</div>
<div class="stats">
  <div class="stat"><div class="stat-val">${covered}</div><div class="stat-lbl">Missions Covered</div></div>
  <div class="stat"><div class="stat-val">${rob}%</div><div class="stat-lbl">Robustness (MC)</div></div>
  <div class="stat"><div class="stat-val">${risk}%</div><div class="stat-lbl">Risk Score</div></div>
</div>
<table>
  <thead><tr>
    <th>Mission</th><th>Aircraft</th><th>Crew</th><th>Weapons</th>
    <th>Role</th><th>Start (Z)</th><th>End (Z)</th><th>Risk</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">GARUDA v1.0 &nbsp;·&nbsp; Air Operations Mission Planning Dashboard &nbsp;·&nbsp; AUTO-GENERATED ATO</div>
</body></html>`

    const win = window.open('', '_blank', 'width=900,height=700')
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 400)
  }

  const btnStyle = (color) => ({
    width: '100%', padding: '11px 0',
    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
    color, border: `1px solid ${color}`,
    background: `${color}14`, cursor: 'pointer', fontFamily: 'inherit',
    borderRadius: 8, transition: 'all 0.15s',
  })

  return (
    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: 12 }}>
      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: C.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
          AIR TASKING ORDER EXPORT
        </div>
        <div style={{ fontSize: 9, color: C.dim, lineHeight: 1.5 }}>
          Active plan: <span style={{ color: C.saffron, fontWeight: 600 }}>Plan {activePlanLabel}</span>
          &nbsp;·&nbsp; {assignments.length} assignments
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[
          { label: 'MISSIONS', val: activeOption?.missions_covered ?? '--', color: C.green },
          { label: 'ROB', val: `${activeOption?.robustness_score?.toFixed(0) ?? '--'}%`, color: C.cyan },
          { label: 'RISK', val: `${activeOption?.risk_score != null ? (activeOption.risk_score*100).toFixed(0) : '--'}%`, color: C.red },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 6, padding: '6px 4px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 14, color: s.color, fontWeight: 700 }}>{s.val}</div>
            <div style={{ fontSize: 8, color: C.muted, letterSpacing: '0.08em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Assignment preview */}
      <div style={{ marginBottom: 14, maxHeight: 180, overflowY: 'auto',
                    border: `1px solid ${C.border}`, borderRadius: 6 }}>
        {assignments.length === 0 ? (
          <div style={{ padding: '10px 12px', fontSize: 10, color: C.dim }}>No assignments in active plan</div>
        ) : assignments.map((a, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 10px', borderBottom: i < assignments.length - 1 ? `1px solid ${C.border}` : 'none',
          }}>
            <span style={{ fontSize: 10, color: C.saffron, fontWeight: 600, minWidth: 40 }}>{a.mission_id}</span>
            <span style={{ fontSize: 10, color: C.text }}>{a.aircraft_id}</span>
            <span style={{ fontSize: 9, color: C.muted }}>{a.crew_id}</span>
            <span style={{ fontSize: 9, color: a.risk_score > 0.3 ? C.red : C.green }}>
              {a.risk_score != null ? (a.risk_score * 100).toFixed(0) + '%' : '--'}
            </span>
          </div>
        ))}
      </div>

      {/* Export buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={exportCSV}
          style={btnStyle(C.green)}
          onMouseEnter={e => e.currentTarget.style.background = `${C.green}28`}
          onMouseLeave={e => e.currentTarget.style.background = `${C.green}14`}
          disabled={assignments.length === 0}
        >
          ↓ Export CSV
        </button>
        <button
          onClick={exportPDF}
          style={btnStyle(C.saffron)}
          onMouseEnter={e => e.currentTarget.style.background = `${C.saffron}28`}
          onMouseLeave={e => e.currentTarget.style.background = `${C.saffron}14`}
          disabled={assignments.length === 0}
        >
          ⎙ Export PDF / Print
        </button>
      </div>

      <div style={{ marginTop: 14, fontSize: 9, color: C.dim, lineHeight: 1.5, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
        CSV includes all assignment fields.<br />
        PDF opens a print-ready ATO document in a new tab.
      </div>
    </div>
  )
}

const TABS = [
  { key: 'diff',       label: 'Diff'   },
  { key: 'robustness', label: 'Rob'    },
  { key: 'neglog',     label: 'Neg'    },
  { key: 'pred',       label: 'Pred'   },
  { key: 'metrics',    label: 'Stats'  },
  { key: 'history',    label: 'Hist'   },
  { key: 'export',     label: 'ATO'    },
]

// ── Main component ─────────────────────────────────────────────────────────────
export default function RightPanel() {
  const plan               = useStore(s => s.plan)
  const activePlanLabel    = useStore(s => s.activePlanLabel)
  const setActivePlanLabel = useStore(s => s.setActivePlanLabel)
  const activeRightTab     = useStore(s => s.activeRightTab)
  const setActiveRightTab  = useStore(s => s.setActiveRightTab)
  const options            = plan?.options ?? []

  // Find the recommended (lowest risk) option
  const bestLabel = plan?.best_option

  return (
    <div style={{
      width: 280,
      display: 'flex',
      flexDirection: 'column',
      background: C.card,
      borderLeft: `1px solid ${C.border}`,
      minHeight: 0,
      overflow: 'hidden',
      flexShrink: 0,
    }}>

      {/* ── Plan A / B / C cards ── */}
      <div style={{
        background: C.bg,
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        {options.length === 0 ? (
          <div style={{ padding: '10px 14px', fontSize: 10, color: C.dim, letterSpacing: '0.1em' }}>
            No plan generated
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 0 }}>
            {options.map(o => {
              const isActive = activePlanLabel === o.label
              const isBest   = o.label === bestLabel
              return (
                <button
                  key={o.label}
                  onClick={() => setActivePlanLabel(o.label)}
                  style={{
                    flex: 1, padding: '8px 4px 6px',
                    fontSize: 10, fontWeight: isActive ? 700 : 500,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: isActive ? C.saffron : C.muted,
                    borderBottom: isActive ? `2px solid ${C.saffron}` : `2px solid transparent`,
                    borderRight: `1px solid ${C.border}`,
                    background: isActive ? 'rgba(255,153,51,0.06)' : 'transparent',
                    cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all 0.15s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = C.text }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = C.muted }}
                >
                  Plan {o.label}
                  {isBest && (
                    <span style={{ fontSize: 7, color: C.green, letterSpacing: '0.06em', fontWeight: 700 }}>
                      ★ BEST
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Robustness bars (always visible) ── */}
      {options.length > 0 && (
        <div style={{ padding: '12px 12px 6px', borderBottom: `1px solid ${C.border}`, flexShrink: 0, background: C.bg }}>
          {options.map(o => (
            <RobustnessBar
              key={o.label}
              label={o.label}
              score={o.robustness_score}
              histogram={o.robustness_histogram}
              active={o.label === activePlanLabel}
              isBest={o.label === bestLabel}
            />
          ))}
          {/* Risk score row */}
          <div style={{ display: 'flex', gap: 6, marginTop: 2, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
            {options.map(o => {
              const risk = (o.risk_score ?? 0) * 100
              const c = risk > 30 ? C.red : risk > 15 ? C.yellow : C.green
              return (
                <div key={o.label} style={{
                  flex: 1, background: C.card, borderRadius: 6, padding: '5px 6px',
                  border: `1px solid ${C.border}`,
                }}>
                  <div style={{ fontSize: 8, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
                    Plan {o.label} Risk
                  </div>
                  <div style={{ fontSize: 13, color: c, fontWeight: 700 }}>{risk.toFixed(0)}%</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Content tabs ── */}
      <div style={{
        display: 'flex',
        background: C.bg,
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveRightTab(t.key)}
            style={{
              flex: 1, padding: '6px 2px',
              fontSize: 9, fontWeight: activeRightTab === t.key ? 700 : 500,
              letterSpacing: '0.06em',
              color: activeRightTab === t.key ? C.saffron : C.muted,
              borderBottom: activeRightTab === t.key ? `2px solid ${C.saffron}` : '2px solid transparent',
              background: 'transparent',
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { if (activeRightTab !== t.key) e.currentTarget.style.color = C.text }}
            onMouseLeave={e => { if (activeRightTab !== t.key) e.currentTarget.style.color = C.muted }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Panel content ── */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {activeRightTab === 'diff'       && <DiffPanel />}
        {activeRightTab === 'robustness' && <RobustnessPanel />}
        {activeRightTab === 'neglog'     && <NegLogPanel />}
        {activeRightTab === 'pred'       && <PredictionsPanel />}
        {activeRightTab === 'metrics'    && <MetricsPanel />}
        {activeRightTab === 'history'    && <HistoryPanel />}
        {activeRightTab === 'export'     && <ExportPanel />}
      </div>
    </div>
  )
}
