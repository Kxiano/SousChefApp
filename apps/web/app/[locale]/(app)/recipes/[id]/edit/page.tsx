import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@sous-chef/db'
import { requireProfile } from '@/lib/auth'
import { RecipeForm } from '../../recipe-form'
import { updateRecipe } from '../../actions'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Recipes')
  return { title: t('edit.title') }
}

export default async function EditRecipePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams])
  const profile = await requireProfile()

  const [recipe, ingredients] = await Promise.all([
    prisma.recipe.findFirst({
      where: { id, restaurantId: profile.restaurantId },
      include: { ingredients: true },
    }),
    prisma.ingredient.findMany({
      where: { restaurantId: profile.restaurantId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, unit: true },
    }),
  ])
  if (!recipe) notFound()

  return (
    <RecipeForm
      mode="edit"
      ingredients={ingredients}
      action={updateRecipe.bind(null, recipe.id)}
      backHref={`/recipes/${recipe.id}`}
      error={error}
      initial={{
        name: recipe.name,
        yieldPortions: recipe.yieldPortions,
        notes: recipe.notes,
        ingredients: recipe.ingredients.map((ri) => ({
          ingredientId: ri.ingredientId,
          quantityPerPortion: Number(ri.quantityPerPortion),
        })),
      }}
    />
  )
}
