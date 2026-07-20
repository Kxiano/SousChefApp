'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@sous-chef/db'
import { createClient } from '@/utils/supabase/server'

async function getRestaurantId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile) redirect('/login')
  return profile.restaurantId
}

export async function createIngredient(formData: FormData) {
  const restaurantId = await getRestaurantId()
  await prisma.ingredient.create({
    data: {
      restaurantId,
      name: formData.get('name') as string,
      unit: formData.get('unit') as string,
      quantity: parseFloat(formData.get('quantity') as string) || 0,
      lowStockThreshold: parseFloat(formData.get('lowStockThreshold') as string) || 0,
      costPerUnit: formData.get('costPerUnit') ? parseFloat(formData.get('costPerUnit') as string) : null,
    },
  })
  revalidatePath('/ingredients')
}

export async function updateIngredient(id: string, formData: FormData) {
  const restaurantId = await getRestaurantId()
  await prisma.ingredient.updateMany({
    where: { id, restaurantId },
    data: {
      name: formData.get('name') as string,
      unit: formData.get('unit') as string,
      quantity: parseFloat(formData.get('quantity') as string) || 0,
      lowStockThreshold: parseFloat(formData.get('lowStockThreshold') as string) || 0,
      costPerUnit: formData.get('costPerUnit') ? parseFloat(formData.get('costPerUnit') as string) : null,
    },
  })
  revalidatePath('/ingredients')
}

export async function deleteIngredient(id: string) {
  const restaurantId = await getRestaurantId()
  await prisma.ingredient.deleteMany({ where: { id, restaurantId } })
  revalidatePath('/ingredients')
}

export async function adjustStock(id: string, delta: number) {
  const restaurantId = await getRestaurantId()
  await prisma.ingredient.updateMany({
    where: { id, restaurantId },
    data: { quantity: { increment: delta } },
  })
  revalidatePath('/ingredients')
}
