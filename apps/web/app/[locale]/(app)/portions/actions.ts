'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@sous-chef/db'
import { createClient } from '@/utils/supabase/server'

async function getProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile) redirect('/login')
  return profile
}

export async function markPrepared(recipeId: string, portions: number) {
  const profile = await getProfile()
  const restaurantId = profile.restaurantId

  // Fetch recipe with ingredients
  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, restaurantId },
    include: { ingredients: true },
  })
  if (!recipe) throw new Error('Recipe not found')

  // Deduct from ingredient stock
  await Promise.all(recipe.ingredients.map(ri =>
    prisma.ingredient.updateMany({
      where: { id: ri.ingredientId, restaurantId },
      data: { quantity: { decrement: Number(ri.quantityPerPortion) * portions } },
    })
  ))

  // Add to ready portions
  const existing = await prisma.readyPortion.findFirst({ where: { recipeId, restaurantId } })
  if (existing) {
    await prisma.readyPortion.update({
      where: { id: existing.id },
      data: { quantity: { increment: portions } },
    })
  } else {
    await prisma.readyPortion.create({ data: { restaurantId, recipeId, quantity: portions } })
  }

  revalidatePath('/portions')
  revalidatePath('/ingredients')
}

export async function recordSale(recipeId: string, quantity: number, type: 'sold' | 'discarded') {
  const profile = await getProfile()
  const restaurantId = profile.restaurantId

  // Deduct from ready portions
  await prisma.readyPortion.updateMany({
    where: { recipeId, restaurantId },
    data: { quantity: { decrement: quantity } },
  })

  // Log the event
  await prisma.salesEvent.create({
    data: {
      restaurantId,
      recipeId,
      quantity,
      eventType: type,
      createdById: profile.id,
    },
  })

  revalidatePath('/portions')
}

// FormData-compatible wrappers for use as form action= props

export async function markPreparedAction(formData: FormData) {
  const recipeId = formData.get('recipeId') as string
  const portions = parseFloat(formData.get('portions') as string) || 0
  if (!recipeId || portions <= 0) return
  await markPrepared(recipeId, portions)
}

export async function recordSaleAction(formData: FormData) {
  const recipeId = formData.get('recipeId') as string
  const qty = parseFloat(formData.get('qty') as string) || 1
  const type = (formData.get('type') as string) === 'discarded' ? 'discarded' : 'sold'
  await recordSale(recipeId, qty, type)
}
