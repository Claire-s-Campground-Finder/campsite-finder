import type { Campsite } from '../types'

const TYPE_EMOJI: Record<string, string> = {
  tent: '⛺',
  rv: '🚐',
  cabin: '🏠',
  glamping: '✨',
}

interface RecentlyViewedProps {
  campsites: Campsite[]
  onSelect: (id: number) => void
  onClear: () => void
}

export function RecentlyViewed({ campsites, onSelect, onClear }: RecentlyViewedProps) {
  if (campsites.length === 0) return null

  return (
    <div style={{ margin: '0 0 1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '0.95rem', color: '#374151', fontWeight: 600 }}>
          Recently viewed
        </h2>
        <button
          onClick={onClear}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#6b7280',
            fontSize: '0.8rem',
            cursor: 'pointer',
            padding: '0.15rem 0.4rem',
          }}
        >
          Clear
        </button>
      </div>
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem',
        }}
      >
        {campsites.map((site) => (
          <button
            key={site.id}
            onClick={() => onSelect(site.id)}
            style={{
              flex: '0 0 auto',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              border: '1px solid #e5e7eb',
              borderRadius: '999px',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '0.85rem',
              color: '#111',
              whiteSpace: 'nowrap',
            }}
            title={`${site.location}, ${site.state}`}
          >
            <span style={{ fontSize: '1rem' }}>{TYPE_EMOJI[site.type]}</span>
            <span>{site.name}</span>
            <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>${site.pricePerNight}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
