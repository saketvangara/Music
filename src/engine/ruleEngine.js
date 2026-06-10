/**
 * Phase 3: Generic rule engine.
 * Evaluates declarative rules from exercises.json against per-rep metric history.
 *
 * Usage:
 *   const engine = createRuleEngine(exercise.rules)
 *   engine.recordFrame(metrics, phase, timestampMs)
 *   const faults = engine.evaluateRep()  // call at end of each rep
 */

export function createRuleEngine(rules) {
  // Phase 3 implementation placeholder
  return {
    recordFrame(_metrics, _phase, _ts) {},
    evaluateRep() { return [] },
    reset() {},
  }
}
