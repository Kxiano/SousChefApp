import type { Metadata } from 'next'
import { getFormatter, getTranslations } from 'next-intl/server'
import { Check, CreditCard, ExternalLink } from 'lucide-react'
import { prisma } from '@sous-chef/db'
import { requireProfile } from '@/lib/auth'
import { TRIAL_DAYS, getPlanCatalog, getTrialState, isBillingConfigured, planPricing, type PlanId } from '@/lib/billing'
import { stripe } from '@/utils/stripe'
import { PageHeader } from '@/components/ui/page-header'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { buttonClass } from '@/components/ui/button'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Billing')
  return { title: t('page.title') }
}

const STATUS_TONE = { active: 'ok', trialing: 'brand', past_due: 'alert', canceled: 'neutral' } as const
const KNOWN_ERRORS = ['not_owner', 'not_configured', 'already_subscribed', 'checkout_failed', 'portal_failed', 'plan_unavailable']

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; error?: string }>
}) {
  const { checkout, error } = await searchParams
  const profile = await requireProfile()
  const isOwner = profile.role === 'owner'
  const [t, format, restaurant, catalog] = await Promise.all([
    getTranslations('Billing'),
    getFormatter(),
    prisma.restaurant.findUniqueOrThrow({ where: { id: profile.restaurantId } }),
    getPlanCatalog(stripe),
  ])

  const status = restaurant.subscriptionStatus ?? 'trialing'
  const trial = getTrialState(restaurant)
  const offerActive = trial.onFreeTrial && !trial.ended
  const hasSubscription = Boolean(restaurant.stripeCustomerId && restaurant.stripeSubscriptionId) && status !== 'canceled'
  const configured = isBillingConfigured()
  const money = (amount: number, currency: string) => format.number(amount, { style: 'currency', currency })
  const statusLabel = t.has(`page.status.${status}`) ? t(`page.status.${status}`) : status

  return (
    <div className="space-y-6">
      <PageHeader title={t('page.title')} subtitle={t('page.plan_name', { restaurant: restaurant.name })} />

      {checkout === 'success' && <Alert tone="success">{t('page.checkout_success')}</Alert>}
      {checkout === 'canceled' && <Alert>{t('page.checkout_canceled')}</Alert>}
      {error && KNOWN_ERRORS.includes(error) && <Alert>{t(`page.errors.${error}`)}</Alert>}

      {/* Where the kitchen stands */}
      {offerActive ? (
        <section aria-label={t('page.plan_heading')} className="flex flex-wrap items-center justify-between gap-6 rounded-[18px] bg-ink p-6 text-ground sm:p-7">
          <div className="min-w-0 flex-[1_1_380px]">
            <p className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-saffron">
              {t('page.trial_days_left', { days: trial.daysLeft })}
            </p>
            <p className="mt-2 font-display text-[22px] leading-snug sm:text-[24px]">
              {t('page.trial_offer_line', { date: format.dateTime(trial.endsAt, { day: 'numeric', month: 'long' }) })}
            </p>
            <div className="mt-4 h-1.5 max-w-[420px] overflow-hidden rounded-full bg-[#2D3137]">
              <div className="h-full bg-saffron" style={{ width: `${Math.round((trial.day / TRIAL_DAYS) * 100)}%` }} />
            </div>
          </div>
          <p className="max-w-[300px] text-[13.5px] leading-relaxed text-[#B9BEC4]">{t('page.free_days_note')}</p>
        </section>
      ) : (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <CreditCard size={18} className="text-muted" aria-hidden />
            <p className="font-semibold">{t('page.plan_name', { restaurant: restaurant.name })}</p>
          </div>
          <Badge tone={STATUS_TONE[status as keyof typeof STATUS_TONE] ?? 'neutral'}>{statusLabel}</Badge>
          {status === 'past_due' && restaurant.gracePeriodEndsAt && (
            <p className="w-full text-[13.5px] text-paprika">
              {t('page.past_due_notice', { date: format.dateTime(restaurant.gracePeriodEndsAt, { day: 'numeric', month: 'long' }) })}
            </p>
          )}
          {status === 'canceled' && <p className="w-full text-[13.5px] text-body">{t('page.canceled_notice')}</p>}
          {trial.onFreeTrial && trial.ended && <p className="w-full text-[13.5px] text-body">{t('page.trial_ended_notice')}</p>}
          {isOwner && configured && hasSubscription && (
            <form action="/api/stripe/portal" method="POST" className="w-full">
              <button type="submit" className={buttonClass('dark')}><ExternalLink size={14} aria-hidden /> {t('page.manage')}</button>
            </form>
          )}
        </Card>
      )}

      {/* Plans */}
      {!hasSubscription && (
        <div className="grid items-stretch gap-4 md:grid-cols-3">
          {catalog.map((plan) => {
            const price = planPricing(plan, offerActive)
            const featured = plan.id === 'annual'
            const discounted = price.percent > 0
            return (
              <article
                key={plan.id}
                className={`flex flex-col rounded-[18px] p-6 ${featured ? 'border-2 border-ink bg-saffron-wash' : 'border border-line bg-surface'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-[22px] font-bold">{t(`page.plans.${plan.id}.name`)}</h2>
                  {discounted && (
                    <Badge tone={featured ? 'dark' : 'brand'}>
                      {featured ? t('page.best_value', { percent: price.percent }) : t('page.trial_offer', { percent: price.percent })}
                    </Badge>
                  )}
                </div>
                <p className="mt-1.5 text-[14px] text-muted">{t(`page.plans.${plan.id}.tagline`)}</p>
                <p className="mt-6 font-mono text-[34px] font-bold leading-none tabular">
                  {money(discounted ? price.firstPeriodPerMonth : price.regularPerMonth, plan.currency)}
                  <span className="text-[14px] text-muted">{t('page.per_month')}</span>
                </p>
                <p className="mt-2 text-[13px] text-muted">
                  {discounted ? (
                    <>
                      <s>{money(price.regular, plan.currency)}</s>{' '}
                      {t(`page.plans.${plan.id}.first_period`, { amount: money(price.firstPeriod, plan.currency) })}
                    </>
                  ) : (
                    t(`page.plans.${plan.id}.billed`, { amount: money(price.regular, plan.currency) })
                  )}
                </p>
                <ul className="mt-6 mb-6 flex flex-col gap-2.5 text-[14px]">
                  {(['everything', discounted ? 'discount' : 'flexible', 'then'] as const).map((key) => (
                    <li key={key} className="flex gap-2">
                      <Check size={16} strokeWidth={2.5} className="mt-0.5 shrink-0 text-basil" aria-hidden />
                      <span>{t(`page.features.${key}`, { percent: price.percent, months: plan.months, amount: money(price.regular, plan.currency), plan: plan.id })}</span>
                    </li>
                  ))}
                </ul>
                {isOwner && (
                  <form action="/api/stripe/checkout" method="POST" className="mt-auto">
                    <input type="hidden" name="plan" value={plan.id} />
                    <button
                      type="submit"
                      disabled={!configured}
                      className={buttonClass(featured ? 'primary' : plan.id === 'semiannual' ? 'dark' : 'secondary', 'lg', 'w-full font-bold')}
                    >
                      {discounted ? t('page.claim', { percent: price.percent }) : t(`page.choose.${plan.id as PlanId}`)}
                    </button>
                  </form>
                )}
              </article>
            )
          })}
        </div>
      )}

      <p className="text-[13px] text-muted">
        {!isOwner ? t('page.owner_only') : !configured ? t('page.not_configured') : t('page.secure_note')}
      </p>
    </div>
  )
}
