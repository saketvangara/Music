import { useRef, useEffect, useState, useCallback } from 'react'
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import { boneColor, jointColor } from '../utils/landmarks'

// ─── Constants ────────────────────────────────────────────────────────────────

// WASM served from public/wasm/ (copied from node_modules by the Vite plugin).
// This guarantees the served binary always matches the installed JS runtime.
const WASM_PATH = '/wasm'

const MODEL_ASSET_PATH =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

// EMA smoothing: 0 = keep all previous (max lag), 1 = no smoothing (raw)
const EMA_ALPHA = 0.5

// ─── MediaPipe factory (GPU → CPU fallback) ───────────────────────────────────

// Try GPU delegate first so we get hardware acceleration where available.
// Fall back to CPU for Firefox (no WebGL2 compute), older Android WebViews,
// and any environment that refuses the GPU delegate.
async function createLandmarker(vision) {
  const shared = {
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  }
  for (const delegate of ['GPU', 'CPU']) {
    try {
      return await PoseLandmarker.createFromOptions(vision, {
        ...shared,
        baseOptions: { modelAssetPath: MODEL_ASSET_PATH, delegate },
      })
    } catch (e) {
      if (delegate === 'CPU') throw e   // both failed — surface the error
      console.warn(`GPU delegate failed (${e.message}); retrying with CPU`)
    }
  }
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function getDisplayRect(videoW, videoH, containerW, containerH) {
  const videoAR     = videoW / videoH
  const containerAR = containerW / containerH
  let displayW, displayH, offsetX, offsetY

  if (videoAR > containerAR) {
    // Video wider than container → scale to height, crop sides
    displayH = containerH
    displayW = videoW * (containerH / videoH)
    offsetX  = (containerW - displayW) / 2   // negative = content extends past edge
    offsetY  = 0
  } else {
    // Video taller than container → scale to width, crop top/bottom
    displayW = containerW
    displayH = videoH * (containerW / videoW)
    offsetX  = 0
    offsetY  = (containerH - displayH) / 2
  }
  return { displayW, displayH, offsetX, offsetY }
}

function drawPose(ctx, landmarks, video, containerW, containerH, dpr, isMirrored) {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) return

  const { displayW, displayH, offsetX, offsetY } =
    getDisplayRect(vw, vh, containerW, containerH)

  // Map normalized landmark [0, 1] → canvas buffer pixel
  const px = (lm) => (lm.x * displayW + offsetX) * dpr
  const py = (lm) => (lm.y * displayH + offsetY) * dpr

  ctx.save()
  ctx.lineCap  = 'round'
  ctx.lineJoin = 'round'

  if (isMirrored) {
    // Mirror the canvas draw to match the CSS scaleX(-1) on the video element
    ctx.translate(containerW * dpr, 0)
    ctx.scale(-1, 1)
  }

  // Bones
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

  // Joints
  for (let i = 0; i < landmarks.length; i++) {
    const lm  = landmarks[i]
    const vis = lm.visibility ?? 1
    if (vis < 0.2) continue
    ctx.globalAlpha = 0.45 + 0.55 * vis
    ctx.fillStyle   = jointColor(i)
    ctx.beginPath()
    ctx.arc(px(lm), py(lm), 4.5 * dpr, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
  ctx.globalAlpha = 1
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CameraStage({ exercise, onBack }) {
  const videoRef      = useRef(null)
  const canvasRef     = useRef(null)
  const containerRef  = useRef(null)
  const landmarkerRef = useRef(null)
  const smoothedRef   = useRef(null)
  const streamRef     = useRef(null)
  const animRef       = useRef(null)        // rAF token (fallback path)
  const lastVTRef     = useRef(-1)          // last processed video.currentTime

  // fps counter: reset at render-loop start so model-load time doesn't inflate it
  const fpsRef = useRef({ count: 0, lastMs: 0 })

  const [facing,      setFacing]      = useState('user')
  const [fps,         setFps]         = useState(0)
  const [modelStatus, setModelStatus] = useState('loading') // loading|ready|error
  const [camStatus,   setCamStatus]   = useState('pending') // pending|active|denied
  const [errMsg,      setErrMsg]      = useState('')
  const [debugOpen,   setDebugOpen]   = useState(false)

  const isMirrored = facing === 'user'

  // ── 1. MediaPipe init ──────────────────────────────────────────────────────
  // On unmount (including React StrictMode's intentional double-mount), close
  // any PoseLandmarker that was created so GPU/WASM memory is released.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let lm = null
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_PATH)
        lm = await createLandmarker(vision)
        if (cancelled) { lm.close(); return }    // StrictMode remount: discard
        landmarkerRef.current = lm
        setModelStatus('ready')
      } catch (err) {
        if (!cancelled) {
          setModelStatus('error')
          setErrMsg('Pose model failed to load: ' + err.message)
        }
      }
    })()

    return () => {
      cancelled = true
      // Close the active landmarker on real unmount (route change, etc.)
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
          video: {
            facingMode,
            width:  { ideal: 1280 },
            height: { ideal: 720  },
          },
          audio: false,
        })

        if (!active) { stream.getTracks().forEach(t => t.stop()); return }

        streamRef.current = stream
        const video = videoRef.current
        if (!video) return

        video.srcObject = stream

        // Wait for metadata so video.videoWidth/Height are valid before play().
        // Calling play() before loadedmetadata can fail on some iOS versions.
        if (video.readyState < 1) {
          await new Promise((res, rej) => {
            video.addEventListener('loadedmetadata', res, { once: true })
            video.addEventListener('error',          rej, { once: true })
          })
        }

        // play() can be silently rejected on some platforms even with autoPlay +
        // muted + playsInline. Log it but don't surface it as a hard error —
        // the browser may still start playback via the autoPlay attribute.
        await video.play().catch(e =>
          console.warn('video.play() rejected (autoplay may still work):', e.name),
        )

        if (active) setCamStatus('active')
      } catch (err) {
        if (!active) return
        setCamStatus('denied')
        setErrMsg(
          err.name === 'NotAllowedError'
            ? 'Camera permission denied — allow access and reload.'
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

  // ── 3. Render loop ─────────────────────────────────────────────────────────
  // Uses requestVideoFrameCallback (fires exactly once per rendered video frame)
  // with requestAnimationFrame as a fallback for browsers that don't support it.
  // rVFC avoids the double-processing at 120 Hz that pure rAF causes, and fires
  // at the correct cadence even when the video runs below the display refresh rate.
  useEffect(() => {
    if (modelStatus !== 'ready') return
    let running  = true
    let rvfcToken = null   // current rVFC registration token

    // Reset FPS counter so model-load time doesn't skew the first reading
    fpsRef.current = { count: 0, lastMs: performance.now() }

    const supportsRVFC = 'requestVideoFrameCallback' in HTMLVideoElement.prototype

    function scheduleNext() {
      if (!running) return
      const video = videoRef.current
      if (supportsRVFC && video) {
        rvfcToken = video.requestVideoFrameCallback(processFrame)
      } else {
        animRef.current = requestAnimationFrame(processFrame)
      }
    }

    // `now` is a DOMHighResTimeStamp provided by both rVFC and rAF callbacks.
    // It's used directly as the MediaPipe detectForVideo timestamp.
    function processFrame(now) {
      if (!running) return

      const video     = videoRef.current
      const canvas    = canvasRef.current
      const container = containerRef.current

      if (!video || !canvas || !container || !landmarkerRef.current) {
        scheduleNext(); return
      }
      if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
        scheduleNext(); return
      }

      // rAF fallback: skip frames the video hasn't advanced (rVFC already
      // guarantees a new frame, so this guard is only needed in the fallback path)
      if (!supportsRVFC) {
        if (video.currentTime === lastVTRef.current) { scheduleNext(); return }
        lastVTRef.current = video.currentTime
      }

      // ── Sync canvas to container (DPR-aware) ───────────────────────
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

      // ── Pose detection ─────────────────────────────────────────────
      let results
      try {
        // `now` from rVFC/rAF is monotonically increasing, satisfying MediaPipe's
        // requirement that VIDEO-mode timestamps always go forward.
        results = landmarkerRef.current.detectForVideo(video, now)
      } catch { scheduleNext(); return }

      // ── EMA smoothing ──────────────────────────────────────────────
      let smoothed = null
      if (results.landmarks.length > 0) {
        const raw  = results.landmarks[0]
        const prev = smoothedRef.current
        smoothedRef.current = (!prev || prev.length !== raw.length)
          ? raw.slice()
          : raw.map((lm, i) => ({
              ...lm,
              x: EMA_ALPHA * lm.x + (1 - EMA_ALPHA) * prev[i].x,
              y: EMA_ALPHA * lm.y + (1 - EMA_ALPHA) * prev[i].y,
              z: EMA_ALPHA * lm.z + (1 - EMA_ALPHA) * prev[i].z,
            }))
        smoothed = smoothedRef.current
      } else {
        smoothedRef.current = null
      }

      // ── Draw ───────────────────────────────────────────────────────
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, bufW, bufH)
      if (smoothed) drawPose(ctx, smoothed, video, cw, ch, dpr, isMirrored)

      // ── FPS counter ────────────────────────────────────────────────
      const f       = fpsRef.current
      f.count++
      const elapsed = now - f.lastMs
      if (elapsed >= 800) {
        setFps(Math.round((f.count * 1000) / elapsed))
        f.count  = 0
        f.lastMs = now
      }

      scheduleNext()
    }

    scheduleNext() // kick off

    return () => {
      running = false
      cancelAnimationFrame(animRef.current)
      // Cancel any pending rVFC registration so it doesn't fire after cleanup
      if (rvfcToken != null && videoRef.current) {
        videoRef.current.cancelVideoFrameCallback(rvfcToken)
        rvfcToken = null
      }
    }
  }, [modelStatus, isMirrored])

  const flipCamera = useCallback(() => {
    setFacing(f => (f === 'user' ? 'environment' : 'user'))
  }, [])

  const showOverlay    = modelStatus === 'loading' || modelStatus === 'error' || camStatus === 'denied'
  const overlayIsError = modelStatus === 'error' || camStatus === 'denied'

  return (
    // position:fixed + inset:0 fills the visual viewport on every browser,
    // including Safari where 100dvh can clip or 100vh includes the address bar.
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
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
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
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
        top: 0, left: 0, right: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        gap: 8,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)',
      }}>
        {onBack && (
          <button onClick={onBack} style={styles.hudBtn}>← Back</button>
        )}

        {exercise && (
          <div style={{ flex: 1, textAlign: 'center', color: '#fff', fontSize: 14, fontWeight: 600 }}>
            {exercise.name}
          </div>
        )}

        <div style={{ flex: onBack ? 0 : 1 }} />

        <span style={{
          color: fps > 20 ? 'rgba(255,255,255,0.55)' : '#f87171',
          fontSize: 12,
          fontFamily: 'monospace',
          minWidth: 48,
          textAlign: 'right',
        }}>
          {fps} fps
        </span>
      </div>

      {/* ── Bottom controls ────────────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        bottom: 24, right: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        alignItems: 'center',
      }}>
        <button onClick={flipCamera} style={styles.roundBtn} title="Flip camera" aria-label="Flip camera">
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
      {exercise && <ViewBanner view={exercise.cameraView} />}

      {/* ── Debug panel ────────────────────────────────────────────── */}
      {debugOpen && (
        <DebugPanel fps={fps} smoothedLandmarks={smoothedRef.current} exercise={exercise} />
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
    '45':  'FILM AT 45° · full body in frame',
  }
  return (
    <div style={{
      position: 'absolute',
      bottom: 24, left: 20, right: 90,
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
      {messages[view] ?? `Camera: ${view}`}
    </div>
  )
}

function DebugPanel({ fps, smoothedLandmarks, exercise }) {
  const count  = smoothedLandmarks?.length ?? 0
  const avgVis = smoothedLandmarks
    ? (smoothedLandmarks.reduce((s, l) => s + (l.visibility ?? 0), 0) / count).toFixed(2)
    : '—'

  return (
    <div style={{
      position: 'absolute',
      top: 60, left: 12,
      background: 'rgba(0,0,0,0.75)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: 8,
      padding: '10px 14px',
      color: '#e2e8f0',
      fontSize: 12,
      fontFamily: 'monospace',
      lineHeight: 1.7,
      backdropFilter: 'blur(6px)',
      minWidth: 180, maxWidth: 260,
    }}>
      <div style={{ color: '#94a3b8', marginBottom: 4, fontWeight: 700, fontSize: 11 }}>
        DEBUG — Phase 1
      </div>
      <div>fps: <Val>{fps}</Val></div>
      <div>landmarks: <Val>{count}</Val></div>
      <div>avg vis: <Val>{avgVis}</Val></div>
      <div>smoothing α: <Val>{EMA_ALPHA}</Val></div>
      <div>rVFC: <Val>{'requestVideoFrameCallback' in HTMLVideoElement.prototype ? '✓' : '✗ rAF'}</Val></div>
      {exercise && <div>exercise: <Val color="#fbbf24">{exercise.id}</Val></div>}
      {smoothedLandmarks && (
        <div style={{ marginTop: 6, color: '#94a3b8', fontSize: 11 }}>
          hip: ({smoothedLandmarks[23]?.x.toFixed(3)}, {smoothedLandmarks[23]?.y.toFixed(3)})
        </div>
      )}
    </div>
  )
}

function Val({ children, color = '#34d399' }) {
  return <span style={{ color }}>{children}</span>
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
    width: 52, height: 52,
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
