import { prisma } from '@sous-chef/db'
import { requireProfile } from '@/lib/auth'
import type { Metadata } from 'next'
import { getFormatter, getTranslations } from 'next-intl/server'
import { Link } from '@/lib/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { StatTile } from '@/components/ui/stat-tile'
import { Card, CardHeader, EmptyState } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonClass } from '@/components/ui/button'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Dashboard')
  return { title: t('title') }
}

function partOfDay(date: Date): 'morning' | 'afternoon' | 'evening' {
  const hour = date.getHours()
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

export default async function DashboardPage() {
  const profile = await requireProfile()

  const restaurantId = profile.restaurantId
  const [t, format] = await Promise.all([getTranslations('Dashboard'), getFormatter()])
  const now = new Date()
  const qty = (value: unknown) => format.number(Number(value), { maximumFractionDigits: 2 })

  const [lowStock, lowStockCount, urgentNotes, urgentCount, pendingPOs, upcomingShifts, portionsToday] = await Promise.all([
    prisma.ingredient.findMany({
      where: { restaurantId, quantity: { lte: prisma.ingredient.fields.lowStockThreshold } },
      orderBy: { name: 'asc' },
      take: 6,
    }),
    prisma.ingredient.count({
      where: { restaurantId, quantity: { lte: prisma.ingredient.fields.lowStockThreshold } }
    }).catch(() => 0),
    prisma.note.findMany({
      where: { restaurantId, isUrgent: true },
      orderBy: { createdAt: 'desc' },
      take: 2,
      include: { author: true },
    }),
    prisma.note.count({ where: { restaurantId, isUrgent: true } }),
    prisma.purchaseOrder.count({ where: { restaurantId, status: 'draft' } }),
    prisma.shift.findMany({
      where: { restaurantId, endsAt: { gte: now } },
      orderBy: { startsAt: 'asc' },
      take: 5,
      include: { profile: true },
    }),
    prisma.salesEvent.aggregate({
      where: {
        restaurantId,
        recordedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        eventType: 'sold',
      },
      _sum: { quantity: true },
    }),
  ])

  const firstName = (profile.displayName ?? '').trim().split(/\s+/)[0]
  const greeting = firstName
    ? t(`greeting.${partOfDay(now)}`, { name: firstName })
    : t(`greeting.${partOfDay(now)}_generic`)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={format.dateTime(now, { weekday: 'long', day: 'numeric', month: 'long' })}
        title={greeting}
        actions={
          <>
            <Link href="/purchase-orders" className={buttonClass('secondary')}>{t('actions.new_order')}</Link>
            <Link href="/calculator" className={buttonClass('primary')}>{t('actions.plan_prep')}</Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatTile
          label={t('stats.low_stock')}
          value={format.number(lowStockCount)}
          hint={t('hints.low_stock')}
          tone={lowStockCount > 0 ? 'alert' : 'ok'}
          href="/ingredients"
        />
        <StatTile
          label={t('stats.sold_today')}
          value={format.number(Number(portionsToday._sum.quantity ?? 0), { maximumFractionDigits: 2 })}
          hint={t('hints.sold_today')}
          href="/portions"
        />
        <StatTile
          label={t('stats.draft_orders')}
          value={format.number(pendingPOs)}
          hint={t('hints.draft_orders')}
          href="/purchase-orders"
        />
        <StatTile
          label={t('stats.urgent_notes')}
          value={format.number(urgentCount)}
          hint={t('hints.urgent_notes')}
          tone={urgentCount > 0 ? 'alert' : 'default'}
          href="/notes"
        />
      </div>

      <div className="grid gap-3.5 lg:grid-cols-3">
        {/* Reorder before service */}
        <Card className="overflow-hidden">
          <CardHeader
            title={t('reorder.heading')}
            action={lowStock.length > 0 ? (
              <Link href="/purchase-orders" className="text-[13.5px] font-semibold text-ink underline-offset-2 hover:underline">{t('reorder.create')}</Link>
            ) : undefined}
          />
          {lowStock.length === 0 ? (
            <p className="px-5 pb-5 text-[14px] text-basil">{t('reorder.empty')}</p>
          ) : (
            <ul className="text-[14px]">
              {lowStock.map((ing) => (
                <li key={ing.id} className="flex items-center justify-between gap-3 border-t border-line-soft px-5 py-3">
                  <span className="min-w-0 truncate font-medium">{ing.name}</span>
                  <span className="shrink-0 font-mono tabular text-paprika">
                    {qty(ing.quantity)} / {qty(ing.lowStockThreshold)} {ing.unit}
                  </span>
                </li>
              ))}
              {lowStockCount > lowStock.length && (
                <li className="border-t border-line-soft px-5 py-3">
                  <Link href="/ingredients" className="text-[13.5px] font-semibold text-muted hover:text-ink">
                    {t('reorder.more', { count: lowStockCount - lowStock.length })}
                  </Link>
                </li>
              )}
            </ul>
          )}
        </Card>

        {/* Shifts */}
        <Card className="overflow-hidden">
          <CardHeader
            title={t('shifts.heading')}
            action={<Link href="/shifts" className="text-[13.5px] font-semibold text-ink underline-offset-2 hover:underline">{t('shifts.view_all')}</Link>}
          />
          {upcomingShifts.length === 0 ? (
            <p className="px-5 pb-5 text-[14px] text-muted">{t('shifts.empty')}</p>
          ) : (
            <ul className="text-[14px]">
              {upcomingShifts.map((shift) => (
                <li key={shift.id} className="flex items-center justify-between gap-3 border-t border-line-soft px-5 py-3">
                  <span className="min-w-0 truncate">
                    <span className="font-semibold">{shift.profile.displayName ?? t('shifts.unnamed')}</span>
                    {shift.roleLabel && <span className="text-muted"> · {shift.roleLabel}</span>}
                  </span>
                  <span className="shrink-0 text-right font-mono text-[13px] tabular">
                    <span className="block text-muted">{format.dateTime(shift.startsAt, { weekday: 'short', day: 'numeric' })}</span>
                    {format.dateTime(shift.startsAt, { hour: '2-digit', minute: '2-digit' })}–{format.dateTime(shift.endsAt, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Urgent notes */}
        {urgentNotes.length > 0 ? (
          <section className="flex flex-col gap-4 rounded-card bg-ink p-5 text-ground">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-saffron">{t('urgent.eyebrow')}</p>
              {urgentCount > urgentNotes.length && (
                <Badge tone="dark">{t('urgent.more', { count: urgentCount - urgentNotes.length })}</Badge>
              )}
            </div>
            {urgentNotes.map((note) => (
              <div key={note.id} className="border-t border-white/10 pt-4 first-of-type:border-t-0 first-of-type:pt-0">
                <p className="font-display text-[19px] leading-snug">{note.content}</p>
                <p className="mt-2 text-[13px] text-[#B9BEC4]">
                  {note.author.displayName ?? t('urgent.someone')} · {format.dateTime(note.createdAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
            <Link href="/notes" className="mt-auto text-[13.5px] font-semibold text-saffron hover:underline">{t('urgent.view_all')}</Link>
          </section>
        ) : (
          <EmptyState action={<Link href="/notes" className={buttonClass('secondary', 'sm')}>{t('urgent.post')}</Link>}>
            {t('urgent.empty')}
          </EmptyState>
        )}
      </div>
    </div>
  )
}
