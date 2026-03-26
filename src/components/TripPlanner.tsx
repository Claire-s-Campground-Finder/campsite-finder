import { useState } from 'react'

interface TripDay {
  id: number
  date: string
  campsite: string
  activities: string[]
}

export function TripPlanner() {
  const [days, setDays] = useState<TripDay[]>([])
  const [startDate, setStartDate] = useState('')
  const [numDays, setNumDays] = useState(3)

  const generateDays = () => {
    if (!startDate) return
    const start = new Date(startDate)
    const newDays: TripDay[] = []
    for (let i = 0; i < numDays; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      newDays.push({ id: i, date: d.toISOString().split('T')[0], campsite: '', activities: [] })
    }
    setDays(newDays)
  }

  const updateCampsite = (id: number, value: string) => {
    setDays((prev) => prev.map((d) => (d.id === id ? { ...d, campsite: value } : d)))
  }

  const addActivity = (dayId: number, activity: string) => {
    if (!activity.trim()) return
    setDays((prev) =>
      prev.map((d) => (d.id === dayId ? { ...d, activities: [...d.activities, activity.trim()] } : d))
    )
  }

  const removeActivity = (dayId: number, index: number) => {
    setDays((prev) =>
      prev.map((d) => (d.id === dayId ? { ...d, activities: d.activities.filter((_, i) => i !== index) } : d))
    )
  }

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem' }}>
      <h3 style={{ margin: '0 0 1rem' }}>Trip Planner</h3>
      {days.length === 0 ? (
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div>
            <label style={labelStyle}>Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Days</label>
            <select value={numDays} onChange={(e) => setNumDays(Number(e.target.value))} style={inputStyle}>
              {[1, 2, 3, 5, 7].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <button onClick={generateDays} style={btnStyle}>Plan Trip</button>
        </div>
      ) : (
        <>
          <button onClick={() => setDays([])} style={{ ...btnStyle, background: '#fff', color: '#6b7280', border: '1px solid #d1d5db', marginBottom: '0.75rem' }}>Start Over</button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {days.map((day) => (
              <DayCard key={day.id} day={day} onUpdateCampsite={updateCampsite} onAddActivity={addActivity} onRemoveActivity={removeActivity} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function DayCard({ day, onUpdateCampsite, onAddActivity, onRemoveActivity }: {
  day: TripDay
  onUpdateCampsite: (id: number, val: string) => void
  onAddActivity: (id: number, val: string) => void
  onRemoveActivity: (id: number, idx: number) => void
}) {
  const [act, setAct] = useState('')
  const label = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div style={{ padding: '0.75rem', background: '#f9fafb', borderRadius: '8px' }}>
      <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>Day {day.id + 1} — {label}</div>
      <input type="text" placeholder="Campsite" value={day.campsite} onChange={(e) => onUpdateCampsite(day.id, e.target.value)} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', marginBottom: '0.3rem' }} />
      <div style={{ display: 'flex', gap: '0.3rem' }}>
        <input type="text" placeholder="Add activity" value={act} onChange={(e) => setAct(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { onAddActivity(day.id, act); setAct('') } }} style={{ ...inputStyle, flex: 1 }} />
        <button onClick={() => { onAddActivity(day.id, act); setAct('') }} style={{ ...btnStyle, padding: '0.4rem 0.6rem' }}>+</button>
      </div>
      {day.activities.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.3rem' }}>
          {day.activities.map((a, i) => (
            <span key={i} style={{ background: '#eff6ff', color: '#1d4ed8', padding: '0.1rem 0.4rem', borderRadius: '999px', fontSize: '0.8rem' }}>
              {a} <button onClick={() => onRemoveActivity(day.id, i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#93c5fd', padding: 0 }}>&times;</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.2rem' }
const inputStyle: React.CSSProperties = { padding: '0.45rem 0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }
const btnStyle: React.CSSProperties = { padding: '0.45rem 0.9rem', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }
