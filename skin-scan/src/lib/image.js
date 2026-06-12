// Canvas/image helpers. The <video> preview is mirrored only via CSS, so
// drawImage(video) yields the un-mirrored frame; we flip once here so the
// captured photo matches what the user saw — and all analysis/overlay
// coordinates then refer to that same flipped image.

export function captureFrame(video, { mirror = true } = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  if (mirror) {
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(video, 0, 0)
  return canvas
}

export function downscale(source, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height))
  if (scale === 1 && source instanceof HTMLCanvasElement) return source
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(source.width * scale)
  canvas.height = Math.round(source.height * scale)
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

export function canvasToBlob(canvas, quality = 0.8) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      'image/jpeg',
      quality,
    )
  })
}

export function canvasToBase64Jpeg(canvas, quality = 0.8) {
  return canvas.toDataURL('image/jpeg', quality).split(',')[1]
}

export function blobToImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = e => { URL.revokeObjectURL(url); reject(e) }
    img.src = url
  })
}
