import { prisma } from '@sous-chef/db'
import { requireProfile } from '@/lib/auth'
import type { Metadata } from 'next'
import { getFormatter, getTranslations } from 'next-intl/server'
import { BookOpen, ChevronRight } from 'lucide-react'
import { Link } from '@/lib/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/card'
import { buttonClass } from '@/components/ui/button'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Recipes')
  return { title: t('meta_title') }
}

export default async function RecipesPage() {
  const profile = await requireProfile()
  const [t, format] = await Promise.all([getTranslations('Recipes'), getFormatter()])
  const money = (value: number) => format.number(value, { style: 'currency', currency: 'EUR' })

  const recipes = await prisma.recipe.findMany({
    where: { restaurantId: profile.restaurantId },
    orderBy: { name: 'asc' },
    include: { ingredients: { include: { ingredient: { select: { costPerUnit: true } } } } },
  })

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('count', { count: recipes.length })}
        action={{ label: t('new_button'), href: '/recipes/new' }}
      />

      <div className="mt-7">
        {recipes.length === 0 ? (
          <EmptyState action={<Link href="/recipes/new" className={buttonClass('primary')}>{t('new_button')}</Link>}>
            {t('empty')}
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {recipes.map((recipe) => {
              // Cost per portion only counts ingredients that have a price.
              const priced = recipe.ingredients.filter((ri) => ri.ingredient.costPerUnit != null)
              const cost = priced.reduce((sum, ri) => sum + Number(ri.ingredient.costPerUnit) * Number(ri.quantityPerPortion), 0)
              return (
                <li key={recipe.id}>
                  <Link
                    href={`/recipes/${recipe.id}`}
                    className="group flex h-full flex-col gap-4 rounded-card border border-line bg-surface p-[18px] transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-line-strong"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-saffron-soft text-saffron-dark">
                        <BookOpen size={18} aria-hidden />
                      </span>
                      <ChevronRight size={18} className="mt-2 text-muted transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="font-display text-[19px] font-bold leading-tight">{recipe.name}</p>
                      <p className="mt-1 text-[13px] text-muted">
                        {t('card_meta', { ingredients: recipe.ingredients.length, portions: recipe.yieldPortions })}
                      </p>
                    </div>
                    <div className="mt-auto flex items-center justify-between border-t border-line-soft pt-3 text-[13px]">
                      <span className="text-muted">{t('detail.col_cost')}</span>
                      {priced.length > 0 ? (
                        <span className="font-mono font-bold tabular">{money(cost)}</span>
                      ) : (
                        <span className="text-muted">{t('no_cost')}</span>
                      )}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
