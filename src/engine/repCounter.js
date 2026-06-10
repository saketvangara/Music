/**
 * Phase 3: Generic rep counter.
 * Driven by exercise.repSignal: { metric, points, method, minProminenceDeg }
 * method: 'valley' | 'peak' | 'hold'
 *
 * Usage:
 *   const counter = createRepCounter(exercise.repSignal)
 *   counter.feed(metricValue, timestampMs) → { reps, phase }
 */

export function createRepCounter(signal) {
  // Phase 3 implementation placeholder
  let reps  = 0
  let phase = 'idle'

  return {
    feed(_value, _ts) {
      return { reps, phase }
    },
    reset() {
      reps  = 0
      phase = 'idle'
    },
    get reps()  { return reps  },
    get phase() { return phase },
  }
}
