'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@sous-chef/db'
import { localizedRedirect, requireProfile } from '@/lib/auth'

export type PortionsError = 'insufficient_stock' | 'not_enough_portions' | 'recipe_not_found'

class PortionsActionError extends Error {
  constructor(readonly code: PortionsError) { super(code) }
}

/**
 * Deducts the recipe's ingredients and adds the portions to ready stock, all or
 * nothing. Each deduction only applies if enough stock remains at that moment,
 * so two cooks preparing at once cannot push an ingredient below zero.
 */
export async function markPrepared(recipeId: string, portions: number): Promise<PortionsError | null> {
  const { restaurantId } = await requireProfile()
  if (!(portions > 0)) return null

  try {
    await prisma.$transaction(async (tx) => {
      const recipe = await tx.recipe.findFirst({
        where: { id: recipeId, restaurantId },
        include: { ingredients: true },
      })
      if (!recipe) throw new PortionsActionError('recipe_not_found')

      for (const ri of recipe.ingredients) {
        const needed = Number(ri.quantityPerPortion) * portions
        const { count } = await tx.ingredient.updateMany({
          where: { id: ri.ingredientId, restaurantId, quantity: { gte: needed } },
          data: { quantity: { decrement: needed } },
        })
        if (count === 0) throw new PortionsActionError('insufficient_stock')
      }

      const existing = await tx.readyPortion.findFirst({ where: { recipeId, restaurantId } })
      if (existing) {
        await tx.readyPortion.update({ where: { id: existing.id }, data: { quantity: { increment: portions } } })
      } else {
        await tx.readyPortion.create({ data: { restaurantId, recipeId, quantity: portions } })
      }
    })
  } catch (error) {
    if (error instanceof PortionsActionError) return error.code
    throw error
  }

  revalidatePath('/[locale]/portions', 'page')
  revalidatePath('/[locale]/ingredients', 'page')
  revalidatePath('/[locale]/calculator', 'page')
  return null
}

/** Removes sold or discarded portions from ready stock and logs the event. */
export async function recordSale(recipeId: string, quantity: number, type: 'sold' | 'discarded'): Promise<PortionsError | null> {
  const profile = await requireProfile()
  const restaurantId = profile.restaurantId
  if (!(quantity > 0)) return null

  try {
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.readyPortion.updateMany({
        where: { recipeId, restaurantId, quantity: { gte: quantity } },
        data: { quantity: { decrement: quantity } },
      })
      if (count === 0) throw new PortionsActionError('not_enough_portions')

      await tx.salesEvent.create({
        data: { restaurantId, recipeId, quantity, eventType: type, createdById: profile.id },
      })
    })
  } catch (error) {
    if (error instanceof PortionsActionError) return error.code
    throw error
  }

  revalidatePath('/[locale]/portions', 'page')
  revalidatePath('/[locale]/best-sellers', 'page')
  return null
}

// FormData-compatible wrappers for use as form action= props. Errors are shown
// on the page through the ?error= search param.

export async function markPreparedAction(formData: FormData) {
  const recipeId = formData.get('recipeId') as string
  const portions = parseFloat(formData.get('portions') as string) || 0
  const returnTo = formData.get('returnTo') === 'calculator'
    ? `/calculator?recipe=${encodeURIComponent(recipeId)}&portions=${portions}`
    : '/portions'
  if (!recipeId || portions <= 0) return

  const error = await markPrepared(recipeId, portions)
  if (error) return localizedRedirect(`${returnTo}${returnTo.includes('?') ? '&' : '?'}error=${error}`)
  if (formData.get('returnTo') === 'calculator') return localizedRedirect('/portions?prepared=1')
}

export async function recordSaleAction(formData: FormData) {
  const recipeId = formData.get('recipeId') as string
  const qty = parseFloat(formData.get('qty') as string) || 1
  const type = (formData.get('type') as string) === 'discarded' ? 'discarded' : 'sold'
  const error = await recordSale(recipeId, qty, type)
  if (error) return localizedRedirect(`/portions?error=${error}`)
}
