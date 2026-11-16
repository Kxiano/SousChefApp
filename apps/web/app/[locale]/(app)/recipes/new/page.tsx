import { prisma } from '@sous-chef/db'
import { requireProfile } from '@/lib/auth'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { RecipeForm } from '../recipe-form'
import { createRecipe } from '../actions'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Recipes')
  return { title: t('new.title') }
}

export default async function NewRecipePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const profile = await requireProfile()

  const ingredients = await prisma.ingredient.findMany({
    where: { restaurantId: profile.restaurantId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, unit: true },
  })

  return <RecipeForm mode="new" ingredients={ingredients} action={createRecipe} backHref="/recipes" error={error} />
}
