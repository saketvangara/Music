import { useEffect, useMemo, useState } from 'react'
import { CONCERNS, CONCERN_KEYS } from '../lib/products'
import { getProduct } from '../lib/catalog'
import { getScans } from '../lib/db'
import OverlayCanvas from '../components/OverlayCanvas'
import ConcernChips from '../components/ConcernChips'
import ScoreCard from '../components/ScoreCard'
import ProductCard from '../components/ProductCard'

export default function ResultsScreen({ scan, onBack }) {
  const [enabled, setEnabled] = useState(() => new Set(CONCERN_KEYS))
  const [prevScan, setPrevScan] = useState(null)

  // Previous scan (next-oldest) for score deltas
  useEffect(() => {
    let alive = true
    getScans().then(scans => {
      if (!alive) return
      const prev = scans.find(s => s.ts < scan.ts)
      setPrevScan(prev ?? null)
    })
    return () => { alive = false }
  }, [scan])

  const toggle = key => {
    setEnabled(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const sortedKeys = useMemo(() =>
    CONCERN_KEYS
      .filter(k => scan.concerns[k])
      .sort((a, b) => (scan.concerns[b].final ?? -1) - (scan.concerns[a].final ?? -1)),
    [scan])

  // Resolve advice product ids → catalog entries (plain strings pass through)
  const productSections = useMemo(() => {
    const sections = []
    const seen = new Set()
    const keys = [...sortedKeys.filter(k => (scan.concerns[k]?.final ?? 0) >= 3), 'always']
    for (const key of keys) {
      const ids = scan.advice?.products?.[key]
      if (!ids?.length) continue
      const items = ids
        .map(id => getProduct(id) ?? String(id)) // unresolved ids show as plain suggestions
        .filter(p => {
          const k = typeof p === 'string' ? p : p.id
          if (seen.has(k)) return false
          seen.add(k)
          return true
        })
      if (items.length) {
        sections.push({
          key,
          label: key === 'always' ? 'Every day, no matter what' : CONCERNS[key].label,
          color: key === 'always' ? '#fde68a' : CONCERNS[key].color,
          items,
        })
      }
    }
    return sections
  }, [scan, sortedKeys])

  const date = new Date(scan.ts)

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ padding: '16px 16px 30px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn-ghost" style={{ padding: '7px 14px' }} onClick={onBack}>←</button>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>Scan results</div>
            <div style={{ fontSize: 12, opacity: 0.55 }}>
              {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {scan.source === 'ai' ? ' · AI + on-device' : ' · on-device only'}
            </div>
          </div>
        </div>

        {!scan.lighting?.ok && (
          <div style={{
            background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)',
            borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#fde68a',
          }}>
            ⚠ {scan.lighting.reasons.join(' · ')} — scores may be less accurate.
          </div>
        )}
        {scan.advice?.imageQualityCaveat && (
          <div style={{ fontSize: 12.5, opacity: 0.6 }}>Note: {scan.advice.imageQualityCaveat}</div>
        )}

        <OverlayCanvas
          photoBlob={scan.photo}
          landmarks={scan.landmarks}
          concerns={scan.concerns}
          enabled={enabled}
        />

        <ConcernChips concerns={scan.concerns} enabled={enabled} onToggle={toggle} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sortedKeys.map(key => (
            <ScoreCard
              key={key}
              concernKey={key}
              concern={scan.concerns[key]}
              delta={
                prevScan && scan.concerns[key].final != null && prevScan.concerns?.[key]?.final != null
                  ? Math.round((scan.concerns[key].final - prevScan.concerns[key].final) * 10) / 10
                  : null
              }
            />
          ))}
        </div>

        {scan.advice?.routine && (
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Your routine</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'rgba(255,255,255,0.85)' }}>
              {scan.advice.routine}
            </div>
          </div>
        )}

        {productSections.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Recommended products</div>
            {productSections.map(section => (
              <div key={section.key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: section.color }} />
                  {section.label}
                </div>
                {section.items.map((p, i) => (
                  <ProductCard key={typeof p === 'string' ? `s-${i}` : p.id} product={p} />
                ))}
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: 11.5, opacity: 0.45, textAlign: 'center', lineHeight: 1.5 }}>
          General guidance, not medical advice. If anything looks severe or unusual,
          see a dermatologist. Patch-test new products.
        </div>
      </div>
    </div>
  )
}
