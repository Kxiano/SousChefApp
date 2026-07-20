'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { createRecipe } from '../actions'

interface Ingredient {
  id: string
  name: string
  unit: string
}

interface NewRecipeClientProps {
  ingredients: Ingredient[]
}

export function NewRecipeClient({ ingredients }: NewRecipeClientProps) {
  const router = useRouter()
  const [rows, setRows] = useState<{ id: string; ingredientId: string; quantity: string }[]>([
    { id: Math.random().toString(), ingredientId: '', quantity: '' }
  ])

  const addRow = () => {
    setRows([...rows, { id: Math.random().toString(), ingredientId: '', quantity: '' }])
  }

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(r => r.id !== id))
    }
  }

  const updateRow = (id: string, field: 'ingredientId' | 'quantity', value: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  return (
    <div style={{ padding: '32px', maxWidth: '700px' }}>
      <Link href="/recipes" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-text-muted)', textDecoration: 'none', marginBottom: '20px' }}>
        <ArrowLeft size={14} /> Back to Recipes
      </Link>

      <PageHeader title="New Recipe" subtitle="Create a new recipe and its ingredient requirements" />

      <form action={createRecipe} style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Recipe Name</label>
            <input name="name" required placeholder="e.g. Tomato Soup" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Yield Portions</label>
            <input name="yieldPortions" type="number" min="1" defaultValue="1" required style={inputStyle} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Instructions / Notes (optional)</label>
          <textarea name="notes" placeholder="Recipe instructions, preparation tips..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        <div>
          <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
            Ingredients Required
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {rows.map((row, index) => {
              const selectedIng = ingredients.find(i => i.id === row.ingredientId)
              return (
                <div key={row.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ flex: 2 }}>
                    <select
                      name="ingredientId"
                      required
                      value={row.ingredientId}
                      onChange={e => updateRow(row.id, 'ingredientId', e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">Select ingredient…</option>
                      {ingredients.map(ing => (
                        <option key={ing.id} value={ing.id}>{ing.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      name="qtyPerPortion"
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      required
                      placeholder="Qty/portion"
                      value={row.quantity}
                      onChange={e => updateRow(row.id, 'quantity', e.target.value)}
                      style={inputStyle}
                    />
                    <span style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', minWidth: '40px' }}>
                      {selectedIng?.unit ?? '—'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length <= 1}
                    style={{
                      ...deleteBtnStyle,
                      opacity: rows.length <= 1 ? 0.3 : 1,
                      cursor: rows.length <= 1 ? 'not-allowed' : 'pointer'
                    }}
                    className="delete-btn"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={addRow}
            style={{
              marginTop: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'transparent',
              color: 'var(--color-text-secondary)',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'background 150ms'
            }}
            className="add-row-btn"
          >
            <Plus size={14} /> Add Ingredient
          </button>
        </div>

        <button type="submit" style={primaryBtnStyle} className="submit-btn">
          <Save size={16} /> Save Recipe
        </button>
      </form>

      <style>{`
        .delete-btn:hover:not(:disabled) { color: var(--color-danger) !important; border-color: rgba(239,68,68,0.3) !important; }
        .add-row-btn:hover { background: var(--color-surface-2) !important; color: var(--color-text-primary) !important; }
        .submit-btn:hover { background: var(--color-brand-400) !important; }
        .submit-btn:active { transform: scale(0.97); }
        select option { background: var(--color-surface-2); }
      `}</style>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 500,
  color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em',
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: '8px',
  backgroundColor: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)', fontSize: '13.5px', outline: 'none',
}
const primaryBtnStyle: React.CSSProperties = {
  marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  padding: '10px 20px', borderRadius: '10px', backgroundColor: 'var(--color-brand-500)',
  border: 'none', color: '#000', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
  transition: 'background 150ms, transform 150ms',
}
const deleteBtnStyle: React.CSSProperties = {
  display: 'flex', padding: '8px', borderRadius: '8px',
  backgroundColor: 'transparent', border: '1px solid var(--color-border)',
  color: 'var(--color-text-muted)', transition: 'color 150ms, border-color 150ms',
}
