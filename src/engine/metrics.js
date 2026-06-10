/**
 * Phase 2: Generic metric engine.
 * computeMetric(spec, landmarks, ctx) → number | null
 *
 * All seven metrics from exercises.json metricVocabulary are implemented here,
 * except leadRate — see FRAME_HISTORY_METRICS below.
 */

import { resolvePoint, SEMANTIC_PAIR } from '../utils/landmarks'

// ─── Contract: metrics that need per-frame history ────────────────────────────

// 'leadRate' compares the velocity of two points across frames, so it cannot
// be computed from a single snapshot.  The rule engine (Phase 3) must handle
// these itself using its frame-history ring buffer and must NOT call
// computeMetric for rules whose metric is in this set.
export const FRAME_HISTORY_METRICS = new Set(['leadRate'])

// ─── Geometry primitives ──────────────────────────────────────────────────────

function jointAngle(a, b, c) {
  const ax = a.x - b.x, ay = a.y - b.y
  const cx = c.x - b.x, cy = c.y - b.y
  const dot  = ax * cx + ay * cy
  const magA = Math.hypot(ax, ay)
  const magC = Math.hypot(cx, cy)
  if (!magA || !magC) return null
  return (Math.acos(Math.max(-1, Math.min(1, dot / (magA * magC)))) * 180) / Math.PI
}

function segmentVsVertical(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y
  return (Math.atan2(Math.abs(dx), Math.abs(dy)) * 180) / Math.PI
}

function segmentVsHorizontal(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y
  return (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI
}

// ─── Side resolution ──────────────────────────────────────────────────────────

// Determine the dominant (more-visible) body side from a rule's point list.
// All points in one computeMetric call must use the SAME side — independently
// picking the best-visible joint per point can produce cross-body angles like
// left-hip → right-knee → left-ankle, which are meaningless.
function dominantSide(points, lms) {
  const names = Array.isArray(points)
    ? points
    : Object.values(points).flat()   // handles { numerator: [...], denominator: [...] }

  for (const name of names) {
    const pair = SEMANTIC_PAIR[name]
    if (!pair) continue
    const [li, ri] = pair
    const lv = lms[li]?.visibility ?? 0
    const rv = lms[ri]?.visibility ?? 0
    return rv > lv ? 'right' : 'left'
  }
  return 'left'   // no bilateral point found (e.g. all absolute names)
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute a single metric value from the current frame's landmarks.
 * Returns null when any required landmark is missing or the metric
 * requires frame history (see FRAME_HISTORY_METRICS).
 *
 * @param {object} spec  - Rule / repSignal spec from exercises.json
 * @param {Array}  lms   - Smoothed 33-element NormalizedLandmark array
 * @param {object} ctx   - { side?: 'left'|'right', torsoLength?: number }
 */
export function computeMetric(spec, lms, ctx = {}) {
  if (!lms) return null
  if (FRAME_HISTORY_METRICS.has(spec.metric)) return null

  // Resolve side once for all points to avoid cross-body mixing.
  const side = (ctx.side === 'left' || ctx.side === 'right')
    ? ctx.side
    : dominantSide(spec.points, lms)

  switch (spec.metric) {
    case 'jointAngle': {
      const [na, nb, nc] = spec.points
      const ia = resolvePoint(na, side, lms)
      const ib = resolvePoint(nb, side, lms)
      const ic = resolvePoint(nc, side, lms)
      if (ia == null || ib == null || ic == null) return null
      return jointAngle(lms[ia], lms[ib], lms[ic])
    }

    case 'segmentVsVertical': {
      const [na, nb] = spec.points
      const ia = resolvePoint(na, side, lms)
      const ib = resolvePoint(nb, side, lms)
      if (ia == null || ib == null) return null
      return segmentVsVertical(lms[ia], lms[ib])
    }

    case 'segmentVsHorizontal': {
      const [na, nb] = spec.points
      const ia = resolvePoint(na, side, lms)
      const ib = resolvePoint(nb, side, lms)
      if (ia == null || ib == null) return null
      return segmentVsHorizontal(lms[ia], lms[ib])
    }

    case 'horizontalRatio': {
      const [na, nb] = spec.points
      const ia = resolvePoint(na, side, lms)
      const ib = resolvePoint(nb, side, lms)
      if (ia == null || ib == null) return null
      const torso = ctx.torsoLength ?? 1
      return Math.abs(lms[ia].x - lms[ib].x) / torso
    }

    case 'verticalRatio': {
      const [na, nb] = spec.points
      const ia = resolvePoint(na, side, lms)
      const ib = resolvePoint(nb, side, lms)
      if (ia == null || ib == null) return null
      const torso = ctx.torsoLength ?? 1
      return Math.abs(lms[ia].y - lms[ib].y) / torso
    }

    case 'frontSeparationRatio': {
      // kneeGap / ankleGap (front view only — per rule's view field)
      const { numerator: [n1a, n1b], denominator: [n2a, n2b] } = spec.points
      const i1a = resolvePoint(n1a, 'auto', lms)
      const i1b = resolvePoint(n1b, 'auto', lms)
      const i2a = resolvePoint(n2a, 'auto', lms)
      const i2b = resolvePoint(n2b, 'auto', lms)
      if (i1a == null || i1b == null || i2a == null || i2b == null) return null
      const numGap = Math.abs(lms[i1a].x - lms[i1b].x)
      const denGap = Math.abs(lms[i2a].x - lms[i2b].x)
      if (!denGap) return null
      return numGap / denGap
    }

    default:
      return null
  }
}

/**
 * Torso length (shoulder→hip, averaged across both sides) used to
 * normalise camera-distance-sensitive metrics like horizontalRatio.
 */
export function computeTorsoLength(lms) {
  if (!lms) return 1
  const ls = lms[11], rs = lms[12], lh = lms[23], rh = lms[24]
  const left  = Math.hypot(ls.x - lh.x, ls.y - lh.y)
  const right = Math.hypot(rs.x - rh.x, rs.y - rh.y)
  return ((left + right) / 2) || 1
}
