import { useState } from 'react'
import { getSettings, saveSettings } from '../lib/settings'
import { testApiKey } from '../lib/claude'
import { clearScans } from '../lib/db'

const MODELS = [
  { id: 'claude-fable-5', label: 'Claude Fable 5 (most accurate)' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (cheaper)' },
]

export default function SettingsScreen() {
  const [settings, setSettings] = useState(getSettings)
  const [keyTest, setKeyTest] = useState(null) // {ok, message} | 'testing'
  const [cleared, setCleared] = useState(false)

  function update(patch) {
    setSettings(saveSettings(patch))
    setKeyTest(null)
  }

  async function handleTestKey() {
    setKeyTest('testing')
    setKeyTest(await testApiKey(settings.apiKey, settings.model))
  }

  async function handleClear() {
    if (!confirm('Delete ALL scan history? This cannot be undone.')) return
    await clearScans()
    setCleared(true)
    setTimeout(() => setCleared(false), 2000)
  }

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ padding: '18px 16px 30px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560, margin: '0 auto' }}>
        <div style={{ fontWeight: 800, fontSize: 19 }}>Settings</div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>AI analysis</div>
            <div style={{ fontSize: 12.5, opacity: 0.6, marginTop: 2, lineHeight: 1.5 }}>
              With an Anthropic API key, each scan also gets an accurate AI assessment
              and personalized product picks. Without one, on-device analysis still works.
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={settings.aiEnabled}
              onChange={e => update({ aiEnabled: e.target.checked })}
              style={{ width: 18, height: 18 }}
            />
            Use AI on each scan
          </label>

          <div>
            <div style={labelStyle}>API key</div>
            <input
              type="password"
              value={settings.apiKey}
              onChange={e => update({ apiKey: e.target.value.trim() })}
              placeholder="sk-ant-…"
              autoComplete="off"
              style={inputStyle}
            />
            <div style={{ fontSize: 11.5, opacity: 0.5, marginTop: 5, lineHeight: 1.45 }}>
              Stored only in this browser and sent only to api.anthropic.com.
              Anyone with access to this device can read it — don't use a shared device.
            </div>
          </div>

          <div>
            <div style={labelStyle}>Model</div>
            <select
              value={settings.model}
              onChange={e => update({ model: e.target.value })}
              style={{ ...inputStyle, appearance: 'auto' }}
            >
              {MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>

          <button
            className="btn-ghost"
            disabled={!settings.apiKey || keyTest === 'testing'}
            onClick={handleTestKey}
            style={{ opacity: settings.apiKey ? 1 : 0.4 }}
          >
            {keyTest === 'testing' ? 'Testing…' : 'Test key'}
          </button>
          {keyTest && keyTest !== 'testing' && (
            <div style={{ fontSize: 13, color: keyTest.ok ? '#34d399' : '#f87171' }}>
              {keyTest.message}
            </div>
          )}
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Data</div>
          <div style={{ fontSize: 12.5, opacity: 0.6, lineHeight: 1.5 }}>
            All scans and photos are stored only on this device (browser storage).
            Nothing is uploaded anywhere except the optional AI call.
          </div>
          <button className="btn-ghost" onClick={handleClear} style={{ color: '#f87171' }}>
            {cleared ? 'Deleted ✓' : 'Delete all scan history'}
          </button>
        </div>

        <div className="card" style={{ fontSize: 12.5, opacity: 0.65, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 700, fontSize: 14, opacity: 1, marginBottom: 4, color: '#e7e7ea' }}>Tips for accurate tracking</div>
          • Scan in the same spot, same time of day, facing a window or even light.<br />
          • No makeup, and ideally 30+ minutes after washing your face.<br />
          • Trends across many scans matter more than any single score.
        </div>

        <div style={{ fontSize: 11, opacity: 0.35, textAlign: 'center' }}>
          SkinScan v0.1.0 · not medical advice
        </div>
      </div>
    </div>
  )
}

const labelStyle = {
  fontSize: 11.5,
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.5)',
  marginBottom: 6,
}

const inputStyle = {
  width: '100%',
  padding: '11px 12px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.05)',
  color: '#e7e7ea',
  fontSize: 14,
}
