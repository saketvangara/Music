// Face-region polygons from MediaPipe FaceLandmarker's canonical 468-point
// mesh, plus mask rasterization. Index loops are ordered; left/right pairs
// use the mesh's standard symmetric correspondences.

export const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379,
  378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
  162, 21, 54, 103, 67, 109,
]

// Excluded from the "skin" baseline (dilated so lashes/brow/lip edges
// don't bleed into skin statistics).
const EYE_L  = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7]
const EYE_R  = [263, 466, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390, 249]
const BROW_L = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46]
const BROW_R = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276]
const LIPS   = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146]

export const REGION_DEFS = {
  forehead: {
    indices: [21, 54, 103, 67, 109, 10, 338, 297, 332, 284, 251, 301, 293,
              334, 296, 336, 9, 107, 105, 63, 71],
    concerns: ['oiliness', 'texture'],
  },
  nose: {
    indices: [6, 351, 412, 343, 437, 420, 360, 344, 438, 309, 250, 462, 370,
              94, 141, 242, 20, 79, 218, 115, 131, 198, 217, 114, 188, 122],
    concerns: ['oiliness', 'pores'],
  },
  // Alar base + nasolabial area, where redness concentrates.
  noseWingL: { indices: [129, 49, 64, 98, 165, 206, 203, 36],   concerns: ['redness'] },
  noseWingR: { indices: [358, 279, 294, 327, 391, 426, 423, 266], concerns: ['redness'] },
  // Infraorbital band: the arc just under the lower lid down to cheek top.
  underEyeL: {
    indices: [31, 228, 229, 230, 231, 232, 233, 244, 128, 121, 120, 119, 118, 117, 111, 35],
    concerns: ['darkCircles'],
  },
  underEyeR: {
    indices: [261, 448, 449, 450, 451, 452, 453, 464, 357, 350, 349, 348, 347, 346, 340, 265],
    concerns: ['darkCircles'],
  },
  cheekL: {
    indices: [116, 117, 118, 119, 120, 100, 142, 36, 205, 187, 147, 123],
    concerns: ['pores', 'texture', 'redness'],
  },
  cheekR: {
    indices: [345, 346, 347, 348, 349, 329, 371, 266, 425, 411, 376, 352],
    concerns: ['pores', 'texture', 'redness'],
  },
  chin: {
    indices: [83, 18, 313, 406, 418, 262, 369, 400, 377, 152, 148, 176, 140, 32, 194],
    concerns: ['oiliness', 'blemishes'],
  },
}

// ─── Geometry helpers ─────────────────────────────────────────────────────────

export function toPoints(landmarks, indices, W, H) {
  return indices.map(i => ({ x: landmarks[i].x * W, y: landmarks[i].y * H }))
}

export function dilatePolygon(points, factor) {
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length
  return points.map(p => ({ x: cx + (p.x - cx) * factor, y: cy + (p.y - cy) * factor }))
}

function shiftPolygon(points, dx, dy) {
  return points.map(p => ({ x: p.x + dx, y: p.y + dy }))
}

export function interOcularDistance(landmarks, W, H) {
  const a = landmarks[33], b = landmarks[263] // eye outer corners
  return Math.hypot((a.x - b.x) * W, (a.y - b.y) * H)
}

// All region polygons in pixel space. Under-eye bands are nudged downward
// so lash/lid shadow doesn't pollute the dark-circle measurement.
export function getRegionPolygons(landmarks, W, H) {
  const polys = {}
  for (const [name, def] of Object.entries(REGION_DEFS)) {
    polys[name] = toPoints(landmarks, def.indices, W, H)
  }
  const eyeWidthL = Math.hypot(
    (landmarks[33].x - landmarks[133].x) * W,
    (landmarks[33].y - landmarks[133].y) * H,
  )
  const eyeWidthR = Math.hypot(
    (landmarks[263].x - landmarks[362].x) * W,
    (landmarks[263].y - landmarks[362].y) * H,
  )
  polys.underEyeL = shiftPolygon(polys.underEyeL, 0, eyeWidthL * 0.12)
  polys.underEyeR = shiftPolygon(polys.underEyeR, 0, eyeWidthR * 0.12)
  return polys
}

// ─── Mask rasterization (browser only — uses canvas) ─────────────────────────

function fillPolys(ctx, polys) {
  for (const pts of polys) {
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.closePath()
    ctx.fill()
  }
}

// Rasterize polygons (minus optional holes) to a Uint8Array of 0/1, W*H.
export function rasterizeMask(W, H, polys, holes = []) {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.fillStyle = '#fff'
  fillPolys(ctx, polys)
  if (holes.length) {
    ctx.globalCompositeOperation = 'destination-out'
    fillPolys(ctx, holes)
  }
  const data = ctx.getImageData(0, 0, W, H).data
  const mask = new Uint8Array(W * H)
  for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] > 127 ? 1 : 0
  return mask
}

// Build every mask the heuristics need, in one place.
export function buildRegionMasks(landmarks, W, H) {
  const polys = getRegionPolygons(landmarks, W, H)
  const oval = toPoints(landmarks, FACE_OVAL, W, H)
  const holes = [
    dilatePolygon(toPoints(landmarks, EYE_L, W, H), 1.6),
    dilatePolygon(toPoints(landmarks, EYE_R, W, H), 1.6),
    dilatePolygon(toPoints(landmarks, BROW_L, W, H), 1.4),
    dilatePolygon(toPoints(landmarks, BROW_R, W, H), 1.4),
    dilatePolygon(toPoints(landmarks, LIPS, W, H), 1.3),
  ]
  return {
    skin:      rasterizeMask(W, H, [oval], holes),
    forehead:  rasterizeMask(W, H, [polys.forehead]),
    nose:      rasterizeMask(W, H, [polys.nose]),
    noseWings: rasterizeMask(W, H, [polys.noseWingL, polys.noseWingR]),
    underEyes: rasterizeMask(W, H, [polys.underEyeL, polys.underEyeR]),
    cheeks:    rasterizeMask(W, H, [polys.cheekL, polys.cheekR]),
    chin:      rasterizeMask(W, H, [polys.chin]),
  }
}
