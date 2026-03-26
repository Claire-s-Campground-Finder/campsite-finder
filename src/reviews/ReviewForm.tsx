import { useState } from 'react'

interface ReviewFormProps {
  campsiteId: number
  campsiteName: string
  onSubmit: (review: ReviewSubmission) => void
  onCancel: () => void
}

interface ReviewSubmission {
  campsiteId: number
  author: string
  email: string
  rating: number
  title: string
  text: string
  visitDate: string
  travelType: 'solo' | 'couple' | 'family' | 'friends'
  wouldRecommend: boolean
  ratings: {
    cleanliness: number
    location: number
    amenities: number
    value: number
  }
}

const TRAVEL_TYPES = [
  { value: 'solo', label: 'Solo' },
  { value: 'couple', label: 'Couple' },
  { value: 'family', label: 'Family' },
  { value: 'friends', label: 'Friends' },
] as const

export function ReviewForm({ campsiteId, campsiteName, onSubmit, onCancel }: ReviewFormProps) {
  const [author, setAuthor] = useState('')
  const [email, setEmail] = useState('')
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [visitDate, setVisitDate] = useState('')
  const [travelType, setTravelType] = useState<ReviewSubmission['travelType']>('couple')
  const [wouldRecommend, setWouldRecommend] = useState(true)
  const [cleanliness, setCleanliness] = useState(0)
  const [location, setLocation] = useState(0)
  const [amenities, setAmenities] = useState(0)
  const [value, setValue] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [hoveredStar, setHoveredStar] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!author.trim()) newErrors.author = 'Name is required'
    if (author.trim().length > 50) newErrors.author = 'Name must be under 50 characters'

    if (!email.trim()) newErrors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Invalid email address'

    if (rating === 0) newErrors.rating = 'Please select an overall rating'
    if (rating < 1 || rating > 5) newErrors.rating = 'Rating must be between 1 and 5'

    if (!title.trim()) newErrors.title = 'Title is required'
    if (title.trim().length > 100) newErrors.title = 'Title must be under 100 characters'

    if (!text.trim()) newErrors.text = 'Review text is required'
    if (text.trim().length < 20) newErrors.text = 'Review must be at least 20 characters'
    if (text.trim().length > 2000) newErrors.text = 'Review must be under 2000 characters'

    if (!visitDate) newErrors.visitDate = 'Visit date is required'
    else {
      const visit = new Date(visitDate)
      const now = new Date()
      if (visit > now) newErrors.visitDate = 'Visit date cannot be in the future'
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      if (visit < oneYearAgo) newErrors.visitDate = 'Visit date must be within the last year'
    }

    if (cleanliness === 0) newErrors.cleanliness = 'Please rate cleanliness'
    if (location === 0) newErrors.location = 'Please rate location'
    if (amenities === 0) newErrors.amenities = 'Please rate amenities'
    if (value === 0) newErrors.value = 'Please rate value'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setIsSubmitting(true)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    onSubmit({
      campsiteId,
      author: author.trim(),
      email: email.trim(),
      rating,
      title: title.trim(),
      text: text.trim(),
      visitDate,
      travelType,
      wouldRecommend,
      ratings: { cleanliness, location, amenities, value },
    })

    setIsSubmitting(false)
  }

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem', background: '#fafafa' }}>
      <h3 style={{ margin: '0 0 0.25rem' }}>Write a Review</h3>
      <p style={{ margin: '0 0 1.25rem', color: '#6b7280', fontSize: '0.9rem' }}>
        Share your experience at {campsiteName}
      </p>

      {/* Overall rating */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>Overall Rating *</label>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.75rem',
                cursor: 'pointer',
                color: star <= (hoveredStar || rating) ? '#f59e0b' : '#d1d5db',
                transition: 'color 0.15s',
                padding: '0 2px',
              }}
            >
              ★
            </button>
          ))}
          {rating > 0 && (
            <span style={{ alignSelf: 'center', marginLeft: '0.5rem', color: '#6b7280', fontSize: '0.85rem' }}>
              {['', 'Terrible', 'Poor', 'Average', 'Good', 'Excellent'][rating]}
            </span>
          )}
        </div>
        {errors.rating && <span style={errorStyle}>{errors.rating}</span>}
      </div>

      {/* Category ratings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
        {[
          { label: 'Cleanliness', value: cleanliness, setter: setCleanliness, key: 'cleanliness' },
          { label: 'Location', value: location, setter: setLocation, key: 'location' },
          { label: 'Amenities', value: amenities, setter: setAmenities, key: 'amenities' },
          { label: 'Value', value: value, setter: setValue, key: 'value' },
        ].map((cat) => (
          <div key={cat.key}>
            <label style={{ ...labelStyle, fontSize: '0.8rem' }}>{cat.label} *</label>
            <div style={{ display: 'flex', gap: '0.15rem' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => cat.setter(star)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                    color: star <= cat.value ? '#f59e0b' : '#d1d5db',
                    padding: '0 1px',
                  }}
                >
                  ★
                </button>
              ))}
            </div>
            {errors[cat.key] && <span style={{ ...errorStyle, fontSize: '0.7rem' }}>{errors[cat.key]}</span>}
          </div>
        ))}
      </div>

      {/* Author and email */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <label style={labelStyle}>Your Name *</label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Jane Doe"
            style={inputStyle}
          />
          {errors.author && <span style={errorStyle}>{errors.author}</span>}
        </div>
        <div>
          <label style={labelStyle}>Email *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
            style={inputStyle}
          />
          {errors.email && <span style={errorStyle}>{errors.email}</span>}
        </div>
      </div>

      {/* Title */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>Review Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarize your experience"
          style={inputStyle}
        />
        {errors.title && <span style={errorStyle}>{errors.title}</span>}
      </div>

      {/* Review text */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>Your Review *</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tell others about your stay. What did you enjoy? What could be improved?"
          rows={5}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {errors.text && <span style={errorStyle}>{errors.text}</span>}
          <span style={{ fontSize: '0.75rem', color: text.length > 1800 ? '#dc2626' : '#9ca3af', marginLeft: 'auto' }}>
            {text.length}/2000
          </span>
        </div>
      </div>

      {/* Visit date and travel type */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <label style={labelStyle}>Visit Date *</label>
          <input
            type="date"
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            style={inputStyle}
          />
          {errors.visitDate && <span style={errorStyle}>{errors.visitDate}</span>}
        </div>
        <div>
          <label style={labelStyle}>Travel Type</label>
          <select
            value={travelType}
            onChange={(e) => setTravelType(e.target.value as ReviewSubmission['travelType'])}
            style={inputStyle}
          >
            {TRAVEL_TYPES.map((tt) => (
              <option key={tt.value} value={tt.value}>{tt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Would recommend */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={wouldRecommend}
            onChange={(e) => setWouldRecommend(e.target.checked)}
          />
          I would recommend this campsite to a friend
        </label>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={cancelButtonStyle}>Cancel</button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          style={{
            ...submitButtonStyle,
            opacity: isSubmitting ? 0.7 : 1,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '0.3rem',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.75rem',
  borderRadius: '8px',
  border: '1px solid #d1d5db',
  fontSize: '0.9rem',
  boxSizing: 'border-box',
}

const errorStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  color: '#dc2626',
  marginTop: '0.2rem',
}

const cancelButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1.25rem',
  borderRadius: '8px',
  border: '1px solid #d1d5db',
  background: '#fff',
  cursor: 'pointer',
  fontSize: '0.9rem',
}

const submitButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1.25rem',
  borderRadius: '8px',
  border: 'none',
  background: '#2563eb',
  color: '#fff',
  fontWeight: 600,
  fontSize: '0.9rem',
}
