import { cache } from 'react'
import { getLocale } from 'next-intl/server'
import { prisma } from '@sous-chef/db'
import { createClient } from '@/utils/supabase/server'
import { redirect } from '@/lib/navigation'

/** Redirects within the current locale, e.g. "/login" becomes "/pt-BR/login". */
export async function localizedRedirect(href: string): Promise<never> {
  const locale = await getLocale()
  return redirect({ href, locale })
}

/** The signed-in Supabase user, or null. Cached for the duration of one request. */
export const getUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

/**
 * The signed-in user's profile. Sends signed-out visitors to the login page and
 * new users (no restaurant yet) to the kitchen setup page.
 */
export const requireProfile = cache(async () => {
  const user = await getUser()
  if (!user) return localizedRedirect('/login')

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile) return localizedRedirect('/onboarding')
  return profile
})
