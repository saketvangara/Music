import { useState, useCallback } from 'react'
import CaptureScreen from './screens/CaptureScreen'
import AnalyzeScreen from './screens/AnalyzeScreen'
import ResultsScreen from './screens/ResultsScreen'
import HistoryScreen from './screens/HistoryScreen'
import SettingsScreen from './screens/SettingsScreen'

const TABS = [
  { id: 'capture', label: 'Scan', icon: '◉' },
  { id: 'history', label: 'History', icon: '☰' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
]

export default function App() {
  // screen: capture | analyze | results | history | settings
  const [screen, setScreen] = useState('capture')
  const [pendingCapture, setPendingCapture] = useState(null) // canvas from CaptureScreen
  const [currentScan, setCurrentScan] = useState(null)       // scan record for Results

  const handleCaptured = useCallback(canvas => {
    setPendingCapture(canvas)
    setScreen('analyze')
  }, [])

  const handleAnalyzed = useCallback(scan => {
    setPendingCapture(null)
    setCurrentScan(scan)
    setScreen('results')
  }, [])

  const openScan = useCallback(scan => {
    setCurrentScan(scan)
    setScreen('results')
  }, [])

  const showTabs = screen !== 'analyze'
  const activeTab = screen === 'results' ? 'history' : screen

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#0f0f12', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {screen === 'capture' && <CaptureScreen onCaptured={handleCaptured} />}
        {screen === 'analyze' && (
          <AnalyzeScreen
            capture={pendingCapture}
            onDone={handleAnalyzed}
            onRetake={() => { setPendingCapture(null); setScreen('capture') }}
          />
        )}
        {screen === 'results' && (
          <ResultsScreen scan={currentScan} onBack={() => setScreen('history')} />
        )}
        {screen === 'history' && <HistoryScreen onOpenScan={openScan} />}
        {screen === 'settings' && <SettingsScreen />}
      </div>

      {showTabs && (
        <nav style={{
          display: 'flex',
          borderTop: '1px solid rgba(255,255,255,0.09)',
          background: '#141418',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setScreen(tab.id)}
              style={{
                flex: 1,
                padding: '10px 0 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                color: activeTab === tab.id ? '#6d5cff' : 'rgba(255,255,255,0.45)',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              <span style={{ fontSize: 19 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
