// GARUDA NL Command Bar – chat interface with full Q&A + operational commands
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../store/useStore'

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

// ── Web Speech API hook ───────────────────────────────────────────────────────
function useSpeechRecognition(onResult, onError) {
  const recRef = useRef(null)
  const [listening,  setListening]  = useState(false)
  const [supported,  setSupported]  = useState(false)

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setSupported(false); return }
    setSupported(true)
    const rec = new SR()
    rec.lang = 'en-US'; rec.continuous = false; rec.interimResults = false
    rec.onresult = e => { onResult(e.results[0][0].transcript); setListening(false) }
    rec.onerror  = e => { onError(e.error); setListening(false) }
    rec.onend    = ()  => setListening(false)
    recRef.current = rec
  }, [])

  const start = useCallback(() => {
    if (!recRef.current) return
    try { recRef.current.start(); setListening(true) } catch { setListening(false) }
  }, [])
  const stop = useCallback(() => {
    if (!recRef.current) return
    try { recRef.current.stop() } catch {}
    setListening(false)
  }, [])

  return { listening, supported, start, stop }
}

// ── Suggested prompts ─────────────────────────────────────────────────────────
const SUGGESTIONS = [
  'What is GARUDA?',
  'Which aircraft are ready?',
  'Tell me about VIPER 12',
  'List all missions',
  'What is SEAD?',
  'How does CP-SAT work?',
  'What SAM threats are active?',
  'What is Monte Carlo robustness?',
  'VIPER 12 is down, what\'s the best re-plan?',
  'What is contested mode?',
]

