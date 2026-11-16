'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@sous-chef/db'
import { requireProfile } from '@/lib/auth'

/** The owner closed the mid-trial offer; don't show it again. */
export async function dismissTrialReminder() {
  const profile = await requireProfile()
  if (profile.role !== 'owner') return
  await prisma.restaurant.updateMany({
    where: { id: profile.restaurantId, trialReminderSeenAt: null },
    data: { trialReminderSeenAt: new Date() },
  })
  revalidatePath('/[locale]', 'layout')
}
