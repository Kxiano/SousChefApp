import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { prisma } from '@sous-chef/db'
import { getUser, localizedRedirect } from '@/lib/auth'
import { AuthShell } from '@/components/auth-shell'
import { Alert } from '@/components/ui/alert'
import { buttonClass } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { createKitchen } from './actions'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Onboarding')
  return { title: t('title') }
}

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const user = await getUser()
  if (!user) return localizedRedirect('/login?redirect=/onboarding')

  // Already part of a kitchen: nothing to set up.
  const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { id: true } })
  if (profile) return localizedRedirect('/dashboard')

  const [t, locale] = await Promise.all([getTranslations('Onboarding'), getLocale()])

  return (
    <AuthShell>
      <Badge tone="ok">{t('trial_badge')}</Badge>
      <h1 className="mt-4 font-display text-[34px] font-extrabold leading-[1.05] tracking-[-0.02em]">{t('heading')}</h1>
      <p className="mt-2 text-[15.5px] text-muted">{t('subheading')}</p>

      {error === 'missing_name' && <Alert>{t('errors.missing_name')}</Alert>}

      <form action={createKitchen} className="mt-7 flex flex-col gap-4">
        <Field label={t('restaurant_label')} htmlFor="restaurantName">
          <Input id="restaurantName" name="restaurantName" required maxLength={80} autoFocus placeholder={t('restaurant_placeholder')} className="h-11" />
        </Field>
        <Field label={t('name_label')} htmlFor="displayName">
          <Input id="displayName" name="displayName" maxLength={60} defaultValue={user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? ''} className="h-11" />
        </Field>
        <Field label={t('language_label')} htmlFor="language">
          <Select id="language" name="language" defaultValue={locale} className="h-11">
            <option value="en">English</option>
            <option value="pt-BR">Português (Brasil)</option>
          </Select>
        </Field>
        <button type="submit" className={buttonClass('primary', 'lg', 'mt-2 w-full font-bold')}>{t('submit')}</button>
        <p className="text-center text-[13px] text-muted">{t('invite_hint')}</p>
      </form>
    </AuthShell>
  )
}
