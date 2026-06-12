import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cpSync, mkdirSync } from 'fs'
import { resolve } from 'path'

// Copy WASM files from node_modules into public/wasm at dev/build start.
// This guarantees the served WASM always matches the installed npm package
// version — prevents the JS runtime / WASM binary version mismatch that
// breaks MediaPipe when npm upgrades the package.
function copyMediaPipeWasm() {
  return {
    name: 'copy-mediapipe-wasm',
    buildStart() {
      const src  = resolve('node_modules/@mediapipe/tasks-vision/wasm')
      const dest = resolve('public/wasm')
      mkdirSync(dest, { recursive: true })
      cpSync(src, dest, { recursive: true })
    },
  }
}

// COOP + COEP headers enable crossOriginIsolated = true, which allows
// SharedArrayBuffer — required for MediaPipe's multi-threaded WASM executor.
// 'credentialless' (vs 'require-corp') lets us still load the face model
// from storage.googleapis.com without needing CORP headers on the CDN,
// and does not block the CORS fetch to api.anthropic.com.
const isolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
}

export default defineConfig({
  plugins: [react(), copyMediaPipeWasm()],
  optimizeDeps: {
    // Don't pre-bundle: WASM must load at runtime from the local /wasm path
    exclude: ['@mediapipe/tasks-vision'],
  },
  server:  { headers: isolationHeaders },
  preview: { headers: isolationHeaders },
})
