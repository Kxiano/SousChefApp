import { createClient } from '@/utils/supabase/server'
import { prisma } from '@sous-chef/db'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Calculator, AlertTriangle, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'
import { markPrepared } from '../portions/actions'

export const metadata: Metadata = { title: 'Ingredient Calculator' }

export default async function CalculatorPage({
  searchParams,
}: {
  searchParams: Promise<{ recipe?: string; portions?: string }>
}) {
  const { recipe: recipeId, portions: portionsStr } = await searchParams
  const portionsNum = Math.max(parseFloat(portionsStr ?? '') || 1, 0.01)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile) redirect('/login')

  const restaurantId = profile.restaurantId

  const recipes = await prisma.recipe.findMany({
    where: { restaurantId },
    orderBy: { name: 'asc' },
    include: {
      ingredients: {
        include: { ingredient: true },
      },
    },
  })

  const selectedRecipe = recipeId ? recipes.find((r: any  ) => r.id === recipeId) : null

  // Calculate requirements if a recipe and portions are selected
  type RequirementRow = {
    ingredientId: string
    name: string
    unit: string
    required: number
    available: number
    cost: number | null
    isShort: boolean
  }
  let requirements: RequirementRow[] = []
  let totalCost = 0

  if (selectedRecipe) {
    requirements = selectedRecipe.ingredients.map((ri: any  ) => {
      const required = Number(ri.quantityPerPortion) * portionsNum
      const available = Number(ri.ingredient.quantity)
      const costPerUnit = ri.ingredient.costPerUnit ? Number(ri.ingredient.costPerUnit) : null
      const cost = costPerUnit ? costPerUnit * required : null
      // eslint-disable-next-line react-hooks/immutability
      if (cost) totalCost += cost
      return {
        ingredientId: ri.ingredientId,
        name: ri.ingredient.name,
        unit: ri.ingredient.unit,
        required,
        available,
        cost,
        isShort: available < required,
      }
    })
  }

  const hasShortage = requirements.some((r: any  ) => r.isShort)

  return (
    <div style={{ padding: '32px', maxWidth: '780px' }}>
      <PageHeader
        title="Ingredient Calculator"
        subtitle="See exactly what you need to prepare a recipe"
      />

      {/* Selector */}
      <form method="GET" style={{ marginTop: '28px', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Recipe</label>
          <select name="recipe" style={inputStyle} defaultValue={recipeId ?? ''}>
            <option value="">Select a recipe…</option>
            {recipes.map((r: any  ) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div style={{ width: '140px' }}>
          <label style={labelStyle}>Portions</label>
          <input
            name="portions"
            type="number"
            min="0.5"
            step="0.5"
            defaultValue={portionsNum}
            style={inputStyle}
          />
        </div>
        <button type="submit" style={primaryBtnStyle} className="calc-btn">
          <Calculator size={14} /> Calculate
        </button>
      </form>

      {/* Results */}
      {selectedRecipe && (
        <>
          <div style={{ marginTop: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={sectionHeadStyle}>
                {selectedRecipe.name} × {portionsNum} portion{portionsNum !== 1 ? 's' : ''}
              </h2>
              {totalCost > 0 && (
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-brand-400)' }}>
                  Est. cost: €{totalCost.toFixed(2)}
                </span>
              )}
            </div>

            {hasShortage && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 14px', borderRadius: '8px', marginBottom: '12px',
                backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                fontSize: '13px', color: 'var(--color-danger)',
              }}>
                <AlertTriangle size={14} />
                Some ingredients are below the required quantity.{' '}
                <Link href="/purchase-orders" style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                  Create a purchase order →
                </Link>
              </div>
            )}

            <div style={{ border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                    {['Ingredient', 'Required', 'In Stock', 'Cost', 'Status'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requirements.map((row, i) => (
                    <tr
                      key={row.ingredientId}
                      style={{
                        borderBottom: i < requirements.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                        backgroundColor: row.isShort ? 'rgba(239,68,68,0.04)' : 'transparent',
                      }}
                    >
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{row.name}</td>
                      <td style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>
                        {row.required.toFixed(2)} {row.unit}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: row.isShort ? 'var(--color-danger)' : 'var(--color-success)' }}>
                        {row.available.toFixed(2)} {row.unit}
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--color-text-muted)' }}>
                        {row.cost != null ? `€${row.cost.toFixed(2)}` : '—'}
                      </td>
                      <td style={{ ...tdStyle }}>
                        {row.isShort ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-danger)' }}>
                            <AlertTriangle size={12} /> Short {(row.required - row.available).toFixed(2)} {row.unit}
                          </span>
                        ) : (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-success)' }}>
                            <CheckCircle size={12} /> OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {totalCost > 0 && (
                  <tfoot>
                    <tr style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-2)' }}>
                      <td colSpan={3} style={{ ...tdStyle, fontWeight: 600 }}>Total estimated cost</td>
                      <td colSpan={2} style={{ ...tdStyle, fontWeight: 700, color: 'var(--color-brand-400)' }}>
                        €{totalCost.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Mark as prepared CTA */}
          {!hasShortage && (
            <div style={{ marginTop: '20px' }}>
              <form action={markPrepared.bind(null, selectedRecipe.id, portionsNum)}>
                <button type="submit" style={{ ...primaryBtnStyle, backgroundColor: 'var(--color-success)', gap: '8px' }} className="prepare-btn">
                  <CheckCircle size={16} />
                  Mark {portionsNum} Portion{portionsNum !== 1 ? 's' : ''} as Prepared
                </button>
              </form>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                This will deduct ingredients from stock and add to ready portions.
              </p>
            </div>
          )}
        </>
      )}

      {!selectedRecipe && (
        <div style={{ ...emptyStyle, marginTop: '28px' }}>
          Select a recipe and portions above to calculate required ingredients.
        </div>
      )}

      <style>{`
        .calc-btn:hover { opacity: 0.85 !important; }
        .prepare-btn:hover { opacity: 0.85 !important; }
        input::placeholder { color: var(--color-text-muted); }
        select option { background: var(--color-surface-2); }
      `}</style>
    </div>
  )
}

const sectionHeadStyle: React.CSSProperties = {
  fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em',
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
  display: 'flex', alignItems: 'center', gap: '6px',
  padding: '9px 18px', borderRadius: '8px', backgroundColor: 'var(--color-brand-500)',
  border: 'none', color: '#000', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
  transition: 'opacity 150ms', whiteSpace: 'nowrap',
}
const thStyle: React.CSSProperties = {
  padding: '10px 16px', textAlign: 'left', fontSize: '11px',
  fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
}
const tdStyle: React.CSSProperties = {
  padding: '12px 16px', fontSize: '13.5px', color: 'var(--color-text-primary)',
}
const emptyStyle: React.CSSProperties = {
  padding: '48px 24px', textAlign: 'center', borderRadius: '12px',
  border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)', fontSize: '14px',
}
