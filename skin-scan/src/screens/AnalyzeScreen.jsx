import { useEffect, useRef, useState } from 'react'
import { createFaceLandmarker } from '../lib/landmarker'
import { downscale, canvasToBlob, canvasToBase64Jpeg } from '../lib/image'
import { buildRegionMasks, interOcularDistance } from '../lib/regions'
import { analyzeSkin } from '../lib/heuristics'
import { checkLighting } from '../lib/lighting'
import { analyzeWithClaude } from '../lib/claude'
import { mergeResults } from '../lib/merge'
import { putScan } from '../lib/db'
import { getSettings } from '../lib/settings'
import Spinner from '../components/Spinner'

const STEPS = [
  { id: 'detect', label: 'Detecting face' },
  { id: 'measure', label: 'Measuring skin' },
  { id: 'ai', label: 'AI review' },
  { id: 'save', label: 'Saving' },
]

export default function AnalyzeScreen({ capture, onDone, onRetake }) {
  const ranRef = useRef(false)
  const [stepIdx, setStepIdx] = useState(0)
  const [error, setError] = useState(null)     // fatal: no face etc.
  const [aiWarning, setAiWarning] = useState(null) // non-fatal AI failure
  const [previewUrl, setPreviewUrl] = useState(null)

  useEffect(() => {
    if (!capture) return
    const url = downscale(capture, 480).toDataURL('image/jpeg', 0.7)
    setPreviewUrl(url)
  }, [capture])

  useEffect(() => {
    if (!capture || ranRef.current) return
    ranRef.current = true // StrictMode double-mount guard: run the pipeline once
    let landmarker = null

    ;(async () => {
      try {
        // ── 1. Face detection on the still image ─────────────────────
        setStepIdx(0)
        const analysisCanvas = downscale(capture, 1024)
        const W = analysisCanvas.width, H = analysisCanvas.height
        landmarker = await createFaceLandmarker('IMAGE')
        const detection = landmarker.detect(analysisCanvas)
        landmarker.close()
        landmarker = null

        const lms = detection.faceLandmarks?.[0]
        if (!lms) {
          setError("Couldn't find a face in the photo. Try again with your face centered and well lit.")
          return
        }
        // Plain {x,y} copies — re-renders overlays later without re-detecting
        const landmarks = lms.map(lm => ({ x: lm.x, y: lm.y }))

        // ── 2. Region masks + lighting + heuristics ──────────────────
        setStepIdx(1)
        // Yield a frame so the progress UI paints before the heavy loop
        await new Promise(r => setTimeout(r, 30))
        const ctx = analysisCanvas.getContext('2d', { willReadFrequently: true })
        const img = ctx.getImageData(0, 0, W, H)
        const masks = buildRegionMasks(landmarks, W, H)
        const iod = interOcularDistance(landmarks, W, H)
        const noseBridgeX = landmarks[6].x * W
        const lighting = checkLighting(img, masks.skin, noseBridgeX)
        const heuristics = analyzeSkin(img, masks, iod)

        // ── 3. Optional AI review (non-fatal on failure) ─────────────
        const settings = getSettings()
        let ai = null
        let aiMeta = null
        if (settings.aiEnabled && settings.apiKey) {
          setStepIdx(2)
          try {
            const base64Jpeg = canvasToBase64Jpeg(downscale(analysisCanvas, 896), 0.8)
            const res = await analyzeWithClaude({
              base64Jpeg, heuristics, lighting,
              apiKey: settings.apiKey, model: settings.model,
            })
            ai = res.result
            aiMeta = res.meta
          } catch (e) {
            setAiWarning(e.message)
          }
        }

        // ── 4. Merge + persist ───────────────────────────────────────
        setStepIdx(3)
        const { concerns, advice, source } = mergeResults(heuristics, ai)
        const scan = {
          id: crypto.randomUUID(),
          ts: Date.now(),
          thumb: await canvasToBlob(downscale(analysisCanvas, 320), 0.7),
          photo: await canvasToBlob(analysisCanvas, 0.8),
          landmarks,
          lighting,
          source,
          concerns,
          advice,
          aiMeta,
        }
        await putScan(scan)
        onDone(scan)
      } catch (e) {
        console.error(e)
        setError('Analysis failed: ' + e.message)
      } finally {
        if (landmarker) landmarker.close()
      }
    })()
  }, [capture, onDone])

  const settings = getSettings()
  const aiActive = settings.aiEnabled && !!settings.apiKey

  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 22, padding: 30,
    }}>
      {previewUrl && (
        <img
          src={previewUrl}
          alt="Your selfie"
          style={{
            width: 150, height: 150, objectFit: 'cover', borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.15)',
            filter: error ? 'grayscale(1)' : 'none',
          }}
        />
      )}

      {!error ? (
        <>
          <Spinner />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 220 }}>
            {STEPS.map((step, i) => {
              if (step.id === 'ai' && !aiActive) return null
              const state = i < stepIdx ? 'done' : i === stepIdx ? 'active' : 'pending'
              return (
                <div key={step.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, fontSize: 15,
                  color: state === 'pending' ? 'rgba(255,255,255,0.3)'
                       : state === 'active' ? '#fff' : '#34d399',
                }}>
                  <span style={{ width: 18, textAlign: 'center' }}>
                    {state === 'done' ? '✓' : state === 'active' ? '•' : '○'}
                  </span>
                  {step.label}
                  {step.id === 'ai' && state === 'active' && (
                    <span style={{ fontSize: 12, opacity: 0.5 }}>(Claude)</span>
                  )}
                </div>
              )
            })}
          </div>
          {aiWarning && (
            <div style={{ color: '#fbbf24', fontSize: 13, textAlign: 'center', maxWidth: 300 }}>
              {aiWarning}
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ color: '#f87171', fontSize: 15, textAlign: 'center', maxWidth: 320 }}>
            {error}
          </div>
          <button className="btn-primary" onClick={onRetake}>Retake selfie</button>
        </>
      )}
    </div>
  )
}
