// GARUDA – Tactical map: Voyager basemap, colored markers, legend
import { useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Polyline, Polygon,
         Marker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'
import { useStore } from '../store/useStore'
import { missionColor, ROLE_COLOR } from '../utils/format'
import ContestedOverlay from './ContestedOverlay'

// ── shared font / colors ──────────────────────────────────────────────────────
const FONT = "'Inter', 'Segoe UI', Arial, sans-serif"
const C = {
  saffron: '#FF9933',
  green:   '#22C55E',
  red:     '#EF4444',
  cyan:    '#38BDF8',
  text:    '#E2E8F0',
  muted:   '#64748B',
  card:    '#111A2E',
  border:  '#1E2D47',
}

// ── Icon helpers ──────────────────────────────────────────────────────────────

// Aircraft: colored triangle + callsign — blue for active, grey for inactive
function acIcon(callsign, role, active = true) {
  const color      = active ? (ROLE_COLOR[role] || C.text) : '#334155'
  const labelColor = active ? '#E2E8F0' : '#475569'
  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;pointer-events:none;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.9))">
        <div style="
          width:0;height:0;
          border-left:7px solid transparent;
          border-right:7px solid transparent;
          border-bottom:13px solid ${color};
          opacity:${active ? 1 : 0.4};
        "></div>
        <div style="
          color:${labelColor};
          font-family:${FONT};
          font-size:11px;font-weight:700;
          white-space:nowrap;
          text-shadow:0 1px 4px #000,0 0 10px rgba(0,0,0,0.95);
          margin-top:2px;
          letter-spacing:0.03em;
          background:rgba(11,18,32,0.7);
          padding:1px 4px;
          border-radius:3px;
        ">${callsign}</div>
      </div>`,
    iconSize: [80, 36],
    iconAnchor: [40, 7],
  })
}

// Airbase: amber square + ICAO label
function baseIcon(icao, name) {
  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;pointer-events:none">
        <div style="position:relative;width:14px;height:14px;background:#0B1220;border:2px solid ${C.saffron};border-radius:2px;">
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:5px;height:5px;background:${C.saffron};border-radius:50%;"></div>
        </div>
        <div style="
          color:${C.saffron};
          font-family:${FONT};
          font-size:10px;font-weight:700;
          white-space:nowrap;
          text-shadow:0 1px 4px #000;
          margin-top:2px;
          background:rgba(11,18,32,0.75);
          padding:1px 5px;
          letter-spacing:0.05em;
          text-transform:uppercase;
          border-radius:3px;
        ">${icao}</div>
      </div>`,
    iconSize: [60, 34],
    iconAnchor: [7, 7],
  })
}

