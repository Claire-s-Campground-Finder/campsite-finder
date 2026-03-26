import { useState, useEffect } from 'react'

interface WeatherData {
  location: string
  tempF: number
  condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'foggy' | 'windy'
  humidity: number
  windMph: number
  uvIndex: number
  forecast: DayForecast[]
}

interface DayForecast {
  day: string
  highF: number
  lowF: number
  condition: WeatherData['condition']
  precipChance: number
}

interface WeatherWidgetProps {
  location: string
  lat: number
  lng: number
}

const CONDITION_ICONS: Record<WeatherData['condition'], string> = {
  sunny: '☀️',
  cloudy: '☁️',
  rainy: '🌧️',
  stormy: '⛈️',
  snowy: '❄️',
  foggy: '🌫️',
  windy: '💨',
}

const CONDITION_COLORS: Record<WeatherData['condition'], string> = {
  sunny: '#fbbf24',
  cloudy: '#9ca3af',
  rainy: '#60a5fa',
  stormy: '#6b7280',
  snowy: '#e0e7ff',
  foggy: '#d1d5db',
  windy: '#a5b4fc',
}

function generateMockWeather(location: string, lat: number): WeatherData {
  const baseTemp = Math.round(65 + (lat - 36) * -3 + (Math.random() * 10 - 5))
  const conditions: WeatherData['condition'][] = ['sunny', 'cloudy', 'rainy', 'sunny', 'windy', 'foggy']
  const condition = conditions[Math.floor(Math.random() * conditions.length)]
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

  return {
    location,
    tempF: baseTemp,
    condition,
    humidity: Math.round(40 + Math.random() * 40),
    windMph: Math.round(5 + Math.random() * 20),
    uvIndex: Math.round(3 + Math.random() * 8),
    forecast: days.map((day) => ({
      day,
      highF: baseTemp + Math.round(Math.random() * 8),
      lowF: baseTemp - Math.round(5 + Math.random() * 10),
      condition: conditions[Math.floor(Math.random() * conditions.length)],
      precipChance: Math.round(Math.random() * 60),
    })),
  }
}

export function WeatherWidget({ location, lat, lng }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => {
      setWeather(generateMockWeather(location, lat))
      setLoading(false)
    }, 600)
    return () => clearTimeout(timer)
  }, [location, lat, lng])

  if (loading) {
    return (
      <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '10px', textAlign: 'center', color: '#9ca3af' }}>
        Loading weather...
      </div>
    )
  }

  if (!weather) return null

  const campingScore = getCampingScore(weather)

  return (
    <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
      {/* Current conditions */}
      <div style={{ padding: '1rem', background: `linear-gradient(135deg, ${CONDITION_COLORS[weather.condition]}33, ${CONDITION_COLORS[weather.condition]}11)` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{weather.location}</div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{weather.tempF}°F</div>
            <div style={{ fontSize: '0.9rem', color: '#374151', textTransform: 'capitalize' }}>
              {CONDITION_ICONS[weather.condition]} {weather.condition}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#6b7280' }}>
            <div>Humidity: {weather.humidity}%</div>
            <div>Wind: {weather.windMph} mph</div>
            <div>UV: {weather.uvIndex}</div>
          </div>
        </div>

        {/* Camping score */}
        <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'rgba(255,255,255,0.7)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Camping Score:</span>
          <div style={{ flex: 1, height: 8, background: '#e5e7eb', borderRadius: 4 }}>
            <div style={{ width: `${campingScore}%`, height: '100%', background: campingScore >= 70 ? '#059669' : campingScore >= 40 ? '#f59e0b' : '#dc2626', borderRadius: 4 }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: campingScore >= 70 ? '#059669' : campingScore >= 40 ? '#f59e0b' : '#dc2626' }}>
            {campingScore}/100
          </span>
        </div>
      </div>

      {/* 5-day forecast */}
      <div style={{ display: 'flex', borderTop: '1px solid #e5e7eb' }}>
        {weather.forecast.map((day) => (
          <div key={day.day} style={{ flex: 1, padding: '0.5rem', textAlign: 'center', borderRight: '1px solid #f3f4f6', fontSize: '0.8rem' }}>
            <div style={{ fontWeight: 600, color: '#374151' }}>{day.day}</div>
            <div style={{ fontSize: '1.1rem', margin: '0.15rem 0' }}>{CONDITION_ICONS[day.condition]}</div>
            <div><span style={{ fontWeight: 600 }}>{day.highF}°</span> <span style={{ color: '#9ca3af' }}>{day.lowF}°</span></div>
            <div style={{ color: '#60a5fa', fontSize: '0.7rem' }}>{day.precipChance}%</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function getCampingScore(weather: WeatherData): number {
  let score = 100
  if (weather.tempF < 40) score -= 30
  else if (weather.tempF < 50) score -= 15
  else if (weather.tempF > 95) score -= 25
  else if (weather.tempF > 85) score -= 10
  if (weather.condition === 'rainy') score -= 25
  if (weather.condition === 'stormy') score -= 45
  if (weather.condition === 'snowy') score -= 35
  if (weather.windMph > 25) score -= 20
  else if (weather.windMph > 15) score -= 10
  if (weather.uvIndex > 8) score -= 10
  if (weather.humidity > 80) score -= 10
  return Math.max(0, Math.min(100, score))
}
