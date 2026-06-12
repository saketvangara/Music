# SkinScan

Mobile-first web app: take a selfie, scan your face, see skin concerns highlighted on the photo, get product recommendations, and track progress over time — all stored on your device.

## What it does

1. **Scan** — line your face up in the oval guide and take a selfie. MediaPipe Face Landmarker (478 points, runs on-device) gates the shutter until your face is centered, close enough, and lit well enough.
2. **Analyze** — the photo is scored per face region for:
   - **Enlarged pores** (high-frequency texture on cheeks/nose)
   - **Oiliness / shine** (specular highlights in the T-zone)
   - **Redness** (CIELAB a* elevation around the nose wings and cheeks)
   - **Dark circles** (under-eye darkness vs cheek skin, blue-cast aware)
   - **Texture** (coarse unevenness)
   - **Blemishes** (AI only)

   All measurements are baselined against *your own* face's skin statistics, so they're robust to skin tone and white balance. A lighting-quality check warns when scores may be unreliable.
3. **AI review (optional)** — paste an Anthropic API key in Settings and each scan also goes to Claude vision for an accurate assessment, per-concern notes, and personalized product picks from the built-in catalog. Works fine without a key (on-device scores only). The call goes directly from your browser to api.anthropic.com; the photo is not sent anywhere else.
4. **Results** — concern overlays drawn on your photo (toggle per concern), 0–10 severity scores, and recommended products from trusted brands (Anua, COSRX, Beauty of Joseon, SKIN1004, Round Lab, Isntree, Torriden, La Roche-Posay, CeraVe, Paula's Choice, The Ordinary) with how each product works and how long results take.
5. **History** — every scan is saved locally (IndexedDB): thumbnails, scores, trend sparklines per concern, and deltas vs your previous scan.

## Run it

```bash
npm install
npm run dev            # local dev
npm run dev -- --host  # expose on LAN to test from your phone
```

> **Camera needs a secure context.** `localhost` works; from a phone you need HTTPS — use a tunnel (`npx ngrok http 5173`, Tailscale, etc.) or any HTTPS hosting of `npm run build`'s `dist/`.

```bash
npm run build            # production build
npm run preview          # serve the build
npm run test:heuristics  # pure-math tests for the scoring layer
```

## Accuracy notes

- Heuristic scores are **lighting-sensitive**. Scan in the same place, same time of day, facing an even light source (a window is ideal), without makeup. The app warns on dim/blown/uneven light and stores that flag with the scan.
- Trends across many scans are far more meaningful than any single score.
- This is general guidance, **not medical advice**. See a dermatologist for anything severe or unusual.

## Stack

Vite 5 + React 18 + `@mediapipe/tasks-vision` — no other runtime dependencies. Face model WASM is served locally (copied from `node_modules` at build start); the `.task` model file is fetched from the MediaPipe CDN on first load and cached.
