'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@sous-chef/db'
import { requireProfile } from '@/lib/auth'

export async function createPurchaseOrder(formData: FormData) {
  const profile = await requireProfile()
  const restaurantId = profile.restaurantId

  const ingredientIds = formData.getAll('ingredientId').map(String)
  const quantities = formData.getAll('quantity').map(String)

  // Only order this restaurant's own ingredients, in positive amounts.
  const owned = await prisma.ingredient.findMany({
    where: { restaurantId, id: { in: ingredientIds.filter(Boolean) } },
    select: { id: true },
  })
  const ownedIds = new Set(owned.map((ingredient) => ingredient.id))
  const items = ingredientIds
    .map((ingredientId, i) => ({ ingredientId, quantityRequested: parseFloat(quantities[i]) || 0 }))
    .filter((item) => ownedIds.has(item.ingredientId) && item.quantityRequested > 0)
  if (items.length === 0) return

  await prisma.purchaseOrder.create({
    data: {
      restaurantId,
      status: 'draft',
      notes: String(formData.get('notes') ?? '').trim() || null,
      createdById: profile.id,
      items: { create: items },
    },
  })

  revalidatePath('/[locale]/purchase-orders', 'page')
}

export async function updateOrderStatus(id: string, status: 'draft' | 'sent' | 'received') {
  const { restaurantId } = await requireProfile()

  if (status === 'received') {
    await prisma.$transaction(async (tx) => {
      // Claim the order first: if two people click "received" at once, only one
      // of them adds the delivered stock.
      const { count } = await tx.purchaseOrder.updateMany({
        where: { id, restaurantId, status: { not: 'received' } },
        data: { status: 'received' },
      })
      if (count === 0) return

      const items = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } })
      for (const item of items) {
        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { quantityReceived: item.quantityRequested },
        })
        await tx.ingredient.updateMany({
          where: { id: item.ingredientId, restaurantId },
          data: { quantity: { increment: item.quantityRequested } },
        })
      }
    })
    revalidatePath('/[locale]/ingredients', 'page')
  } else {
    // A received order is final; it cannot move back to draft or sent.
    await prisma.purchaseOrder.updateMany({
      where: { id, restaurantId, status: { not: 'received' } },
      data: { status },
    })
  }

  revalidatePath('/[locale]/purchase-orders', 'page')
}

export async function deletePurchaseOrder(id: string) {
  const { restaurantId } = await requireProfile()
  await prisma.purchaseOrder.deleteMany({
    where: { id, restaurantId, status: 'draft' },
  })
  revalidatePath('/[locale]/purchase-orders', 'page')
}
