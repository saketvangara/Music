import { useRef, useEffect, useState, useCallback } from 'react'
import { createFaceLandmarker } from '../lib/landmarker'
import { captureFrame } from '../lib/image'
import FaceOvalGuide from '../components/FaceOvalGuide'
import Spinner from '../components/Spinner'

// Guide ellipse geometry — must match FaceOvalGuide's SVG.
const OVAL = { cx: 0.5, cy: 0.44, rx: 0.31, ry: 0.26 }

// Face-mesh gating runs on every Nth video frame: the mesh is heavier than
// pose-lite and we only need go/no-go, not smooth tracking.
const DETECT_EVERY = 4

function getDisplayRect(videoW, videoH, containerW, containerH) {
  const videoAR = videoW / videoH
  const containerAR = containerW / containerH
  let displayW, displayH, offsetX, offsetY
  if (videoAR > containerAR) {
    displayH = containerH
    displayW = videoW * (containerH / videoH)
    offsetX = (containerW - displayW) / 2
    offsetY = 0
  } else {
    displayW = containerW
    displayH = videoH * (containerW / videoW)
    offsetX = 0
    offsetY = (containerH - displayH) / 2
  }
  return { displayW, displayH, offsetX, offsetY }
}

export default function CaptureScreen({ onCaptured }) {
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const landmarkerRef = useRef(null)
  const streamRef = useRef(null)
  const frameCountRef = useRef(0)
  const brightCanvasRef = useRef(null)

  const [facing, setFacing] = useState('user')
  const [modelStatus, setModelStatus] = useState('loading') // loading|ready|error
  const [camStatus, setCamStatus] = useState('pending')     // pending|active|denied
  const [errMsg, setErrMsg] = useState('')
  const [gate, setGate] = useState({ ok: false, hint: 'Position your face in the oval' })

  const isMirrored = facing === 'user'

  // ── 1. Face landmarker init (VIDEO mode for live gating) ──────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const lm = await createFaceLandmarker('VIDEO')
        if (cancelled) { lm.close(); return } // StrictMode remount: discard
        landmarkerRef.current = lm
        setModelStatus('ready')
      } catch (err) {
        if (!cancelled) {
          setModelStatus('error')
          setErrMsg('Face model failed to load: ' + err.message)
        }
      }
    })()
    return () => {
      cancelled = true
      if (landmarkerRef.current) {
        landmarkerRef.current.close()
        landmarkerRef.current = null
      }
    }
  }, [])

  // ── 2. Camera stream ───────────────────────────────────────────────────────
  useEffect(() => {
    let active = true
    async function startStream(facingMode) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        if (!active) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        // Wait for metadata so videoWidth/Height are valid before play() —
        // calling play() earlier can fail on some iOS versions.
        if (video.readyState < 1) {
          await new Promise((res, rej) => {
            video.addEventListener('loadedmetadata', res, { once: true })
            video.addEventListener('error', rej, { once: true })
          })
        }
        // play() can be silently rejected even with autoPlay+muted+playsInline;
        // the autoPlay attribute may still start playback.
        await video.play().catch(e =>
          console.warn('video.play() rejected (autoplay may still work):', e.name))
        if (active) setCamStatus('active')
      } catch (err) {
        if (!active) return
        setCamStatus('denied')
        setErrMsg(err.name === 'NotAllowedError'
          ? 'Camera permission denied — allow access and reload.'
          : 'Camera unavailable: ' + err.message)
      }
    }
    startStream(facing)
    return () => {
      active = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
    }
  }, [facing])

  // ── 3. Gating loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (modelStatus !== 'ready' || camStatus !== 'active') return
    let running = true
    let rvfcToken = null
    let rafToken = null
    const supportsRVFC = 'requestVideoFrameCallback' in HTMLVideoElement.prototype

    function scheduleNext() {
      if (!running) return
      const video = videoRef.current
      if (supportsRVFC && video) rvfcToken = video.requestVideoFrameCallback(processFrame)
      else rafToken = requestAnimationFrame(processFrame)
    }

    function meanBrightness(video) {
      if (!brightCanvasRef.current) {
        brightCanvasRef.current = document.createElement('canvas')
        brightCanvasRef.current.width = 32
        brightCanvasRef.current.height = 32
      }
      const c = brightCanvasRef.current
      const ctx = c.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(video, 0, 0, 32, 32)
      const d = ctx.getImageData(0, 0, 32, 32).data
      let sum = 0
      for (let i = 0; i < d.length; i += 4) {
        sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
      }
      return sum / (d.length / 4)
    }

    function processFrame(now) {
      if (!running) return
      const video = videoRef.current
      const container = containerRef.current
      if (!video || !container || !landmarkerRef.current ||
          video.readyState < 2 || !video.videoWidth) {
        scheduleNext(); return
      }
      if (frameCountRef.current++ % DETECT_EVERY !== 0) { scheduleNext(); return }

      let results
      try {
        results = landmarkerRef.current.detectForVideo(video, now)
      } catch { scheduleNext(); return }

      const lms = results.faceLandmarks?.[0]
      if (!lms) {
        setGate({ ok: false, hint: 'Position your face in the oval' })
        scheduleNext(); return
      }

      // Map face center/width from normalized video coords → container coords
      const cw = container.clientWidth, ch = container.clientHeight
      const { displayW, displayH, offsetX, offsetY } =
        getDisplayRect(video.videoWidth, video.videoHeight, cw, ch)
      const toX = lm => {
        const x = lm.x * displayW + offsetX
        return isMirrored ? cw - x : x
      }
      const toY = lm => lm.y * displayH + offsetY

      // Cheek-to-cheek width and face center (landmarks 234/454 = oval sides)
      const faceW = Math.abs(toX(lms[454]) - toX(lms[234]))
      const cx = (toX(lms[454]) + toX(lms[234])) / 2
      const cy = (toY(lms[10]) + toY(lms[152])) / 2 // forehead top ↔ chin

      const ovalCx = OVAL.cx * cw, ovalCy = OVAL.cy * ch
      const ovalRx = OVAL.rx * cw, ovalRy = OVAL.ry * ch
      const inOval = ((cx - ovalCx) / ovalRx) ** 2 + ((cy - ovalCy) / ovalRy) ** 2 < 0.35
      const sizeRatio = faceW / (2 * ovalRx)

      let ok = false, hint
      const brightness = meanBrightness(video)
      if (brightness < 50) hint = 'Too dark — find brighter light'
      else if (sizeRatio < 0.45) hint = 'Move closer'
      else if (sizeRatio > 1.05) hint = 'Move back a little'
      else if (!inOval) hint = 'Center your face in the oval'
      else { ok = true; hint = 'Hold still — tap the button' }

      setGate(prev => (prev.ok === ok && prev.hint === hint ? prev : { ok, hint }))
      scheduleNext()
    }

    scheduleNext()
    return () => {
      running = false
      if (rafToken != null) cancelAnimationFrame(rafToken)
      if (rvfcToken != null && videoRef.current) {
        videoRef.current.cancelVideoFrameCallback(rvfcToken)
      }
    }
  }, [modelStatus, camStatus, isMirrored])

  // ── Shutter ────────────────────────────────────────────────────────────────
  const handleShutter = useCallback(() => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    // Mirror the captured frame for front camera so the photo matches the
    // preview the user lined up with; analysis coordinates then match too.
    const canvas = captureFrame(video, { mirror: isMirrored })
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    onCaptured(canvas)
  }, [isMirrored, onCaptured])

  const showOverlay = modelStatus === 'loading' || modelStatus === 'error' || camStatus === 'denied'
  const overlayIsError = modelStatus === 'error' || camStatus === 'denied'

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#0a0a0a' }}>
      <video
        ref={videoRef}
        autoPlay playsInline muted
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover',
          transform: isMirrored ? 'scaleX(-1)' : 'none',
        }}
      />

      {!showOverlay && <FaceOvalGuide ok={gate.ok} hint={gate.hint} />}

      {showOverlay && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 10,
          background: 'rgba(0,0,0,0.72)',
          color: overlayIsError ? '#f87171' : '#fff',
          fontSize: 15, textAlign: 'center', padding: '0 36px',
        }}>
          {modelStatus === 'loading' && !overlayIsError && (
            <>
              <Spinner />
              <div>Loading face model…</div>
              <div style={{ fontSize: 12, opacity: 0.55 }}>~4 MB one-time download, then cached</div>
            </>
          )}
          {overlayIsError && <div>{errMsg}</div>}
        </div>
      )}

      {/* Title */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '14px 16px', textAlign: 'center',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)',
        color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: '0.02em',
      }}>
        SkinScan
        <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.6, marginTop: 2 }}>
          Scan in the same light each time for reliable trends
        </div>
      </div>

      {/* Shutter + flip */}
      {!showOverlay && (
        <div style={{
          position: 'absolute', bottom: 26, left: 0, right: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <button
            onClick={handleShutter}
            disabled={!gate.ok}
            aria-label="Take selfie"
            style={{
              width: 74, height: 74, borderRadius: '50%',
              border: `4px solid ${gate.ok ? '#34d399' : 'rgba(255,255,255,0.4)'}`,
              background: gate.ok ? '#fff' : 'rgba(255,255,255,0.25)',
              transition: 'all 0.2s',
            }}
          />
          <button
            onClick={() => setFacing(f => (f === 'user' ? 'environment' : 'user'))}
            aria-label="Flip camera"
            style={{
              position: 'absolute', right: 24,
              width: 48, height: 48, borderRadius: '50%',
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', fontSize: 20,
            }}
          >
            ⇄
          </button>
        </div>
      )}
    </div>
  )
}
