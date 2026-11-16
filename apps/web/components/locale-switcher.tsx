'use client'

import { useLocale } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Link, usePathname } from '@/lib/navigation'

const LABELS = { en: 'EN', 'pt-BR': 'PT' } as const

/** Switches language while staying on the same page. */
export function LocaleSwitcher({ className = '' }: { className?: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = useLocale()
  // One-off status messages (?error=, ?created=...) are not carried over.
  const query = Object.fromEntries([...searchParams].filter(([key]) => !['error', 'created', 'email', 'renamed', 'prepared', 'checkout'].includes(key)))

  return (
    <div className={`flex items-center gap-1 text-[12.5px] ${className}`}>
      {(Object.keys(LABELS) as (keyof typeof LABELS)[]).map((locale, i) => (
        <span key={locale} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden className="text-line-strong">·</span>}
          <Link
            href={{ pathname, query }}
            locale={locale}
            aria-current={locale === current ? 'true' : undefined}
            className={locale === current ? 'font-bold text-ink' : 'text-muted hover:text-ink'}
          >
            {LABELS[locale]}
          </Link>
        </span>
      ))}
    </div>
  )
}
