import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Don't pre-bundle: the WASM inside tasks-vision must load at runtime from CDN
    exclude: ['@mediapipe/tasks-vision'],
  },
})
