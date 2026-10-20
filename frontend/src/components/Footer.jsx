// GARUDA – Footer: classification strip, keyboard shortcuts, branding
export default function Footer() {
  const shortcuts = [
    ['I', 'Inject'],
    ['A', 'Accept'],
    ['R', 'Reject'],
    ['M', 'NL Cmd'],
    ['C', 'Contested'],
    ['ESC', 'Close'],
  ]

  return (
    <div style={{
      height: 26,
      background: '#070E1A',
      borderTop: '1px solid #1E2D47',
      display: 'flex',
      alignItems: 'center',
      padding: '0 14px',
      gap: 0,
      flexShrink: 0,
    }}>
      {/* Classification */}
      <span style={{
        fontSize: 9, color: '#334155', letterSpacing: '0.18em',
        textTransform: 'uppercase', minWidth: 170, fontWeight: 500,
      }}>
        EXERCISE — UNCLASSIFIED
      </span>

      {/* Keyboard shortcuts */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        {shortcuts.map(([key, label]) => (
          <span key={key} style={{ fontSize: 9, color: '#334155', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              color: '#64748B', background: '#111A2E',
              border: '1px solid #1E2D47',
              padding: '0 5px', lineHeight: '15px', letterSpacing: '0.04em',
              borderRadius: 3, fontFamily: 'IBM Plex Mono, monospace',
            }}>
              {key}
            </span>
            {label}
          </span>
        ))}
      </div>

      {/* Branding */}
      <span style={{
        fontSize: 9, color: '#334155', letterSpacing: '0.08em',
        whiteSpace: 'nowrap', minWidth: 260, textAlign: 'right',
      }}>
        OPERATIONAL DATA IS SIMULATED · PIPELINE ACCEPTS REAL FEEDS ·{' '}
        <span style={{ color: '#FF9933', fontWeight: 600 }}>GARUDA v1.0</span>
      </span>
    </div>
  )
}
