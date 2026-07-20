import { createClient } from '@/utils/supabase/server'
import { prisma } from '@sous-chef/db'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { NewRecipeClient } from './new-recipe-client'

export const metadata: Metadata = { title: 'New Recipe' }

export default async function NewRecipePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile) redirect('/login')

  const ingredients = await prisma.ingredient.findMany({
    where: { restaurantId: profile.restaurantId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, unit: true }
  })

  return <NewRecipeClient ingredients={ingredients} />
}
