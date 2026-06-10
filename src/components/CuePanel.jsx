// Phase 2: live cue checklist — stub
export default function CuePanel({ exercise }) {
  if (!exercise) return null
  return (
    <div style={{ padding: 16, color: '#e2e8f0' }}>
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Cues — {exercise.name}</h2>
      <ul style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: 14 }}>
        {exercise.cues.map((c, i) => <li key={i}>{c}</li>)}
      </ul>
    </div>
  )
}
