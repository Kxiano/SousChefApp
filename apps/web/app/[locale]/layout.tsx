import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: 'Sous Chef', template: '%s · Sous Chef' },
  description: 'The digital co-pilot for restaurant kitchens.',
}

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  return (
    <div lang={locale} className="h-full">{children}</div>
  )
}
