import { Campsite } from '../types'

interface MapViewProps {
  campsites: Campsite[]
  onSelect: (id: number) => void
}

export function MapView({ campsites, onSelect }: MapViewProps) {
  // Simple visual map using positioned dots on a California outline
  const minLat = 32.5
  const maxLat = 42.0
  const minLng = -124.5
  const maxLng = -114.0

  const toPosition = (lat: number, lng: number) => ({
    left: `${((lng - minLng) / (maxLng - minLng)) * 100}%`,
    top: `${((maxLat - lat) / (maxLat - minLat)) * 100}%`,
  })

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 500,
        background: 'linear-gradient(180deg, #dbeafe 0%, #bfdbfe 30%, #93c5fd 100%)',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #e5e7eb',
      }}
    >
      {/* Simple California shape hint */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.08,
          fontSize: '12rem',
          fontWeight: 900,
          color: '#1e40af',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        CA
      </div>

      {campsites.map((site) => {
        const pos = toPosition(site.lat, site.lng)
        return (
          <button
            key={site.id}
            onClick={() => onSelect(site.id)}
            title={`${site.name} — $${site.pricePerNight}/night`}
            style={{
              position: 'absolute',
              left: pos.left,
              top: pos.top,
              transform: 'translate(-50%, -50%)',
              background: site.available ? '#2563eb' : '#9ca3af',
              color: '#fff',
              border: '2px solid #fff',
              borderRadius: '999px',
              padding: '0.2rem 0.5rem',
              fontSize: '0.7rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              zIndex: 1,
            }}
          >
            ${site.pricePerNight}
          </button>
        )
      })}

      <div
        style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          background: 'rgba(255,255,255,0.9)',
          padding: '0.4rem 0.8rem',
          borderRadius: '6px',
          fontSize: '0.75rem',
          color: '#6b7280',
        }}
      >
        Click a pin to view details
      </div>
    </div>
  )
}
