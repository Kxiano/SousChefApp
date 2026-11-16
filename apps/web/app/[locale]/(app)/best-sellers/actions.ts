'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@sous-chef/db'
import { requireProfile } from '@/lib/auth'

export async function recordManualSale(formData: FormData) {
  const profile = await requireProfile()
  const recipeId = formData.get('recipeId') as string
  const quantity = parseFloat(formData.get('quantity') as string) || 0
  if (!recipeId || quantity <= 0) return

  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, restaurantId: profile.restaurantId },
    select: { id: true },
  })
  if (!recipe) return

  await prisma.salesEvent.create({
    data: {
      restaurantId: profile.restaurantId,
      recipeId: recipe.id,
      quantity,
      eventType: 'sold',
      source: 'manual',
      createdById: profile.id,
    },
  })

  revalidatePath('/[locale]/best-sellers', 'page')
}
