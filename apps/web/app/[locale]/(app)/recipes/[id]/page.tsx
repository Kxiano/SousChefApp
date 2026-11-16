import { prisma } from '@sous-chef/db'
import { requireProfile } from '@/lib/auth'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getFormatter, getTranslations } from 'next-intl/server'
import { Trash2, ArrowLeft, Pencil, Calculator } from 'lucide-react'
import { ConfirmSubmitButton } from '@/components/confirm-submit-button'
import { Link } from '@/lib/navigation'
import { buttonClass } from '@/components/ui/button'
import { Card, SectionLabel } from '@/components/ui/card'
import { Table, Th, Td } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { deleteRecipe } from '../actions'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Recipes')
  return { title: t('detail.meta_title') }
}

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await requireProfile()
  const [t, format] = await Promise.all([getTranslations('Recipes'), getFormatter()])
  const money = (value: number) => format.number(value, { style: 'currency', currency: 'EUR' })

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
    <div className="max-w-3xl">
      <Link href="/recipes" className="inline-flex min-h-10 items-center gap-1.5 text-[13.5px] text-muted hover:text-ink">
        <ArrowLeft size={14} aria-hidden /> {t('back')}
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-[34px]">{recipe.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge>{t('detail.yields', { count: recipe.yieldPortions })}</Badge>
            {totalCost > 0 && (
              <Badge tone="brand"><span className="font-mono tabular">{t('cost_badge', { cost: money(totalCost) })}</span></Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/recipes/${recipe.id}/edit`} className={buttonClass('secondary')}>
            <Pencil size={14} aria-hidden /> {t('detail.edit')}
          </Link>
          <form action={deleteRecipe.bind(null, recipe.id)}>
            <ConfirmSubmitButton
              message={t('detail.delete_confirm', { name: recipe.name })}
              className={buttonClass('danger')}
            >
              <Trash2 size={14} aria-hidden /> {t('detail.delete')}
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>

      {recipe.notes && (
        <Card className="mt-6 p-5">
          <SectionLabel className="mb-2">{t('notes_heading')}</SectionLabel>
          <p className="whitespace-pre-line text-[14.5px] leading-relaxed text-body">{recipe.notes}</p>
        </Card>
      )}

      <div className="mt-8">
        <SectionLabel>{t('detail.ingredients_heading')}</SectionLabel>
        <Table>
          <thead>
            <tr>
              <Th>{t('detail.col_ingredient')}</Th>
              <Th align="right">{t('detail.col_qty')}</Th>
              <Th align="right">{t('detail.col_cost')}</Th>
            </tr>
          </thead>
          <tbody>
            {recipe.ingredients.map((ri) => (
              <tr key={ri.id}>
                <Td className="font-medium">{ri.ingredient.name}</Td>
                <Td align="right" className="whitespace-nowrap font-mono text-body tabular">
                  {format.number(Number(ri.quantityPerPortion))} {ri.ingredient.unit}
                </Td>
                <Td align="right" className="whitespace-nowrap font-mono text-muted tabular">
                  {ri.ingredient.costPerUnit
                    ? money(Number(ri.ingredient.costPerUnit) * Number(ri.quantityPerPortion))
                    : '—'}
                </Td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-sunken">
              <Td colSpan={2} className="border-line font-semibold">{t('detail.total_cost')}</Td>
              <Td align="right" className="whitespace-nowrap border-line font-mono font-bold text-saffron-dark tabular">
                {totalCost > 0 ? money(totalCost) : '—'}
              </Td>
            </tr>
          </tfoot>
        </Table>
      </div>

      <div className="mt-6">
        <Link href={`/calculator?recipe=${recipe.id}`} className={buttonClass('primary', 'lg')}>
          <Calculator size={16} aria-hidden /> {t('detail.calculate')}
        </Link>
      </div>
    </div>
  )
}
