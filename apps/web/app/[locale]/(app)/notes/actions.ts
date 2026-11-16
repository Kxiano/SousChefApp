'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@sous-chef/db'
import { requireProfile } from '@/lib/auth'

export async function createNote(formData: FormData) {
  const profile = await requireProfile()
  const content = String(formData.get('content') ?? '').trim()
  if (!content) return

  await prisma.note.create({
    data: {
      restaurantId: profile.restaurantId,
      authorId: profile.id,
      content,
      isUrgent: formData.get('isUrgent') === 'true',
    },
  })
  revalidatePath('/[locale]/notes', 'page')
  revalidatePath('/[locale]/dashboard', 'page')
}

export async function deleteNote(id: string) {
  const { restaurantId } = await requireProfile()
  await prisma.note.deleteMany({ where: { id, restaurantId } })
  revalidatePath('/[locale]/notes', 'page')
  revalidatePath('/[locale]/dashboard', 'page')
}
