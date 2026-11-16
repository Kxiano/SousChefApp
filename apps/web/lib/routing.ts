import { defineRouting } from 'next-intl/routing'

// Plain routing config and helpers, safe to import from the proxy, route
// handlers and server code. React navigation helpers live in lib/navigation.ts.

export const routing = defineRouting({
  locales: ['en', 'pt-BR'],
  defaultLocale: 'en',
})

export type Locale = (typeof routing.locales)[number]

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (routing.locales as readonly string[]).includes(value)
}

/**
 * Only allow redirects to paths inside this app, never to another site
 * ("//evil.com" or "https://..."). Returns null when the value is unsafe.
 */
export function safeRedirectPath(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null
  return value
}

/** Removes a leading /en or /pt-BR so the path can be passed to the locale-aware helpers. */
export function stripLocale(path: string): string {
  return path.replace(/^\/(en|pt-BR)(?=\/|$|\?)/, '') || '/'
}
