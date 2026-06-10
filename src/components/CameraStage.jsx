import { useRef, useEffect, useState, useCallback } from 'react'
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import { boneColor, jointColor } from '../utils/landmarks'

// ─── Constants ────────────────────────────────────────────────────────────────

const WASM_PATH =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
const MODEL_ASSET_PATH =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

// EMA smoothing: 0 = all previous, 1 = no smoothing
const EMA_ALPHA = 0.5

// ─── Drawing helpers ──────────────────────────────────────────────────────────

/**
 * Compute how the video content maps onto the container under object-fit:cover.
 * Returns the displayed pixel dimensions and the top-left offset (can be negative
 * when content overflows — that's the cropped portion).
 */
function getDisplayRect(videoW, videoH, containerW, containerH) {
  const videoAR = videoW / videoH
  const containerAR = containerW / containerH
  let displayW, displayH, offsetX, offsetY

  if (videoAR > containerAR) {
    // Video wider than container → fit by height, crop sides
    displayH = containerH
    displayW = videoW * (containerH / videoH)
    offsetX = (containerW - displayW) / 2
    offsetY = 0
  } else {
    // Video taller than container → fit by width, crop top/bottom
    displayW = containerW
    displayH = videoH * (containerW / videoW)
    offsetX = 0
    offsetY = (containerH - displayH) / 2
  }
  return { displayW, displayH, offsetX, offsetY }
}

