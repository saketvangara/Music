// Pure, DOM-free skin-concern scoring so it can run (and be tested) in Node.
// All functions take an image as {data: Uint8ClampedArray (RGBA), width, height}
// and masks as Uint8Array (0/1) of width*height.
//
// Every score is baselined against the user's OWN face-oval skin statistics,
// which makes the measurements robust to skin tone and camera white balance.
// Raw measurements are returned alongside each 0–10 score so thresholds can
// be recalibrated later without invalidating stored history.

const clamp01 = v => Math.max(0, Math.min(1, v))
const round1 = v => Math.round(v * 10) / 10

// ─── Color math ───────────────────────────────────────────────────────────────

export function luma(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function saturation(r, g, b) {
  const max = Math.max(r, g, b)
  if (max === 0) return 0
  return (max - Math.min(r, g, b)) / max
}

function srgbToLinear(c) {
  c /= 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

// sRGB → CIELAB (D65). Returns [L*, a*, b*].
export function rgbToLab(r, g, b) {
  const rl = srgbToLinear(r), gl = srgbToLinear(g), bl = srgbToLinear(b)
  let x = (0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl) / 0.95047
  let y =  0.2126729 * rl + 0.7151522 * gl + 0.0721750 * bl
  let z = (0.0193339 * rl + 0.1191920 * gl + 0.9503041 * bl) / 1.08883
  const f = t => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  x = f(x); y = f(y); z = f(z)
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}

// ─── Masked statistics ────────────────────────────────────────────────────────

export function maskedLabMean(img, mask) {
  const { data, width, height } = img
  let L = 0, A = 0, B = 0, n = 0
  for (let i = 0; i < width * height; i++) {
    if (!mask[i]) continue
    const o = i * 4
    const lab = rgbToLab(data[o], data[o + 1], data[o + 2])
    L += lab[0]; A += lab[1]; B += lab[2]; n++
  }
  return n ? { L: L / n, a: A / n, b: B / n, n } : { L: 0, a: 0, b: 0, n: 0 }
}

export function maskedMedianLuma(img, mask) {
  const { data, width, height } = img
  const hist = new Uint32Array(256)
  let n = 0
  for (let i = 0; i < width * height; i++) {
    if (!mask[i]) continue
    const o = i * 4
    hist[Math.min(255, luma(data[o], data[o + 1], data[o + 2]) | 0)]++
    n++
  }
  if (!n) return 0
  let acc = 0
  for (let v = 0; v < 256; v++) {
    acc += hist[v]
    if (acc >= n / 2) return v
  }
  return 255
}

// Keep only the top `frac` rows of a mask's bounding box (e.g. upper cheek
// band as the comparison skin for dark circles).
export function maskTopBand(mask, width, height, frac = 0.5) {
  let minY = height, maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x]) { if (y < minY) minY = y; if (y > maxY) maxY = y; break }
    }
  }
  if (maxY < 0) return mask
  const cutoff = minY + (maxY - minY) * frac
  const out = new Uint8Array(mask.length)
  for (let y = minY; y <= cutoff; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      out[i] = mask[i]
    }
  }
  return out
}

// ─── Grayscale + box blur (for high-frequency texture energy) ─────────────────

export function toGrayscale(img) {
  const { data, width, height } = img
  const gray = new Float32Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const o = i * 4
    gray[i] = luma(data[o], data[o + 1], data[o + 2])
  }
  return gray
}

// Two-pass sliding-window box blur, O(W*H) regardless of radius.
export function boxBlur(src, width, height, radius) {
  const tmp = new Float32Array(src.length)
  const out = new Float32Array(src.length)
  // horizontal
  for (let y = 0; y < height; y++) {
    const row = y * width
    let sum = 0, count = 0
    for (let x = -radius; x <= radius; x++) {
      if (x >= 0 && x < width) { sum += src[row + x]; count++ }
    }
    for (let x = 0; x < width; x++) {
      tmp[row + x] = sum / count
      const add = x + radius + 1, sub = x - radius
      if (add < width) { sum += src[row + add]; count++ }
      if (sub >= 0)    { sum -= src[row + sub]; count-- }
    }
  }
  // vertical
  for (let x = 0; x < width; x++) {
    let sum = 0, count = 0
    for (let y = -radius; y <= radius; y++) {
      if (y >= 0 && y < height) { sum += tmp[y * width + x]; count++ }
    }
    for (let y = 0; y < height; y++) {
      out[y * width + x] = sum / count
      const add = y + radius + 1, sub = y - radius
      if (add < height) { sum += tmp[add * width + x]; count++ }
      if (sub >= 0)     { sum -= tmp[sub * width + x]; count-- }
    }
  }
  return out
}

// Std-dev of (gray − blurred) over mask pixels: high-frequency energy.
export function residualSigma(gray, blurred, mask, width, height) {
  let sum = 0, sumSq = 0, n = 0
  for (let i = 0; i < width * height; i++) {
    if (!mask[i]) continue
    const d = gray[i] - blurred[i]
    sum += d; sumSq += d * d; n++
  }
  if (n < 2) return 0
  const mean = sum / n
  return Math.sqrt(Math.max(0, sumSq / n - mean * mean))
}

