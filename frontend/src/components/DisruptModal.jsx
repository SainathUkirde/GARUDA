// DISRUPT MODAL – rendered via portal so it escapes overflow:hidden parents
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../store/useStore'

const TYPES = [
  { value:'AIRCRAFT_UNSERVICEABLE', label:'Aircraft Unserviceable' },
  { value:'CREW_UNAVAILABLE',       label:'Crew Unavailable'       },
  { value:'WEATHER_CLOSING',        label:'Weather Closing'        },
  { value:'NEW_THREAT',             label:'New Threat Zone'        },
  { value:'COMMS_JAM',              label:'Comms Jam'              },
  { value:'PRIORITY_CHANGE',        label:'Priority Change'        },
]
const SEVS   = ['LOW','MEDIUM','HIGH','CRITICAL']
const ASSETS = ['AC01','AC02','AC03','AC04','AC05','AC06','AC07','AC08','AC09','AC10','AC11','AC12']
const CALLSIGNS = {
  AC01:'VIPER 11', AC02:'VIPER 12', AC03:'VIPER 13',
  AC04:'RAPTOR 21',AC05:'RAPTOR 22',AC06:'RAPTOR 23',
  AC07:'HAWK 31',  AC08:'HAWK 32',  AC09:'HAWK 33',  AC10:'HAWK 34',
  AC11:'GHOST 41', AC12:'GHOST 42',
}

const SEV_COLOR = {
  LOW:      '#38BDF8',
  MEDIUM:   '#FACC15',
  HIGH:     '#FF9933',
  CRITICAL: '#EF4444',
}

export default function DisruptModal() {
  const injectDisruption    = useStore(s => s.injectDisruption)
  const setShowDisruptModal = useStore(s => s.setShowDisruptModal)

  const [type,     setType]     = useState('AIRCRAFT_UNSERVICEABLE')
  const [targetId, setTargetId] = useState('AC02')
  const [severity, setSeverity] = useState('HIGH')
  const [detail,   setDetail]   = useState('')

  function submit(e) {
    e.preventDefault()
    injectDisruption({ type, target_id: targetId || null, severity, detail })
  }

  const modal = (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(7,14,26,0.82)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={e => e.target === e.currentTarget && setShowDisruptModal(false)}
    >
      <div style={{
        width: 380,
        background: '#111A2E',
        border: '1px solid #2A4070',
        borderRadius: 14,
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        overflow: 'hidden',
      }}>
        {/* Title bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          background: '#0B1220',
          borderBottom: '1px solid #1E2D47',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#FF9933', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              ⚡ Inject Disruption
            </div>
            <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>
              Simulate an operational event and trigger re-plan
            </div>
          </div>
          <button
            onClick={() => setShowDisruptModal(false)}
            style={{
              background: 'transparent', border: '1px solid #1E2D47',
              borderRadius: 6, color: '#64748B', fontSize: 16,
              width: 28, height: 28, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#EF4444'; e.currentTarget.style.color = '#EF4444' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E2D47'; e.currentTarget.style.color = '#64748B' }}
          >✕</button>
        </div>

        <form onSubmit={submit} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Disruption Type */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: '#64748B', display: 'block', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
              Disruption Type
            </label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              style={{
                width: '100%', padding: '8px 10px',
                background: '#0B1220', color: '#E2E8F0',
                border: '1px solid #1E2D47', borderRadius: 8,
                fontSize: 12, outline: 'none', cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Target Asset */}
          {['AIRCRAFT_UNSERVICEABLE','CREW_UNAVAILABLE','PRIORITY_CHANGE'].includes(type) && (
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: '#64748B', display: 'block', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                Target Aircraft
              </label>
              <select
                value={targetId}
                onChange={e => setTargetId(e.target.value)}
                style={{
                  width: '100%', padding: '8px 10px',
                  background: '#0B1220', color: '#E2E8F0',
                  border: '1px solid #1E2D47', borderRadius: 8,
                  fontSize: 12, outline: 'none', cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {ASSETS.map(id => <option key={id} value={id}>{CALLSIGNS[id]} ({id})</option>)}
              </select>
            </div>
          )}

          {/* Severity */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: '#64748B', display: 'block', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
              Severity
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {SEVS.map(s => {
                const active = severity === s
                const color  = SEV_COLOR[s]
                return (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setSeverity(s)}
                    style={{
                      flex: 1, padding: '7px 0',
                      fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      color:       active ? '#0B1220' : color,
                      border:      `1px solid ${color}`,
                      background:  active ? color : `${color}12`,
                      borderRadius: 7,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = `${color}25` }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = `${color}12` }}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Detail */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: '#64748B', display: 'block', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
              Detail <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </label>
            <input
              type="text"
              value={detail}
              onChange={e => setDetail(e.target.value)}
              placeholder="e.g. hydraulic failure / coords 20.1N 78.3E"
              style={{
                width: '100%', padding: '8px 10px',
                background: '#0B1220', color: '#E2E8F0',
                border: '1px solid #1E2D47', borderRadius: 8,
                fontSize: 12, outline: 'none',
                fontFamily: 'inherit',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#FF9933'}
              onBlur={e => e.currentTarget.style.borderColor = '#1E2D47'}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 2 }}>
            <button
              type="button"
              onClick={() => setShowDisruptModal(false)}
              style={{
                flex: 1, padding: '9px 0',
                fontSize: 11, fontWeight: 600,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: '#64748B', border: '1px solid #1E2D47',
                background: 'transparent', cursor: 'pointer',
                borderRadius: 8, fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#94A3B8' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E2D47'; e.currentTarget.style.color = '#64748B' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                flex: 1, padding: '9px 0',
                fontSize: 12, fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: '#0B1220', border: '1px solid #FF9933',
                background: '#FF9933', cursor: 'pointer',
                borderRadius: 8, fontFamily: 'inherit',
                transition: 'all 0.15s',
                boxShadow: '0 2px 8px rgba(255,153,51,0.3)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FFB347'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(255,153,51,0.45)' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#FF9933'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(255,153,51,0.3)' }}
            >
              ⚡ INJECT
            </button>
          </div>

        </form>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
