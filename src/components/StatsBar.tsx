import { Campsite } from '../types'

interface StatsBarProps {
  campsites: Campsite[]
  favoriteCount: number
}

export function StatsBar({ campsites, favoriteCount }: StatsBarProps) {
  const available = campsites.filter((c) => c.available).length
  const avgPrice = Math.round(campsites.reduce((sum, c) => sum + c.pricePerNight, 0) / campsites.length)
  const avgRating = (campsites.reduce((sum, c) => sum + c.rating, 0) / campsites.length).toFixed(1)
  const types = new Set(campsites.map((c) => c.type)).size

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.5rem',
      }}
    >
      <StatCard label="Total Sites" value={String(campsites.length)} />
      <StatCard label="Available" value={`${available}/${campsites.length}`} color="#059669" />
      <StatCard label="Avg Price" value={`$${avgPrice}/n`} />
      <StatCard label="Avg Rating" value={`${avgRating} ★`} color="#f59e0b" />
      <StatCard label="Types" value={String(types)} />
      <StatCard label="Saved" value={String(favoriteCount)} color="#ef4444" />
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div
      style={{
        padding: '0.75rem',
        background: '#f9fafb',
        borderRadius: '8px',
        textAlign: 'center',
        border: '1px solid #f3f4f6',
      }}
    >
      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: color || '#111827' }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem' }}>{label}</div>
    </div>
  )
}
