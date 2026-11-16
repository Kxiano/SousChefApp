import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Lock } from 'lucide-react'
import { Link } from '@/lib/navigation'
import { AuthShell } from '@/components/auth-shell'
import { buttonClass } from '@/components/ui/button'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Billing')
  return { title: t('title') }
}

const REASONS = ['trial_ended', 'payment_failed', 'canceled'] as const

export default async function BillingLockedPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams
  const t = await getTranslations('Billing')
  const why = (REASONS as readonly string[]).includes(reason ?? '') ? (reason as (typeof REASONS)[number]) : null

  return (
    <AuthShell>
      <span className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-paprika-soft">
        <Lock size={22} className="text-paprika" aria-hidden />
      </span>
      <h1 className="mt-5 font-display text-[32px] font-extrabold leading-[1.08] tracking-[-0.02em]">
        {why ? t(`locked.${why}.heading`) : t('heading')}
      </h1>
      <p className="mt-3 text-[15.5px] leading-relaxed text-muted">{why ? t(`locked.${why}.body`) : t('body')}</p>
      <p className="mt-3 text-[14px] font-medium text-body">{t('locked.data_safe')}</p>

      <Link href="/billing" className={buttonClass('primary', 'lg', 'mt-7 w-full font-bold')}>
        {why === 'trial_ended' ? t('locked.choose_plan') : t('manage')}
      </Link>
      <form action="/auth/signout" method="POST" className="mt-3">
        <button type="submit" className={buttonClass('ghost', 'lg', 'w-full')}>{t('sign_out')}</button>
      </form>
    </AuthShell>
  )
}
