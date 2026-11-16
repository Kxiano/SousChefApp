import type { ReactNode } from 'react'
import { Link } from '@/lib/navigation'

const tones = { default: 'text-ink', alert: 'text-paprika', ok: 'text-basil', brand: 'text-saffron-dark' }

/** A big number with a label, for dashboards. Becomes a link when `href` is set. */
export function StatTile({
  label,
  value,
  hint,
  tone = 'default',
  href,
}: {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  tone?: keyof typeof tones
  href?: string
}) {
  const body = (
    <>
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className={`mt-2 font-mono text-[32px] font-bold leading-none tabular ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-2 text-[12.5px] text-muted">{hint}</p>}
    </>
  )
  const className = 'block rounded-card border border-line bg-surface p-[18px]'
  return href ? (
    <Link href={href} className={`${className} transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-line-strong`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}
