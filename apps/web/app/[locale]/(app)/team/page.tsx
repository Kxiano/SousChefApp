import type { Metadata } from 'next'
import { getFormatter, getLocale, getTranslations } from 'next-intl/server'
import { Link2, Mail, Trash2 } from 'lucide-react'
import { prisma } from '@sous-chef/db'
import { requireProfile } from '@/lib/auth'
import { getAppUrl } from '@/lib/app-url'
import { PageHeader } from '@/components/ui/page-header'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { buttonClass } from '@/components/ui/button'
import { Card, EmptyState, SectionLabel } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/form'
import { CopyButton } from '@/components/copy-button'
import { createInvite, renameKitchen, revokeInvite } from './actions'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Team')
  return { title: t('title') }
}

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; email?: string; error?: string; renamed?: string }>
}) {
  const { created, email, error, renamed } = await searchParams
  const profile = await requireProfile()
  const isOwner = profile.role === 'owner'
  const [t, format, locale, appUrl] = await Promise.all([getTranslations('Team'), getFormatter(), getLocale(), getAppUrl()])

  const [members, invites, restaurant] = await Promise.all([
    prisma.profile.findMany({
      where: { restaurantId: profile.restaurantId },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    }),
    isOwner
      ? prisma.inviteToken.findMany({
          where: { restaurantId: profile.restaurantId, usedAt: null, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([]),
    prisma.restaurant.findUnique({ where: { id: profile.restaurantId }, select: { name: true } }),
  ])

  // Emails live in Supabase's auth schema, not in profiles.
  const emailRows = members.length
    ? await prisma.$queryRaw<{ id: string; email: string | null }[]>`
        select id::text, email from auth.users where id = any(${members.map((m) => m.id)}::uuid[])`
    : []
  const emailById = new Map(emailRows.map((row) => [row.id, row.email]))

  const inviteLink = (token: string) => `${appUrl}/${locale}/invite?token=${token}`

  return (
    <div className="max-w-[820px]">
      <PageHeader title={t('title')} subtitle={t('subtitle', { count: members.length })} />

      {error === 'not_owner' && <Alert>{t('errors.not_owner')}</Alert>}
      {error === 'invalid_email' && <Alert>{t('errors.invalid_email')}</Alert>}
      {error === 'missing_name' && <Alert>{t('errors.missing_name')}</Alert>}
      {renamed && <Alert tone="success">{t('kitchen.renamed')}</Alert>}
      {created && email === 'sent' && <Alert tone="success">{t('created.sent')}</Alert>}
      {created && email === 'simulated' && <Alert tone="success">{t('created.simulated')}</Alert>}
      {created && email === 'failed' && <Alert>{t('created.failed')}</Alert>}
      {created && !email && <Alert tone="success">{t('created.link')}</Alert>}

      {isOwner && (
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          <section>
            <SectionLabel>{t('kitchen.heading')}</SectionLabel>
            <Card className="p-4 sm:p-5">
              <form action={renameKitchen} className="flex flex-wrap items-end gap-2.5">
                <div className="min-w-0 flex-[1_1_200px]">
                  <Label htmlFor="kitchen-name">{t('kitchen.name_label')}</Label>
                  <Input id="kitchen-name" name="restaurantName" required maxLength={80} defaultValue={restaurant?.name ?? ''} />
                </div>
                <button type="submit" className={buttonClass('secondary')}>{t('kitchen.save')}</button>
              </form>
            </Card>
          </section>

          <section>
            <SectionLabel>{t('invite.heading')}</SectionLabel>
            <Card className="p-4 sm:p-5">
              <form action={createInvite} className="flex flex-wrap items-end gap-2.5">
                <div className="min-w-0 flex-[1_1_200px]">
                  <Label htmlFor="invite-email">{t('invite.email_label')}</Label>
                  <Input id="invite-email" name="email" type="email" autoComplete="off" placeholder={t('invite.email_placeholder')} />
                </div>
                <button type="submit" className={buttonClass('primary')}>
                  <Link2 size={15} aria-hidden /> {t('invite.submit')}
                </button>
              </form>
              <p className="mt-3 text-[12.5px] leading-relaxed text-muted">{t('invite.help', { days: 7 })}</p>
            </Card>
          </section>
        </div>
      )}

      {isOwner && (
        <section className="mt-7">
          <SectionLabel>{t('pending.heading')}</SectionLabel>
          {invites.length === 0 ? (
            <EmptyState>{t('pending.empty')}</EmptyState>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {invites.map((invite) => (
                <li
                  key={invite.id}
                  className={`rounded-card border bg-surface p-3.5 sm:p-4 ${invite.id === created ? 'border-saffron ring-2 ring-saffron/25' : 'border-line'}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      readOnly
                      value={inviteLink(invite.token)}
                      aria-label={t('pending.link_label')}
                      className="h-10 min-w-0 flex-[1_1_240px] rounded-control border border-line bg-sunken px-3 font-mono text-[12.5px] text-body focus:border-ink focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <CopyButton value={inviteLink(invite.token)} />
                      <form action={revokeInvite.bind(null, invite.id)}>
                        <button type="submit" className={buttonClass('danger', 'sm', 'h-10 sm:h-8')}>
                          <Trash2 size={14} aria-hidden /> {t('pending.revoke')}
                        </button>
                      </form>
                    </div>
                  </div>
                  <p className="mt-2.5 text-[12.5px] text-muted">
                    {t('pending.meta', {
                      created: format.relativeTime(invite.createdAt),
                      expires: format.dateTime(invite.expiresAt, { day: 'numeric', month: 'short' }),
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mt-7">
        <SectionLabel>{t('members.heading')}</SectionLabel>
        <Card className="overflow-hidden">
          <ul>
            {members.map((member, i) => {
              const memberEmail = emailById.get(member.id)
              const name = member.displayName ?? memberEmail ?? t('members.unnamed')
              return (
                <li key={member.id} className={`flex items-center gap-3 px-4 py-3.5 sm:px-5 ${i === 0 ? '' : 'border-t border-line-soft'}`}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ground font-display text-[15px] font-bold text-body" aria-hidden>
                    {name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-semibold text-ink">
                      {name}
                      {member.id === profile.id && <span className="font-normal text-muted"> · {t('members.you')}</span>}
                    </p>
                    {memberEmail && (
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-[13px] text-muted">
                        <Mail size={12} aria-hidden /> {memberEmail}
                      </p>
                    )}
                  </div>
                  <Badge tone={member.role === 'owner' ? 'dark' : 'neutral'}>
                    {member.role === 'owner' ? t('members.owner') : t('members.staff')}
                  </Badge>
                </li>
              )
            })}
          </ul>
        </Card>
        {!isOwner && <p className="mt-2.5 text-[12.5px] text-muted">{t('members.owner_only')}</p>}
      </section>
    </div>
  )
}
