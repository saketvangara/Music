// Direct browser call to the Claude API for the AI skin assessment.
// The user's API key never leaves the device except to api.anthropic.com.

import { catalogSummary } from './catalog.js'

const API_URL = 'https://api.anthropic.com/v1/messages'

const SYSTEM_PROMPT = `You are a skincare analysis assistant. You are given a selfie and on-device measurement estimates. Assess these concerns: enlarged pores (pores), oiliness/shine (oiliness), redness (redness), dark circles (darkCircles), skin texture (texture), and blemishes/breakouts (blemishes).

You are not a medical professional. Do not diagnose conditions. If anything looks severe, infected, or atypical, say to see a dermatologist in the relevant note.

A product catalog follows in the user message. Recommend products by their "id" from the catalog whenever a suitable one exists; you may add at most one off-catalog suggestion per concern as a plain string.

Respond with ONLY a JSON object, no markdown fences, exactly this shape:
{
  "concerns": {
    "pores":       { "severity": 0-10, "regions": ["nose","cheeks"], "note": "<=25 words" },
    "oiliness":    { "severity": 0-10, "regions": [...], "note": "..." },
    "redness":     { "severity": 0-10, "regions": [...], "note": "..." },
    "darkCircles": { "severity": 0-10, "regions": [...], "note": "..." },
    "texture":     { "severity": 0-10, "regions": [...], "note": "..." },
    "blemishes":   { "severity": 0-10, "regions": [...], "note": "..." }
  },
  "products": { "<concernKey>": ["<catalog id or plain suggestion>", ...max 3], ... },
  "routine": "<AM/PM routine advice, <=120 words>",
  "imageQualityCaveat": "<string or null>"
}
Allowed region tags: forehead, nose, noseWings, underEyes, cheeks, chin.`

function buildUserText(heuristics, lighting) {
  return `On-device measurements (0-10 scores with raw values; use as priors but trust your own visual assessment and adjust freely where the image contradicts them):
${JSON.stringify(heuristics, null, 1)}

Lighting quality check: ${JSON.stringify(lighting)}

Product catalog (recommend by id):
${JSON.stringify(catalogSummary())}`
}

const clamp10 = v => Math.max(0, Math.min(10, Number(v) || 0))

function parseResponse(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  const parsed = JSON.parse(cleaned)
  if (!parsed || typeof parsed !== 'object' || !parsed.concerns) {
    throw new Error('missing concerns')
  }
  const concerns = {}
  for (const [key, c] of Object.entries(parsed.concerns)) {
    concerns[key] = {
      severity: clamp10(c?.severity),
      regions: Array.isArray(c?.regions) ? c.regions.map(String) : [],
      note: typeof c?.note === 'string' ? c.note : '',
    }
  }
  return {
    concerns,
    products: parsed.products && typeof parsed.products === 'object' ? parsed.products : {},
    routine: typeof parsed.routine === 'string' ? parsed.routine : '',
    imageQualityCaveat: parsed.imageQualityCaveat || null,
  }
}

function friendlyError(status, fallback) {
  if (status === 401 || status === 403) return 'API key invalid — check Settings.'
  if (status === 429) return 'Rate limited — try again in a minute.'
  if (status === 400) return 'The API rejected the request (photo may be too large).'
  if (status >= 500) return 'Claude API is having issues — try again shortly.'
  return fallback
}

// Returns { result, meta } or throws Error with a user-friendly message.
export async function analyzeWithClaude({ base64Jpeg, heuristics, lighting, apiKey, model }) {
  let res
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Jpeg } },
            { type: 'text', text: buildUserText(heuristics, lighting) },
          ],
        }],
      }),
    })
  } catch {
    throw new Error('Network error reaching the Claude API — check your connection.')
  }

  if (!res.ok) {
    throw new Error(friendlyError(res.status, `Claude API error (${res.status}).`))
  }

  const body = await res.json()
  const text = body.content?.find(b => b.type === 'text')?.text ?? ''
  let result
  try {
    result = parseResponse(text)
  } catch {
    throw new Error('AI returned an unreadable response — using on-device scores.')
  }
  return { result, meta: { model: body.model, usage: body.usage ?? null } }
}

// Cheap key validation for the Settings "Test key" button.
export async function testApiKey(apiKey, model) {
  let res
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    })
  } catch {
    return { ok: false, message: 'Network error — check your connection.' }
  }
  if (res.ok) return { ok: true, message: 'API key works.' }
  return { ok: false, message: friendlyError(res.status, `Error ${res.status}`) }
}
