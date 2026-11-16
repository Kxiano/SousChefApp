import { stripe } from '@/utils/stripe'
import { createClient } from '@/utils/supabase/server'
import { isBillingConfigured } from '@/lib/billing'
import { isLocale, routing } from '@/lib/routing'
import { prisma } from '@sous-chef/db'
import { NextResponse, type NextRequest } from 'next/server'

// Opens the Stripe customer portal. Every outcome is a 303 redirect so the
// browser follows it with GET, not another POST.
export async function POST(request: NextRequest) {
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value
  const locale = isLocale(cookieLocale) ? cookieLocale : routing.defaultLocale
  const billingUrl = (search = '') => new URL(`/${locale}/billing${search}`, request.url)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL(`/${locale}/login`, request.url), { status: 303 })

  const profile = await prisma.profile.findUnique({ where: { id: user.id }, include: { restaurant: true } })
  if (!profile || profile.role !== 'owner') return NextResponse.redirect(billingUrl('?error=not_owner'), { status: 303 })
  if (!isBillingConfigured()) return NextResponse.redirect(billingUrl('?error=not_configured'), { status: 303 })

  // No Stripe customer yet: there is nothing to manage, so go subscribe instead.
  if (!profile.restaurant.stripeCustomerId) return NextResponse.redirect(billingUrl(), { status: 303 })

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.restaurant.stripeCustomerId,
      return_url: billingUrl().toString(),
      locale: locale === 'pt-BR' ? 'pt-BR' : 'en',
    })
    return NextResponse.redirect(portalSession.url, { status: 303 })
  } catch (error) {
    console.error('Portal error:', error)
    return NextResponse.redirect(billingUrl('?error=portal_failed'), { status: 303 })
  }
}
