import type { ReactNode } from 'react'
import { Link } from '@/lib/navigation'
import { buttonClass } from './button'

interface PageHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  /** Small line above the title, e.g. a date. */
  eyebrow?: ReactNode
  /** Buttons on the right. */
  actions?: ReactNode
  /** Shorthand for a single primary link button. */
  action?: { label: string; href: string }
}

export function PageHeader({ title, subtitle, eyebrow, actions, action }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="text-sm text-muted">{eyebrow}</p>}
        <h1 className="mt-1 font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-[34px]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[14.5px] text-muted">{subtitle}</p>}
      </div>
      {(actions || action) && (
        <div className="flex flex-wrap gap-2.5">
          {actions}
          {action && <Link href={action.href} className={buttonClass('primary')}>{action.label}</Link>}
        </div>
      )}
    </div>
  )
}
