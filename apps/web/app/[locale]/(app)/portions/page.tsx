import { createClient } from '@/utils/supabase/server'
import { prisma } from '@sous-chef/db'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { UtensilsCrossed, CheckCircle } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { markPreparedAction, recordSaleAction } from './actions'

export const metadata: Metadata = { title: 'Ready Portions' }

export default async function PortionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile) redirect('/login')

  const restaurantId = profile.restaurantId

  const [recipes, portions] = await Promise.all([
    prisma.recipe.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
    }),
    prisma.readyPortion.findMany({
      where: { restaurantId },
      include: { recipe: true },
    }),
  ])

  // Today's sales
  const todaySales = await prisma.salesEvent.groupBy({
    by: ['recipeId', 'eventType'],
    where: {
      restaurantId,
      recordedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    },
    _sum: { quantity: true },
  })

  const salesByRecipe = new Map<string, { sold: number; discarded: number }>()
  for (const s of todaySales) {
    const entry = salesByRecipe.get(s.recipeId) ?? { sold: 0, discarded: 0 }
    if (s.eventType === 'sold') entry.sold += Number(s._sum.quantity ?? 0)
    if (s.eventType === 'discarded') entry.discarded += Number(s._sum.quantity ?? 0)
    salesByRecipe.set(s.recipeId, entry)
  }

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <PageHeader
        title="Ready Portions"
        subtitle="Track prepared stock and log sales"
      />

      {/* Mark as prepared */}
      <section style={{ marginTop: '28px' }}>
        <h2 style={sectionHeadStyle}>Mark as Prepared</h2>
        <form
          action={markPreparedAction}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 140px auto',
            gap: '8px',
            padding: '16px',
            backgroundColor: 'var(--color-surface-2)',
            borderRadius: '12px',
            border: '1px solid var(--color-border)',
            alignItems: 'end',
          }}
        >
          <div>
            <label style={labelStyle}>Recipe</label>
            <select name="recipeId" required style={inputStyle}>
              <option value="">Select a recipe…</option>
              {recipes.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Portions prepared</label>
            <input name="portions" type="number" min="0.01" step="0.01" placeholder="0" required style={inputStyle} />
          </div>
          <button type="submit" style={primaryBtnStyle} className="action-btn">
            <CheckCircle size={15} /> Prepare
          </button>
        </form>
      </section>

      {/* Portions table */}
      <section style={{ marginTop: '32px' }}>
        <h2 style={sectionHeadStyle}>Current Stock</h2>
        {portions.length === 0 ? (
          <div style={emptyStyle}>No prepared portions yet. Use the form above to mark a recipe as prepared.</div>
        ) : (
          <div style={{ border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                  {['Recipe', 'Ready', 'Sold Today', 'Discarded Today', 'Log Sale'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {portions.map((p, i) => {
                  const stats = salesByRecipe.get(p.recipeId) ?? { sold: 0, discarded: 0 }
                  const qty = Number(p.quantity)
                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: i < portions.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                      }}
                    >
                      <td style={{ ...tdStyle, fontWeight: 500 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <UtensilsCrossed size={14} color="var(--color-brand-400)" />
                          {p.recipe.name}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: qty === 0 ? 'var(--color-text-muted)' : 'var(--color-success)' }}>
                        {qty.toFixed(0)}
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>{stats.sold}</td>
                      <td style={{ ...tdStyle, color: 'var(--color-text-muted)' }}>{stats.discarded}</td>
                      <td style={{ ...tdStyle }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <form action={recordSaleAction}>
                            <input type="hidden" name="recipeId" value={p.recipeId} />
                            <input type="hidden" name="type" value="sold" />
                            <input name="qty" type="number" min="1" defaultValue="1" style={{ ...inputStyle, width: '60px', padding: '4px 8px', fontSize: '12px' }} />
                            <button type="submit" style={successBtnStyle} className="sell-btn">Sold</button>
                          </form>
                          <form action={recordSaleAction}>
                            <input type="hidden" name="recipeId" value={p.recipeId} />
                            <input type="hidden" name="type" value="discarded" />
                            <input name="qty" type="number" min="1" defaultValue="1" style={{ ...inputStyle, width: '60px', padding: '4px 8px', fontSize: '12px' }} />
                            <button type="submit" style={dangerBtnStyle} className="discard-btn">Discard</button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <style>{`
        .action-btn:hover { opacity: 0.85 !important; }
        .sell-btn:hover { background: var(--color-success) !important; color: #000 !important; }
        .discard-btn:hover { background: var(--color-danger) !important; color: #fff !important; }
        input::placeholder { color: var(--color-text-muted); }
        select option { background: var(--color-surface-2); }
      `}</style>
    </div>
  )
}

const sectionHeadStyle: React.CSSProperties = {
  fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px',
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
  padding: '9px 16px', borderRadius: '8px', backgroundColor: 'var(--color-brand-500)',
  border: 'none', color: '#000', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
  transition: 'opacity 150ms', whiteSpace: 'nowrap',
}
const successBtnStyle: React.CSSProperties = {
  marginTop: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
  backgroundColor: 'transparent', border: '1px solid var(--color-success)',
  color: 'var(--color-success)', cursor: 'pointer', transition: 'background 150ms, color 150ms',
}
const dangerBtnStyle: React.CSSProperties = {
  marginTop: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
  backgroundColor: 'transparent', border: '1px solid var(--color-danger)',
  color: 'var(--color-danger)', cursor: 'pointer', transition: 'background 150ms, color 150ms',
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
