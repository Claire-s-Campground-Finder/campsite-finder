import { Campsite, Review } from '../types'

interface CampsiteDetailProps {
  campsite: Campsite
  reviews: Review[]
  isFavorite: boolean
  onToggleFavorite: () => void
  onBack: () => void
}

export function CampsiteDetail({ campsite, reviews, isFavorite, onToggleFavorite, onBack }: CampsiteDetailProps) {
  return (
    <div>
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.95rem',
          color: '#2563eb',
          padding: 0,
          marginBottom: '1rem',
        }}
      >
        &larr; Back to all campsites
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>{campsite.name}</h2>
          <p style={{ margin: '0.25rem 0', color: '#6b7280' }}>
            {campsite.location}, {campsite.state}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={onToggleFavorite}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              background: isFavorite ? '#fef2f2' : '#fff',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            {isFavorite ? '❤️ Saved' : '🤍 Save'}
          </button>
          <span
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              background: campsite.available ? '#dcfce7' : '#fee2e2',
              color: campsite.available ? '#166534' : '#991b1b',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
          >
            {campsite.available ? 'Available' : 'Booked'}
          </span>
        </div>
      </div>

      {/* Info grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem',
          margin: '1.5rem 0',
          padding: '1.25rem',
          background: '#f9fafb',
          borderRadius: '12px',
        }}
      >
        <InfoItem label="Price" value={`$${campsite.pricePerNight}/night`} />
        <InfoItem label="Rating" value={`${campsite.rating} ★ (${campsite.reviewCount} reviews)`} />
        <InfoItem label="Type" value={campsite.type.charAt(0).toUpperCase() + campsite.type.slice(1)} />
        <InfoItem label="Max Guests" value={String(campsite.maxGuests)} />
        <InfoItem label="Check-in" value={campsite.checkIn} />
        <InfoItem label="Check-out" value={campsite.checkOut} />
        <InfoItem label="Pets" value={campsite.petFriendly ? 'Allowed 🐾' : 'Not allowed'} />
        <InfoItem label="Coordinates" value={`${campsite.lat.toFixed(2)}, ${campsite.lng.toFixed(2)}`} />
      </div>

      <h3>About</h3>
      <p style={{ color: '#374151', lineHeight: 1.6 }}>{campsite.description}</p>

      <h3>Amenities</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {campsite.amenities.map((amenity) => (
          <span
            key={amenity}
            style={{
              background: '#eff6ff',
              color: '#1d4ed8',
              padding: '0.3rem 0.75rem',
              borderRadius: '999px',
              fontSize: '0.85rem',
            }}
          >
            {amenity}
          </span>
        ))}
      </div>

      {/* Reviews */}
      <h3 style={{ marginTop: '2rem' }}>Reviews ({reviews.length})</h3>
      {reviews.length === 0 ? (
        <p style={{ color: '#9ca3af' }}>No reviews yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {reviews.map((review) => (
            <div
              key={review.id}
              style={{
                padding: '1rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                {review.authorWebsite ? (
                  <a href={review.authorWebsite} style={{ color: '#2563eb', fontWeight: 600 }}>
                    {review.author}
                  </a>
                ) : (
                  <strong>{review.author}</strong>
                )}
                <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{review.date}</span>
              </div>
              <div style={{ color: '#f59e0b', marginBottom: '0.25rem' }}>
                {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
              </div>
              <p style={{ margin: 0, color: '#374151', lineHeight: 1.5 }}>{review.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.95rem', fontWeight: 500, marginTop: '0.15rem' }}>{value}</div>
    </div>
  )
}
