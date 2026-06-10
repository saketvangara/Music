import { useState, useMemo } from 'react'
import exercisesData from '../../exercises.json'

const { exercises } = exercisesData

// Group exercises by category
const CATEGORY_LABELS = {
  'lower-body': 'Lower Body',
  'upper-push': 'Upper Push',
  'upper-pull': 'Upper Pull',
  'core':       'Core',
}

export default function ExercisePicker({ onSelect }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return exercises
    return exercises.filter(ex =>
      ex.name.toLowerCase().includes(q) ||
      ex.id.includes(q) ||
      (ex.aliases ?? []).some(a => a.toLowerCase().includes(q)) ||
      (ex.primaryMuscles ?? []).some(m => m.toLowerCase().includes(q))
    )
  }, [query])

  const grouped = useMemo(() => {
    const map = {}
    for (const ex of filtered) {
      if (!map[ex.category]) map[ex.category] = []
      map[ex.category].push(ex)
    }
    return map
  }, [filtered])

  return (
    <div style={{
      width: '100vw',
      height: '100dvh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      background: '#0f0f12',
      color: '#e2e8f0',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 16px 12px', flexShrink: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 14, color: '#fff' }}>
          Form Coach
        </h1>
        <input
          type="search"
          placeholder="Search exercises, muscles…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.07)',
            color: '#e2e8f0',
            fontSize: 15,
            outline: 'none',
          }}
        />
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>
        {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
          const items = grouped[cat]
          if (!items?.length) return null
          return (
            <div key={cat} style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#64748b',
                textTransform: 'uppercase',
                marginBottom: 8,
                paddingTop: 4,
              }}>
                {label}
              </div>
              {items.map(ex => (
                <ExerciseRow key={ex.id} exercise={ex} onSelect={onSelect} />
              ))}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ color: '#64748b', textAlign: 'center', marginTop: 48, fontSize: 15 }}>
            No exercises match "{query}"
          </div>
        )}
      </div>
    </div>
  )
}

function ExerciseRow({ exercise: ex, onSelect }) {
  return (
    <button
      onClick={() => onSelect(ex)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        marginBottom: 6,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        color: '#e2e8f0',
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{ex.name}</div>
        <div style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {ex.primaryMuscles?.join(', ')} · {ex.equipment}
        </div>
      </div>
      <span style={{
        flexShrink: 0,
        fontSize: 10,
        fontWeight: 700,
        padding: '3px 7px',
        borderRadius: 6,
        background: ex.autoCheck ? 'rgba(52,211,153,0.15)' : 'rgba(100,116,139,0.2)',
        color: ex.autoCheck ? '#34d399' : '#94a3b8',
        border: `1px solid ${ex.autoCheck ? 'rgba(52,211,153,0.3)' : 'rgba(100,116,139,0.3)'}`,
        letterSpacing: '0.04em',
      }}>
        {ex.autoCheck ? 'LIVE' : 'CUES'}
      </span>
    </button>
  )
}
