import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { isLocale } from '@/lib/navigation'

export const metadata: Metadata = {
  title: { default: 'Sous Chef', template: '%s · Sous Chef' },
  description: 'The digital co-pilot for restaurant kitchens.',
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  setRequestLocale(locale)

  return (
    <NextIntlClientProvider>
      <div lang={locale} className="h-full">{children}</div>
    </NextIntlClientProvider>
  )
}
