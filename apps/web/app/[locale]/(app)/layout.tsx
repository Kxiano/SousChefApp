import { Suspense } from 'react'
import { getFormatter, getTranslations } from 'next-intl/server'
import { prisma } from '@sous-chef/db'
import { requireProfile } from '@/lib/auth'
import { TRIAL_DAYS, getPlanCatalog, getTrialState, planPricing } from '@/lib/billing'
import { stripe } from '@/utils/stripe'
import { Sidebar, type NavGroup } from '@/components/app-shell/sidebar'
import { TrialOffer, type OfferPlan } from '@/components/trial-offer'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile()
  const [t, format, restaurant, lowStock] = await Promise.all([
    getTranslations('Navigation'),
    getFormatter(),
    prisma.restaurant.findUniqueOrThrow({ where: { id: profile.restaurantId } }),
    prisma.ingredient.count({
      where: { restaurantId: profile.restaurantId, quantity: { lte: prisma.ingredient.fields.lowStockThreshold } },
    }),
  ])

  const isOwner = profile.role === 'owner'
  const trial = getTrialState(restaurant)

  const groups: NavGroup[] = [
    {
      label: t('group_service'),
      items: [
        { href: '/dashboard', label: t('dashboard'), icon: 'dashboard' },
        { href: '/calculator', label: t('calculator'), icon: 'calculator' },
        { href: '/portions', label: t('portions'), icon: 'portions' },
        { href: '/chat', label: t('ai_chef'), icon: 'chat' },
      ],
    },
    {
      label: t('group_kitchen'),
      items: [
        { href: '/ingredients', label: t('inventory'), icon: 'inventory', badge: lowStock },
        { href: '/recipes', label: t('recipes'), icon: 'recipes' },
        { href: '/purchase-orders', label: t('purchases'), icon: 'purchases' },
        { href: '/best-sellers', label: t('best_sellers'), icon: 'bestSellers' },
      ],
    },
    {
      label: t('group_team'),
      items: [
        { href: '/shifts', label: t('shifts'), icon: 'shifts' },
        { href: '/notes', label: t('notes'), icon: 'notes' },
        { href: '/team', label: t('team'), icon: 'team' },
      ],
    },
  ]

  const offer = isOwner && trial.onFreeTrial && trial.showReminder ? await loadOffer() : null

  async function loadOffer() {
    if (!trial.onFreeTrial) return null
    const [tOffer, recipes, sales, teammates, catalog] = await Promise.all([
      getTranslations('TrialOffer'),
      prisma.recipe.count({ where: { restaurantId: restaurant.id } }),
      prisma.salesEvent.aggregate({ where: { restaurantId: restaurant.id }, _sum: { quantity: true } }),
      prisma.profile.count({ where: { restaurantId: restaurant.id } }),
      getPlanCatalog(stripe),
    ])
    const money = (amount: number, currency: string) => format.number(amount, { style: 'currency', currency })
    const plans: OfferPlan[] = catalog
      .filter((plan): plan is typeof plan & { id: OfferPlan['id'] } => plan.id !== 'monthly')
      .map((plan) => {
        const price = planPricing(plan, true)
        return {
          id: plan.id,
          percent: price.percent,
          perMonth: money(price.firstPeriodPerMonth, plan.currency),
          firstPeriod: money(price.firstPeriod, plan.currency),
          regular: money(price.regular, plan.currency),
          regularPerMonth: money(price.regularPerMonth, plan.currency),
        }
      })
      .reverse() // annual first
    const monthly = catalog.find((plan) => plan.id === 'monthly')!
    return {
      name: (profile.displayName ?? '').split(' ')[0] || tOffer('chef'),
      restaurant: restaurant.name,
      day: trial.day,
      totalDays: TRIAL_DAYS,
      daysLeft: trial.daysLeft,
      endsOn: format.dateTime(trial.endsAt, { day: 'numeric', month: 'long' }),
      stats: { recipes, portions: Math.round(Number(sales._sum.quantity ?? 0)), teammates },
      plans,
      monthlyPrice: money(monthly.amount, monthly.currency),
    }
  }

  return (
    <div className="min-h-full lg:flex">
      <Suspense>
        <Sidebar
          restaurantName={restaurant.name}
          userLine={`${profile.displayName ?? ''} · ${isOwner ? t('owner') : t('staff')}`}
          groups={groups}
          trial={trial.onFreeTrial && !trial.ended ? {
            title: t('trial_days_left', { days: trial.daysLeft }),
            cta: t('trial_cta'),
            percent: Math.round((trial.day / TRIAL_DAYS) * 100),
          } : null}
          labels={{ billing: t('manage_billing'), signOut: t('sign_out'), openMenu: t('open_menu'), closeMenu: t('close_menu'), app: t('app') }}
        />
      </Suspense>
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-8 sm:py-8 animate-enter">{children}</div>
      </main>
      {offer && <TrialOffer {...offer} />}
    </div>
  )
}
