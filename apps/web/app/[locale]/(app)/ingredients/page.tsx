import { createClient } from '@/utils/supabase/server'
import { prisma } from '@sous-chef/db'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { AlertTriangle, Plus } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { createIngredient, deleteIngredient } from './actions'

export const metadata: Metadata = { title: 'Inventory' }

const UNITS = ['kg', 'g', 'L', 'mL', 'pcs', 'box', 'bag', 'bottle', 'can', 'portion']

export default async function IngredientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile) redirect('/login')

  const ingredients = await prisma.ingredient.findMany({
    where: { restaurantId: profile.restaurantId },
    orderBy: { name: 'asc' },
  })

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <PageHeader title="Ingredient Inventory" subtitle={`${ingredients.length} items tracked`} />

      {/* Add form */}
      <form
        action={createIngredient}
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto',
          gap: '8px',
          marginTop: '24px',
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: 'var(--color-surface-2)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          alignItems: 'end',
        }}
      >
        <div>
          <label style={labelStyle}>Name</label>
          <input name="name" required placeholder="e.g. Tomatoes" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Unit</label>
          <select name="unit" required style={inputStyle}>
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Quantity</label>
          <input name="quantity" type="number" step="0.01" min="0" placeholder="0" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Low stock at</label>
          <input name="lowStockThreshold" type="number" step="0.01" min="0" placeholder="0" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Cost/unit (€)</label>
          <input name="costPerUnit" type="number" step="0.01" min="0" placeholder="0.00" style={inputStyle} />
        </div>
        <button type="submit" style={addBtnStyle} className="add-btn">
          <Plus size={16} />
        </button>
      </form>

      {/* Table */}
      {ingredients.length === 0 ? (
        <Empty message="No ingredients yet. Add your first ingredient above." />
      ) : (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-2)' }}>
                {['Name', 'Unit', 'Stock', 'Low Stock', 'Cost/unit', ''].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ingredients.map((ing, i) => {
                const isLow = Number(ing.quantity) <= Number(ing.lowStockThreshold)
                return (
                  <tr
                    key={ing.id}
                    style={{
                      borderBottom: i < ingredients.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                      backgroundColor: isLow ? 'rgba(239,68,68,0.04)' : 'transparent',
                    }}
                  >
                    <td style={tdStyle}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isLow && <AlertTriangle size={14} color="var(--color-danger)" />}
                        <span style={{ fontWeight: 500 }}>{ing.name}</span>
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--color-text-muted)' }}>{ing.unit}</td>
                    <td style={{ ...tdStyle, color: isLow ? 'var(--color-danger)' : 'var(--color-text-primary)', fontWeight: 600 }}>
                      {Number(ing.quantity).toFixed(2)}
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--color-text-muted)' }}>
                      {Number(ing.lowStockThreshold).toFixed(2)}
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--color-text-muted)' }}>
                      {ing.costPerUnit ? `€${Number(ing.costPerUnit).toFixed(2)}` : '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <form action={deleteIngredient.bind(null, ing.id)}>
                        <button type="submit" style={deleteBtnStyle} className="delete-btn">Delete</button>
                      </form>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .add-btn:hover { background-color: var(--color-brand-400) !important; }
        .add-btn:active { transform: scale(0.95); }
        .delete-btn:hover { color: var(--color-danger) !important; }
        input::placeholder, textarea::placeholder { color: var(--color-text-muted); }
        select option { background: var(--color-surface-2); }
      `}</style>
    </div>
  )
}

function Empty({ message }: { message: string }) {
  return (
    <div style={{
      padding: '48px 24px', textAlign: 'center', borderRadius: '12px',
      border: '1px dashed var(--color-border)',
      color: 'var(--color-text-muted)', fontSize: '14px',
    }}>
      {message}
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
const addBtnStyle: React.CSSProperties = {
  padding: '9px 14px', borderRadius: '8px', backgroundColor: 'var(--color-brand-500)',
  border: 'none', color: '#000', cursor: 'pointer',
  transition: 'background 150ms, transform 150ms var(--ease-out-strong)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const deleteBtnStyle: React.CSSProperties = {
  fontSize: '12px', padding: '4px 10px', borderRadius: '6px',
  backgroundColor: 'transparent', border: '1px solid var(--color-border)',
  color: 'var(--color-text-muted)', cursor: 'pointer',
  transition: 'color 150ms, border-color 150ms',
}
const thStyle: React.CSSProperties = {
  padding: '10px 16px', textAlign: 'left', fontSize: '11px',
  fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
}
const tdStyle: React.CSSProperties = {
  padding: '12px 16px', fontSize: '13.5px', color: 'var(--color-text-primary)',
}