function drawPose(ctx, landmarks, video, containerW, containerH, dpr, isMirrored) {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) return

  const { displayW, displayH, offsetX, offsetY } = getDisplayRect(
    vw, vh, containerW, containerH,
  )

  // Map normalized landmark [0,1] → canvas buffer pixel
  const px = (lm) => (lm.x * displayW + offsetX) * dpr
  const py = (lm) => (lm.y * displayH + offsetY) * dpr

  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (isMirrored) {
    // Mirror to match the CSS-flipped video element
    ctx.translate(containerW * dpr, 0)
    ctx.scale(-1, 1)
  }

  // Draw bones
  ctx.lineWidth = 2.5 * dpr
  for (const conn of PoseLandmarker.POSE_CONNECTIONS) {
    const a = landmarks[conn.start]
    const b = landmarks[conn.end]
    if (!a || !b) continue
    const vis = Math.min(a.visibility ?? 1, b.visibility ?? 1)
    if (vis < 0.2) continue
    ctx.globalAlpha = 0.35 + 0.65 * vis
    ctx.strokeStyle = boneColor(conn.start, conn.end)
    ctx.beginPath()
    ctx.moveTo(px(a), py(a))
    ctx.lineTo(px(b), py(b))
    ctx.stroke()
  }

  // Draw joints
  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i]
    const vis = lm.visibility ?? 1
    if (vis < 0.2) continue
    ctx.globalAlpha = 0.45 + 0.55 * vis
    ctx.fillStyle = jointColor(i)
    ctx.beginPath()
    ctx.arc(px(lm), py(lm), 4.5 * dpr, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
  ctx.globalAlpha = 1
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CameraStage({ exercise, onBack }) {
  const videoRef     = useRef(null)
  const canvasRef    = useRef(null)
  const containerRef = useRef(null)
  const landmarkerRef   = useRef(null)
  const smoothedRef     = useRef(null)
  const streamRef       = useRef(null)
  const animRef         = useRef(null)
  const lastVideoTimeRef = useRef(-1)
  const fpsRef          = useRef({ count: 0, lastMs: 0 })

  const [facing, setFacing]           = useState('user') // 'user' | 'environment'
  const [fps, setFps]                 = useState(0)
  const [modelStatus, setModelStatus] = useState('loading') // loading | ready | error
  const [camStatus, setCamStatus]     = useState('pending') // pending | active | denied
  const [errMsg, setErrMsg]           = useState('')
  const [debugOpen, setDebugOpen]     = useState(false)

  const isMirrored = facing === 'user'

  // ── 1. Initialize MediaPipe ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_PATH)
        const lm = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_ASSET_PATH,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })
        if (!cancelled) {
          landmarkerRef.current = lm
          setModelStatus('ready')
        }
      } catch (err) {
        if (!cancelled) {
          console.error('MediaPipe init error:', err)
          setModelStatus('error')
          setErrMsg('Pose model failed to load: ' + err.message)
        }
      }
    })()
    return () => { cancelled = true }
  }, [])

  // ── 2. Camera stream (re-runs when facing changes) ───────────────────────
  useEffect(() => {
    let active = true

    async function startStream(facingMode) {
      // Stop existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })

        if (!active) {
          stream.getTracks().forEach(t => t.stop())
          return
        }

        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          // play() may reject on mobile if not triggered by user gesture, but
          // the video has muted + autoPlay + playsInline so it normally works.
          await video.play().catch(() => {})
          setCamStatus('active')
        }
      } catch (err) {
        if (!active) return
        console.error('Camera error:', err)
        setCamStatus('denied')
        setErrMsg(
          err.name === 'NotAllowedError'
            ? 'Camera permission denied. Allow camera access and reload.'
            : 'Camera unavailable: ' + err.message,
        )
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

  // ── 3. Render loop ───────────────────────────────────────────────────────
  useEffect(() => {
    if (modelStatus !== 'ready') return
    let running = true

    function loop() {
      if (!running) return
      animRef.current = requestAnimationFrame(loop)

      const video     = videoRef.current
      const canvas    = canvasRef.current
      const container = containerRef.current
      if (!video || !canvas || !container) return
      if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return
      // Only process new frames
      if (video.currentTime === lastVideoTimeRef.current) return
      lastVideoTimeRef.current = video.currentTime

      // Keep canvas buffer matched to container at device pixel ratio
      const cw  = container.clientWidth
      const ch  = container.clientHeight
      const dpr = window.devicePixelRatio || 1
      const bufW = Math.round(cw * dpr)
      const bufH = Math.round(ch * dpr)
      if (canvas.width !== bufW || canvas.height !== bufH) {
        canvas.width  = bufW
        canvas.height = bufH
        canvas.style.width  = cw + 'px'
        canvas.style.height = ch + 'px'
      }

      // ── Pose detection ──
      let results
      try {
        results = landmarkerRef.current.detectForVideo(video, performance.now())
      } catch {
        return
      }

      // ── EMA smoothing ──
      let smoothed = null
      if (results.landmarks.length > 0) {
        const raw  = results.landmarks[0]
        const prev = smoothedRef.current
        if (!prev || prev.length !== raw.length) {
          smoothedRef.current = raw.slice()
        } else {
          smoothedRef.current = raw.map((lm, i) => ({
            ...lm,
            x: EMA_ALPHA * lm.x + (1 - EMA_ALPHA) * prev[i].x,
            y: EMA_ALPHA * lm.y + (1 - EMA_ALPHA) * prev[i].y,
            z: EMA_ALPHA * lm.z + (1 - EMA_ALPHA) * prev[i].z,
          }))
        }
        smoothed = smoothedRef.current
      } else {
        smoothedRef.current = null
      }

      // ── Draw ──
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, bufW, bufH)
      if (smoothed) {
        drawPose(ctx, smoothed, video, cw, ch, dpr, isMirrored)
      }

      // ── FPS counter ──
      const now = performance.now()
      const f   = fpsRef.current
      f.count++
      const elapsed = now - f.lastMs
      if (elapsed >= 800) {
        setFps(Math.round((f.count * 1000) / elapsed))
        f.count  = 0
        f.lastMs = now
      }
    }

    animRef.current = requestAnimationFrame(loop)
    return () => {
      running = false
      cancelAnimationFrame(animRef.current)
    }
  }, [modelStatus, isMirrored])

  const flipCamera = useCallback(() => {
    setFacing(f => (f === 'user' ? 'environment' : 'user'))
  }, [])

  // ── Derived status ───────────────────────────────────────────────────────
  const showOverlay = modelStatus === 'loading' || modelStatus === 'error' || camStatus === 'denied'
  const overlayIsError = modelStatus === 'error' || camStatus === 'denied'

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100vw',
        height: '100dvh',
        overflow: 'hidden',
        background: '#0a0a0a',
        touchAction: 'none',
      }}
    >
      {/* ── Camera feed ────────────────────────────────────────────── */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: isMirrored ? 'scaleX(-1)' : 'none',
        }}
      />

      {/* ── Skeleton overlay ───────────────────────────────────────── */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
        }}
      />

      {/* ── Loading / error overlay ────────────────────────────────── */}
      {showOverlay && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          background: 'rgba(0,0,0,0.72)',
          color: overlayIsError ? '#f87171' : '#fff',
          fontSize: 15,
          textAlign: 'center',
          padding: '0 36px',
        }}>
          {modelStatus === 'loading' && (
            <>
              <Spinner />
              <div>Loading pose model…</div>
              <div style={{ fontSize: 12, opacity: 0.55 }}>
                Downloading ~4 MB — one-time, then cached
              </div>
            </>
          )}
          {overlayIsError && <div>{errMsg}</div>}
        </div>
      )}

      {/* ── Top HUD ────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        gap: 8,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)',
      }}>
        {onBack && (
          <button onClick={onBack} style={styles.hudBtn}>
            ← Back
          </button>
        )}

        {exercise && (
          <div style={{ flex: 1, textAlign: 'center', color: '#fff', fontSize: 14, fontWeight: 600 }}>
            {exercise.name}
          </div>
        )}

        <div style={{ flex: onBack ? 0 : 1 }} />

        <span
          style={{
            color: fps > 20 ? 'rgba(255,255,255,0.55)' : '#f87171',
            fontSize: 12,
            fontFamily: 'monospace',
            minWidth: 48,
            textAlign: 'right',
          }}
        >
          {fps} fps
        </span>
      </div>

      {/* ── Bottom controls ────────────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        right: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        alignItems: 'center',
      }}>
        <button
          onClick={flipCamera}
          style={styles.roundBtn}
          title="Flip camera"
          aria-label="Flip camera"
        >
          ⇄
        </button>

        <button
          onClick={() => setDebugOpen(o => !o)}
          style={{ ...styles.roundBtn, fontSize: 14 }}
          title="Toggle debug panel"
          aria-label="Toggle debug panel"
        >
          {debugOpen ? '✕' : 'DBG'}
        </button>
      </div>

      {/* ── Camera-view banner ─────────────────────────────────────── */}
      {exercise && (
        <ViewBanner view={exercise.cameraView} />
      )}

      {/* ── Debug panel (Phase 1: landmark count + smoothing note) ─── */}
      {debugOpen && (
        <DebugPanel
          fps={fps}
          smoothedLandmarks={smoothedRef.current}
          exercise={exercise}
        />
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{
      width: 36, height: 36,
      border: '3px solid rgba(255,255,255,0.15)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function ViewBanner({ view }) {
  const messages = {
    side:  'FILM FROM THE SIDE · full body in frame',
    front: 'FACE THE CAMERA · full body in frame',
    '45':  'FILM AT 45° ANGLE · full body in frame',
  }
  const msg = messages[view] ?? `Camera: ${view}`
  return (
    <div style={{
      position: 'absolute',
      bottom: 24,
      left: 20,
      right: 90, // leave room for round buttons
      background: 'rgba(0,0,0,0.6)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: 8,
      padding: '6px 12px',
      color: '#fde68a',
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.05em',
      backdropFilter: 'blur(8px)',
      textAlign: 'center',
    }}>
      {msg}
    </div>
  )
}

function DebugPanel({ fps, smoothedLandmarks, exercise }) {
  const lmCount = smoothedLandmarks?.length ?? 0
  const avgVis  = smoothedLandmarks
    ? (smoothedLandmarks.reduce((s, l) => s + (l.visibility ?? 0), 0) / lmCount).toFixed(2)
    : '—'

  return (
    <div style={{
      position: 'absolute',
      top: 60,
      left: 12,
      background: 'rgba(0,0,0,0.75)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: 8,
      padding: '10px 14px',
      color: '#e2e8f0',
      fontSize: 12,
      fontFamily: 'monospace',
      lineHeight: 1.7,
      backdropFilter: 'blur(6px)',
      minWidth: 180,
      maxWidth: 260,
    }}>
      <div style={{ color: '#94a3b8', marginBottom: 4, fontWeight: 700, fontSize: 11 }}>
        DEBUG — Phase 1
      </div>
      <div>fps: <span style={{ color: '#34d399' }}>{fps}</span></div>
      <div>landmarks: <span style={{ color: '#34d399' }}>{lmCount}</span></div>
      <div>avg visibility: <span style={{ color: '#34d399' }}>{avgVis}</span></div>
      <div>smoothing α: <span style={{ color: '#34d399' }}>{EMA_ALPHA}</span></div>
      {exercise && (
        <div>exercise: <span style={{ color: '#fbbf24' }}>{exercise.id}</span></div>
      )}
      {smoothedLandmarks && (
        <div style={{ marginTop: 6, color: '#94a3b8', fontSize: 11 }}>
          hip: ({smoothedLandmarks[23]?.x.toFixed(3)}, {smoothedLandmarks[23]?.y.toFixed(3)})
        </div>
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  hudBtn: {
    background: 'rgba(0,0,0,0.45)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    borderRadius: 8,
    padding: '6px 14px',
    fontSize: 14,
    backdropFilter: 'blur(8px)',
  },
  roundBtn: {
    width: 52,
    height: 52,
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    fontSize: 22,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(8px)',
  },
}
