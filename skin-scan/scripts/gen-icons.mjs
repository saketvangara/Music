// One-shot generator for the PWA icons (no image deps — writes PNG directly).
// Run: node scripts/gen-icons.mjs

import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'

function crc32(buf) {
  let c, table = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  let crc = 0xffffffff
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function writePng(path, size, paint) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // no filter
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = paint(x, y, size)
      const o = y * (size * 4 + 1) + 1 + x * 4
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6 // 8-bit RGBA
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
  writeFileSync(path, png)
  console.log(`wrote ${path} (${png.length} bytes)`)
}

// Face silhouette in a soft purple circle, scan-line accent.
function paint(x, y, size) {
  const cx = size / 2, cy = size / 2
  const d = Math.hypot(x - cx, y - cy)
  // background
  if (d > size * 0.48) return [15, 15, 18, 255]
  // outer circle
  if (d > size * 0.44) return [109, 92, 255, 255]
  // face oval (slightly above center)
  const fx = (x - cx) / (size * 0.22)
  const fy = (y - cy * 0.94) / (size * 0.28)
  const inFace = fx * fx + fy * fy < 1
  // scan line
  const scanY = Math.abs(y - cy * 1.02) < size * 0.018
  if (inFace && scanY) return [109, 92, 255, 255]
  if (inFace) return [231, 231, 234, 255]
  if (scanY) return [109, 92, 255, 200]
  return [26, 26, 32, 255]
}

mkdirSync('public/icons', { recursive: true })
writePng('public/icons/icon-192.png', 192, paint)
writePng('public/icons/icon-512.png', 512, paint)
