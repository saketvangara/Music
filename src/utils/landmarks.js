// MediaPipe Pose 33-landmark index map.
// Mirrors the "landmarks" description in exercises.json.
export const IDX = {
  nose: 0,
  leftEyeInner: 1, leftEye: 2, leftEyeOuter: 3,
  rightEyeInner: 4, rightEye: 5, rightEyeOuter: 6,
  leftEar: 7, rightEar: 8,
  mouthLeft: 9, mouthRight: 10,
  leftShoulder: 11,  rightShoulder: 12,
  leftElbow: 13,     rightElbow: 14,
  leftWrist: 15,     rightWrist: 16,
  leftPinky: 17,     rightPinky: 18,
  leftIndex: 19,     rightIndex: 20,
  leftThumb: 21,     rightThumb: 22,
  leftHip: 23,       rightHip: 24,
  leftKnee: 25,      rightKnee: 26,
  leftAnkle: 27,     rightAnkle: 28,
  leftHeel: 29,      rightHeel: 30,
  leftFootIndex: 31, rightFootIndex: 32,
}

// Semantic names used by exercise rules → [leftIdx, rightIdx]
export const SEMANTIC_PAIR = {
  shoulder:   [IDX.leftShoulder,   IDX.rightShoulder],
  elbow:      [IDX.leftElbow,      IDX.rightElbow],
  wrist:      [IDX.leftWrist,      IDX.rightWrist],
  hip:        [IDX.leftHip,        IDX.rightHip],
  knee:       [IDX.leftKnee,       IDX.rightKnee],
  ankle:      [IDX.leftAnkle,      IDX.rightAnkle],
  heel:       [IDX.leftHeel,       IDX.rightHeel],
  footIndex:  [IDX.leftFootIndex,  IDX.rightFootIndex],
}

// Resolve a semantic point name to a single landmark index.
// side: 'left' | 'right' | 'auto' (picks the more visible one).
export function resolvePoint(name, side, landmarks) {
  const pair = SEMANTIC_PAIR[name]
  if (!pair) {
    // Absolute name like 'leftKnee'
    const idx = IDX[name]
    return idx !== undefined ? idx : null
  }
  const [li, ri] = pair
  if (side === 'left') return li
  if (side === 'right') return ri
  // auto: pick more visible
  if (!landmarks) return li
  const lv = landmarks[li]?.visibility ?? 0
  const rv = landmarks[ri]?.visibility ?? 0
  return rv > lv ? ri : li
}

// Color helpers for skeleton drawing
const FACE_SET = new Set([0,1,2,3,4,5,6,7,8,9,10])
const LEFT_SET = new Set([11,13,15,17,19,21,23,25,27,29,31])
const RIGHT_SET = new Set([12,14,16,18,20,22,24,26,28,30,32])

export function boneColor(startIdx, endIdx) {
  if (FACE_SET.has(startIdx) || FACE_SET.has(endIdx)) return '#94a3b8'
  if (LEFT_SET.has(startIdx) && LEFT_SET.has(endIdx)) return '#f472b6'
  if (RIGHT_SET.has(startIdx) && RIGHT_SET.has(endIdx)) return '#34d399'
  return '#fbbf24'
}

export function jointColor(idx) {
  if (FACE_SET.has(idx)) return '#cbd5e1'
  if (LEFT_SET.has(idx)) return '#fbcfe8'
  if (RIGHT_SET.has(idx)) return '#a7f3d0'
  return '#ffffff'
}