// Target: amber diamond + label
function targetIcon(name, assigned) {
  const color = assigned ? C.saffron : C.red
  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;pointer-events:none">
        <div style="width:11px;height:11px;background:${color};transform:rotate(45deg);flex-shrink:0;border-radius:1px;box-shadow:0 0 6px ${color}88;"></div>
        <div style="
          color:${color};
          font-family:${FONT};
          font-size:10px;font-weight:700;
          white-space:nowrap;
          text-shadow:0 1px 4px #000;
          margin-top:5px;
          background:rgba(11,18,32,0.75);
          padding:1px 5px;
          letter-spacing:0.03em;
          text-transform:uppercase;
          border-radius:3px;
        ">${name}</div>
      </div>`,
    iconSize: [80, 34],
    iconAnchor: [5, 5],
  })
}

// Threat styles – always red for SAM
function threatStyle(severity) {
  if (severity === 'CRITICAL') return { stroke: C.red,     glow: 'rgba(239,68,68,0.15)' }
  if (severity === 'HIGH')     return { stroke: '#FF6B35', glow: 'rgba(255,107,53,0.12)' }
  return                               { stroke: '#FB923C', glow: 'rgba(251,146,60,0.09)' }
}

const KM = 1000

// ── Component ─────────────────────────────────────────────────────────────────

export default function TacticalMap() {
  const scenario        = useStore(s => s.scenario)
  const plan            = useStore(s => s.plan)
  const activePlanLabel = useStore(s => s.activePlanLabel)
  const contested       = useStore(s => s.contested)
  const jammedPolygon   = useStore(s => s.jammedPolygon)

  const airbases    = scenario?.airbases     ?? []
  const aircraft    = scenario?.aircraft     ?? []
  const missions    = scenario?.missions     ?? []
  const threatZones = scenario?.threat_zones ?? []

  const activeOption = plan?.options?.find(o => o.label === activePlanLabel)
  const assignments  = activeOption?.assignments ?? []

  const routes = useMemo(() => assignments.map(a => {
    const ac      = aircraft.find(x => x.id === a.aircraft_id)
    const mission = missions.find(m => m.id === a.mission_id)
    return {
      key:       a.mission_id,
      positions: a.route?.map(p => [p.lat, p.lon]) ?? [],
      color:     missionColor(mission?.type),
      ac,
      mission,
    }
  }), [assignments, missions, aircraft])

  const acPositions = useMemo(() => assignments.map(a => {
    const ac   = aircraft.find(x => x.id === a.aircraft_id)
    const base = airbases.find(b => b.id === ac?.base)
    return { ac, base, assignment: a }
  }).filter(x => x.ac && x.base), [assignments, aircraft, airbases])

  const assignedIds = new Set(assignments.map(a => a.aircraft_id))
  const unassigned  = aircraft.filter(a => !assignedIds.has(a.id))

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ContestedOverlay />
      <MapContainer
        center={[20.5, 77.5]}
        zoom={6}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        attributionControl={true}
      >
        {/*
          OpenStreetMap Standard – completely free, no API key required.
        */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        {/* ── SAM / threat rings – always red, pulsing dot center ── */}
        {threatZones.filter(t => t.active).map(t => {
          const s = threatStyle(t.severity)
          return (
            <Circle
              key={t.id}
              center={[t.lat, t.lon]}
              radius={t.radius_km * KM}
              pathOptions={{
                color:       s.stroke,
                fillColor:   s.stroke,
                fillOpacity: 0.10,
                weight:      2,
                dashArray:   '6 5',
                opacity:     0.95,
              }}
            >
              <Popup>
                <div style={{ fontFamily: FONT }}>
                  <div style={{ color: s.stroke, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{t.name}</div>
                  <div style={{ color: '#57606a', fontSize: 11 }}>TYPE <span style={{ color: '#c9d1d9' }}>{t.type}</span></div>
                  <div style={{ color: '#57606a', fontSize: 11 }}>SEV  <span style={{ color: s.stroke, fontWeight: 600 }}>{t.severity}</span></div>
                  <div style={{ color: '#57606a', fontSize: 11 }}>R    <span style={{ color: '#c9d1d9' }}>{t.radius_km} km</span></div>
                </div>
              </Popup>
            </Circle>
          )
        })}

        {/* SAM centre dots */}
        {threatZones.filter(t => t.active).map(t => (
          <CircleMarker
            key={`ctr-${t.id}`}
            center={[t.lat, t.lon]}
            radius={4}
            pathOptions={{
              color:       threatStyle(t.severity).stroke,
              fillColor:   threatStyle(t.severity).stroke,
              fillOpacity: 1,
              weight:      1,
            }}
          />
        ))}

        {/* Jammed area polygon (contested mode) */}
        {contested && jammedPolygon.length > 0 && (
          <Polygon
            positions={jammedPolygon.map(p => [p.lat, p.lon])}
            pathOptions={{
              color:       '#e8a317',
              fillColor:   '#e8a317',
              fillOpacity: 0.05,
              weight:      1.5,
              dashArray:   '5 7',
              opacity:     0.75,
            }}
          />
        )}

        {/* ── Flight routes – green dashed lines ── */}
        {routes.map(r => r.positions.length > 1 && (
          <Polyline
            key={r.key}
            positions={r.positions}
            pathOptions={{
              color:     r.color,
              weight:    2.5,
              opacity:   0.95,
              dashArray: r.ac?.status === 'AIRBORNE' ? undefined : '8 5',
            }}
          >
            <Popup>
              <div style={{ fontFamily: FONT }}>
                <div style={{ color: r.color, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{r.ac?.callsign}</div>
                <div style={{ color: '#c9d1d9', fontSize: 12 }}>{r.mission?.name}</div>
                <div style={{ color: '#57606a', fontSize: 11 }}>TYPE <span style={{ color: '#c9d1d9' }}>{r.mission?.type}</span></div>
              </div>
            </Popup>
          </Polyline>
        ))}

        {/* ── Mission targets ── */}
        {missions.map(m => {
          const isAssigned = assignments.some(a => a.mission_id === m.id)
          const assignedAc = aircraft.find(a => a.id === assignments.find(x => x.mission_id === m.id)?.aircraft_id)
          return (
            <Marker key={m.id} position={[m.target_lat, m.target_lon]} icon={targetIcon(m.name, isAssigned)}>
              <Popup>
                <div style={{ fontFamily: FONT }}>
                  <div style={{ color: isAssigned ? '#e8a317' : '#d64545', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{m.name}</div>
                  <div style={{ color: '#57606a', fontSize: 11 }}>PRIORITY <span style={{ color: '#c9d1d9', fontWeight: 600 }}>P{m.priority}</span></div>
                  <div style={{ color: '#57606a', fontSize: 11 }}>TYPE     <span style={{ color: '#c9d1d9' }}>{m.type}</span></div>
                  <div style={{ color: '#57606a', fontSize: 11, marginTop: 3 }}>
                    {isAssigned
                      ? <span style={{ color: '#8fb56e', fontWeight: 600 }}>✓ {assignedAc?.callsign}</span>
                      : <span style={{ color: '#d64545', fontWeight: 600 }}>UNASSIGNED</span>}
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* ── Assigned aircraft at base ── */}
        {acPositions.map(({ ac, base }) => (
          <Marker
            key={ac.id}
            position={[base.lat + 0.07, base.lon + 0.07]}
            icon={acIcon(ac.callsign, ac.role, ac.status === 'READY')}
          >
            <Popup>
              <div style={{ fontFamily: FONT }}>
                <div style={{ color: ROLE_COLOR[ac.role] || '#c9d1d9', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{ac.callsign}</div>
                <div style={{ color: '#57606a', fontSize: 11 }}>ROLE   <span style={{ color: '#c9d1d9' }}>{ac.role}</span></div>
                <div style={{ color: '#57606a', fontSize: 11 }}>STATUS <span style={{ color: ac.status === 'READY' ? '#8fb56e' : '#d64545', fontWeight: 600 }}>{ac.status}</span></div>
                <div style={{ color: '#57606a', fontSize: 11 }}>ENG HRS <span style={{ color: '#c9d1d9' }}>{ac.engine_hours} h</span></div>
                <div style={{ color: '#57606a', fontSize: 11 }}>FAIL P  <span style={{ color: ac.fail_probability > 0.4 ? '#d64545' : '#8fb56e', fontWeight: 600 }}>{(ac.fail_probability * 100).toFixed(0)}%</span></div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* ── Unassigned aircraft ── */}
        {unassigned.map(ac => {
          const base = airbases.find(b => b.id === ac.base)
          if (!base) return null
          return (
            <Marker
              key={ac.id}
              position={[base.lat - 0.07, base.lon - 0.07]}
              icon={acIcon(ac.callsign, ac.role, false)}
            >
              <Popup>
                <div style={{ fontFamily: FONT }}>
                  <div style={{ color: '#57606a', fontWeight: 700, fontSize: 13 }}>{ac.callsign}</div>
                  <div style={{ color: '#57606a', fontSize: 11 }}>{ac.role} — <span style={{ color: '#d64545', fontWeight: 600 }}>UNASSIGNED</span></div>
                  <div style={{ color: '#57606a', fontSize: 11 }}>STATUS <span style={{ color: '#c9d1d9' }}>{ac.status}</span></div>
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* ── Airbases ── */}
        {airbases.map(b => (
          <Marker key={b.id} position={[b.lat, b.lon]} icon={baseIcon(b.icao, b.name)}>
            <Popup>
              <div style={{ fontFamily: FONT }}>
                <div style={{ color: '#e8a317', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{b.name}</div>
                <div style={{ color: '#57606a', fontSize: 11 }}>ICAO  <span style={{ color: '#c9d1d9', fontWeight: 600 }}>{b.icao}</span></div>
                <div style={{ color: '#57606a', fontSize: 11 }}>ELEV  <span style={{ color: '#c9d1d9' }}>{b.elevation_ft} ft</span></div>
                <div style={{ color: '#57606a', fontSize: 11 }}>CAP   <span style={{ color: '#c9d1d9' }}>{b.capacity} AC</span></div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* ── Map legend (bottom-left) ── */}
      <div style={{
        position: 'absolute', bottom: 30, left: 10, zIndex: 1000,
        background: 'rgba(11,18,32,0.88)',
        border: '1px solid #1E2D47',
        borderRadius: 8,
        padding: '8px 12px',
        backdropFilter: 'blur(4px)',
        fontSize: 10,
        minWidth: 130,
      }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#64748B', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 7 }}>
          MAP LEGEND
        </div>
        {[
          { icon: '▲', color: C.cyan,    label: 'Aircraft (assigned)' },
          { icon: '▲', color: '#475569', label: 'Aircraft (unassigned)' },
          { icon: '■', color: C.saffron, label: 'Airbase' },
          { icon: '◆', color: C.saffron, label: 'Mission Target' },
          { icon: '◎', color: C.red,     label: 'SAM Threat Zone' },
          { icon: '─', color: '#FF9933', label: 'Strike Route' },
          { icon: '─', color: '#EF4444', label: 'SEAD Route' },
          { icon: '─', color: '#38BDF8', label: 'CAS Route' },
          { icon: '─', color: '#22C55E', label: 'ISR Route' },
        ].map(({ icon, color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
            <span style={{ color, fontSize: 11, flexShrink: 0, width: 12, textAlign: 'center' }}>{icon}</span>
            <span style={{ color: '#94A3B8', fontSize: 10 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
