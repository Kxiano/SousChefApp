import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { safeRedirectPath } from '@/lib/routing'

const LOCALE_PREFIX = /^\/(en|pt-BR)(?=\/|$)/
const PUBLIC_PATHS = ['/', '/login', '/signup', '/invite']

/**
 * Refreshes the Supabase session on top of the response next-intl produced, then
 * applies the app's access rules: signed-out visitors go to the login page and
 * restaurants with a lapsed subscription go to the billing page.
 */
export async function updateSession(request: NextRequest, response: NextResponse) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write onto next-intl's response rather than replacing it, so its
          // locale redirects and rewrites survive a session refresh.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const localePrefix = pathname.match(LOCALE_PREFIX)?.[0] ?? ''
  const path = pathname.slice(localePrefix.length) || '/'
  const isPublic = PUBLIC_PATHS.some((p) => p === '/' ? path === '/' : path === p || path.startsWith(`${p}/`))

  /** A redirect that keeps any refreshed session cookies. */
  const redirectTo = (target: string, search?: Record<string, string>) => {
    const url = request.nextUrl.clone()
    url.pathname = `${localePrefix}${target}`
    url.search = search ? new URLSearchParams(search).toString() : ''
    const redirect = NextResponse.redirect(url)
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }

  if (!user) {
    if (isPublic) return response
    return redirectTo('/login', { redirect: `${pathname}${request.nextUrl.search}` })
  }

  if (path === '/login' || path === '/signup') {
    // Already signed in: continue to where the login page would have sent them.
    const next = safeRedirectPath(request.nextUrl.searchParams.get('redirect'))
    if (!next) return redirectTo('/dashboard')
    const redirect = NextResponse.redirect(new URL(LOCALE_PREFIX.test(next) ? next : `${localePrefix}${next}`, request.url))
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }
  // Locked kitchens can still reach the billing pages to fix their payment.
  if (isPublic || path === '/billing-locked' || path === '/billing' || path === '/onboarding') return response

  // Lock the app when the restaurant's subscription has lapsed.
  const { data: profile } = await supabase
    .from('profiles')
    .select('restaurant_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile) return response

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('subscription_status, grace_period_ends_at, trial_ends_at, stripe_subscription_id')
    .eq('id', profile.restaurant_id)
    .maybeSingle()
  if (!restaurant) return response

  const now = new Date()
  const graceEnds = restaurant.grace_period_ends_at ? new Date(restaurant.grace_period_ends_at) : null
  const trialEnds = restaurant.trial_ends_at ? new Date(restaurant.trial_ends_at) : null
  const status = restaurant.subscription_status ?? 'trialing'

  let reason: string | null = null
  if (status === 'canceled') reason = 'canceled'
  else if (status === 'past_due' && graceEnds !== null && graceEnds < now) reason = 'payment_failed'
  else if (status === 'trialing' && !restaurant.stripe_subscription_id && trialEnds !== null && trialEnds < now) reason = 'trial_ended'

  return reason ? redirectTo('/billing-locked', { reason }) : response
}
