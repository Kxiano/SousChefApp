import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { safeRedirectPath } from '@/lib/navigation'
import { AuthShell } from '@/components/auth-shell'
import { Alert } from '@/components/ui/alert'
import { buttonClass } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/form'
import { login, signup } from './actions'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Auth')
  return { title: t('title') }
}

// Codes the login actions put in the URL; anything else falls back to a generic error.
const ERROR_CODES = ['invalid_credentials', 'email_not_confirmed', 'user_already_exists', 'weak_password', 'signup_failed'] as const
const MESSAGE_CODES = ['check_email'] as const

function isCode<T extends string>(codes: readonly T[], value: string | undefined): value is T {
  return value !== undefined && (codes as readonly string[]).includes(value)
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; redirect?: string; email?: string }>
}) {
  const { error, message, redirect, email } = await searchParams
  const t = await getTranslations('Auth')
  const redirectTo = safeRedirectPath(redirect)
  const errorText = error ? t(`errors.${isCode(ERROR_CODES, error) ? error : 'invalid_credentials'}`) : null
  const messageText = isCode(MESSAGE_CODES, message) ? t(`messages.${message}`) : null

  return (
    <AuthShell>
      <h1 className="font-display text-[34px] font-extrabold leading-[1.05] tracking-[-0.02em] sm:text-[36px]">{t('heading')}</h1>
      <p className="mt-2 text-[15.5px] text-muted">{t('subheading')}</p>

      {errorText && <Alert>{errorText}</Alert>}
      {messageText && <Alert tone="success">{messageText}</Alert>}

      <form className="mt-7 flex flex-col gap-4">
        {redirectTo && <input type="hidden" name="redirect" value={redirectTo} />}
        <Field label={t('email')} htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={email} className="h-11" />
        </Field>
        <Field label={t('password')} htmlFor="password" hint={t('password_hint')}>
          <Input id="password" name="password" type="password" autoComplete="current-password" required minLength={6} className="h-11" />
        </Field>
        <div className="mt-2 flex flex-col gap-2.5">
          <button formAction={login} className={buttonClass('dark', 'lg', 'w-full')}>{t('log_in')}</button>
          <button formAction={signup} className={buttonClass('secondary', 'lg', 'w-full')}>{t('sign_up')}</button>
        </div>
        <p className="text-center text-[13px] text-muted">{t('trial_note')}</p>
      </form>
    </AuthShell>
  )
}
