import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'

// Written out in full so Tailwind finds the classes.
const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' }

/** A card-framed table that scrolls sideways on narrow screens. */
export function Table({ className = '', children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface">
      <table className={`w-full border-collapse text-[14px] ${className}`} {...props}>{children}</table>
    </div>
  )
}

export function Th({ className = '', align = 'left', ...props }: ThHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' | 'center' }) {
  return (
    <th
      className={`border-b border-line bg-sunken px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted ${ALIGN[align]} ${className}`}
      {...props}
    />
  )
}

export function Td({ className = '', align = 'left', ...props }: TdHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' | 'center' }) {
  return <td className={`border-t border-line-soft px-4 py-3 ${ALIGN[align]} ${className}`} {...props} />
}
