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

export async function createNote(formData: FormData) {
  const profile = await getProfile()
  await prisma.note.create({
    data: {
      restaurantId: profile.restaurantId,
      authorId: profile.id,
      content: formData.get('content') as string,
      isUrgent: formData.get('isUrgent') === 'true',
    },
  })
  revalidatePath('/notes')
}

export async function deleteNote(id: string) {
  const profile = await getProfile()
  await prisma.note.deleteMany({
    where: { id, restaurantId: profile.restaurantId },
  })
  revalidatePath('/notes')
}
