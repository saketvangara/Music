import { useState } from 'react'
import CameraStage from './components/CameraStage'
import ExercisePicker from './components/ExercisePicker'

export default function App() {
  const [screen, setScreen] = useState('picker') // 'picker' | 'workout'
  const [exercise, setExercise] = useState(null)

  function handleSelect(ex) {
    setExercise(ex)
    setScreen('workout')
  }

  function handleBack() {
    setScreen('picker')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#0f0f12' }}>
      {screen === 'picker' ? (
        <ExercisePicker onSelect={handleSelect} />
      ) : (
        <CameraStage exercise={exercise} onBack={handleBack} />
      )}
    </div>
  )
}
