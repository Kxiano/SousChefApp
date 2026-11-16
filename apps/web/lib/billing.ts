import type Stripe from 'stripe'
import { prisma } from '@sous-chef/db'

const DAY = 24 * 60 * 60 * 1000

export const GRACE_PERIOD_DAYS = 3
export const TRIAL_DAYS = 30
/** On this day of the trial, owners see the mid-trial offer. */
export const TRIAL_REMINDER_DAY = 15

// ---------------------------------------------------------------- plans

export type PlanId = 'monthly' | 'semiannual' | 'annual'
export const PLAN_IDS: PlanId[] = ['monthly', 'semiannual', 'annual']

/**
 * The subscription plans. Prices and trial-offer coupons live in Stripe; their ids
 * come from env vars (`scripts/stripe-setup.mjs` creates them and prints the lines).
 * `offerPercent` is what we show when Stripe is not reachable; the coupon's own
 * percent wins when it is.
 */
export const PLANS: Record<PlanId, { months: number; priceEnv: string; couponEnv?: string; offerPercent: number; defaultAmount: number }> = {
  monthly: { months: 1, priceEnv: 'STRIPE_PRICE_MONTHLY', offerPercent: 0, defaultAmount: 10 },
  semiannual: { months: 6, priceEnv: 'STRIPE_PRICE_SEMIANNUAL', couponEnv: 'STRIPE_COUPON_SEMIANNUAL', offerPercent: 20, defaultAmount: 60 },
  annual: { months: 12, priceEnv: 'STRIPE_PRICE_ANNUAL', couponEnv: 'STRIPE_COUPON_ANNUAL', offerPercent: 35, defaultAmount: 120 },
}

/** Default list price per month, in euros (the setup script creates the Stripe prices from it). */
export const DEFAULT_MONTHLY_PRICE = 10

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && (PLAN_IDS as string[]).includes(value)
}

export function planPriceId(plan: PlanId) {
  // STRIPE_PRICE_ID is the older single-price setting; it still works as the monthly plan.
  return process.env[PLANS[plan].priceEnv] || (plan === 'monthly' ? process.env.STRIPE_PRICE_ID : undefined) || null
}

export function planCouponId(plan: PlanId) {
  const env = PLANS[plan].couponEnv
  return (env && process.env[env]) || null
}

function hasStripeKey() {
  const key = process.env.STRIPE_SECRET_KEY ?? ''
  return /^(sk|rk)_(test|live)_/.test(key) && !key.includes('placeholder')
}

/** True when real Stripe keys and at least one plan price are configured. */
export function isBillingConfigured() {
  return hasStripeKey() && PLAN_IDS.some((plan) => planPriceId(plan))
}

export type PlanInfo = {
  id: PlanId
  months: number
  available: boolean
  /** Full price for one billing period, in major units (e.g. euros). */
  amount: number
  currency: string
  /** Trial offer discount on the first period, in percent (0 = none). */
  offerPercent: number
}

/** Plan prices and offers for display, read from Stripe when it is configured. */
export async function getPlanCatalog(stripe: Stripe): Promise<PlanInfo[]> {
  return Promise.all(PLAN_IDS.map(async (id) => {
    const plan = PLANS[id]
    const info: PlanInfo = { id, months: plan.months, available: false, amount: plan.defaultAmount, currency: 'EUR', offerPercent: plan.offerPercent }
    const priceId = planPriceId(id)
    if (!hasStripeKey() || !priceId) return info
    try {
      const price = await stripe.prices.retrieve(priceId)
      info.available = price.active
      if (price.unit_amount != null) info.amount = price.unit_amount / 100
      info.currency = price.currency.toUpperCase()
      const couponId = planCouponId(id)
      if (couponId) {
        const coupon = await stripe.coupons.retrieve(couponId)
        if (coupon.valid && coupon.percent_off) info.offerPercent = coupon.percent_off
      }
    } catch (error) {
      console.error(`Could not load Stripe plan "${id}":`, error)
    }
    return info
  }))
}

// ---------------------------------------------------------------- trial

export function newTrialEnd(from = new Date()) {
  return new Date(from.getTime() + TRIAL_DAYS * DAY)
}

type TrialFields = {
  subscriptionStatus: string | null
  stripeSubscriptionId: string | null
  trialEndsAt: Date | null
  trialReminderSeenAt?: Date | null
}

/** Where a restaurant is in its free trial (not a Stripe trial after subscribing). */
export function getTrialState(restaurant: TrialFields, now = new Date()) {
  const onFreeTrial = !restaurant.stripeSubscriptionId
    && (restaurant.subscriptionStatus ?? 'trialing') === 'trialing'
    && restaurant.trialEndsAt !== null
  if (!onFreeTrial) return { onFreeTrial: false as const }

  const endsAt = restaurant.trialEndsAt!
  const msLeft = endsAt.getTime() - now.getTime()
  const daysLeft = Math.max(Math.ceil(msLeft / DAY), 0)
  const day = Math.min(Math.max(TRIAL_DAYS - daysLeft, 0) + 1, TRIAL_DAYS)
  return {
    onFreeTrial: true as const,
    endsAt,
    daysLeft,
    day,
    ended: msLeft <= 0,
    /** Owners see the mid-trial offer once, from day 15 until they act on it. */
    showReminder: msLeft > 0 && day >= TRIAL_REMINDER_DAY && !restaurant.trialReminderSeenAt,
  }
}

// ---------------------------------------------------------------- webhooks

/**
 * Finds the restaurant a Stripe subscription belongs to: by the restaurantId
 * stored in its metadata at checkout, or by the saved subscription id.
 */
export async function findRestaurantForSubscription(subscription: Stripe.Subscription) {
  const restaurantId = subscription.metadata?.restaurantId
  if (restaurantId) {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } })
    if (restaurant) return restaurant
  }
  return prisma.restaurant.findFirst({ where: { stripeSubscriptionId: subscription.id } })
}

/**
 * When the grace period ends for a past-due restaurant. An existing deadline is
 * kept, so repeated Stripe events cannot keep extending it.
 */
export function graceDeadline(current: Date | null) {
  return current ?? new Date(Date.now() + GRACE_PERIOD_DAYS * DAY)
}

/**
 * What a plan costs: the regular price, and with the trial offer applied to the first
 * period. Rounded to cents. With €10/month: 6 months €60 → €48 (€8/mo); a year €120 → €78 (€6.50/mo).
 */
export function planPricing(plan: PlanInfo, withOffer: boolean) {
  const percent = withOffer ? plan.offerPercent : 0
  const firstPeriod = Math.round(plan.amount * (100 - percent)) / 100
  return {
    regular: plan.amount,
    regularPerMonth: Math.round((plan.amount / plan.months) * 100) / 100,
    firstPeriod,
    firstPeriodPerMonth: Math.round((firstPeriod / plan.months) * 100) / 100,
    percent,
  }
}
