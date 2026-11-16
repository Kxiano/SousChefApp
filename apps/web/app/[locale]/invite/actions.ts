'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@sous-chef/db'
import { getUser, localizedRedirect } from '@/lib/auth'

export async function acceptInvite(token: string) {
  const user = await getUser()
  if (!user) return localizedRedirect(`/login?redirect=${encodeURIComponent(`/invite?token=${token}`)}`)

  const accepted = await prisma.$transaction(async (tx) => {
    // Claim the token in one step so it can only ever be used once.
    const invite = await tx.inviteToken.findUnique({ where: { token }, include: { restaurant: true } })
    if (!invite) return false
    const { count } = await tx.inviteToken.updateMany({
      where: { id: invite.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    })
    if (count === 0) return false

    await tx.profile.upsert({
      where: { id: user.id },
      update: { restaurantId: invite.restaurantId, role: 'staff', language: invite.restaurant.language },
      create: {
        id: user.id,
        restaurantId: invite.restaurantId,
        role: 'staff',
        language: invite.restaurant.language,
        displayName: user.email?.split('@')[0] ?? null,
      },
    })
    return true
  })

  if (!accepted) return localizedRedirect(`/invite?token=${encodeURIComponent(token)}`)

  revalidatePath('/', 'layout')
  return localizedRedirect('/dashboard')
}
