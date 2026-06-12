import { useState } from 'react'
import { CATEGORIES } from '../lib/catalog'

// product: full catalog entry, or a plain-string suggestion from the AI.
export default function ProductCard({ product }) {
  const [open, setOpen] = useState(false)

  if (typeof product === 'string') {
    return (
      <div className="card" style={{ fontSize: 14 }}>
        {product}
        <span style={{ fontSize: 11, opacity: 0.5, marginLeft: 6 }}>AI suggestion</span>
      </div>
    )
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#a5b4fc', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {product.brand}
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 600, marginTop: 1 }}>{product.name}</div>
        </div>
        <span style={{
          fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
          background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)',
          whiteSpace: 'nowrap',
        }}>
          {CATEGORIES[product.category] ?? product.category}
        </span>
        <span style={{ opacity: 0.4, fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </button>

      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
        {product.keyIngredients.join(' · ')}
      </div>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4, fontSize: 13.5, lineHeight: 1.5 }}>
          <div>
            <div style={detailLabel}>How it helps</div>
            {product.howItWorks}
          </div>
          <div>
            <div style={detailLabel}>Time to results</div>
            {product.resultsTimeline}
          </div>
          <div>
            <div style={detailLabel}>How to use</div>
            {product.usage}
          </div>
          {product.cautions && (
            <div style={{ color: '#fbbf24' }}>
              <div style={detailLabel}>Heads up</div>
              {product.cautions}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const detailLabel = {
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.45)',
  marginBottom: 2,
}
