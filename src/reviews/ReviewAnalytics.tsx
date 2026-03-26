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
}

interface ReviewAnalyticsProps {
  reviews: ReviewData[]
  campsiteName: string
}

type TimePeriod = '30d' | '90d' | '6m' | '1y' | 'all'
type TrendDirection = 'up' | 'down' | 'stable'

interface MonthlyStats {
  month: string
  count: number
  avgRating: number
  recommendRate: number
}

interface SentimentResult {
  positive: string[]
  negative: string[]
  neutral: string[]
}

interface TrendData {
  direction: TrendDirection
  change: number
  previousAvg: number
  currentAvg: number
}

export function ReviewAnalytics({ reviews, campsiteName }: ReviewAnalyticsProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all')
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'sentiment' | 'comparison'>('overview')

  const filteredReviews = useMemo(() => {
    if (timePeriod === 'all') return reviews
    const now = new Date()
    const cutoff = new Date()
    switch (timePeriod) {
      case '30d': cutoff.setDate(now.getDate() - 30); break
      case '90d': cutoff.setDate(now.getDate() - 90); break
      case '6m': cutoff.setMonth(now.getMonth() - 6); break
      case '1y': cutoff.setFullYear(now.getFullYear() - 1); break
    }
    return reviews.filter((r) => new Date(r.date) >= cutoff)
  }, [reviews, timePeriod])

  const overallStats = useMemo(() => {
    if (filteredReviews.length === 0) {
      return { avgRating: 0, totalReviews: 0, recommendRate: 0, avgHelpful: 0, responseRate: 0 }
    }
    const avgRating = filteredReviews.reduce((s, r) => s + r.rating, 0) / filteredReviews.length
    const recommendRate = (filteredReviews.filter((r) => r.wouldRecommend).length / filteredReviews.length) * 100
    const avgHelpful = filteredReviews.reduce((s, r) => s + r.helpfulCount, 0) / filteredReviews.length
    return {
      avgRating: Math.round(avgRating * 100) / 100,
      totalReviews: filteredReviews.length,
      recommendRate: Math.round(recommendRate),
      avgHelpful: Math.round(avgHelpful * 10) / 10,
      responseRate: 0,
    }
  }, [filteredReviews])

  const categoryBreakdown = useMemo(() => {
    if (filteredReviews.length === 0) return []
    const categories = ['cleanliness', 'location', 'amenities', 'value'] as const
    return categories.map((cat) => {
      const avg = filteredReviews.reduce((s, r) => s + r.ratings[cat], 0) / filteredReviews.length
      const distribution = [0, 0, 0, 0, 0]
      filteredReviews.forEach((r) => {
        const val = r.ratings[cat]
        if (val >= 1 && val <= 5) distribution[val - 1]++
      })
      return {
        name: cat,
        average: Math.round(avg * 100) / 100,
        distribution,
        trend: calculateCategoryTrend(reviews, cat),
      }
    })
  }, [filteredReviews, reviews])

  const travelTypeBreakdown = useMemo(() => {
    const types = ['solo', 'couple', 'family', 'friends'] as const
    return types.map((type) => {
      const typeReviews = filteredReviews.filter((r) => r.travelType === type)
      const count = typeReviews.length
      const avgRating = count > 0 ? typeReviews.reduce((s, r) => s + r.rating, 0) / count : 0
      const pct = filteredReviews.length > 0 ? (count / filteredReviews.length) * 100 : 0
      return {
        type,
        count,
        percentage: Math.round(pct),
        avgRating: Math.round(avgRating * 10) / 10,
      }
    })
  }, [filteredReviews])

  const monthlyStats = useMemo((): MonthlyStats[] => {
    const grouped = new Map<string, ReviewData[]>()
    filteredReviews.forEach((r) => {
      const month = r.date.slice(0, 7)
      const existing = grouped.get(month) ?? []
      existing.push(r)
      grouped.set(month, existing)
    })

    return Array.from(grouped.entries())
      .map(([month, revs]) => ({
        month,
        count: revs.length,
        avgRating: Math.round((revs.reduce((s, r) => s + r.rating, 0) / revs.length) * 10) / 10,
        recommendRate: Math.round((revs.filter((r) => r.wouldRecommend).length / revs.length) * 100),
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }, [filteredReviews])

  const sentiment = useMemo((): SentimentResult => {
    const positiveKeywords = ['amazing', 'beautiful', 'perfect', 'love', 'fantastic', 'incredible', 'stunning', 'wonderful', 'excellent', 'great', 'best', 'recommend', 'clean', 'friendly', 'peaceful', 'quiet']
    const negativeKeywords = ['dirty', 'noisy', 'expensive', 'crowded', 'broken', 'poor', 'terrible', 'worst', 'disappointing', 'rude', 'overpriced', 'bug', 'mosquito', 'cold', 'hot', 'uncomfortable']

    const foundPositive = new Map<string, number>()
    const foundNegative = new Map<string, number>()

    filteredReviews.forEach((r) => {
      const words = r.text.toLowerCase().split(/\s+/)
      words.forEach((word) => {
        const clean = word.replace(/[^a-z]/g, '')
        if (positiveKeywords.includes(clean)) {
          foundPositive.set(clean, (foundPositive.get(clean) ?? 0) + 1)
        }
        if (negativeKeywords.includes(clean)) {
          foundNegative.set(clean, (foundNegative.get(clean) ?? 0) + 1)
        }
      })
    })

    const sortByCount = (map: Map<string, number>) =>
      Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([word]) => word)

    return {
      positive: sortByCount(foundPositive).slice(0, 10),
      negative: sortByCount(foundNegative).slice(0, 10),
      neutral: [],
    }
  }, [filteredReviews])

  const ratingTrend = useMemo((): TrendData => {
    if (monthlyStats.length < 2) return { direction: 'stable', change: 0, previousAvg: 0, currentAvg: 0 }
    const recent = monthlyStats.slice(-3)
    const older = monthlyStats.slice(0, -3)
    const currentAvg = recent.reduce((s, m) => s + m.avgRating, 0) / recent.length
    const previousAvg = older.length > 0 ? older.reduce((s, m) => s + m.avgRating, 0) / older.length : currentAvg
    const change = currentAvg - previousAvg
    return {
      direction: change > 0.1 ? 'up' : change < -0.1 ? 'down' : 'stable',
      change: Math.round(Math.abs(change) * 100) / 100,
      previousAvg: Math.round(previousAvg * 100) / 100,
      currentAvg: Math.round(currentAvg * 100) / 100,
    }
  }, [monthlyStats])

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Review Analytics — {campsiteName}</h3>
        <select
          value={timePeriod}
          onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
          style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
        >
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="6m">Last 6 months</option>
          <option value="1y">Last year</option>
          <option value="all">All time</option>
        </select>
      </div>

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: '0.25rem', background: '#f3f4f6', borderRadius: '8px', padding: '0.25rem', marginBottom: '1.25rem' }}>
        {(['overview', 'trends', 'sentiment', 'comparison'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '0.4rem',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === tab ? '#fff' : 'transparent',
              boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              fontWeight: activeTab === tab ? 600 : 400,
              fontSize: '0.85rem',
              textTransform: 'capitalize',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div>
          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <KpiCard label="Avg Rating" value={`${overallStats.avgRating}`} suffix="/ 5" color="#f59e0b" />
            <KpiCard label="Total Reviews" value={`${overallStats.totalReviews}`} color="#2563eb" />
            <KpiCard label="Recommend" value={`${overallStats.recommendRate}%`} color="#059669" />
            <KpiCard label="Avg Helpful" value={`${overallStats.avgHelpful}`} suffix="votes" color="#8b5cf6" />
          </div>

          {/* Category breakdown */}
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem' }}>Rating Categories</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {categoryBreakdown.map((cat) => (
              <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ width: 90, fontSize: '0.85rem', color: '#374151', textTransform: 'capitalize' }}>{cat.name}</span>
                <div style={{ flex: 1, height: 10, background: '#f3f4f6', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${(cat.average / 5) * 100}%`, height: '100%', background: '#f59e0b', borderRadius: 5 }} />
                </div>
                <span style={{ width: 35, fontSize: '0.85rem', fontWeight: 600, textAlign: 'right' }}>{cat.average}</span>
                <span style={{ fontSize: '0.75rem', color: cat.trend.direction === 'up' ? '#059669' : cat.trend.direction === 'down' ? '#dc2626' : '#9ca3af' }}>
                  {cat.trend.direction === 'up' ? '↑' : cat.trend.direction === 'down' ? '↓' : '→'}
                </span>
              </div>
            ))}
          </div>

          {/* Travel type breakdown */}
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem' }}>By Travel Type</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem' }}>
            {travelTypeBreakdown.map((tt) => (
              <div key={tt.type} style={{ padding: '0.75rem', background: '#f9fafb', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'capitalize', marginBottom: '0.25rem' }}>{tt.type}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{tt.avgRating} ★</div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{tt.count} reviews ({tt.percentage}%)</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trends tab */}
      {activeTab === 'trends' && (
        <div>
          {/* Rating trend indicator */}
          <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '10px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
              background: ratingTrend.direction === 'up' ? '#dcfce7' : ratingTrend.direction === 'down' ? '#fee2e2' : '#f3f4f6',
            }}>
              {ratingTrend.direction === 'up' ? '📈' : ratingTrend.direction === 'down' ? '📉' : '➡️'}
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>
                Rating is {ratingTrend.direction === 'up' ? 'improving' : ratingTrend.direction === 'down' ? 'declining' : 'stable'}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                {ratingTrend.previousAvg} → {ratingTrend.currentAvg} ({ratingTrend.direction === 'stable' ? 'no change' : `${ratingTrend.change} ${ratingTrend.direction === 'up' ? 'increase' : 'decrease'}`})
              </div>
            </div>
          </div>

          {/* Monthly chart (simple bar chart) */}
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem' }}>Monthly Review Volume & Rating</h4>
          {monthlyStats.length === 0 ? (
            <p style={{ color: '#9ca3af', textAlign: 'center' }}>No data for selected period</p>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', height: 180, padding: '0 0.5rem' }}>
              {monthlyStats.map((ms) => {
                const maxCount = Math.max(...monthlyStats.map((m) => m.count), 1)
                const barHeight = (ms.count / maxCount) * 140
                return (
                  <div key={ms.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>{ms.avgRating}★</span>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: 40,
                        height: barHeight,
                        background: ms.avgRating >= 4.5 ? '#059669' : ms.avgRating >= 4 ? '#f59e0b' : ms.avgRating >= 3 ? '#f97316' : '#dc2626',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.3s',
                      }}
                      title={`${ms.month}: ${ms.count} reviews, avg ${ms.avgRating}`}
                    />
                    <span style={{ fontSize: '0.65rem', color: '#9ca3af', writingMode: 'vertical-lr', transform: 'rotate(180deg)', height: 30 }}>
                      {ms.month.slice(5)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Sentiment tab */}
      {activeTab === 'sentiment' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <h4 style={{ margin: '0 0 0.5rem', color: '#059669', fontSize: '0.95rem' }}>Top Positive Keywords</h4>
              {sentiment.positive.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No keywords found</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {sentiment.positive.map((word, i) => (
                    <span key={word} style={{
                      padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.8rem',
                      background: '#dcfce7', color: '#166534',
                      opacity: 1 - (i * 0.06),
                    }}>
                      {word}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h4 style={{ margin: '0 0 0.5rem', color: '#dc2626', fontSize: '0.95rem' }}>Top Negative Keywords</h4>
              {sentiment.negative.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No keywords found</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {sentiment.negative.map((word, i) => (
                    <span key={word} style={{
                      padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.8rem',
                      background: '#fee2e2', color: '#991b1b',
                      opacity: 1 - (i * 0.06),
                    }}>
                      {word}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sentiment ratio */}
          <div style={{ marginTop: '1.25rem' }}>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>Sentiment Balance</h4>
            {(() => {
              const total = sentiment.positive.length + sentiment.negative.length
              const positivePct = total > 0 ? (sentiment.positive.length / total) * 100 : 50
              return (
                <div>
                  <div style={{ display: 'flex', height: 24, borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ width: `${positivePct}%`, background: '#059669', transition: 'width 0.3s' }} />
                    <div style={{ flex: 1, background: '#dc2626' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    <span>{Math.round(positivePct)}% positive</span>
                    <span>{Math.round(100 - positivePct)}% negative</span>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Comparison tab */}
      {activeTab === 'comparison' && (
        <div>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem' }}>Rating Heatmap by Travel Type & Category</h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Travel Type</th>
                  <th style={thStyle}>Overall</th>
                  <th style={thStyle}>Cleanliness</th>
                  <th style={thStyle}>Location</th>
                  <th style={thStyle}>Amenities</th>
                  <th style={thStyle}>Value</th>
                  <th style={thStyle}>Count</th>
                </tr>
              </thead>
              <tbody>
                {(['solo', 'couple', 'family', 'friends'] as const).map((type) => {
                  const typeRevs = filteredReviews.filter((r) => r.travelType === type)
                  if (typeRevs.length === 0) return null
                  const avg = (field: 'cleanliness' | 'location' | 'amenities' | 'value') =>
                    Math.round((typeRevs.reduce((s, r) => s + r.ratings[field], 0) / typeRevs.length) * 10) / 10
                  const overall = Math.round((typeRevs.reduce((s, r) => s + r.rating, 0) / typeRevs.length) * 10) / 10

                  return (
                    <tr key={type}>
                      <td style={{ ...tdStyle, textTransform: 'capitalize', fontWeight: 600 }}>{type}</td>
                      <td style={{ ...tdStyle, ...heatmapColor(overall) }}>{overall}</td>
                      <td style={{ ...tdStyle, ...heatmapColor(avg('cleanliness')) }}>{avg('cleanliness')}</td>
                      <td style={{ ...tdStyle, ...heatmapColor(avg('location')) }}>{avg('location')}</td>
                      <td style={{ ...tdStyle, ...heatmapColor(avg('amenities')) }}>{avg('amenities')}</td>
                      <td style={{ ...tdStyle, ...heatmapColor(avg('value')) }}>{avg('value')}</td>
                      <td style={tdStyle}>{typeRevs.length}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, suffix, color }: { label: string; value: string; suffix?: string; color: string }) {
  return (
    <div style={{ padding: '0.75rem', background: '#fff', borderRadius: '8px', border: '1px solid #f3f4f6', textAlign: 'center' }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color }}>
        {value}
        {suffix && <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#9ca3af', marginLeft: '0.25rem' }}>{suffix}</span>}
      </div>
      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{label}</div>
    </div>
  )
}

function calculateCategoryTrend(reviews: ReviewData[], category: 'cleanliness' | 'location' | 'amenities' | 'value'): TrendData {
  if (reviews.length < 4) return { direction: 'stable', change: 0, previousAvg: 0, currentAvg: 0 }
  const sorted = [...reviews].sort((a, b) => a.date.localeCompare(b.date))
  const mid = Math.floor(sorted.length / 2)
  const first = sorted.slice(0, mid)
  const second = sorted.slice(mid)
  const avgFirst = first.reduce((s, r) => s + r.ratings[category], 0) / first.length
  const avgSecond = second.reduce((s, r) => s + r.ratings[category], 0) / second.length
  const change = avgSecond - avgFirst
  return {
    direction: change > 0.2 ? 'up' : change < -0.2 ? 'down' : 'stable',
    change: Math.round(Math.abs(change) * 100) / 100,
    previousAvg: Math.round(avgFirst * 100) / 100,
    currentAvg: Math.round(avgSecond * 100) / 100,
  }
}

function heatmapColor(rating: number): React.CSSProperties {
  if (rating >= 4.5) return { background: '#dcfce7', color: '#166534', fontWeight: 600 }
  if (rating >= 4.0) return { background: '#fef9c3', color: '#854d0e', fontWeight: 600 }
  if (rating >= 3.0) return { background: '#ffedd5', color: '#9a3412', fontWeight: 600 }
  return { background: '#fee2e2', color: '#991b1b', fontWeight: 600 }
}

const thStyle: React.CSSProperties = {
  padding: '0.5rem',
  textAlign: 'center',
  borderBottom: '2px solid #e5e7eb',
  color: '#6b7280',
  fontSize: '0.8rem',
}

const tdStyle: React.CSSProperties = {
  padding: '0.5rem',
  textAlign: 'center',
  borderBottom: '1px solid #f3f4f6',
}
