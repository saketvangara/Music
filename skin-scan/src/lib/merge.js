// Combine heuristic + AI scores into the final per-concern results.
// Accuracy priority: AI leads (0.7) but the heuristic anchors it (0.3)
// against vision-model overconfidence. Blemishes has no heuristic — AI only.

import { CONCERN_KEYS, buildLocalAdvice } from './products.js'

const round1 = v => Math.round(v * 10) / 10

const DEFAULT_REGIONS = {
  pores: ['nose', 'cheeks'],
  oiliness: ['forehead', 'nose', 'chin'],
  redness: ['noseWings', 'cheeks'],
  darkCircles: ['underEyes'],
  texture: ['cheeks', 'forehead'],
  blemishes: ['cheeks', 'chin', 'forehead'],
}

// heuristics: {pores: {score, raw}, ...} (no blemishes)
// ai: parsed Claude result or null
// Returns { concerns, advice, source }
export function mergeResults(heuristics, ai) {
  const concerns = {}

  for (const key of CONCERN_KEYS) {
    const h = heuristics[key]?.score ?? null
    const a = ai?.concerns?.[key]?.severity ?? null
    let final
    if (a != null && h != null) final = round1(0.7 * a + 0.3 * h)
    else if (a != null) final = round1(a)
    else final = h != null ? round1(h) : null

    concerns[key] = {
      final,
      heuristic: h,
      ai: a,
      raw: heuristics[key]?.raw ?? null,
      regions: ai?.concerns?.[key]?.regions?.length
        ? ai.concerns[key].regions
        : DEFAULT_REGIONS[key],
      note: ai?.concerns?.[key]?.note || '',
    }
  }

  const scores = Object.fromEntries(CONCERN_KEYS.map(k => [k, concerns[k].final]))
  const local = buildLocalAdvice(scores)

  const advice = {
    // AI product picks (catalog ids or plain strings) override local picks per concern
    products: { ...local.products, ...(ai?.products ?? {}) },
    routine: ai?.routine || local.routine,
    imageQualityCaveat: ai?.imageQualityCaveat ?? null,
  }

  return { concerns, advice, source: ai ? 'ai' : 'heuristic' }
}
