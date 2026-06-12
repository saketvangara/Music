// Tiny inline SVG trend line for one concern. values: chronological 0–10.
export default function Sparkline({ values, color, width = 120, height = 32 }) {
  const pts = values.filter(v => v != null)
  if (pts.length < 2) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', fontSize: 10, opacity: 0.4 }}>
        {pts.length === 1 ? 'need 2+ scans' : 'no data'}
      </div>
    )
  }
  const pad = 3
  const x = i => pad + (i / (pts.length - 1)) * (width - pad * 2)
  const y = v => pad + (1 - v / 10) * (height - pad * 2)
  const points = pts.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const last = pts[pts.length - 1]

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.85"
      />
      <circle cx={x(pts.length - 1)} cy={y(last)} r="3" fill={color} />
    </svg>
  )
}
