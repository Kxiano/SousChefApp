import { createClient } from '@/utils/supabase/server'
import { prisma } from '@sous-chef/db'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Calendar, Clock, Trash2, UserCircle } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { createShift, deleteShift } from './actions'

export const metadata: Metadata = { title: 'Shift Scheduling' }

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default async function ShiftsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile) redirect('/login')

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
    const key = new Date(shift.startsAt).toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })
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
    <div style={{ padding: '32px', maxWidth: '860px' }}>
      <PageHeader
        title="Shift Schedule"
        subtitle={`${shifts.filter(s => new Date(s.startsAt) >= new Date()).length} upcoming shifts`}
      />

      {/* Create shift form */}
      <section style={{ marginTop: '28px' }}>
        <h2 style={sectionHeadStyle}>Add Shift</h2>
        <form
          action={createShift}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr auto',
            gap: '8px',
            padding: '16px',
            backgroundColor: 'var(--color-surface-2)',
            borderRadius: '12px',
            border: '1px solid var(--color-border)',
            alignItems: 'end',
          }}
        >
          <div>
            <label style={labelStyle}>Team Member</label>
            <select name="profileId" style={inputStyle}>
              {teamMembers.map(m => (
                <option key={m.id} value={m.id}>{m.displayName ?? m.id.slice(0, 8)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Start</label>
            <input name="startsAt" type="datetime-local" required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>End</label>
            <input name="endsAt" type="datetime-local" required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Role label</label>
            <input name="roleLabel" placeholder="e.g. Line cook" style={inputStyle} />
          </div>
          <button type="submit" style={primaryBtnStyle} className="add-btn">
            + Add
          </button>
        </form>
      </section>

      {/* Upcoming */}
      {upcomingGroups.length > 0 && (
        <section style={{ marginTop: '36px' }}>
          <h2 style={sectionHeadStyle}>Upcoming</h2>
          <ShiftGroups groups={upcomingGroups} canDelete={profile.role === 'owner'} />
        </section>
      )}

      {/* Past */}
      {pastGroups.length > 0 && (
        <section style={{ marginTop: '36px' }}>
          <h2 style={sectionHeadStyle}>Past</h2>
          <ShiftGroups groups={pastGroups} canDelete={false} muted />
        </section>
      )}

      {shifts.length === 0 && (
        <div style={{ ...emptyStyle, marginTop: '28px' }}>No shifts scheduled yet. Add your first shift above.</div>
      )}

      <style>{`
        .add-btn:hover { opacity: 0.85 !important; }
        .delete-btn:hover { color: var(--color-danger) !important; border-color: rgba(239,68,68,0.3) !important; }
        input::placeholder { color: var(--color-text-muted); }
        input[type="datetime-local"]::-webkit-calendar-picker-indicator { filter: invert(0.4); }
        select option { background: var(--color-surface-2); }
      `}</style>
    </div>
  )
}

function ShiftGroups({
  groups,
  canDelete,
  muted = false,
}: {
  groups: [string, { id: string; startsAt: Date; endsAt: Date; roleLabel: string | null; profile: { displayName: string | null; id: string } }[]][]
  canDelete: boolean
  muted?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {groups.map(([key, dayShifts]) => (
        <div key={key}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Calendar size={13} color="var(--color-brand-400)" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: muted ? 'var(--color-text-muted)' : 'var(--color-text-secondary)' }}>
              {formatDate(dayShifts[0].startsAt)}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {dayShifts.map(shift => (
              <div
                key={shift.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', borderRadius: '10px',
                  backgroundColor: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  opacity: muted ? 0.6 : 1,
                }}
              >
                <UserCircle size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                    {shift.profile.displayName ?? `User ${shift.profile.id.slice(0, 6)}`}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={11} />
                    {formatTime(shift.startsAt)} → {formatTime(shift.endsAt)}
                  </p>
                </div>
                {shift.roleLabel && (
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '99px', backgroundColor: 'var(--color-surface-4)', color: 'var(--color-text-muted)' }}>
                    {shift.roleLabel}
                  </span>
                )}
                {canDelete && (
                  <form action={deleteShift.bind(null, shift.id)}>
                    <button type="submit" style={deleteBtnStyle} className="delete-btn">
                      <Trash2 size={13} />
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const sectionHeadStyle: React.CSSProperties = {
  fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 500,
  color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em',
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: '8px',
  backgroundColor: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)', fontSize: '13.5px', outline: 'none',
}
const primaryBtnStyle: React.CSSProperties = {
  padding: '9px 18px', borderRadius: '8px', backgroundColor: 'var(--color-brand-500)',
  border: 'none', color: '#000', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
  transition: 'opacity 150ms', whiteSpace: 'nowrap',
}
const deleteBtnStyle: React.CSSProperties = {
  display: 'flex', padding: '6px', borderRadius: '7px', fontSize: '12px',
  backgroundColor: 'transparent', border: '1px solid var(--color-border)',
  color: 'var(--color-text-muted)', cursor: 'pointer', transition: 'color 150ms, border-color 150ms',
}
const emptyStyle: React.CSSProperties = {
  padding: '48px 24px', textAlign: 'center', borderRadius: '12px',
  border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)', fontSize: '14px',
}