// ─── Concern scores ───────────────────────────────────────────────────────────

// Specular shine: bright + desaturated pixels as a fraction of the region.
export function shinyFraction(img, mask, medianSkinY) {
  const { data, width, height } = img
  const yThresh = Math.min(245, medianSkinY + 45)
  let shiny = 0, n = 0
  for (let i = 0; i < width * height; i++) {
    if (!mask[i]) continue
    const o = i * 4
    const r = data[o], g = data[o + 1], b = data[o + 2]
    if (luma(r, g, b) > yThresh && saturation(r, g, b) < 0.22) shiny++
    n++
  }
  return n ? shiny / n : 0
}

export function scoreOiliness(img, masks) {
  const medianY = maskedMedianLuma(img, masks.skin)
  const forehead = shinyFraction(img, masks.forehead, medianY)
  const nose     = shinyFraction(img, masks.nose, medianY)
  const chin     = shinyFraction(img, masks.chin, medianY)
  const score = v => clamp01(v / 0.18) * 10
  return {
    score: round1(0.5 * score(forehead) + 0.35 * score(nose) + 0.15 * score(chin)),
    raw: { forehead: round1(forehead * 100), nose: round1(nose * 100), chin: round1(chin * 100), medianY },
  }
}

// Redness: CIELAB a* elevation of nose wings / cheeks vs whole-face skin.
export function scoreRedness(img, masks) {
  const base = maskedLabMean(img, masks.skin)
  const wings = maskedLabMean(img, masks.noseWings)
  const cheeks = maskedLabMean(img, masks.cheeks)
  const dWings = wings.n ? wings.a - base.a : 0
  const dCheeks = cheeks.n ? cheeks.a - base.a : 0
  const score = d => clamp01((d - 1.5) / 7) * 10
  return {
    score: round1(Math.max(score(dWings), 0.8 * score(dCheeks))),
    raw: { dAWings: round1(dWings), dACheeks: round1(dCheeks), baseA: round1(base.a) },
  }
}

// Dark circles: under-eye darker (lower L*) than upper-cheek skin,
// with a bluish cast (lower b*) adding confidence.
export function scoreDarkCircles(img, masks, width, height) {
  const cheekBand = maskTopBand(masks.cheeks, width, height, 0.5)
  const cheek = maskedLabMean(img, cheekBand)
  const under = maskedLabMean(img, masks.underEyes)
  if (!cheek.n || !under.n) return { score: 0, raw: { dL: 0, dB: 0 } }
  const dL = cheek.L - under.L
  const dB = under.b - cheek.b
  let score = clamp01((dL - 3) / 11) * 10
  if (dB < -2) score = Math.min(10, score + 1)
  return { score: round1(score), raw: { dL: round1(dL), dB: round1(dB) } }
}

// Pores + texture: high-frequency residual sigma, blur radius scaled by face
// size (inter-ocular distance) so scores are resolution-independent.
export function scorePoresAndTexture(img, masks, iod) {
  const { width, height } = img
  const gray = toGrayscale(img)
  const scale = Math.max(0.25, iod / 320) // 320px between eye corners = reference
  const rFine   = Math.max(1, Math.round(4 * scale))
  const rCoarse = Math.max(2, Math.round(8 * scale))

  const blurFine = boxBlur(gray, width, height, rFine)
  const poresMask = orMasks(masks.cheeks, masks.nose)
  const sigmaFine = residualSigma(gray, blurFine, poresMask, width, height)

  const blurCoarse = boxBlur(gray, width, height, rCoarse)
  const textureMask = orMasks(masks.cheeks, masks.forehead)
  const sigmaCoarse = residualSigma(gray, blurCoarse, textureMask, width, height)

  return {
    pores:   { score: round1(clamp01((sigmaFine - 2.0) / 7) * 10), raw: { sigma: round1(sigmaFine), radius: rFine } },
    texture: { score: round1(clamp01((sigmaCoarse - 2.5) / 8) * 10), raw: { sigma: round1(sigmaCoarse), radius: rCoarse } },
  }
}

export function orMasks(a, b) {
  const out = new Uint8Array(a.length)
  for (let i = 0; i < a.length; i++) out[i] = a[i] | b[i]
  return out
}

// ─── Entry point ──────────────────────────────────────────────────────────────

// masks: { skin, forehead, nose, noseWings, underEyes, cheeks, chin }
// iod: inter-ocular distance in pixels.
// Returns { pores, oiliness, redness, darkCircles, texture } as {score, raw};
// blemishes has no reliable heuristic and is AI-only.
export function analyzeSkin(img, masks, iod) {
  const oiliness = scoreOiliness(img, masks)
  const redness = scoreRedness(img, masks)
  const darkCircles = scoreDarkCircles(img, masks, img.width, img.height)
  const { pores, texture } = scorePoresAndTexture(img, masks, iod)
  return { pores, oiliness, redness, darkCircles, texture }
}
