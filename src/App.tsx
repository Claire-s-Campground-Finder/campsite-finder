import { useState } from 'react'

interface Campsite {
  id: number
  name: string
  location: string
  type: 'tent' | 'rv' | 'cabin'
  rating: number
  available: boolean
}

const SAMPLE_CAMPSITES: Campsite[] = [
  { id: 1, name: 'Pine Ridge Campground', location: 'Big Sur, CA', type: 'tent', rating: 4.8, available: true },
  { id: 2, name: 'Redwood Valley RV Park', location: 'Crescent City, CA', type: 'rv', rating: 4.2, available: true },
  { id: 3, name: 'Lake Tahoe Cabins', location: 'South Lake Tahoe, CA', type: 'cabin', rating: 4.9, available: false },
  { id: 4, name: 'Joshua Tree Base Camp', location: 'Joshua Tree, CA', type: 'tent', rating: 4.5, available: true },
  { id: 5, name: 'Yosemite Pines', location: 'Groveland, CA', type: 'tent', rating: 4.7, available: true },
  { id: 6, name: 'Malibu Creek Cabins', location: 'Malibu, CA', type: 'cabin', rating: 4.3, available: true },
]

function App() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const filtered = SAMPLE_CAMPSITES.filter((site) => {
    const matchesSearch =
      site.name.toLowerCase().includes(search.toLowerCase()) ||
      site.location.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'all' || site.type === typeFilter
    return matchesSearch && matchesType
  })

  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 800, margin: '0 auto', padding: '2rem' }}>
      <h1>Campsite Finder</h1>
      <p>Find local campsites near you.</p>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Search by name or location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid #ccc',
            fontSize: '1rem',
          }}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid #ccc',
            fontSize: '1rem',
          }}
        >
          <option value="all">All Types</option>
          <option value="tent">Tent</option>
          <option value="rv">RV</option>
          <option value="cabin">Cabin</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: '#888' }}>No campsites found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map((site) => (
            <div
              key={site.id}
              style={{
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
                padding: '1.25rem',
                background: site.available ? '#fff' : '#f9f9f9',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>{site.name}</h3>
                <span
                  style={{
                    background: site.available ? '#e6f4ea' : '#fce8e6',
                    color: site.available ? '#1e7e34' : '#c5221f',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '999px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  {site.available ? 'Available' : 'Booked'}
                </span>
              </div>
              <p style={{ margin: '0.5rem 0 0', color: '#555' }}>
                {site.location} &middot; {site.type.charAt(0).toUpperCase() + site.type.slice(1)} &middot; {site.rating} stars
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default App
