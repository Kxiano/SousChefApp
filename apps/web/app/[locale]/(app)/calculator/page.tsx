import { prisma } from '@sous-chef/db'
import { requireProfile } from '@/lib/auth'
import type { Metadata } from 'next'
import { getFormatter, getTranslations } from 'next-intl/server'
import { Calculator, AlertTriangle, CheckCircle2, ShoppingCart } from 'lucide-react'
import { Link } from '@/lib/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { Alert } from '@/components/ui/alert'
import { EmptyState } from '@/components/ui/card'
import { buttonClass } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/form'
import { markPreparedAction } from '../portions/actions'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Calculator')
  return { title: t('title') }
}

export default async function CalculatorPage({
  searchParams,
}: {
  searchParams: Promise<{ recipe?: string; portions?: string; error?: string }>
}) {
  const { recipe: recipeId, portions: portionsStr, error } = await searchParams
  const portionsNum = Math.max(parseFloat(portionsStr ?? '') || 1, 0.01)

  const profile = await requireProfile()
  const [t, format] = await Promise.all([getTranslations('Calculator'), getFormatter()])
  const money = (value: number) => format.number(value, { style: 'currency', currency: 'EUR' })
  const qty = (value: number) => format.number(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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

  const selectedRecipe = recipeId ? recipes.find((r) => r.id === recipeId) : null

  type RequirementRow = {
    ingredientId: string
    name: string
    unit: string
    required: number
    available: number
    cost: number | null
    isShort: boolean
  }

  const requirements: RequirementRow[] = selectedRecipe
    ? selectedRecipe.ingredients.map((ri) => {
        const required = Number(ri.quantityPerPortion) * portionsNum
        const available = Number(ri.ingredient.quantity)
        const costPerUnit = ri.ingredient.costPerUnit ? Number(ri.ingredient.costPerUnit) : null
        return {
          ingredientId: ri.ingredientId,
          name: ri.ingredient.name,
          unit: ri.ingredient.unit,
          required,
          available,
          cost: costPerUnit ? costPerUnit * required : null,
          isShort: available < required,
        }
      })
    : []
  const totalCost = requirements.reduce((sum, row) => sum + (row.cost ?? 0), 0)
  const hasShortage = requirements.some((r) => r.isShort)

  return (
    <div className="max-w-4xl">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {error === 'insufficient_stock' && <Alert>{t('errors.insufficient_stock')}</Alert>}

      {/* Selector */}
      <form method="GET" className="mt-7 flex flex-wrap items-end gap-3 rounded-card border border-line bg-surface p-4">
        <Field label={t('recipe_label')} htmlFor="calc-recipe" className="min-w-[220px] flex-[1_1_260px]">
          <Select id="calc-recipe" name="recipe" defaultValue={recipeId ?? ''}>
            <option value="">{t('select_recipe')}</option>
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </Select>
        </Field>
        <Field label={t('portions_label')} htmlFor="calc-portions" className="w-full sm:w-36">
          <Input id="calc-portions" name="portions" type="number" min="0.5" step="0.5" defaultValue={portionsNum} className="font-mono tabular" />
        </Field>
        <button type="submit" className={buttonClass('dark', 'md', 'w-full sm:w-auto')}>
          <Calculator size={15} aria-hidden /> {t('calculate')}
        </button>
      </form>

      {/* Results: the prep ticket */}
      {selectedRecipe ? (
        <section className="mt-6 overflow-hidden rounded-[18px] border border-line bg-surface shadow-[0_30px_60px_-30px_rgba(22,24,27,0.25)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-5 py-4">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">{t('ticket_label')}</p>
              <h2 className="mt-0.5 font-display text-[21px] font-bold leading-tight">
                {t('result_heading', { recipe: selectedRecipe.name, count: portionsNum })}
              </h2>
            </div>
            {totalCost > 0 && (
              <span className="rounded-[8px] bg-saffron-soft px-2.5 py-1.5 font-mono text-[13px] font-bold text-saffron-dark tabular">
                {t('per_plate', { cost: money(totalCost / portionsNum) })}
              </span>
            )}
          </div>

          {hasShortage && (
            <div className="flex flex-wrap items-center gap-2 border-b border-line-soft bg-paprika-soft px-5 py-2.5 text-[13.5px] text-paprika-dark">
              <AlertTriangle size={15} className="shrink-0" aria-hidden />
              <span>{t('shortage')}</span>
              <Link href="/purchase-orders" className="font-semibold underline underline-offset-2">{t('create_po')}</Link>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[14px]">
              <thead>
                <tr className="text-[11.5px] uppercase tracking-[0.06em] text-muted">
                  <th className="px-5 py-2.5 text-left font-semibold">{t('col_ingredient')}</th>
                  <th className="px-2 py-2.5 text-right font-semibold">{t('col_required')}</th>
                  <th className="px-2 py-2.5 text-right font-semibold">{t('col_in_stock')}</th>
                  <th className="px-2 py-2.5 text-right font-semibold">{t('col_cost')}</th>
                  <th className="px-5 py-2.5 text-right font-semibold">{t('col_status')}</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular">
                {requirements.map((row) => (
                  <tr key={row.ingredientId} className={`border-t border-line-soft ${row.isShort ? 'bg-paprika-soft/70' : ''}`}>
                    <td className="px-5 py-3 font-sans font-medium">{row.name}</td>
                    <td className="whitespace-nowrap px-2 py-3 text-right">{qty(row.required)} {row.unit}</td>
                    <td className={`whitespace-nowrap px-2 py-3 text-right ${row.isShort ? 'font-bold text-paprika' : ''}`}>
                      {qty(row.available)} {row.unit}
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-right text-muted">{row.cost != null ? money(row.cost) : '—'}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-sans font-semibold">
                      {row.isShort ? (
                        <span className="inline-flex items-center gap-1 text-paprika">
                          <AlertTriangle size={13} aria-hidden /> {t('short', { amount: qty(row.required - row.available), unit: row.unit })}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-basil">
                          <CheckCircle2 size={13} aria-hidden /> {t('ok')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {totalCost > 0 && (
                <tfoot>
                  <tr className="border-t border-line bg-sunken">
                    <td colSpan={3} className="px-5 py-3 font-semibold">{t('total_cost')}</td>
                    <td colSpan={2} className="whitespace-nowrap px-5 py-3 text-right font-mono font-bold text-saffron-dark tabular">
                      {money(totalCost)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-line-soft bg-sunken px-5 py-4">
            {hasShortage ? (
              <Link href="/purchase-orders" className={buttonClass('dark')}>
                <ShoppingCart size={15} aria-hidden /> {t('create_po')}
              </Link>
            ) : (
              <>
                <form action={markPreparedAction}>
                  <input type="hidden" name="recipeId" value={selectedRecipe.id} />
                  <input type="hidden" name="portions" value={portionsNum} />
                  <input type="hidden" name="returnTo" value="calculator" />
                  <button type="submit" className={buttonClass('primary')}>
                    <CheckCircle2 size={16} aria-hidden />
                    {t('mark_prepared', { count: portionsNum })}
                  </button>
                </form>
                <p className="text-[12.5px] text-muted">{t('mark_prepared_help')}</p>
              </>
            )}
          </div>
        </section>
      ) : (
        <div className="mt-6">
          <EmptyState>{t('empty')}</EmptyState>
        </div>
      )}
    </div>
  )
}
