import { headers } from 'next/headers'

/** The public origin of the app (e.g. https://souschef.app), for links sent outside it. */
export async function getAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL && process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  }
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  if (!host) return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}
