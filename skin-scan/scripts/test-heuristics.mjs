// Node tests for the pure heuristic layer — synthetic pixel buffers, no DOM.
// Run: npm run test:heuristics

import {
  rgbToLab, maskedLabMean, maskedMedianLuma, maskTopBand,
  toGrayscale, boxBlur, residualSigma, shinyFraction,
  scoreOiliness, scoreRedness, scoreDarkCircles, scorePoresAndTexture, orMasks,
} from '../src/lib/heuristics.js'
import { checkLighting } from '../src/lib/lighting.js'

let failures = 0
function check(name, cond, detail = '') {
  if (cond) {
    console.log(`  ✓ ${name}`)
  } else {
    failures++
    console.error(`  ✗ ${name} ${detail}`)
  }
}

// ─── Builders ─────────────────────────────────────────────────────────────────

const W = 200, H = 200

function makeImage(r = 200, g = 160, b = 140) {
  const data = new Uint8ClampedArray(W * H * 4)
  for (let i = 0; i < W * H; i++) {
    data[i * 4] = r; data[i * 4 + 1] = g; data[i * 4 + 2] = b; data[i * 4 + 3] = 255
  }
  return { data, width: W, height: H }
}

function rectMask(x0, y0, x1, y1) {
  const mask = new Uint8Array(W * H)
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) mask[y * W + x] = 1
  return mask
}

function paintRect(img, x0, y0, x1, y1, r, g, b) {
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const o = (y * W + x) * 4
      img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b
    }
}

const fullMask = rectMask(0, 0, W, H)

// ─── Color math ───────────────────────────────────────────────────────────────

console.log('color math')
{
  const [L, a] = rgbToLab(255, 0, 0)
  check('pure red has strongly positive a*', a > 40, `a*=${a}`)
  const [Lw, aw, bw] = rgbToLab(255, 255, 255)
  check('white is L*≈100, a*≈0, b*≈0', Math.abs(Lw - 100) < 1 && Math.abs(aw) < 1 && Math.abs(bw) < 1)
  const grayImg = makeImage(128, 128, 128)
  check('median luma of flat gray = 128', maskedMedianLuma(grayImg, fullMask) === 128)
}

// ─── Mask math ────────────────────────────────────────────────────────────────

console.log('mask math')
{
  const m = rectMask(10, 40, 30, 100) // rows 40..99
  const top = maskTopBand(m, W, H, 0.5)
  let topCount = 0, origCount = 0
  for (let i = 0; i < m.length; i++) { topCount += top[i]; origCount += m[i] }
  check('top band keeps ~half the rows', Math.abs(topCount / origCount - 0.5) < 0.05,
    `${topCount}/${origCount}`)
  let belowCutoff = 0
  for (let y = 75; y < H; y++) for (let x = 0; x < W; x++) belowCutoff += top[y * W + x]
  check('top band has no pixels below cutoff', belowCutoff === 0)
  const union = orMasks(rectMask(0, 0, 10, 10), rectMask(5, 5, 15, 15))
  let u = 0; for (const v of union) u += v
  check('orMasks unions areas', u === 100 + 100 - 25, `got ${u}`)
}

// ─── Oiliness / shine ─────────────────────────────────────────────────────────

console.log('oiliness')
{
  const img = makeImage()
  paintRect(img, 0, 0, 80, 80, 252, 250, 248) // bright, low-sat specular patch
  const shinyRegion = rectMask(0, 0, 80, 80)
  const mattRegion = rectMask(100, 100, 180, 180)
  const medianY = maskedMedianLuma(img, fullMask)
  check('shiny patch ≈ 100% shiny pixels', shinyFraction(img, shinyRegion, medianY) > 0.95)
  check('matte region ≈ 0% shiny pixels', shinyFraction(img, mattRegion, medianY) < 0.01)

  const masks = { skin: fullMask, forehead: shinyRegion, nose: mattRegion, chin: mattRegion }
  const oily = scoreOiliness(img, masks)
  check('oiliness fires on shiny forehead (weight 0.5 → score 5)', oily.score >= 4.5, `score=${oily.score}`)
  const masksMatte = { skin: fullMask, forehead: mattRegion, nose: mattRegion, chin: mattRegion }
  check('oiliness ≈ 0 when all matte', scoreOiliness(img, masksMatte).score < 0.5)
}

// ─── Redness ──────────────────────────────────────────────────────────────────

