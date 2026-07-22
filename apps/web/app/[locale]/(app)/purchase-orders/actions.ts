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

export async function createPurchaseOrder(formData: FormData) {
  const profile = await getProfile()
  const restaurantId = profile.restaurantId

  const ingredientIds = formData.getAll('ingredientId') as string[]
  const quantities = formData.getAll('quantity') as string[]

  await prisma.purchaseOrder.create({
    data: {
      restaurantId,
      status: 'draft',
      notes: formData.get('notes') as string || null,
      createdById: profile.id,
      items: {
        create: ingredientIds.map((ingredientId, i) => ({
          ingredientId,
          quantityRequested: parseFloat(quantities[i]) || 0,
        })),
      },
    },
  })

  revalidatePath('/purchase-orders')
}

export async function updateOrderStatus(id: string, status: 'draft' | 'sent' | 'received') {
  const profile = await getProfile()
  const restaurantId = profile.restaurantId

  if (status === 'received') {
    const order = await prisma.purchaseOrder.findFirst({
      where: { id, restaurantId },
      include: { items: true },
    })

    if (order && order.status !== 'received') {
      await prisma.$transaction(async (tx) => {
        await tx.purchaseOrder.update({
          where: { id },
          data: { status: 'received' },
        })

        for (const item of order.items) {
          await tx.purchaseOrderItem.update({
            where: { id: item.id },
            data: { quantityReceived: item.quantityRequested },
          })

          await tx.ingredient.update({
            where: { id: item.ingredientId },
            data: { quantity: { increment: item.quantityRequested } },
          })
        }
      })
    }
  } else {
    await prisma.purchaseOrder.updateMany({
      where: { id, restaurantId },
      data: { status },
    })
  }

  revalidatePath('/purchase-orders')
}

export async function deletePurchaseOrder(id: string) {
  const profile = await getProfile()
  await prisma.purchaseOrder.deleteMany({
    where: { id, restaurantId: profile.restaurantId, status: 'draft' },
  })
  revalidatePath('/purchase-orders')
}
