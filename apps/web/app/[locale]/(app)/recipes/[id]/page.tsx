import { createClient } from '@/utils/supabase/server'
import { prisma } from '@sous-chef/db'
import { redirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { deleteRecipe } from '../actions'

export const metadata: Metadata = { title: 'Recipe Detail' }

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile) redirect('/login')

  const recipe = await prisma.recipe.findFirst({
    where: { id, restaurantId: profile.restaurantId },
    include: {
      ingredients: {
        include: { ingredient: true },
      },
    },
  })
  if (!recipe) notFound()

  const totalCost = recipe.ingredients.reduce((sum, ri) => {
    const cost = ri.ingredient.costPerUnit ? Number(ri.ingredient.costPerUnit) * Number(ri.quantityPerPortion) : 0
    return sum + cost
  }, 0)

  return (
    <div style={{ padding: '32px', maxWidth: '700px' }}>
      <Link href="/recipes" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-text-muted)', textDecoration: 'none', marginBottom: '20px' }}>
        <ArrowLeft size={14} /> Back to Recipes
      </Link>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>{recipe.name}</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Yields {recipe.yieldPortions} portion{recipe.yieldPortions !== 1 ? 's' : ''}
          </p>
        </div>
        <form action={deleteRecipe.bind(null, recipe.id)}>
          <button type="submit" style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)',
            backgroundColor: 'transparent', color: 'var(--color-danger)',
            fontSize: '13px', cursor: 'pointer', transition: 'background 150ms',
          }}
            className="delete-btn"
          >
            <Trash2 size={14} /> Delete
          </button>
        </form>
      </div>

      {recipe.notes && (
        <p style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '10px', backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
          {recipe.notes}
        </p>
      )}

      {/* Ingredient list */}
      <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '28px', marginBottom: '12px' }}>
        Ingredients (per portion)
      </h2>

      <div style={{ border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={thStyle}>Ingredient</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Qty/portion</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Cost/portion</th>
            </tr>
          </thead>
          <tbody>
            {recipe.ingredients.map((ri, i) => (
              <tr key={ri.id} style={{ borderBottom: i < recipe.ingredients.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                <td style={tdStyle}>{ri.ingredient.name}</td>
                <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                  {Number(ri.quantityPerPortion)} {ri.ingredient.unit}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--color-text-muted)' }}>
                  {ri.ingredient.costPerUnit
                    ? `€${(Number(ri.ingredient.costPerUnit) * Number(ri.quantityPerPortion)).toFixed(2)}`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-2)' }}>
              <td colSpan={2} style={{ ...tdStyle, fontWeight: 600 }}>Total cost per portion</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: 'var(--color-brand-400)' }}>
                {totalCost > 0 ? `€${totalCost.toFixed(2)}` : '—'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
        <Link
          href={`/calculator?recipe=${recipe.id}`}
          style={{
            padding: '10px 20px', borderRadius: '10px',
            backgroundColor: 'var(--color-brand-500)', color: '#000',
            fontWeight: 600, fontSize: '13.5px', textDecoration: 'none',
            transition: 'background 150ms, transform 150ms',
          }}
          className="calc-btn"
        >
          Calculate Ingredient Needs →
        </Link>
      </div>

      <style>{`
        .delete-btn:hover { background: rgba(239,68,68,0.08) !important; }
        .calc-btn:hover { background: var(--color-brand-400) !important; }
        .calc-btn:active { transform: scale(0.97); }
      `}</style>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '10px 16px', textAlign: 'left', fontSize: '11px',
  fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
}
const tdStyle: React.CSSProperties = {
  padding: '12px 16px', fontSize: '13.5px', color: 'var(--color-text-primary)',
}
