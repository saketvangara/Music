# Music
My experiments with python for my music startup - trbble

Metadata file contains code written to ingest any title track from soundcloud, remove garbage words and stopwords from it and give out the artist name, track name, genre, duration and other corrected metadata. 

Twitter retargeting - A listener built using twitter API's that finds people posting music discovered from various sources such as soundcloud, spotify, pandora, shazam, soundhound,etc., finds out the genre of the song posted and suggests the best possible recommendation from trbble for to give to the user. Posting back to twitter is not done (songs stored in a DB)

Recommendations using soundcloud - Uses a seed track to playlists on soundcloud in which the track is present, and to find tracks that are common between these playlists and recommend them to users

---

# Form Coach

A real-time, data-driven workout form coach that runs entirely in the browser.
It watches you through your phone or laptop camera, counts reps, and flags form
faults live — no server required.

> **Important disclaimer:** 2D single-camera pose analysis is an _assistive guide_,
> not a clinical assessment. It can miss faults that only appear from a second
> angle, and it cannot evaluate load, intent, or pain. Use it to reinforce your
> self-awareness, not to replace qualified coaching or medical advice.

## Running the app

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # production bundle
```

Allow camera access when the browser asks. For best results, ensure your whole
body is visible in frame and position the camera from the angle shown in the
in-app banner.

## How the data schema works

All exercises live in `exercises.json`. The app is fully data-driven — the
JavaScript engine reads the JSON at startup and no exercise-specific code exists
in any component.

Each entry looks like:

```jsonc
{
  "id": "bodyweight-squat",
  "name": "Bodyweight Squat",
  "category": "lower-body",
  "cameraView": "side",          // side | front | 45
  "autoCheck": true,             // false = cue-only, no rule evaluation
  "repSignal": {
    "metric": "jointAngle",
    "points": ["hip", "knee", "ankle"],
    "method": "valley",          // valley | peak | hold
    "minProminenceDeg": 25
  },
  "cues": ["..."],
  "rules": [{
    "metric": "jointAngle",
    "points": ["hip", "knee", "ankle"],
    "condition": { "aggregate": "min", "op": ">", "threshold": 100, "phase": "bottom" },
    "severity": "low",
    "cue": "Aim for thighs closer to parallel…"
  }],
  "sources": [{ "name": "...", "url": "..." }]
}
```

**Landmark names** map to MediaPipe Pose 33 indices:
`nose=0, L/R shoulder=11/12, L/R elbow=13/14, L/R wrist=15/16, L/R hip=23/24, L/R knee=25/26, L/R ankle=27/28`

**Metric vocabulary:**
| Metric | Description |
|--------|-------------|
| `jointAngle` | Angle (°) at the middle point of [A, B, C] |
| `segmentVsVertical` | Angle (°) of [A→B] from vertical |
| `segmentVsHorizontal` | Angle (°) of [A→B] from horizontal |
| `horizontalRatio` | `\|xA − xB\|` normalised by torso length |
| `verticalRatio` | `\|yA − yB\|` normalised by torso length |
| `frontSeparationRatio` | `kneeGap / ankleGap` (front view, for valgus) |
| `leadRate` | How fast point A rises vs B in a phase |

## How to add exercises

1. Append a new object to the `exercises` array in `exercises.json` — no engine code changes needed.
2. Set `autoCheck: true` only if key faults are reliably detectable from a single 2D camera at the stated `cameraView`. Otherwise use `autoCheck: false` (cue-only).
3. Source every cue from reputable, clinician- or certified-coach-authored material. Record each in `sources`.
4. Write all cues in your own words — never paste verbatim text.

## Project structure

```
src/
  components/
    CameraStage.jsx    camera feed + skeleton overlay (Phase 1)
    ExercisePicker.jsx searchable exercise list       (Phase 2)
    CuePanel.jsx       cue checklist                  (Phase 2)
    LiveCoach.jsx      rep counter + live toasts      (Phase 4)
    SetSummary.jsx     end-of-set summary             (Phase 4)
    CoachPanel.jsx     Claude coaching layer          (Phase 5, optional)
  engine/
    metrics.js         computes all metricVocabulary values
    repCounter.js      valley/peak/hold rep detection
    ruleEngine.js      evaluates declarative rules per rep
  utils/
    landmarks.js       landmark name→index map + color helpers
exercises.json         the exercise library (data contract)
```
