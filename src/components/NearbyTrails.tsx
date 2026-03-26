import { useState } from 'react'

interface Trail {
  id: number
  name: string
  distance: number
  elevationGain: number
  difficulty: 'easy' | 'moderate' | 'hard'
  type: 'loop' | 'out-and-back' | 'point-to-point'
  rating: number
  estimatedTime: string
  features: string[]
}

const TRAILS: Trail[] = [
  { id: 1, name: 'Coastal Bluff Loop', distance: 3.2, elevationGain: 420, difficulty: 'easy', type: 'loop', rating: 4.7, estimatedTime: '1.5 hrs', features: ['Ocean views', 'Wildflowers'] },
  { id: 2, name: 'Redwood Creek Trail', distance: 5.8, elevationGain: 850, difficulty: 'moderate', type: 'out-and-back', rating: 4.9, estimatedTime: '3 hrs', features: ['Old growth', 'Creek crossing'] },
  { id: 3, name: 'Summit Ridge', distance: 8.4, elevationGain: 2100, difficulty: 'hard', type: 'out-and-back', rating: 4.6, estimatedTime: '5 hrs', features: ['Panoramic views', 'Alpine meadow'] },
  { id: 4, name: 'Lakeside Nature Walk', distance: 1.5, elevationGain: 120, difficulty: 'easy', type: 'loop', rating: 4.3, estimatedTime: '45 min', features: ['Lake access', 'Bird watching'] },
  { id: 5, name: 'Canyon Descent', distance: 6.1, elevationGain: 1650, difficulty: 'hard', type: 'point-to-point', rating: 4.8, estimatedTime: '4 hrs', features: ['Waterfall', 'Swimming hole'] },
  { id: 6, name: 'Meadow Connector', distance: 4.0, elevationGain: 580, difficulty: 'moderate', type: 'loop', rating: 4.4, estimatedTime: '2 hrs', features: ['Wildflowers', 'Deer sightings'] },
]

const DIFF_COLORS = { easy: '#059669', moderate: '#d97706', hard: '#dc2626' }

export function NearbyTrails() {
  const [filter, setFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'rating' | 'distance' | 'elevation'>('rating')

  let filtered = filter === 'all' ? TRAILS : TRAILS.filter((t) => t.difficulty === filter)
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating
    if (sortBy === 'distance') return a.distance - b.distance
    return b.elevationGain - a.elevationGain
  })

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem' }}>
      <h3 style={{ margin: '0 0 0.75rem' }}>Nearby Trails</h3>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {['all', 'easy', 'moderate', 'hard'].map((d) => (
          <button key={d} onClick={() => setFilter(d)} style={{ padding: '0.3rem 0.7rem', borderRadius: '999px', border: filter === d ? 'none' : '1px solid #d1d5db', background: filter === d ? '#2563eb' : '#fff', color: filter === d ? '#fff' : '#374151', fontSize: '0.8rem', cursor: 'pointer', textTransform: 'capitalize' }}>
            {d}
          </button>
        ))}
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} style={{ marginLeft: 'auto', padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.8rem' }}>
          <option value="rating">Top Rated</option>
          <option value="distance">Shortest</option>
          <option value="elevation">Most Elevation</option>
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {filtered.map((trail) => (
          <div key={trail.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.75rem', background: '#f9fafb', borderRadius: '8px' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{trail.name}</div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                {trail.distance} mi &middot; {trail.elevationGain} ft gain &middot; {trail.type} &middot; {trail.estimatedTime}
              </div>
              <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.2rem' }}>
                {trail.features.map((f) => (
                  <span key={f} style={{ fontSize: '0.7rem', background: '#eff6ff', color: '#1d4ed8', padding: '0.05rem 0.35rem', borderRadius: '4px' }}>{f}</span>
                ))}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#f59e0b', fontSize: '0.85rem' }}>{trail.rating} ★</div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: DIFF_COLORS[trail.difficulty] }}>{trail.difficulty}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
