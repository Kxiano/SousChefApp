import { prisma } from '@sous-chef/db'
import { requireProfile } from '@/lib/auth'
import type { Metadata } from 'next'
import { getFormatter, getTranslations } from 'next-intl/server'
import { UtensilsCrossed, CheckCircle } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Alert } from '@/components/ui/alert'
import { buttonClass } from '@/components/ui/button'
import { Card, EmptyState, SectionLabel } from '@/components/ui/card'
import { Field, Input, Select } from '@/components/ui/form'
import { Table, Td, Th } from '@/components/ui/table'
import { markPreparedAction, recordSaleAction } from './actions'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Portions')
  return { title: t('title') }
}

const ERROR_CODES = ['insufficient_stock', 'not_enough_portions', 'recipe_not_found'] as const

const qtyInputClass = 'h-10 w-16 rounded-control border border-line-strong bg-surface px-2 text-center font-mono text-[14px] tabular focus:border-ink focus:outline-none focus:ring-2 focus:ring-saffron/40'

export default async function PortionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; prepared?: string }>
}) {
  const { error, prepared } = await searchParams
  const profile = await requireProfile()
  const [t, format] = await Promise.all([getTranslations('Portions'), getFormatter()])
  const errorCode = ERROR_CODES.find((code) => code === error)

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
    <div>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {errorCode && <Alert>{t(`errors.${errorCode}`)}</Alert>}
      {prepared && !error && <Alert tone="success">{t('prepared_success')}</Alert>}

      {/* Mark as prepared */}
      <section className="mt-7">
        <SectionLabel>{t('prepare.heading')}</SectionLabel>
        <Card className="p-4 sm:p-5">
          <form action={markPreparedAction} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_160px_auto]">
            <Field label={t('prepare.recipe')} htmlFor="prepare-recipe">
              <Select id="prepare-recipe" name="recipeId" required>
                <option value="">{t('prepare.select_recipe')}</option>
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </Select>
            </Field>
            <Field label={t('prepare.portions')} htmlFor="prepare-portions">
              <Input id="prepare-portions" name="portions" type="number" min="0.01" step="0.01" placeholder="0" required className="font-mono tabular" />
            </Field>
            <button type="submit" className={buttonClass('primary')}>
              <CheckCircle size={16} aria-hidden /> {t('prepare.submit')}
            </button>
          </form>
        </Card>
      </section>

      {/* Ready stock */}
      <section className="mt-8">
        <SectionLabel>{t('stock.heading')}</SectionLabel>
        {portions.length === 0 ? (
          <EmptyState>{t('stock.empty')}</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t('stock.recipe')}</Th>
                <Th align="right">{t('stock.ready')}</Th>
                <Th align="right">{t('stock.sold_today')}</Th>
                <Th align="right">{t('stock.discarded_today')}</Th>
                <Th>{t('stock.log_sale')}</Th>
              </tr>
            </thead>
            <tbody>
              {portions.map((p) => {
                const stats = salesByRecipe.get(p.recipeId) ?? { sold: 0, discarded: 0 }
                const qty = Number(p.quantity)
                return (
                  <tr key={p.id}>
                    <Td className="font-medium">
                      <span className="flex items-center gap-2">
                        <UtensilsCrossed size={14} className="shrink-0 text-saffron-dark" aria-hidden />
                        {p.recipe.name}
                      </span>
                    </Td>
                    <Td align="right" className={`font-mono text-[16px] font-bold tabular ${qty > 0 ? 'text-basil' : 'text-muted'}`}>
                      {format.number(qty, { maximumFractionDigits: 2 })}
                    </Td>
                    <Td align="right" className="font-mono tabular text-body">{format.number(stats.sold)}</Td>
                    <Td align="right" className="font-mono tabular text-muted">{format.number(stats.discarded)}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-2">
                        <form action={recordSaleAction} className="flex items-center gap-1.5">
                          <input type="hidden" name="recipeId" value={p.recipeId} />
                          <input type="hidden" name="type" value="sold" />
                          <input name="qty" type="number" min="1" defaultValue="1" aria-label={t('stock.qty_label')} className={qtyInputClass} />
                          <button type="submit" className={buttonClass('secondary', 'md', 'hover:border-basil hover:bg-basil-soft hover:text-basil')}>
                            {t('stock.sold')}
                          </button>
                        </form>
                        <form action={recordSaleAction} className="flex items-center gap-1.5">
                          <input type="hidden" name="recipeId" value={p.recipeId} />
                          <input type="hidden" name="type" value="discarded" />
                          <input name="qty" type="number" min="1" defaultValue="1" aria-label={t('stock.qty_label')} className={qtyInputClass} />
                          <button type="submit" className={buttonClass('danger')}>
                            {t('stock.discard')}
                          </button>
                        </form>
                      </div>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </section>
    </div>
  )
}
