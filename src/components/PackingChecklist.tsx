import { useState, useEffect } from 'react'

interface ChecklistItem {
  id: string
  label: string
  category: string
}

const ITEMS: ChecklistItem[] = [
  { id: 'tent', label: 'Tent', category: 'Shelter' },
  { id: 'bag', label: 'Sleeping bag', category: 'Shelter' },
  { id: 'pad', label: 'Sleeping pad', category: 'Shelter' },
  { id: 'stove', label: 'Camp stove', category: 'Cooking' },
  { id: 'cooler', label: 'Cooler', category: 'Cooking' },
  { id: 'water', label: 'Water bottles', category: 'Cooking' },
  { id: 'utensils', label: 'Utensils', category: 'Cooking' },
  { id: 'firstaid', label: 'First aid kit', category: 'Safety' },
  { id: 'light', label: 'Headlamp', category: 'Safety' },
  { id: 'map', label: 'Trail map', category: 'Safety' },
  { id: 'layers', label: 'Warm layers', category: 'Clothing' },
  { id: 'rain', label: 'Rain jacket', category: 'Clothing' },
  { id: 'boots', label: 'Hiking boots', category: 'Clothing' },
  { id: 'screen', label: 'Sunscreen', category: 'Personal' },
  { id: 'repel', label: 'Bug spray', category: 'Personal' },
]

export function PackingChecklist() {
  const [checked, setChecked] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('packing-checked')
    return saved ? new Set(JSON.parse(saved)) : new Set()
  })

  useEffect(() => {
    localStorage.setItem('packing-checked', JSON.stringify([...checked]))
  }, [checked])

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const categories = [...new Set(ITEMS.map((i) => i.category))]
  const progress = Math.round((checked.size / ITEMS.length) * 100)

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h4 style={{ margin: 0 }}>Packing Checklist</h4>
        <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{checked.size}/{ITEMS.length}</span>
      </div>
      <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, marginBottom: '0.75rem' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: '#059669', borderRadius: 3 }} />
      </div>
      {categories.map((cat) => (
        <div key={cat} style={{ marginBottom: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.2rem' }}>{cat}</div>
          {ITEMS.filter((i) => i.category === cat).map((item) => (
            <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.2rem 0', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input type="checkbox" checked={checked.has(item.id)} onChange={() => toggle(item.id)} />
              <span style={{ textDecoration: checked.has(item.id) ? 'line-through' : 'none', color: checked.has(item.id) ? '#9ca3af' : '#374151' }}>
                {item.label}
              </span>
            </label>
          ))}
        </div>
      ))}
      {checked.size > 0 && (
        <button
          onClick={() => setChecked(new Set())}
          style={{ marginTop: '0.5rem', background: 'none', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.3rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer', color: '#6b7280' }}
        >
          Reset
        </button>
      )}
    </div>
  )
}
