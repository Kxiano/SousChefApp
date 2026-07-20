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

export async function recordManualSale(formData: FormData) {
  const profile = await getProfile()
  const recipeId = formData.get('recipeId') as string
  const quantity = parseFloat(formData.get('quantity') as string) || 0
  if (!recipeId || quantity <= 0) return

  await prisma.salesEvent.create({
    data: {
      restaurantId: profile.restaurantId,
      recipeId,
      quantity,
      eventType: 'sold',
      source: 'manual',
      createdById: profile.id,
    },
  })

  revalidatePath('/best-sellers')
}
