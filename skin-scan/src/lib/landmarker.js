// FaceLandmarker factory with GPU → CPU delegate fallback.
// WASM served from public/wasm (copied from node_modules by the Vite plugin)
// so the binary always matches the installed JS runtime.

import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision'

const WASM_PATH = '/wasm'

const MODEL_ASSET_PATH =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

let visionPromise = null
function getVision() {
  if (!visionPromise) visionPromise = FilesetResolver.forVisionTasks(WASM_PATH)
  return visionPromise
}

// mode: 'VIDEO' (capture-screen gating) or 'IMAGE' (still-photo analysis).
// GPU first for hardware acceleration; CPU fallback covers Firefox (no WebGL2
// compute), older Android WebViews, and anything that refuses the GPU delegate.
export async function createFaceLandmarker(mode) {
  const vision = await getVision()
  const shared = {
    runningMode: mode,
    numFaces: 1,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
  }
  for (const delegate of ['GPU', 'CPU']) {
    try {
      return await FaceLandmarker.createFromOptions(vision, {
        ...shared,
        baseOptions: { modelAssetPath: MODEL_ASSET_PATH, delegate },
      })
    } catch (e) {
      if (delegate === 'CPU') throw e // both failed — surface the error
      console.warn(`GPU delegate failed (${e.message}); retrying with CPU`)
    }
  }
}
