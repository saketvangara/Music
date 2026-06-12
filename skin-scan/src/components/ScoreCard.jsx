import { CONCERNS } from '../lib/products'

function severityWord(score) {
  if (score < 2) return 'minimal'
  if (score < 4) return 'mild'
  if (score < 6) return 'moderate'
  if (score < 8) return 'noticeable'
  return 'significant'
}

export default function ScoreCard({ concernKey, concern, delta }) {
  const def = CONCERNS[concernKey]
  const score = concern.final

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: def.color }} />
        <span style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>{def.label}</span>
        {delta != null && delta !== 0 && (
          <span style={{
            fontSize: 12, fontWeight: 700,
            color: delta < 0 ? '#34d399' : '#f87171',
          }}>
            {delta < 0 ? '▼' : '▲'} {Math.abs(delta).toFixed(1)}
          </span>
        )}
        <span style={{ fontWeight: 800, fontSize: 17 }}>
          {score != null ? score : '—'}
          <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.5 }}> /10</span>
        </span>
      </div>

      {score != null ? (
        <>
          <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }}>
            <div style={{
              height: '100%', borderRadius: 3, width: `${score * 10}%`,
              background: def.color, transition: 'width 0.4s',
            }} />
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.65)' }}>
            {severityWord(score)}
            {concern.ai != null && concern.heuristic != null && (
              <span style={{ opacity: 0.6 }}> · AI {concern.ai} · device {concern.heuristic}</span>
            )}
            {concern.ai != null && concern.heuristic == null && (
              <span style={{ opacity: 0.6 }}> · AI assessment</span>
            )}
          </div>
          {concern.note && (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.45 }}>
              {concern.note}
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)' }}>
          Needs AI analysis — add an API key in Settings
        </div>
      )}
    </div>
  )
}
