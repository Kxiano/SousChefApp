import { prisma } from '@sous-chef/db'
import { requireProfile } from '@/lib/auth'
import type { Metadata } from 'next'
import { getFormatter, getTranslations } from 'next-intl/server'
import { TrendingUp } from 'lucide-react'
import { Link } from '@/lib/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { Card, EmptyState, SectionLabel } from '@/components/ui/card'
import { Field, Input, Select } from '@/components/ui/form'
import { buttonClass } from '@/components/ui/button'
import { recordManualSale } from './actions'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('BestSellers')
  return { title: t('title') }
}

type Period = 'today' | 'week' | 'month' | 'all'
const PERIODS: Period[] = ['today', 'week', 'month', 'all']

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

// Rank badges for the podium; the rest get a plain number.
const RANK_STYLES = [
  'bg-saffron text-ink',
  'bg-ink text-white',
  'bg-[#EFEDE7] text-body',
]

export default async function BestSellersPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period: rawPeriod } = await searchParams
  const period: Period = (PERIODS.includes(rawPeriod as Period) ? rawPeriod : 'week') as Period

  const profile = await requireProfile()
  const [t, format] = await Promise.all([getTranslations('BestSellers'), getFormatter()])

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

  const recipeMap = new Map(recipes.map((r) => [r.id, r]))
  const maxSales = Number(sales[0]?._sum.quantity ?? 1) || 1

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {/* Period tabs */}
      <nav aria-label={t('subtitle')} className="flex flex-wrap gap-1.5 rounded-control border border-line bg-surface p-1 sm:inline-flex">
        {PERIODS.map((p) => (
          <Link
            key={p}
            href={{ pathname: '/best-sellers', query: { period: p } }}
            aria-current={period === p ? 'page' : undefined}
            className={`flex h-9 flex-1 items-center justify-center whitespace-nowrap rounded-[8px] px-3.5 text-[13.5px] font-semibold transition-colors sm:flex-none ${
              period === p ? 'bg-ink text-white' : 'text-body hover:bg-ground hover:text-ink'
            }`}
          >
            {t(`periods.${p}`)}
          </Link>
        ))}
      </nav>

      {/* Ranking */}
      {sales.length === 0 ? (
        <EmptyState>{t('empty')}</EmptyState>
      ) : (
        <Card className="overflow-hidden">
          {/* Long menus scroll inside the card, so the page keeps the same height as the others. */}
          <ol
            tabIndex={0}
            aria-label={t('title')}
            className="max-h-[max(320px,calc(100dvh-410px))] overflow-y-auto overscroll-contain"
          >
            {sales.map((entry, i) => {
              const recipe = recipeMap.get(entry.recipeId)
              if (!recipe) return null
              const qty = Number(entry._sum.quantity ?? 0)
              const pct = Math.max(Math.round((qty / maxSales) * 100), 2)
              return (
                <li key={entry.recipeId} className="flex items-center gap-4 border-t border-line-soft px-5 py-4 first:border-t-0">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-[14px] font-bold tabular ${
                      RANK_STYLES[i] ?? 'text-muted'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <span className="truncate text-[15px] font-semibold">{recipe.name}</span>
                      <span className={`shrink-0 font-mono text-[14px] font-bold tabular ${i === 0 ? 'text-saffron-dark' : 'text-body'}`}>
                        {t('sold_count', { count: qty, formatted: format.number(qty, { maximumFractionDigits: 2 }) })}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#EFEDE7]">
                      <div
                        className={`h-full rounded-full transition-[width] duration-500 ease-[var(--ease-out-strong)] ${i === 0 ? 'bg-saffron' : 'bg-ink/70'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </Card>
      )}

      {/* Manual sale log */}
      <section>
        <SectionLabel>{t('manual.heading')}</SectionLabel>
        <Card className="p-4 sm:p-5">
          <form action={recordManualSale} className="grid items-end gap-3 sm:grid-cols-[1fr_160px_auto]">
            <Field label={t('manual.recipe')} htmlFor="sale-recipe">
              <Select id="sale-recipe" name="recipeId" required>
                <option value="">{t('manual.select_recipe')}</option>
                {recipes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            </Field>
            <Field label={t('manual.quantity')} htmlFor="sale-qty">
              <Input id="sale-qty" name="quantity" type="number" min="1" step="1" placeholder="1" required className="font-mono" />
            </Field>
            <button type="submit" className={buttonClass('primary', 'md', 'w-full sm:w-auto')}>
              <TrendingUp size={15} aria-hidden /> {t('manual.submit')}
            </button>
          </form>
        </Card>
      </section>
    </div>
  )
}
