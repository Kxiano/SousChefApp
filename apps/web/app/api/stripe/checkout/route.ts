import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@sous-chef/db'
import { stripe } from '@/utils/stripe'
import { createClient } from '@/utils/supabase/server'
import { getTrialState, isBillingConfigured, isPlanId, planCouponId, planPriceId } from '@/lib/billing'
import { isLocale, routing } from '@/lib/routing'

const TWO_DAYS = 2 * 24 * 60 * 60 * 1000

// Started from a plain form POST (billing page or the mid-trial offer); every
// outcome is a 303 redirect so the browser follows it with GET.
export async function POST(request: NextRequest) {
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value
  const locale = isLocale(cookieLocale) ? cookieLocale : routing.defaultLocale
  const billingUrl = (search = '') => new URL(`/${locale}/billing${search}`, request.url)
  const back = (search: string) => NextResponse.redirect(billingUrl(search), { status: 303 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL(`/${locale}/login`, request.url), { status: 303 })

  const profile = await prisma.profile.findUnique({ where: { id: user.id }, include: { restaurant: true } })
  if (!profile || profile.role !== 'owner') return back('?error=not_owner')
  if (!isBillingConfigured()) return back('?error=not_configured')

  const form = await request.formData().catch(() => null)
  const requested = form?.get('plan')
  const plan = isPlanId(requested) ? requested : 'monthly'
  const priceId = planPriceId(plan)
  if (!priceId) return back('?error=plan_unavailable')

  const { restaurant } = profile
  // Already subscribed: changes happen in the customer portal, not a second checkout.
  if (restaurant.stripeSubscriptionId && restaurant.stripeCustomerId
    && ['active', 'trialing', 'past_due'].includes(restaurant.subscriptionStatus ?? '')) {
    return back('?error=already_subscribed')
  }

  // Acting on the offer counts as having seen it.
  if (!restaurant.trialReminderSeenAt) {
    await prisma.restaurant.update({ where: { id: restaurant.id }, data: { trialReminderSeenAt: new Date() } })
  }

  const trial = getTrialState(restaurant)
  const trialActive = trial.onFreeTrial && !trial.ended
  // The trial offer only applies while the free trial is still running.
  const couponId = trialActive ? planCouponId(plan) : null
  // Keep the remaining free days: billing starts when the trial would have ended.
  // (Stripe needs a trial end at least 48 hours away.)
  const trialEnd = trialActive && trial.endsAt.getTime() - Date.now() > TWO_DAYS
    ? Math.floor(trial.endsAt.getTime() / 1000)
    : undefined

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      discounts: couponId ? [{ coupon: couponId }] : undefined,
      customer: restaurant.stripeCustomerId ?? undefined,
      customer_email: restaurant.stripeCustomerId ? undefined : user.email,
      client_reference_id: restaurant.id,
      subscription_data: { metadata: { restaurantId: restaurant.id, plan }, trial_end: trialEnd },
      billing_address_collection: 'required',
      locale: locale === 'pt-BR' ? 'pt-BR' : 'en',
      success_url: billingUrl('?checkout=success').toString(),
      cancel_url: billingUrl('?checkout=canceled').toString(),
    })
    return NextResponse.redirect(session.url!, { status: 303 })
  } catch (error) {
    console.error('Checkout error:', error)
    return back('?error=checkout_failed')
  }
}
