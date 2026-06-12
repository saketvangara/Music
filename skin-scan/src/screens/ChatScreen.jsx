import { useEffect, useRef, useState } from 'react'
import { sendChat } from '../lib/chat'
import { getScans } from '../lib/db'
import { getSettings } from '../lib/settings'

const STORAGE_KEY = 'skinscan.chat'

const STARTERS = [
  'Build me a full AM/PM routine',
  'Why is my redness score high?',
  'Cheaper alternatives to the recommendations?',
  'What should I focus on this month?',
]

function loadMessages() {
  try {
    const m = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(m) ? m : []
  } catch {
    return []
  }
}

export default function ChatScreen({ onOpenSettings }) {
  const [messages, setMessages] = useState(loadMessages)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const scansRef = useRef(null)
  const bottomRef = useRef(null)

  const settings = getSettings()
  const hasKey = !!settings.apiKey

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-60)))
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  async function send(text) {
    const content = text.trim()
    if (!content || busy) return
    setError(null)
    setInput('')
    const history = [...messages, { role: 'user', content }]
    setMessages(history)
    setBusy(true)
    try {
      if (!scansRef.current) scansRef.current = await getScans()
      const reply = await sendChat({
        history,
        scans: scansRef.current,
        apiKey: settings.apiKey,
        model: settings.model,
      })
      setMessages(m => [...m, { role: 'assistant', content: reply }])
    } catch (e) {
      setError(e.message)
      // leave the user message in place so they can retry by resending
    } finally {
      setBusy(false)
    }
  }

  function clearChat() {
    if (messages.length && !confirm('Clear this conversation?')) return
    setMessages([])
    setError(null)
  }

  if (!hasKey) {
    return (
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 14, padding: 36, textAlign: 'center',
      }}>
        <div style={{ fontSize: 34 }}>💬</div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Chat needs an API key</div>
        <div style={{ fontSize: 13.5, opacity: 0.6, lineHeight: 1.55, maxWidth: 300 }}>
          The skincare coach runs on Claude and knows your scan history.
          Add your Anthropic API key in Settings to start chatting.
        </div>
        <button className="btn-primary" onClick={onOpenSettings}>Open Settings</button>
      </div>
    )
  }

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '14px 16px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>Skincare coach</div>
          <div style={{ fontSize: 11, opacity: 0.5 }}>Knows your scans · not medical advice</div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} style={{ fontSize: 12.5, opacity: 0.55, padding: 6 }}>
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '14px 14px 6px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
              <div style={{ fontSize: 13, opacity: 0.5, textAlign: 'center', marginBottom: 6 }}>
                Ask anything about your skin, routine, or products
              </div>
              {STARTERS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="btn-ghost"
                  style={{ fontSize: 13.5, textAlign: 'left' }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '86%',
                padding: '10px 14px',
                borderRadius: 16,
                borderBottomRightRadius: m.role === 'user' ? 5 : 16,
                borderBottomLeftRadius: m.role === 'user' ? 16 : 5,
                background: m.role === 'user' ? '#6d5cff' : '#1f1f26',
                color: m.role === 'user' ? '#fff' : '#e7e7ea',
                fontSize: 14.5,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {m.content}
            </div>
          ))}

          {busy && (
            <div style={{
              alignSelf: 'flex-start', padding: '10px 16px', borderRadius: 16,
              background: '#1f1f26', fontSize: 14, opacity: 0.6,
            }}>
              Thinking…
            </div>
          )}
          {error && (
            <div style={{ fontSize: 13, color: '#f87171', textAlign: 'center' }}>{error}</div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div style={{
        display: 'flex', gap: 8, padding: '10px 12px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(input) }}
          placeholder="Ask your skincare coach…"
          disabled={busy}
          style={{
            flex: 1, padding: '12px 14px', borderRadius: 22, fontSize: 15,
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(255,255,255,0.05)', color: '#e7e7ea', outline: 'none',
          }}
        />
        <button
          onClick={() => send(input)}
          disabled={busy || !input.trim()}
          aria-label="Send"
          style={{
            width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
            background: input.trim() && !busy ? '#6d5cff' : 'rgba(255,255,255,0.08)',
            color: '#fff', fontSize: 18,
          }}
        >
          ↑
        </button>
      </div>
    </div>
  )
}
