'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@sous-chef/db'
import { getUser, localizedRedirect } from '@/lib/auth'
import { isLocale, redirect } from '@/lib/navigation'
import { newTrialEnd } from '@/lib/billing'

/** Creates the new user's restaurant, with them as its owner. */
export async function createKitchen(formData: FormData) {
  const user = await getUser()
  if (!user) return localizedRedirect('/login')

  const restaurantName = String(formData.get('restaurantName') ?? '').trim().slice(0, 80)
  const displayName = String(formData.get('displayName') ?? '').trim().slice(0, 60)
  const requested = formData.get('language')
  const language = isLocale(requested) ? requested : 'en'
  if (!restaurantName) return localizedRedirect('/onboarding?error=missing_name')

  // Someone who already has a profile (double submit, or set up in another tab) keeps it.
  const existing = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!existing) {
    await prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: { name: restaurantName, language, subscriptionStatus: 'trialing', trialEndsAt: newTrialEnd() },
      })
      await tx.profile.create({
        data: {
          id: user.id,
          restaurantId: restaurant.id,
          role: 'owner',
          language,
          displayName: displayName || user.email?.split('@')[0] || null,
        },
      })
    })
  }

  revalidatePath('/', 'layout')
  return redirect({ href: '/dashboard', locale: language })
}
