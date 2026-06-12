const KEY = 'skinscan.settings'

const DEFAULTS = {
  apiKey: '',
  model: 'claude-fable-5',
  aiEnabled: true,
}

export function getSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch }
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}
