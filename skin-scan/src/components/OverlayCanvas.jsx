import { useEffect, useRef, useState } from 'react'
import { blobToImage } from '../lib/image'
import { drawOverlays, drawRegionDebug } from '../lib/overlay'

export default function OverlayCanvas({ photoBlob, landmarks, concerns, enabled, debug = false }) {
  const canvasRef = useRef(null)
  const [img, setImg] = useState(null)

  useEffect(() => {
    let alive = true
    blobToImage(photoBlob).then(image => { if (alive) setImg(image) })
    return () => { alive = false }
  }, [photoBlob])

  useEffect(() => {
    if (!img || !canvasRef.current) return
    const canvas = canvasRef.current
    const W = img.naturalWidth, H = img.naturalHeight
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W
      canvas.height = H
    }
    const ctx = canvas.getContext('2d')
    drawOverlays(ctx, img, landmarks, concerns, enabled, W, H)
    if (debug && landmarks) drawRegionDebug(ctx, landmarks, W, H)
  }, [img, landmarks, concerns, enabled, debug])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', display: 'block', borderRadius: 16 }}
    />
  )
}
