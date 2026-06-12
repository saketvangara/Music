// Draws concern highlights over the captured photo. Flat tinted polygons for
// most concerns; oiliness gets a per-pixel shine highlight, which reads better.

import { CONCERNS } from './products.js'
import { getRegionPolygons } from './regions.js'
import { luma } from './heuristics.js'

// Map region tags (used in concern.regions) to polygon names.
const REGION_TAG_TO_POLYS = {
  forehead:  ['forehead'],
  nose:      ['nose'],
  noseWings: ['noseWingL', 'noseWingR'],
  underEyes: ['underEyeL', 'underEyeR'],
  cheeks:    ['cheekL', 'cheekR'],
  chin:      ['chin'],
}

function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

function tracePath(ctx, pts) {
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
  ctx.closePath()
}

function fillRegion(ctx, pts, color, severity) {
  const alpha = 0.10 + 0.035 * severity // severity 10 → 0.45
  ctx.save()
  tracePath(ctx, pts)
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  ctx.fill()
  ctx.globalAlpha = Math.min(0.8, alpha + 0.3)
  ctx.lineWidth = 2
  ctx.strokeStyle = color
  ctx.stroke()
  ctx.restore()
}

// Paint only the actual shiny pixels inside the T-zone polygons.
function fillShinePixels(ctx, imgData, polys, color, W, H) {
  const mask = document.createElement('canvas')
  mask.width = W; mask.height = H
  const mctx = mask.getContext('2d', { willReadFrequently: true })
  mctx.fillStyle = '#fff'
  for (const pts of polys) { tracePath(mctx, pts); mctx.fill() }
  const maskData = mctx.getImageData(0, 0, W, H).data

  const [cr, cg, cb] = hexToRgb(color)
  const out = mctx.createImageData(W, H)
  const src = imgData.data
  for (let i = 0; i < W * H; i++) {
    if (maskData[i * 4 + 3] < 128) continue
    const o = i * 4
    const r = src[o], g = src[o + 1], b = src[o + 2]
    const max = Math.max(r, g, b)
    const sat = max === 0 ? 0 : (max - Math.min(r, g, b)) / max
    if (luma(r, g, b) > 200 && sat < 0.25) {
      out.data[o] = cr; out.data[o + 1] = cg; out.data[o + 2] = cb; out.data[o + 3] = 140
    }
  }
  mctx.clearRect(0, 0, W, H)
  mctx.putImageData(out, 0, 0)
  ctx.drawImage(mask, 0, 0)
}

// Redraw photo + overlays for the enabled concern keys.
// photo: CanvasImageSource at W×H; landmarks: normalized [{x,y},...]
// concerns: scan.concerns; enabled: Set of concern keys.
export function drawOverlays(ctx, photo, landmarks, concerns, enabled, W, H) {
  ctx.clearRect(0, 0, W, H)
  ctx.drawImage(photo, 0, 0, W, H)
  if (!landmarks || !enabled.size) return

  const polys = getRegionPolygons(landmarks, W, H)
  let photoData = null

  for (const key of Object.keys(CONCERNS)) {
    if (!enabled.has(key)) continue
    const concern = concerns[key]
    if (!concern || concern.final == null || concern.final < 1) continue
    const color = CONCERNS[key].color

    if (key === 'oiliness') {
      if (!photoData) {
        const tmp = document.createElement('canvas')
        tmp.width = W; tmp.height = H
        const tctx = tmp.getContext('2d', { willReadFrequently: true })
        tctx.drawImage(photo, 0, 0, W, H)
        photoData = tctx.getImageData(0, 0, W, H)
      }
      const tzone = (concern.regions || []).flatMap(tag => REGION_TAG_TO_POLYS[tag] || [])
        .map(name => polys[name]).filter(Boolean)
      if (tzone.length) fillShinePixels(ctx, photoData, tzone, color, W, H)
      continue
    }

    for (const tag of concern.regions || []) {
      for (const name of REGION_TAG_TO_POLYS[tag] || []) {
        if (polys[name]) fillRegion(ctx, polys[name], color, concern.final)
      }
    }
  }
}

// Debug: outline every region polygon (long-press version string in Settings).
export function drawRegionDebug(ctx, landmarks, W, H) {
  const polys = getRegionPolygons(landmarks, W, H)
  ctx.save()
  ctx.font = '10px monospace'
  for (const [name, pts] of Object.entries(polys)) {
    tracePath(ctx, pts)
    ctx.strokeStyle = '#0f0'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = '#0f0'
    ctx.fillText(name, pts[0].x + 2, pts[0].y - 2)
  }
  ctx.restore()
}
