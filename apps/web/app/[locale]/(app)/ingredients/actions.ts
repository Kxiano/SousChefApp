'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@sous-chef/db'
import { requireProfile } from '@/lib/auth'

function readIngredientForm(formData: FormData) {
  const costPerUnit = formData.get('costPerUnit')
  return {
    name: String(formData.get('name') ?? '').trim(),
    unit: String(formData.get('unit') ?? '').trim(),
    quantity: Math.max(parseFloat(formData.get('quantity') as string) || 0, 0),
    lowStockThreshold: Math.max(parseFloat(formData.get('lowStockThreshold') as string) || 0, 0),
    costPerUnit: costPerUnit ? Math.max(parseFloat(costPerUnit as string) || 0, 0) : null,
  }
}

export async function createIngredient(formData: FormData) {
  const { restaurantId } = await requireProfile()
  const data = readIngredientForm(formData)
  if (!data.name || !data.unit) return
  await prisma.ingredient.create({ data: { restaurantId, ...data } })
  revalidatePath('/[locale]/ingredients', 'page')
}

export async function updateIngredient(id: string, formData: FormData) {
  const { restaurantId } = await requireProfile()
  const data = readIngredientForm(formData)
  if (!data.name || !data.unit) return
  await prisma.ingredient.updateMany({ where: { id, restaurantId }, data })
  revalidatePath('/[locale]/ingredients', 'page')
}

export async function deleteIngredient(id: string) {
  const { restaurantId } = await requireProfile()
  await prisma.ingredient.deleteMany({ where: { id, restaurantId } })
  revalidatePath('/[locale]/ingredients', 'page')
}

export async function adjustStock(id: string, delta: number) {
  const { restaurantId } = await requireProfile()
  // A removal only applies when there is enough stock, so quantities never go negative.
  await prisma.ingredient.updateMany({
    where: { id, restaurantId, ...(delta < 0 ? { quantity: { gte: -delta } } : {}) },
    data: { quantity: { increment: delta } },
  })
  revalidatePath('/[locale]/ingredients', 'page')
}
