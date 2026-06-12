// Lighting-quality check over the skin mask. All heuristic scores are
// lighting-sensitive, so poor light gets a visible warning and is stored
// with the scan so history trends can be read with appropriate skepticism.

import { luma, maskedMedianLuma } from './heuristics.js'

// noseBridgeX: pixel x of the nose bridge — splits the face for the
// left/right illumination asymmetry check.
export function checkLighting(img, skinMask, noseBridgeX) {
  const { data, width, height } = img
  let n = 0, clipped = 0, shadow = 0
  let sumL = 0, nL = 0, sumR = 0, nR = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      if (!skinMask[i]) continue
      const o = i * 4
      const Y = luma(data[o], data[o + 1], data[o + 2])
      n++
      if (Y > 250) clipped++
      if (Y < 25) shadow++
      if (x < noseBridgeX) { sumL += Y; nL++ } else { sumR += Y; nR++ }
    }
  }

  const medianY = maskedMedianLuma(img, skinMask)
  const clippedPct = n ? (clipped / n) * 100 : 0
  const shadowPct = n ? (shadow / n) * 100 : 0
  const asymmetry = nL && nR ? Math.abs(sumL / nL - sumR / nR) : 0

  const reasons = []
  if (medianY < 60) reasons.push('Too dim — find brighter light')
  if (medianY > 205) reasons.push('Overexposed — move away from direct light')
  if (clippedPct > 4) reasons.push('Blown-out highlights on skin')
  if (shadowPct > 10) reasons.push('Heavy shadows on face')
  if (asymmetry > 28) reasons.push('Uneven side lighting — face the light source')

  return {
    ok: reasons.length === 0,
    reasons,
    medianY: Math.round(medianY),
    clippedPct: Math.round(clippedPct * 10) / 10,
    shadowPct: Math.round(shadowPct * 10) / 10,
    asymmetry: Math.round(asymmetry),
  }
}
