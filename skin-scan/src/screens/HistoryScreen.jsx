import { useEffect, useMemo, useState } from 'react'
import { getScans, deleteScan } from '../lib/db'
import { CONCERNS, CONCERN_KEYS } from '../lib/products'
import Sparkline from '../components/Sparkline'

function Thumb({ blob }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url ? (
    <img src={url} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover' }} />
  ) : (
    <div style={{ width: 56, height: 56, borderRadius: 12, background: 'rgba(255,255,255,0.06)' }} />
  )
}

export default function HistoryScreen({ onOpenScan }) {
  const [scans, setScans] = useState(null) // null = loading

  useEffect(() => {
    let alive = true
    getScans().then(s => { if (alive) setScans(s) })
    return () => { alive = false }
  }, [])

  async function handleDelete(e, id) {
    e.stopPropagation()
    if (!confirm('Delete this scan?')) return
    await deleteScan(id)
    setScans(prev => prev.filter(s => s.id !== id))
  }

  // Chronological score series per concern, for trends
  const trends = useMemo(() => {
    if (!scans?.length) return null
    const chrono = [...scans].sort((a, b) => a.ts - b.ts)
    const series = {}
    for (const key of CONCERN_KEYS) {
      series[key] = chrono.map(s => s.concerns?.[key]?.final ?? null)
    }
    return series
  }, [scans])

  const worstConcern = scan => {
    let worst = null
    for (const key of CONCERN_KEYS) {
      const v = scan.concerns?.[key]?.final
      if (v != null && (worst == null || v > scan.concerns[worst].final)) worst = key
    }
    return worst
  }

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ padding: '18px 16px 30px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560, margin: '0 auto' }}>
        <div style={{ fontWeight: 800, fontSize: 19 }}>History</div>

        {scans === null && <div style={{ opacity: 0.5, fontSize: 14 }}>Loading…</div>}

        {scans?.length === 0 && (
          <div style={{ opacity: 0.55, fontSize: 14.5, lineHeight: 1.6, marginTop: 30, textAlign: 'center' }}>
            No scans yet.<br />
            Take your first selfie in the Scan tab — your progress will build up here.
          </div>
        )}

        {trends && scans.length >= 2 && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Trends ({scans.length} scans)</div>
            {CONCERN_KEYS.map(key => {
              const vals = trends[key].filter(v => v != null)
              if (vals.length < 2) return null
              const delta = vals[vals.length - 1] - vals[0]
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: CONCERNS[key].color }} />
                  <span style={{ flex: 1, fontSize: 13 }}>{CONCERNS[key].label}</span>
                  <Sparkline values={trends[key]} color={CONCERNS[key].color} />
                  <span style={{
                    fontSize: 12, fontWeight: 700, width: 42, textAlign: 'right',
                    color: delta < -0.5 ? '#34d399' : delta > 0.5 ? '#f87171' : 'rgba(255,255,255,0.4)',
                  }}>
                    {delta > 0 ? '+' : ''}{Math.round(delta * 10) / 10}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {scans?.map(scan => {
          const worst = worstConcern(scan)
          const d = new Date(scan.ts)
          return (
            <button
              key={scan.id}
              onClick={() => onOpenScan(scan)}
              className="card"
              style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}
            >
              <Thumb blob={scan.thumb} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  <span style={{ opacity: 0.45, fontWeight: 400 }}>
                    {' '}{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {worst && (
                  <div style={{ fontSize: 12, marginTop: 3, color: CONCERNS[worst].color }}>
                    Top concern: {CONCERNS[worst].label} {scan.concerns[worst].final}
                  </div>
                )}
                <div style={{ fontSize: 11, opacity: 0.4, marginTop: 2 }}>
                  {scan.source === 'ai' ? 'AI + on-device' : 'on-device'}
                  {!scan.lighting?.ok && ' · ⚠ lighting'}
                </div>
              </div>
              <button
                onClick={e => handleDelete(e, scan.id)}
                aria-label="Delete scan"
                style={{ padding: 8, opacity: 0.4, fontSize: 15 }}
              >
                ✕
              </button>
            </button>
          )
        })}
      </div>
    </div>
  )
}
