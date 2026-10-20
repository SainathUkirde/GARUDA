// Shared micro-utilities used across components

export function zuluClock() {
  const d = new Date()
  const dd = String(d.getUTCDate()).padStart(2,'0')
  const hh = String(d.getUTCHours()).padStart(2,'0')
  const mm = String(d.getUTCMinutes()).padStart(2,'0')
  const ss = String(d.getUTCSeconds()).padStart(2,'0')
  const mo = d.toLocaleString('en-US',{month:'short',timeZone:'UTC'}).toUpperCase()
  const yr = d.getUTCFullYear()
  return `${dd}${hh}${mm}Z ${mo} ${yr}`
}

// LOW=cyan/blue, MEDIUM=yellow, HIGH=orange/saffron, CRITICAL=red
export const SEVERITY_COLOR = {
  CRITICAL: '#EF4444',
  HIGH:     '#FF9933',
  MEDIUM:   '#FACC15',
  LOW:      '#38BDF8',
}

// Mission/role color – distinct per type
export const ROLE_COLOR = {
  STRIKE: '#FF9933',   // saffron – primary
  SEAD:   '#EF4444',   // red – suppression
  CAS:    '#38BDF8',   // cyan – close air support
  ISR:    '#22C55E',   // green – reconnaissance
}

export function missionColor(type) {
  return ROLE_COLOR[type] || '#94A3B8'
}

export function pctBarStyle(pct, color='#FF9933') {
  return { width:`${Math.min(100,pct)}%`, background: color, height:'3px', transition:'width .4s', borderRadius: 2 }
}

export function hoursToLabel(isoStr) {
  const d = new Date(isoStr)
  const hh = String(d.getUTCHours()).padStart(2,'0')
  const mm = String(d.getUTCMinutes()).padStart(2,'0')
  return `${hh}${mm}Z`
}

// Given an assignment's start/end, return left% and width% on a timeline
// that spans scenarioStart → scenarioStart + 8h
export function ganttPos(startIso, endIso, scenarioStartIso) {
  const base  = new Date(scenarioStartIso).getTime()
  const total = 8 * 60 * 60 * 1000
  const s     = new Date(startIso).getTime() - base
  const e     = new Date(endIso).getTime()   - base
  return {
    left:  `${Math.max(0, s/total*100).toFixed(2)}%`,
    width: `${Math.max(0.5, (e-s)/total*100).toFixed(2)}%`,
  }
}
