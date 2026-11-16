'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { getLocale } from 'next-intl/server'
import { prisma } from '@sous-chef/db'
import { localizedRedirect, requireProfile } from '@/lib/auth'
import { getAppUrl } from '@/lib/app-url'
import { sendInviteEmail } from '@/utils/email'

const INVITE_LIFETIME_DAYS = 7

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Only owners manage the team; everyone else gets sent back to the page. */
async function requireOwner() {
  const profile = await requireProfile()
  if (profile.role !== 'owner') return localizedRedirect('/team?error=not_owner')
  return profile
}

export async function createInvite(formData: FormData) {
  const owner = await requireOwner()
  const email = String(formData.get('email') ?? '').trim()
  if (email && !EMAIL_PATTERN.test(email)) return localizedRedirect('/team?error=invalid_email')

  const invite = await prisma.inviteToken.create({
    data: {
      restaurantId: owner.restaurantId,
      token: randomBytes(24).toString('base64url'),
      createdById: owner.id,
      expiresAt: new Date(Date.now() + INVITE_LIFETIME_DAYS * 24 * 60 * 60 * 1000),
    },
    include: { restaurant: { select: { name: true } } },
  })

  revalidatePath('/[locale]/team', 'page')
  if (!email) return localizedRedirect(`/team?created=${invite.id}`)

  const inviteUrl = `${await getAppUrl()}/${await getLocale()}/invite?token=${invite.token}`
  const result = await sendInviteEmail(email, invite.restaurant.name, inviteUrl)
  return localizedRedirect(`/team?created=${invite.id}&email=${result}`)
}

export async function renameKitchen(formData: FormData) {
  const owner = await requireOwner()
  const name = String(formData.get('restaurantName') ?? '').trim().slice(0, 80)
  if (!name) return localizedRedirect('/team?error=missing_name')
  await prisma.restaurant.update({ where: { id: owner.restaurantId }, data: { name } })
  revalidatePath('/', 'layout')
  return localizedRedirect('/team?renamed=1')
}

export async function revokeInvite(id: string) {
  const owner = await requireOwner()
  await prisma.inviteToken.deleteMany({
    where: { id, restaurantId: owner.restaurantId, usedAt: null },
  })
  revalidatePath('/[locale]/team', 'page')
}
