import { CONCERNS } from '../lib/products'

export default function ConcernChips({ concerns, enabled, onToggle }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {Object.entries(CONCERNS).map(([key, def]) => {
        const concern = concerns[key]
        if (!concern || concern.final == null) return null
        const on = enabled.has(key)
        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600,
              border: `1.5px solid ${on ? def.color : 'rgba(255,255,255,0.18)'}`,
              background: on ? def.color + '26' : 'transparent',
              color: on ? '#fff' : 'rgba(255,255,255,0.5)',
            }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: def.color, opacity: on ? 1 : 0.4,
            }} />
            {def.label}
            <span style={{ opacity: 0.7 }}>{concern.final}</span>
          </button>
        )
      })}
    </div>
  )
}
