/**
 * Phase 2: Generic metric engine.
 * Implements every metric in exercises.json metricVocabulary.
 * computeMetric(metricSpec, landmarks, context) → number | null
 */

import { resolvePoint } from '../utils/landmarks'

/**
 * Angle (degrees) at vertex B for the triplet [A, B, C].
 */
function jointAngle(a, b, c) {
  const ax = a.x - b.x, ay = a.y - b.y
  const cx = c.x - b.x, cy = c.y - b.y
  const dot = ax * cx + ay * cy
  const magA = Math.hypot(ax, ay)
  const magC = Math.hypot(cx, cy)
  if (!magA || !magC) return null
  return (Math.acos(Math.max(-1, Math.min(1, dot / (magA * magC)))) * 180) / Math.PI
}

/**
 * Angle (degrees) of segment [A, B] from vertical. 0 = straight up.
 */
function segmentVsVertical(a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return (Math.atan2(Math.abs(dx), Math.abs(dy)) * 180) / Math.PI
}

/**
 * Angle (degrees) of segment [A, B] from horizontal. 0 = flat.
 */
function segmentVsHorizontal(a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI
}

/**
 * Compute a single metric value from the current frame's landmarks.
 * Returns null if any required landmark is missing/low-confidence.
 *
 * @param {object} spec   - The metric spec from the exercise rule or repSignal
 * @param {Array}  lms    - Smoothed landmarks array (33 NormalizedLandmark)
 * @param {object} ctx    - { side: 'left'|'right'|'auto' }
 */
export function computeMetric(spec, lms, ctx = {}) {
  if (!lms) return null
  const side = ctx.side ?? 'auto'

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
      // |x_a - x_b| / torso
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
      // kneeGap / ankleGap (front view)
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

    case 'leadRate':
      // Computed from frame history in ruleEngine — return null here
      return null

    default:
      return null
  }
}

/**
 * Compute the torso normalisation length (shoulder→hip, average both sides).
 */
export function computeTorsoLength(lms) {
  if (!lms) return 1
  const ls = lms[11], rs = lms[12], lh = lms[23], rh = lms[24]
  const left  = Math.hypot(ls.x - lh.x, ls.y - lh.y)
  const right = Math.hypot(rs.x - rh.x, rs.y - rh.y)
  return ((left + right) / 2) || 1
}