console.log('redness')
{
  const img = makeImage()
  paintRect(img, 0, 0, 60, 60, 225, 130, 125) // visibly redder patch
  const redRegion = rectMask(0, 0, 60, 60)
  const normalRegion = rectMask(100, 100, 180, 180)
  const masks = { skin: fullMask, noseWings: redRegion, cheeks: normalRegion }
  const red = scoreRedness(img, masks)
  check('redness fires on red nose wings', red.score > 5, `score=${red.score} raw=${JSON.stringify(red.raw)}`)
  const masksNone = { skin: fullMask, noseWings: normalRegion, cheeks: normalRegion }
  check('redness ≈ 0 on uniform skin', scoreRedness(img, masksNone).score < 1)
}

// ─── Dark circles ─────────────────────────────────────────────────────────────

console.log('dark circles')
{
  const img = makeImage()
  paintRect(img, 40, 20, 160, 50, 140, 110, 105) // darkened under-eye band
  const masks = {
    underEyes: rectMask(40, 20, 160, 50),
    cheeks: rectMask(40, 60, 160, 140),
  }
  const dc = scoreDarkCircles(img, masks, W, H)
  check('dark circles fire on darkened band', dc.score > 4, `score=${dc.score} raw=${JSON.stringify(dc.raw)}`)

  const masksSame = { underEyes: rectMask(40, 60, 100, 140), cheeks: rectMask(100, 60, 160, 140) }
  check('dark circles ≈ 0 on uniform skin', scoreDarkCircles(img, masksSame, W, H).score < 1)
}

// ─── Pores / texture ──────────────────────────────────────────────────────────

console.log('pores / texture')
{
  const img = makeImage()
  // deterministic high-frequency noise in one cheek
  let seed = 42
  const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
  for (let y = 100; y < 180; y++)
    for (let x = 100; x < 180; x++) {
      const o = (y * W + x) * 4
      const dv = Math.round((rand() - 0.5) * 60)
      img.data[o] = 200 + dv; img.data[o + 1] = 160 + dv; img.data[o + 2] = 140 + dv
    }
  const noisy = rectMask(100, 100, 180, 180)
  const smooth = rectMask(10, 10, 90, 90)
  const iod = 64 // small face → small blur radius

  const noisyScores = scorePoresAndTexture(img, { cheeks: noisy, nose: noisy, forehead: noisy }, iod)
  const smoothScores = scorePoresAndTexture(img, { cheeks: smooth, nose: smooth, forehead: smooth }, iod)
  check('pores fire on noisy region', noisyScores.pores.score > 5, `score=${noisyScores.pores.score}`)
  check('pores ≈ 0 on smooth region', smoothScores.pores.score < 0.5, `score=${smoothScores.pores.score}`)
  check('texture separates noisy vs smooth',
    noisyScores.texture.score > smoothScores.texture.score + 3,
    `${noisyScores.texture.score} vs ${smoothScores.texture.score}`)

  // blur sanity: blurring flattens the residual
  const gray = toGrayscale(img)
  const blurred = boxBlur(gray, W, H, 4)
  const sigmaNoisy = residualSigma(gray, blurred, noisy, W, H)
  const sigmaSmooth = residualSigma(gray, blurred, smooth, W, H)
  check('residual σ noisy >> smooth', sigmaNoisy > sigmaSmooth * 5, `${sigmaNoisy} vs ${sigmaSmooth}`)
}

// ─── Lighting ─────────────────────────────────────────────────────────────────

console.log('lighting')
{
  const good = checkLighting(makeImage(), fullMask, W / 2)
  check('even mid-tone lighting passes', good.ok, JSON.stringify(good))

  const dim = checkLighting(makeImage(40, 32, 28), fullMask, W / 2)
  check('dim image flagged', !dim.ok && dim.reasons.some(r => r.includes('dim')))

  const lopsided = makeImage()
  paintRect(lopsided, 0, 0, 100, 200, 90, 72, 63) // dark left half
  const asym = checkLighting(lopsided, fullMask, W / 2)
  check('side-lit face flagged as uneven', asym.reasons.some(r => r.includes('Uneven')),
    JSON.stringify(asym))
}

// ─── Lab mean sanity ──────────────────────────────────────────────────────────

console.log('lab stats')
{
  const img = makeImage()
  const stats = maskedLabMean(img, fullMask)
  check('skin tone L* in plausible range', stats.L > 50 && stats.L < 90, `L=${stats.L}`)
  check('skin tone a* positive (warm)', stats.a > 0, `a=${stats.a}`)
  check('pixel count matches mask', stats.n === W * H)
}

console.log('')
if (failures) {
  console.error(`${failures} test(s) FAILED`)
  process.exit(1)
} else {
  console.log('All heuristic tests passed')
}
