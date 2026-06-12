export default function Spinner({ size = 36 }) {
  return (
    <div style={{
      width: size, height: size,
      border: '3px solid rgba(255,255,255,0.15)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
  )
}
