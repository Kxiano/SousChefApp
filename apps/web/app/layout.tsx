import { Bricolage_Grotesque, Inter, JetBrains_Mono } from 'next/font/google'
import { getLocale } from 'next-intl/server'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const bricolage = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-bricolage', display: 'swap', weight: ['500', '700', '800'] })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap', weight: ['500', '700'] })

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  return (
    <html lang={locale} className={`h-full ${inter.variable} ${bricolage.variable} ${jetbrains.variable}`}>
      <body className="h-full bg-ground font-sans text-ink antialiased">{children}</body>
    </html>
  )
}
