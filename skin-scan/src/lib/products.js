import { productsForConcern } from './catalog.js'

export const CONCERNS = {
  pores:       { label: 'Enlarged pores',  color: '#f59e0b' },
  oiliness:    { label: 'Oiliness / shine', color: '#22d3ee' },
  redness:     { label: 'Redness',          color: '#ef4444' },
  darkCircles: { label: 'Dark circles',     color: '#a78bfa' },
  texture:     { label: 'Texture',          color: '#a3e635' },
  blemishes:   { label: 'Blemishes',        color: '#ec4899' },
}

export const CONCERN_KEYS = Object.keys(CONCERNS)

const SUGGEST_THRESHOLD = 3

// Heuristics-only fallback advice when no AI result is available.
// Returns { products: {concern: [catalogId,...]}, routine: string }
export function buildLocalAdvice(scores) {
  const products = {}
  const active = []

  for (const key of CONCERN_KEYS) {
    const score = scores[key]
    if (score != null && score >= SUGGEST_THRESHOLD) {
      active.push(key)
      products[key] = productsForConcern(key).map(p => p.id)
    }
  }
  products.always = productsForConcern('always', 2).map(p => p.id)

  const parts = []
  parts.push('AM: gentle cleanser')
  if (active.includes('redness')) parts.push('soothing toner (heartleaf/centella)')
  if (active.includes('pores') || active.includes('oiliness')) parts.push('niacinamide serum')
  if (active.includes('darkCircles')) parts.push('caffeine eye serum')
  parts.push('light moisturizer, then SPF50 — every single morning.')

  const pm = ['PM: cleanse']
  if (active.includes('pores') || active.includes('texture')) pm.push('BHA exfoliant 2–3x/week')
  if (active.includes('redness')) pm.push('azelaic acid or centella serum')
  if (active.includes('blemishes')) pm.push('targeted blemish treatment')
  if (active.includes('darkCircles')) pm.push('retinal eye cream (start 3x/week)')
  pm.push('moisturizer to finish.')

  const routine = parts.join(', ') + ' ' + pm.join(', ') +
    ' Introduce one new product at a time, a week apart, so you can spot anything that irritates.'

  return { products, routine }
}
