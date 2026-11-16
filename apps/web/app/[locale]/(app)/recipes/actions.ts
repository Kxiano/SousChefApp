'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@sous-chef/db'
import { localizedRedirect, requireProfile } from '@/lib/auth'

/** Pairs each submitted ingredient with its quantity, keeping only this restaurant's ingredients. */
async function readRecipeIngredients(formData: FormData, restaurantId: string) {
  const ingredientIds = formData.getAll('ingredientId').map(String)
  const quantities = formData.getAll('qtyPerPortion').map(String)

  const owned = await prisma.ingredient.findMany({
    where: { restaurantId, id: { in: ingredientIds.filter(Boolean) } },
    select: { id: true },
  })
  const ownedIds = new Set(owned.map((ingredient) => ingredient.id))

  const byIngredient = new Map<string, number>()
  ingredientIds.forEach((ingredientId, i) => {
    const quantity = parseFloat(quantities[i]) || 0
    if (ownedIds.has(ingredientId) && quantity > 0) byIngredient.set(ingredientId, quantity)
  })
  return [...byIngredient].map(([ingredientId, quantityPerPortion]) => ({ ingredientId, quantityPerPortion }))
}

function readRecipeFields(formData: FormData) {
  return {
    name: String(formData.get('name') ?? '').trim(),
    yieldPortions: Math.max(parseInt(formData.get('yieldPortions') as string) || 1, 1),
    notes: String(formData.get('notes') ?? '').trim() || null,
  }
}

export async function createRecipe(formData: FormData) {
  const { restaurantId } = await requireProfile()
  const fields = readRecipeFields(formData)
  if (!fields.name) return localizedRedirect('/recipes/new?error=missing_name')

  const ingredients = await readRecipeIngredients(formData, restaurantId)
  if (ingredients.length === 0) return localizedRedirect('/recipes/new?error=no_ingredients')

  const recipe = await prisma.recipe.create({
    data: { restaurantId, ...fields, ingredients: { create: ingredients } },
  })
  revalidatePath('/[locale]/recipes', 'page')
  return localizedRedirect(`/recipes/${recipe.id}`)
}

/** Replaces a recipe's details and its full ingredient list in one step. */
export async function updateRecipe(id: string, formData: FormData) {
  const { restaurantId } = await requireProfile()
  const fields = readRecipeFields(formData)
  if (!fields.name) return localizedRedirect(`/recipes/${id}/edit?error=missing_name`)

  const ingredients = await readRecipeIngredients(formData, restaurantId)
  if (ingredients.length === 0) return localizedRedirect(`/recipes/${id}/edit?error=no_ingredients`)

  const updated = await prisma.$transaction(async (tx) => {
    const { count } = await tx.recipe.updateMany({ where: { id, restaurantId }, data: fields })
    if (count === 0) return false
    await tx.recipeIngredient.deleteMany({ where: { recipeId: id } })
    await tx.recipeIngredient.createMany({ data: ingredients.map((ri) => ({ ...ri, recipeId: id })) })
    return true
  })
  if (!updated) return localizedRedirect('/recipes')

  revalidatePath('/[locale]/recipes', 'page')
  revalidatePath('/[locale]/recipes/[id]', 'page')
  revalidatePath('/[locale]/calculator', 'page')
  return localizedRedirect(`/recipes/${id}`)
}

export async function deleteRecipe(id: string) {
  const { restaurantId } = await requireProfile()
  await prisma.recipe.deleteMany({ where: { id, restaurantId } })
  revalidatePath('/[locale]/recipes', 'page')
  return localizedRedirect('/recipes')
}
