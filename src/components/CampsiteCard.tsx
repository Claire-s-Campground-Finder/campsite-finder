import { Campsite } from '../types'

interface CampsiteCardProps {
  campsite: Campsite
  isFavorite: boolean
  onToggleFavorite: () => void
  onSelect: () => void
}

const TYPE_ICONS: Record<string, string> = {
  tent: 'Tent',
  rv: 'RV',
  cabin: 'Cabin',
  glamping: 'Glamping',
}

const TYPE_COLORS: Record<string, string> = {
  tent: '#059669',
  rv: '#2563eb',
  cabin: '#9333ea',
  glamping: '#d97706',
}

export function CampsiteCard({ campsite, isFavorite, onToggleFavorite, onSelect }: CampsiteCardProps) {
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        overflow: 'hidden',
        background: '#fff',
        transition: 'box-shadow 0.2s',
        cursor: 'pointer',
      }}
      onClick={onSelect}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Placeholder image area */}
      <div
        style={{
          height: 160,
          background: `linear-gradient(135deg, ${TYPE_COLORS[campsite.type]}22, ${TYPE_COLORS[campsite.type]}44)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <span style={{ fontSize: '2.5rem', opacity: 0.5 }}>
          {campsite.type === 'tent' ? '⛺' : campsite.type === 'rv' ? '🚐' : campsite.type === 'cabin' ? '🏠' : '✨'}
        </span>

        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite()
          }}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'rgba(255,255,255,0.9)',
            border: 'none',
            borderRadius: '50%',
            width: 36,
            height: 36,
            fontSize: '1.1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>

        {/* Availability badge */}
        <span
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            background: campsite.available ? '#dcfce7' : '#fee2e2',
            color: campsite.available ? '#166534' : '#991b1b',
            padding: '0.2rem 0.6rem',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          {campsite.available ? 'Available' : 'Booked'}
        </span>
      </div>

      <div style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{campsite.name}</h3>
          <span style={{ fontWeight: 700, color: '#111', whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>
            ${campsite.pricePerNight}<span style={{ fontWeight: 400, color: '#6b7280', fontSize: '0.8rem' }}>/night</span>
          </span>
        </div>

        <p style={{ margin: '0.25rem 0', color: '#6b7280', fontSize: '0.85rem' }}>
          {campsite.location}, {campsite.state}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0' }}>
          <span
            style={{
              background: TYPE_COLORS[campsite.type] + '15',
              color: TYPE_COLORS[campsite.type],
              padding: '0.15rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            {TYPE_ICONS[campsite.type]}
          </span>
          <span style={{ fontSize: '0.85rem', color: '#f59e0b' }}>
            {'★'.repeat(Math.round(campsite.rating))} {campsite.rating}
          </span>
          <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
            ({campsite.reviewCount})
          </span>
          {campsite.petFriendly && (
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>🐾 Pet OK</span>
          )}
        </div>

        <p style={{ margin: '0.5rem 0 0', color: '#4b5563', fontSize: '0.85rem', lineHeight: 1.4 }}>
          {campsite.description.slice(0, 100)}...
        </p>
      </div>
    </div>
  )
}
