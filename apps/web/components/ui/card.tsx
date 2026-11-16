import type { HTMLAttributes, ReactNode } from 'react'

/** A white panel with the standard border and radius. */
export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-card border border-line bg-surface ${className}`} {...props} />
}

/** A card's title row: a heading and an optional action on the right. */
export function CardHeader({ title, action, description }: { title: ReactNode; action?: ReactNode; description?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4 pb-3">
      <div className="min-w-0">
        <h2 className="font-display text-[19px] font-bold leading-tight">{title}</h2>
        {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}

/** Small uppercase label above a group of content. */
export function SectionLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h2 className={`mb-3 text-[11.5px] font-bold uppercase tracking-[0.08em] text-muted ${className}`}>{children}</h2>
}

/** A dashed box for "nothing here yet" states. */
export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-dashed border-line-strong bg-surface/50 px-6 py-10 text-center text-[14.5px] text-muted">
      <p className="max-w-md">{children}</p>
      {action}
    </div>
  )
}
