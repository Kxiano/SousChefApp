import { createClient } from '@/utils/supabase/server'
import { prisma } from '@sous-chef/db'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { AlertTriangle, UtensilsCrossed, ShoppingCart, StickyNote, Calendar } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile) redirect('/login')

  const restaurantId = profile.restaurantId

  const [lowStockCount, urgentNotes, pendingPOs, upcomingShifts, portionsToday] = await Promise.all([
    prisma.ingredient.count({
      where: { restaurantId, quantity: { lte: prisma.ingredient.fields.lowStockThreshold } }
    }).catch(() => 0),
    prisma.note.count({ where: { restaurantId, isUrgent: true } }),
    prisma.purchaseOrder.count({ where: { restaurantId, status: 'draft' } }),
    prisma.shift.findMany({
      where: { restaurantId, startsAt: { gte: new Date() } },
      orderBy: { startsAt: 'asc' },
      take: 3,
      include: { profile: true },
    }),
    prisma.salesEvent.aggregate({
      where: {
        restaurantId,
        recordedAt: { gte: new Date(new Date().setHours(0,0,0,0)) },
        eventType: 'sold',
      },
      _sum: { quantity: true },
    }),
  ])

  return (
    <div style={{ padding: '32px', maxWidth: '1000px' }}>
      <PageHeader
        title="Kitchen Overview"
        subtitle={new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      />

      {/* Stat grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginTop: '24px' }}>
        <StatCard
          label="Low Stock Alerts"
          value={String(lowStockCount)}
          icon={<AlertTriangle size={18} />}
          href="/ingredients"
          danger={lowStockCount > 0}
        />
        <StatCard
          label="Sold Today"
          value={String(portionsToday._sum.quantity ?? 0)}
          icon={<UtensilsCrossed size={18} />}
          href="/portions"
        />
        <StatCard
          label="Draft Purchase Orders"
          value={String(pendingPOs)}
          icon={<ShoppingCart size={18} />}
          href="/purchase-orders"
        />
        <StatCard
          label="Urgent Notes"
          value={String(urgentNotes)}
          icon={<StickyNote size={18} />}
          href="/notes"
          danger={urgentNotes > 0}
        />
      </div>

      {/* Upcoming shifts */}
      <section style={{ marginTop: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Upcoming Shifts
          </h2>
          <Link href="/shifts" style={{ fontSize: '13px', color: 'var(--color-brand-400)', textDecoration: 'none' }}>
            View all →
          </Link>
        </div>
        {upcomingShifts.length === 0 ? (
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>No upcoming shifts scheduled.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {upcomingShifts.map(shift => (
              <div key={shift.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px', borderRadius: '10px',
                backgroundColor: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
              }}>
                <Calendar size={16} style={{ color: 'var(--color-brand-400)', flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 500 }}>{shift.profile.displayName ?? shift.profile.id}</p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {new Date(shift.startsAt).toLocaleString()} → {new Date(shift.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {shift.roleLabel && (
                  <span style={{ marginLeft: 'auto', fontSize: '11px', padding: '2px 8px', borderRadius: '99px', backgroundColor: 'var(--color-surface-4)', color: 'var(--color-text-muted)' }}>
                    {shift.roleLabel}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
