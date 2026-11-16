'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { localizedRedirect } from '@/lib/auth'
import { safeRedirectPath, stripLocale } from '@/lib/navigation'

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get('email') ?? '').trim(),
    password: String(formData.get('password') ?? ''),
  }
}

/** Where to go after signing in: the page that sent the user here, or the dashboard. */
function nextPath(formData: FormData) {
  const target = safeRedirectPath(formData.get('redirect'))
  return target ? stripLocale(target) : '/dashboard'
}

/** Back to the login page with a message, keeping the redirect target. */
function backToLogin(formData: FormData, params: Record<string, string>) {
  const search = new URLSearchParams(params)
  // Keep the email filled in when the form comes back with an error.
  const email = String(formData.get('email') ?? '').trim()
  if (email && params.error) search.set('email', email)
  const target = safeRedirectPath(formData.get('redirect'))
  if (target) search.set('redirect', target)
  return localizedRedirect(`/login?${search}`)
}

export async function login(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(readCredentials(formData))

  if (error) {
    const code = error.code === 'email_not_confirmed' ? 'email_not_confirmed' : 'invalid_credentials'
    return backToLogin(formData, { error: code })
  }

  revalidatePath('/', 'layout')
  return localizedRedirect(nextPath(formData))
}

export async function signup(formData: FormData) {
  const credentials = readCredentials(formData)
  if (credentials.password.length < 6) return backToLogin(formData, { error: 'weak_password' })

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp(credentials)

  if (error) {
    const code = error.code === 'user_already_exists' ? 'user_already_exists'
      : error.code === 'weak_password' ? 'weak_password'
      : 'signup_failed'
    return backToLogin(formData, { error: code })
  }

  // With email confirmation on, Supabase returns no session until the link is clicked.
  if (!data.session) return backToLogin(formData, { message: 'check_email' })

  revalidatePath('/', 'layout')
  return localizedRedirect(nextPath(formData))
}
