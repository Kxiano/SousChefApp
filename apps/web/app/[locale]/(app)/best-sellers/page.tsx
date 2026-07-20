import { createClient } from '@/utils/supabase/server'
import { prisma } from '@sous-chef/db'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { TrendingUp, Medal } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { recordManualSale } from './actions'

export const metadata: Metadata = { title: 'Best Sellers' }

type Period = 'today' | 'week' | 'month' | 'all'

function getPeriodStart(period: Period): Date | null {
  const now = new Date()
  if (period === 'today') return new Date(now.setHours(0, 0, 0, 0))
  if (period === 'week') {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d
  }
  if (period === 'month') {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d
  }
  return null
}

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']

export default async function BestSellersPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period: rawPeriod } = await searchParams
  const period: Period = (['today', 'week', 'month', 'all'].includes(rawPeriod ?? '') ? rawPeriod : 'week') as Period

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile) redirect('/login')

  const restaurantId = profile.restaurantId
  const periodStart = getPeriodStart(period)

  const [recipes, sales] = await Promise.all([
    prisma.recipe.findMany({ where: { restaurantId }, orderBy: { name: 'asc' } }),
    prisma.salesEvent.groupBy({
      by: ['recipeId'],
      where: {
        restaurantId,
        eventType: 'sold',
        ...(periodStart ? { recordedAt: { gte: periodStart } } : {}),
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
    }),
  ])

  const recipeMap = new Map<string, any>(recipes.map((r: { id: string; name: string }) => [r.id, r]))
  const maxSales = Number(sales[0]?._sum.quantity ?? 1)

  return (
    <div style={{ padding: '32px', maxWidth: '820px' }}>
      <PageHeader
        title="Best Sellers"
        subtitle="Sales ranking by recipe"
      />

      {/* Period tabs */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '24px' }}>
        {(['today', 'week', 'month', 'all'] as Period[]).map(p => (
          <a
            key={p}
            href={`?period=${p}`}
            style={{
              padding: '6px 14px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 500,
              textDecoration: 'none', transition: 'background 150ms, color 150ms',
              backgroundColor: period === p ? 'var(--color-brand-500)' : 'var(--color-surface-2)',
              color: period === p ? '#000' : 'var(--color-text-secondary)',
              border: period === p ? 'none' : '1px solid var(--color-border)',
            }}
          >
            {p === 'today' ? 'Today' : p === 'week' ? 'Last 7 days' : p === 'month' ? 'Last 30 days' : 'All time'}
          </a>
        ))}
      </div>

      {/* Ranking */}
      {sales.length === 0 ? (
        <div style={{ ...emptyStyle, marginTop: '28px' }}>No sales data for this period. Log some sales below.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '24px' }}>
          {sales.map((entry: any, i: number) => {
            const recipe = recipeMap.get(entry.recipeId)
            if (!recipe) return null
            const qty = Number(entry._sum.quantity ?? 0)
            const pct = Math.round((qty / maxSales) * 100)
            return (
              <div
                key={entry.recipeId}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 16px', borderRadius: '12px',
                  backgroundColor: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {/* Rank */}
                <div style={{
                  width: '32px', flexShrink: 0, textAlign: 'center',
                  fontSize: i < 3 ? '18px' : '14px',
                  color: i < 3 ? MEDAL_COLORS[i] : 'var(--color-text-muted)',
                  fontWeight: 700,
                }}>
                  {i < 3 ? <Medal size={20} style={{ color: MEDAL_COLORS[i] }} /> : `#${i + 1}`}
                </div>

                {/* Name + bar */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {recipe.name}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: i === 0 ? 'var(--color-brand-400)' : 'var(--color-text-secondary)' }}>
                      {qty.toFixed(0)} sold
                    </span>
                  </div>
                  <div style={{ height: '4px', borderRadius: '99px', backgroundColor: 'var(--color-surface-4)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '99px',
                      width: `${pct}%`,
                      backgroundColor: i === 0 ? 'var(--color-brand-500)' : i === 1 ? 'var(--color-brand-400)' : 'var(--color-brand-300)',
                      transition: 'width 600ms var(--ease-out-strong)',
                    }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Manual sale log */}
      <section style={{ marginTop: '40px' }}>
        <h2 style={sectionHeadStyle}>Log Manual Sale</h2>
        <form
          action={recordManualSale}
          style={{
            display: 'grid', gridTemplateColumns: '1fr 140px auto', gap: '8px',
            padding: '16px', backgroundColor: 'var(--color-surface-2)',
            borderRadius: '12px', border: '1px solid var(--color-border)', alignItems: 'end',
          }}
        >
          <div>
            <label style={labelStyle}>Recipe</label>
            <select name="recipeId" required style={inputStyle}>
              <option value="">Select a recipe…</option>
              {recipes.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Qty sold</label>
            <input name="quantity" type="number" min="1" step="1" placeholder="1" required style={inputStyle} />
          </div>
          <button type="submit" style={primaryBtnStyle} className="log-btn">
            <TrendingUp size={14} /> Log
          </button>
        </form>
      </section>

      <style>{`
        .log-btn:hover { opacity: 0.85 !important; }
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
  padding: '9px 18px', borderRadius: '8px', backgroundColor: 'var(--color-brand-500)',
  border: 'none', color: '#000', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
  transition: 'opacity 150ms', whiteSpace: 'nowrap',
}
const emptyStyle: React.CSSProperties = {
  padding: '48px 24px', textAlign: 'center', borderRadius: '12px',
  border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)', fontSize: '14px',
}
