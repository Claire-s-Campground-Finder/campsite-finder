import { useState, useMemo } from 'react'

interface ReviewData {
  id: number
  campsiteId: number
  author: string
  rating: number
  title: string
  text: string
  date: string
  travelType: 'solo' | 'couple' | 'family' | 'friends'
  wouldRecommend: boolean
  ratings: {
    cleanliness: number
    location: number
    amenities: number
    value: number
  }
  helpfulCount: number
  response: { text: string; date: string } | null
}

interface ReviewListProps {
  reviews: ReviewData[]
  campsiteName: string
  onWriteReview: () => void
}

type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful'
type FilterRating = 0 | 1 | 2 | 3 | 4 | 5

export function ReviewList({ reviews, campsiteName, onWriteReview }: ReviewListProps) {
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [filterRating, setFilterRating] = useState<FilterRating>(0)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [helpedIds, setHelpedIds] = useState<Set<number>>(new Set())

  const ratingDistribution = useMemo(() => {
    const dist = [0, 0, 0, 0, 0]
    reviews.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++
    })
    return dist
  }, [reviews])

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
  }, [reviews])

  const categoryAverages = useMemo(() => {
    if (reviews.length === 0) return { cleanliness: 0, location: 0, amenities: 0, value: 0 }
    const totals = { cleanliness: 0, location: 0, amenities: 0, value: 0 }
    reviews.forEach((r) => {
      totals.cleanliness += r.ratings.cleanliness
      totals.location += r.ratings.location
      totals.amenities += r.ratings.amenities
      totals.value += r.ratings.value
    })
    return {
      cleanliness: totals.cleanliness / reviews.length,
      location: totals.location / reviews.length,
      amenities: totals.amenities / reviews.length,
      value: totals.value / reviews.length,
    }
  }, [reviews])

  const recommendPercent = useMemo(() => {
    if (reviews.length === 0) return 0
    return Math.round((reviews.filter((r) => r.wouldRecommend).length / reviews.length) * 100)
  }, [reviews])

  const sortedAndFiltered = useMemo(() => {
    let result = [...reviews]

    if (filterRating > 0) {
      result = result.filter((r) => r.rating === filterRating)
    }

    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => b.date.localeCompare(a.date))
        break
      case 'oldest':
        result.sort((a, b) => a.date.localeCompare(b.date))
        break
      case 'highest':
        result.sort((a, b) => b.rating - a.rating)
        break
      case 'lowest':
        result.sort((a, b) => a.rating - b.rating)
        break
      case 'helpful':
        result.sort((a, b) => b.helpfulCount - a.helpfulCount)
        break
    }

    return result
  }, [reviews, sortBy, filterRating])

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const markHelpful = (id: number) => {
    if (helpedIds.has(id)) return
    setHelpedIds((prev) => new Set(prev).add(id))
  }

  if (reviews.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
        <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No reviews yet for {campsiteName}</p>
        <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>Be the first to share your experience!</p>
        <button onClick={onWriteReview} style={primaryButtonStyle}>Write a Review</button>
      </div>
    )
  }

  return (
    <div>
      {/* Summary header */}
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {/* Overall score */}
        <div style={{ textAlign: 'center', minWidth: 100 }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#111827' }}>{averageRating.toFixed(1)}</div>
          <div style={{ color: '#f59e0b', fontSize: '1.1rem' }}>{'★'.repeat(Math.round(averageRating))}</div>
          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.15rem' }}>
            {reviews.length} review{reviews.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Rating distribution */}
        <div style={{ flex: 1, minWidth: 200 }}>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = ratingDistribution[star - 1]
            const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0
            return (
              <button
                key={star}
                onClick={() => setFilterRating(filterRating === star ? 0 : star as FilterRating)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  background: filterRating === star ? '#eff6ff' : 'none',
                  border: 'none',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
              >
                <span style={{ width: 20, textAlign: 'right' }}>{star}</span>
                <span style={{ color: '#f59e0b' }}>★</span>
                <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b', borderRadius: 4 }} />
                </div>
                <span style={{ width: 30, textAlign: 'right', color: '#6b7280' }}>{count}</span>
              </button>
            )
          })}
        </div>

        {/* Category averages */}
        <div style={{ minWidth: 160 }}>
          {Object.entries(categoryAverages).map(([key, avg]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.85rem' }}>
              <span style={{ color: '#6b7280', textTransform: 'capitalize' }}>{key}</span>
              <span style={{ fontWeight: 600 }}>{avg.toFixed(1)} ★</span>
            </div>
          ))}
          <div style={{ marginTop: '0.5rem', padding: '0.4rem', background: '#f0fdf4', borderRadius: '6px', fontSize: '0.8rem', textAlign: 'center', color: '#166534' }}>
            {recommendPercent}% recommend
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Rated</option>
            <option value="lowest">Lowest Rated</option>
            <option value="helpful">Most Helpful</option>
          </select>
          {filterRating > 0 && (
            <button
              onClick={() => setFilterRating(0)}
              style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '999px', padding: '0.25rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer', color: '#2563eb' }}
            >
              {filterRating} ★ only &times;
            </button>
          )}
          <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
            Showing {sortedAndFiltered.length} of {reviews.length}
          </span>
        </div>
        <button onClick={onWriteReview} style={primaryButtonStyle}>Write a Review</button>
      </div>

      {/* Review cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {sortedAndFiltered.map((review) => {
          const isExpanded = expandedIds.has(review.id)
          const isLong = review.text.length > 300
          const displayText = isLong && !isExpanded ? review.text.slice(0, 300) + '...' : review.text
          const wasHelped = helpedIds.has(review.id)

          return (
            <div key={review.id} style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '10px', background: '#fff' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div>
                  <strong style={{ fontSize: '0.95rem' }}>{review.author}</strong>
                  <span style={{ color: '#9ca3af', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                    {review.travelType} traveler
                  </span>
                </div>
                <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{review.date}</span>
              </div>

              {/* Rating and title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span style={{ color: '#f59e0b' }}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                <strong>{review.title}</strong>
              </div>

              {/* Text */}
              <p style={{ margin: '0.5rem 0', color: '#374151', lineHeight: 1.5, fontSize: '0.9rem' }}>
                {displayText}
              </p>
              {isLong && (
                <button
                  onClick={() => toggleExpanded(review.id)}
                  style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.85rem', padding: 0 }}
                >
                  {isExpanded ? 'Show less' : 'Read more'}
                </button>
              )}

              {/* Category ratings inline */}
              <div style={{ display: 'flex', gap: '1rem', margin: '0.5rem 0', flexWrap: 'wrap' }}>
                {Object.entries(review.ratings).map(([key, val]) => (
                  <span key={key} style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    <span style={{ textTransform: 'capitalize' }}>{key}</span>: <span style={{ color: '#f59e0b' }}>{val}★</span>
                  </span>
                ))}
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                {review.wouldRecommend && (
                  <span style={{ fontSize: '0.8rem', color: '#059669' }}>Recommends this campsite</span>
                )}
                <button
                  onClick={() => markHelpful(review.id)}
                  disabled={wasHelped}
                  style={{
                    background: 'none',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    padding: '0.2rem 0.6rem',
                    fontSize: '0.8rem',
                    cursor: wasHelped ? 'default' : 'pointer',
                    color: wasHelped ? '#059669' : '#6b7280',
                    marginLeft: 'auto',
                  }}
                >
                  {wasHelped ? 'Helpful!' : 'Helpful'} ({review.helpfulCount + (wasHelped ? 1 : 0)})
                </button>
              </div>

              {/* Manager response */}
              {review.response && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f9fafb', borderRadius: '8px', borderLeft: '3px solid #2563eb' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', color: '#2563eb' }}>
                    Campground Response
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#374151', lineHeight: 1.4 }}>{review.response.text}</p>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{review.response.date}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const primaryButtonStyle: React.CSSProperties = {
  padding: '0.45rem 1rem',
  borderRadius: '8px',
  border: 'none',
  background: '#2563eb',
  color: '#fff',
  fontWeight: 600,
  fontSize: '0.85rem',
  cursor: 'pointer',
}