// ── Chat bubble ───────────────────────────────────────────────────────────────
function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  const isCmd  = msg.intent && msg.intent !== 'QA' && msg.intent !== 'UNKNOWN'
  const isWhatIf = msg.is_what_if === false ? false : true

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <div style={{
          background: C.saffron,
          color: '#0B1220',
          borderRadius: '12px 12px 2px 12px',
          padding: '8px 14px',
          fontSize: 12, fontWeight: 500,
          maxWidth: '80%',
          lineHeight: 1.5,
        }}>
          {msg.text}
        </div>
      </div>
    )
  }

  // Assistant bubble
  const borderColor = isCmd
    ? (isWhatIf ? C.yellow : C.green)
    : C.border

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
      <div style={{ maxWidth: '88%' }}>
        {/* Tag row */}
        {msg.intent && msg.intent !== 'QA' && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 5, alignItems: 'center' }}>
            <span style={{
              fontSize: 9, fontWeight: 700,
              color: isWhatIf ? C.yellow : C.green,
              background: isWhatIf ? 'rgba(250,204,21,0.12)' : 'rgba(34,197,94,0.12)',
              border: `1px solid ${isWhatIf ? C.yellow : C.green}44`,
              borderRadius: 4, padding: '1px 7px', letterSpacing: '0.08em',
            }}>
              {isWhatIf ? 'WHAT-IF' : 'COMMITTED'}
            </span>
            <span style={{ fontSize: 9, color: C.muted }}>{msg.intent}</span>
            {msg.diff_ready && (
              <span style={{ fontSize: 9, color: C.green, marginLeft: 'auto' }}>
                ✓ DIFF READY — check Diff tab
              </span>
            )}
          </div>
        )}
        {/* Message body */}
        <div style={{
          background: C.card,
          border: `1px solid ${borderColor}`,
          borderRadius: '2px 12px 12px 12px',
          padding: '10px 14px',
          fontSize: 12,
          color: C.text,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {msg.text}
        </div>
      </div>
    </div>
  )
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
      <div style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: '2px 12px 12px 12px',
        padding: '10px 16px', display: 'flex', gap: 5, alignItems: 'center',
      }}>
        {[0, 0.2, 0.4].map((delay, i) => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: C.muted,
            animation: `replan-pulse 1.2s ease-in-out ${delay}s infinite`,
            display: 'inline-block',
          }} />
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function NLCommandBar() {
  const nlCommand         = useStore(s => s.nlCommand)
  const setShowNLBar      = useStore(s => s.setShowNLBar)
  const setActiveRightTab = useStore(s => s.setActiveRightTab)

  const [text,    setText]    = useState('')
  const [commit,  setCommit]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hello! I'm GARUDA's mission assistant. Ask me anything about the exercise, aircraft, missions, threats, or how the system works — or give me an operational command like \"VIPER 12 is down\".",
    }
  ])
  const [micError, setMicError] = useState('')
  const inputRef   = useRef(null)
  const bottomRef  = useRef(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const { listening, supported, start, stop } = useSpeechRecognition(
    transcript => { setText(transcript); setMicError('') },
    err        => setMicError(`Mic error: ${err}`)
  )

  async function submit(e, overrideText) {
    e?.preventDefault()
    const q = (overrideText ?? text).trim()
    if (!q || loading) return

    setText('')
    setMessages(prev => [...prev, { role: 'user', text: q }])
    setLoading(true)

    try {
      const r = await nlCommand(q, commit)
      const answer = r?.chat_answer || r?.explanation || 'No response received.'
      setMessages(prev => [...prev, {
        role:     'assistant',
        text:     answer,
        intent:   r?.intent,
        is_what_if: r?.is_what_if,
        diff_ready: !r?.is_what_if && !!r?.plan_diff,
      }])
      if (!r?.is_what_if && r?.plan_diff) {
        setActiveRightTab('diff')
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Failed to reach the backend. Please ensure the server is running.',
      }])
    }
    setLoading(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
    if (e.key === 'Escape') setShowNLBar(false)
  }

  const panel = (
    <div style={{
      position: 'fixed',
      bottom: 30,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 580,
      maxWidth: '95vw',
      zIndex: 9998,
      background: C.bg,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: '70vh',
      overflow: 'hidden',
    }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        background: C.bg,
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: C.green, flexShrink: 0,
          }} className="live-dot" />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.saffron, letterSpacing: '0.06em' }}>
              GARUDA Mission Assistant
            </div>
            <div style={{ fontSize: 10, color: C.muted }}>
              Ask anything · Operational commands · What-if analysis
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* WHAT-IF / COMMIT toggle */}
          <button
            onClick={() => setCommit(c => !c)}
            title={commit ? 'COMMIT mode: commands will change state' : 'WHAT-IF mode: no state changes'}
            style={{
              fontSize: 9, fontWeight: 700, padding: '3px 10px',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color:       commit ? '#0B1220' : C.yellow,
              border:      `1px solid ${commit ? C.green : C.yellow}`,
              background:  commit ? C.green : 'rgba(250,204,21,0.1)',
              borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            {commit ? '● COMMIT' : '◌ WHAT-IF'}
          </button>
          <button
            onClick={() => setShowNLBar(false)}
            style={{
              background: 'transparent', border: `1px solid ${C.border}`,
              borderRadius: 6, color: C.muted, fontSize: 16,
              width: 28, height: 28, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}
          >×</button>
        </div>
      </div>

      {/* ── Chat messages ── */}
      <div style={{
        flex: 1, overflowY: 'auto', minHeight: 0,
        padding: '14px 16px',
      }}>
        {messages.map((msg, i) => <Bubble key={i} msg={msg} />)}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* ── Suggestions ── */}
      {messages.length <= 1 && !loading && (
        <div style={{
          padding: '0 16px 10px',
          display: 'flex', flexWrap: 'wrap', gap: 6, flexShrink: 0,
        }}>
          {SUGGESTIONS.slice(0, 6).map(s => (
            <button
              key={s}
              onClick={() => submit(null, s)}
              style={{
                fontSize: 10, color: C.cyan,
                background: 'rgba(56,189,248,0.07)',
                border: `1px solid rgba(56,189,248,0.25)`,
                borderRadius: 20, padding: '4px 10px',
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(56,189,248,0.14)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(56,189,248,0.07)'}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* ── Input row ── */}
      <div style={{
        borderTop: `1px solid ${C.border}`,
        padding: '10px 12px',
        flexShrink: 0,
        background: C.bg,
      }}>
        {micError && (
          <div style={{ fontSize: 10, color: C.red, marginBottom: 6 }}>{micError}</div>
        )}
        <form onSubmit={submit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything or type an operational command…"
            autoFocus
            style={{
              flex: 1, padding: '9px 12px',
              background: '#162038',
              color: C.text,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              fontSize: 12, outline: 'none',
              fontFamily: 'inherit',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => e.currentTarget.style.borderColor = C.saffron}
            onBlur={e => e.currentTarget.style.borderColor = C.border}
          />

          {/* Mic */}
          {supported && (
            <button
              type="button"
              onClick={() => { if (listening) stop(); else { setMicError(''); start() } }}
              title={listening ? 'Stop listening' : 'Voice input'}
              style={{
                width: 36, height: 36, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15,
                color:      listening ? C.red : C.muted,
                border:     `1px solid ${listening ? C.red : C.border}`,
                background: listening ? 'rgba(239,68,68,0.1)' : 'transparent',
                borderRadius: 8, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {listening ? '⏹' : '🎤'}
            </button>
          )}

          {/* Send */}
          <button
            type="submit"
            disabled={loading || !text.trim()}
            style={{
              padding: '9px 18px',
              fontSize: 11, fontWeight: 700,
              letterSpacing: '0.06em',
              color: '#0B1220',
              background: (!text.trim() || loading) ? C.dim : C.saffron,
              border: `1px solid ${(!text.trim() || loading) ? C.dim : C.saffron}`,
              borderRadius: 8, cursor: (!text.trim() || loading) ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (text.trim() && !loading) e.currentTarget.style.background = '#FFB347' }}
            onMouseLeave={e => { if (text.trim() && !loading) e.currentTarget.style.background = C.saffron }}
          >
            {loading ? '…' : 'Send'}
          </button>
        </form>

        {listening && (
          <div className="replan-pulse" style={{
            fontSize: 10, color: C.red, marginTop: 6,
            letterSpacing: '0.1em',
          }}>
            ● LISTENING…
          </div>
        )}
      </div>

    </div>
  )

  return createPortal(panel, document.body)
}
