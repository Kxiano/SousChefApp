'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@sous-chef/db'
import { requireProfile } from '@/lib/auth'

export async function createShift(formData: FormData) {
  const profile = await requireProfile()
  const restaurantId = profile.restaurantId

  const startsAt = new Date(formData.get('startsAt') as string)
  const endsAt = new Date(formData.get('endsAt') as string)
  if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime()) || endsAt <= startsAt) return

  // Shifts can only be assigned to members of this restaurant.
  const requestedProfileId = (formData.get('profileId') as string) || profile.id
  const member = await prisma.profile.findFirst({
    where: { id: requestedProfileId, restaurantId },
    select: { id: true },
  })
  if (!member) return

  await prisma.shift.create({
    data: {
      restaurantId,
      profileId: member.id,
      startsAt,
      endsAt,
      roleLabel: String(formData.get('roleLabel') ?? '').trim() || null,
      notes: String(formData.get('notes') ?? '').trim() || null,
    },
  })
  revalidatePath('/[locale]/shifts', 'page')
  revalidatePath('/[locale]/dashboard', 'page')
}

export async function deleteShift(id: string) {
  const { restaurantId } = await requireProfile()
  await prisma.shift.deleteMany({ where: { id, restaurantId } })
  revalidatePath('/[locale]/shifts', 'page')
  revalidatePath('/[locale]/dashboard', 'page')
}
