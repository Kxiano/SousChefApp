import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import '../globals.css'

const geist = Geist({ subsets: ['latin'] })

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
    <html lang={locale} className="h-full">
      <body className={`${geist.className} h-full antialiased`}>{children}</body>
    </html>
  )
}
