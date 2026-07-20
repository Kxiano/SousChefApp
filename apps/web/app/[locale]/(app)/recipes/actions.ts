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

export async function createRecipe(formData: FormData) {
  const restaurantId = await getRestaurantId()
  const ingredientIds = formData.getAll('ingredientId') as string[]
  const quantities = formData.getAll('qtyPerPortion') as string[]

  const recipe = await prisma.recipe.create({
    data: {
      restaurantId,
      name: formData.get('name') as string,
      yieldPortions: parseInt(formData.get('yieldPortions') as string) || 1,
      notes: formData.get('notes') as string || null,
      ingredients: {
        create: ingredientIds.map((ingredientId, i) => ({
          ingredientId,
          quantityPerPortion: parseFloat(quantities[i]) || 0,
        })),
      },
    },
  })
  revalidatePath('/recipes')
  redirect(`/recipes/${recipe.id}`)
}

export async function deleteRecipe(id: string) {
  const restaurantId = await getRestaurantId()
  await prisma.recipe.deleteMany({ where: { id, restaurantId } })
  revalidatePath('/recipes')
  redirect('/recipes')
}
