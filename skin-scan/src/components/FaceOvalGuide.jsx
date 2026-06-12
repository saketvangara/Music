// Dimmed full-screen overlay with a transparent elliptical hole that the
// user lines their face up inside. Pure SVG, sized in viewport units.

export default function FaceOvalGuide({ ok, hint }) {
  const strokeColor = ok ? '#34d399' : 'rgba(255,255,255,0.85)'
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <mask id="oval-hole">
            <rect width="100%" height="100%" fill="#fff" />
            <ellipse cx="50%" cy="44%" rx="31%" ry="26%" fill="#000" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#oval-hole)" />
        <ellipse
          cx="50%" cy="44%" rx="31%" ry="26%"
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeDasharray={ok ? 'none' : '10 7'}
        />
      </svg>
      <div style={{
        position: 'absolute',
        top: 'calc(44% + 28%)',
        left: 0, right: 0,
        textAlign: 'center',
        color: ok ? '#34d399' : '#fff',
        fontSize: 14,
        fontWeight: 600,
        textShadow: '0 1px 4px rgba(0,0,0,0.8)',
        padding: '0 30px',
      }}>
        {hint}
      </div>
    </div>
  )
}
