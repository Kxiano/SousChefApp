import type { ReactNode } from 'react'

const tones = {
  neutral: 'bg-[#EFEDE7] text-body',
  ok: 'bg-basil-soft text-basil',
  alert: 'bg-paprika-soft text-paprika-dark',
  brand: 'bg-saffron-soft text-saffron-dark',
  dark: 'bg-ink text-saffron',
}

/** A small rounded pill for a status or a count. */
export function Badge({ children, tone = 'neutral', className = '' }: { children: ReactNode; tone?: keyof typeof tones; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${tones[tone]} ${className}`}>
      {children}
    </span>
  )
}
