import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Users } from 'lucide-react'
import { prisma } from '@sous-chef/db'
import { getUser } from '@/lib/auth'
import { Link } from '@/lib/navigation'
import { AuthShell } from '@/components/auth-shell'
import { buttonClass } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { acceptInvite } from './actions'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Invite')
  return { title: t('title') }
}

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const t = await getTranslations('Invite')

  const invite = token
    ? await prisma.inviteToken.findUnique({ where: { token }, include: { restaurant: true } })
    : null
  const valid = invite && !invite.usedAt && invite.expiresAt >= new Date()

  if (!token || !valid) {
    return (
      <AuthShell>
        <h1 className="font-display text-[30px] font-extrabold leading-tight tracking-[-0.02em]">{t('title')}</h1>
        <Alert>{token ? t('invalid') : t('missing_token')}</Alert>
        <Link href="/" className={buttonClass('secondary', 'lg', 'mt-6 w-full')}>{t('home')}</Link>
      </AuthShell>
    )
  }

  const user = await getUser()

  return (
    <AuthShell>
      <span className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-saffron-soft">
        <Users size={22} className="text-saffron-dark" aria-hidden />
      </span>
      <h1 className="mt-5 font-display text-[32px] font-extrabold leading-[1.08] tracking-[-0.02em]">
        {t('join', { restaurant: invite.restaurant.name })}
      </h1>
      {user ? (
        <>
          <p className="mt-2 text-[15.5px] text-muted">{t('logged_in_as', { email: user.email ?? '' })}</p>
          <form action={acceptInvite.bind(null, token)} className="mt-7">
            <button className={buttonClass('primary', 'lg', 'w-full font-bold')}>{t('accept')}</button>
          </form>
        </>
      ) : (
        <>
          <p className="mt-2 text-[15.5px] text-muted">{t('log_in_to_accept')}</p>
          <Link
            href={{ pathname: '/login', query: { redirect: `/invite?token=${token}` } }}
            className={buttonClass('dark', 'lg', 'mt-7 w-full')}
          >
            {t('log_in_or_sign_up')}
          </Link>
        </>
      )}
    </AuthShell>
  )
}
