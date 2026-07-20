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

export async function createShift(formData: FormData) {
  const profile = await getProfile()
  await prisma.shift.create({
    data: {
      restaurantId: profile.restaurantId,
      profileId: formData.get('profileId') as string || profile.id,
      startsAt: new Date(formData.get('startsAt') as string),
      endsAt: new Date(formData.get('endsAt') as string),
      roleLabel: formData.get('roleLabel') as string || null,
      notes: formData.get('notes') as string || null,
    },
  })
  revalidatePath('/shifts')
}

export async function deleteShift(id: string) {
  const profile = await getProfile()
  await prisma.shift.deleteMany({
    where: { id, restaurantId: profile.restaurantId },
  })
  revalidatePath('/shifts')
}
