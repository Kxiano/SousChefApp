import { prisma } from '@sous-chef/db'
import { requireProfile } from '@/lib/auth'
import type { Metadata } from 'next'
import { getFormatter, getTranslations } from 'next-intl/server'
import { Calendar, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { buttonClass } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, EmptyState, SectionLabel } from '@/components/ui/card'
import { Field, Input, Select } from '@/components/ui/form'
import { createShift, deleteShift } from './actions'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Shifts')
  return { title: t('title') }
}

/** A locale-independent key for grouping shifts by calendar day. */
function dayKey(date: Date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

export default async function ShiftsPage() {
  const profile = await requireProfile()
  const t = await getTranslations('Shifts')

  const restaurantId = profile.restaurantId

  const [shifts, teamMembers] = await Promise.all([
    prisma.shift.findMany({
      where: { restaurantId },
      orderBy: { startsAt: 'asc' },
      include: { profile: true },
    }),
    prisma.profile.findMany({
      where: { restaurantId },
      orderBy: { displayName: 'asc' },
    }),
  ])

  // Group shifts by date string
  const grouped = new Map<string, typeof shifts>()
  for (const shift of shifts) {
    const key = dayKey(shift.startsAt)
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(shift)
  }

  // Sort days: upcoming first, then past
  const now = new Date()
  const upcomingGroups: [string, typeof shifts][] = []
  const pastGroups: [string, typeof shifts][] = []
  for (const [key, dayShifts] of grouped) {
    const dayDate = new Date(dayShifts[0].startsAt)
    if (dayDate >= new Date(now.setHours(0, 0, 0, 0))) upcomingGroups.push([key, dayShifts])
    else pastGroups.push([key, dayShifts])
  }

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle', { count: shifts.filter(s => new Date(s.startsAt) >= new Date()).length })}
      />

      {/* Create shift form */}
      <section className="mt-7">
        <SectionLabel>{t('add_heading')}</SectionLabel>
        <Card className="p-4 sm:p-5">
          <form action={createShift} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
            <Field label={t('team_member')} htmlFor="shift-member">
              <Select id="shift-member" name="profileId">
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.displayName ?? m.id.slice(0, 8)}</option>
                ))}
              </Select>
            </Field>
            <Field label={t('start')} htmlFor="shift-start">
              <Input id="shift-start" name="startsAt" type="datetime-local" required className="font-mono tabular text-[13.5px]" />
            </Field>
            <Field label={t('end')} htmlFor="shift-end">
              <Input id="shift-end" name="endsAt" type="datetime-local" required className="font-mono tabular text-[13.5px]" />
            </Field>
            <Field label={t('role_label')} htmlFor="shift-role">
              <Input id="shift-role" name="roleLabel" placeholder={t('role_placeholder')} />
            </Field>
            <button type="submit" className={buttonClass('primary', 'md', 'sm:col-span-2 lg:col-span-1')}>
              <Plus size={16} aria-hidden /> {t('add').replace(/^\+\s*/, '')}
            </button>
          </form>
        </Card>
      </section>

      {/* Upcoming */}
      {upcomingGroups.length > 0 && (
        <section className="mt-9">
          <SectionLabel>{t('upcoming')}</SectionLabel>
          <ShiftGroups groups={upcomingGroups} canDelete={profile.role === 'owner'} />
        </section>
      )}

      {/* Past */}
      {pastGroups.length > 0 && (
        <section className="mt-9">
          <SectionLabel>{t('past')}</SectionLabel>
          <ShiftGroups groups={pastGroups} canDelete={false} muted />
        </section>
      )}

      {shifts.length === 0 && (
        <div className="mt-7">
          <EmptyState>{t('empty')}</EmptyState>
        </div>
      )}
    </div>
  )
}

async function ShiftGroups({
  groups,
  canDelete,
  muted = false,
}: {
  groups: [string, { id: string; startsAt: Date; endsAt: Date; roleLabel: string | null; notes: string | null; profile: { displayName: string | null; id: string } }[]][]
  canDelete: boolean
  muted?: boolean
}) {
  const [t, format] = await Promise.all([getTranslations('Shifts'), getFormatter()])
  const formatTime = (date: Date) => format.dateTime(date, { hour: '2-digit', minute: '2-digit' })
  const formatDate = (date: Date) => format.dateTime(date, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="flex flex-col gap-6">
      {groups.map(([key, dayShifts]) => (
        <div key={key}>
          <h3 className={`mb-2.5 flex items-center gap-2 font-display text-[17px] font-bold first-letter:uppercase ${muted ? 'text-muted' : 'text-ink'}`}>
            <Calendar size={15} className={muted ? 'text-muted' : 'text-saffron-dark'} aria-hidden />
            <span className="first-letter:uppercase">{formatDate(dayShifts[0].startsAt)}</span>
          </h3>
          <Card className={`overflow-hidden ${muted ? 'opacity-70' : ''}`}>
            <ul className="divide-y divide-line-soft">
              {dayShifts.map(shift => (
                <li key={shift.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
                  <span className="min-w-[118px] shrink-0 whitespace-nowrap font-mono text-[14px] font-medium tabular">
                    {formatTime(shift.startsAt)}–{formatTime(shift.endsAt)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[14.5px] font-semibold">
                      {shift.profile.displayName ?? t('unnamed_member', { id: shift.profile.id.slice(0, 6) })}
                      {shift.roleLabel && <Badge>{shift.roleLabel}</Badge>}
                    </p>
                    {shift.notes && <p className="mt-0.5 text-[13px] text-muted">{shift.notes}</p>}
                  </div>
                  {canDelete && (
                    <form action={deleteShift.bind(null, shift.id)}>
                      <button
                        type="submit"
                        aria-label={t('delete')}
                        className="flex h-10 w-10 items-center justify-center rounded-control border border-line text-muted transition-colors hover:border-[#F1C7BE] hover:bg-paprika-soft hover:text-paprika"
                      >
                        <Trash2 size={15} aria-hidden />
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ))}
    </div>
  )
}
