// Chat with a skincare assistant that knows the user's scan history.
// Same direct-browser Claude call as claude.js; the key never leaves the
// device except to api.anthropic.com.

import { catalogSummary } from './catalog.js'
import { CONCERNS, CONCERN_KEYS } from './products.js'

const API_URL = 'https://api.anthropic.com/v1/messages'

const SYSTEM_PROMPT = `You are the in-app skincare coach for SkinScan, a face-scanning app. The user scans their face regularly; you receive their recent scan scores (0-10 per concern, higher = worse) and trends below.

Your job: personalized, practical skincare guidance — routines, product picks, plans, explanations of their scores and trends.

Rules:
- Ground every answer in THEIR data. Reference their actual scores and trends, not generic advice.
- When recommending products, prefer the app's catalog below (mention brand + product name); you may suggest off-catalog products when genuinely better suited, and always mention rough price tier.
- Introduce at most 1-2 new products at a time; sequence the rest into a plan.
- Be concise and concrete: short paragraphs or simple lists, no tables, no headers. Plain text only.
- You are not a medical professional. No diagnoses; recommend a dermatologist for anything severe, painful, or atypical.
- If they ask something unrelated to skin/skincare, answer briefly and steer back.`

function summarizeScans(scans) {
  if (!scans?.length) return 'No scans yet.'
  const recent = scans.slice(0, 6) // newest first
  const lines = recent.map(s => {
    const d = new Date(s.ts).toISOString().slice(0, 10)
    const scores = CONCERN_KEYS
      .map(k => {
        const v = s.concerns?.[k]?.final
        return v != null ? `${k}:${v}` : null
      })
      .filter(Boolean)
      .join(' ')
    return `${d} (${s.source}${s.lighting?.ok === false ? ', poor lighting' : ''}): ${scores}`
  })
  const latest = recent[0]
  const notes = CONCERN_KEYS
    .map(k => {
      const n = latest.concerns?.[k]?.note
      return n ? `${CONCERNS[k].label}: ${n}` : null
    })
    .filter(Boolean)
  return [
    'Recent scans, newest first (0-10, higher = worse):',
    ...lines,
    notes.length ? 'AI notes on latest scan: ' + notes.join(' | ') : null,
    latest.advice?.routine ? 'Current suggested routine: ' + latest.advice.routine : null,
  ].filter(Boolean).join('\n')
}

function buildContext(scans) {
  return `USER SCAN DATA
${summarizeScans(scans)}

PRODUCT CATALOG
${JSON.stringify(catalogSummary())}`
}

// history: [{role:'user'|'assistant', content:string}, ...] including the
// newest user message. Returns the assistant's reply text.
export async function sendChat({ history, scans, apiKey, model }) {
  const trimmed = history.slice(-20) // bound token usage
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
        max_tokens: 1024,
        system: SYSTEM_PROMPT + '\n\n' + buildContext(scans),
        messages: trimmed,
      }),
    })
  } catch {
    throw new Error('Network error — check your connection.')
  }
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error('API key invalid — check Settings.')
    if (res.status === 429) throw new Error('Rate limited — wait a minute and try again.')
    if (res.status >= 500) throw new Error('Claude API is having issues — try again shortly.')
    throw new Error(`Claude API error (${res.status}).`)
  }
  const body = await res.json()
  const text = body.content?.filter(b => b.type === 'text').map(b => b.text).join('') ?? ''
  if (!text) throw new Error('Empty response — try again.')
  return text
}
