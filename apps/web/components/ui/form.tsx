import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const control =
  'w-full rounded-control border border-line-strong bg-surface px-3 text-[14.5px] text-ink placeholder:text-[#8A9097] transition-[border-color,box-shadow] duration-150 hover:border-[#C9C5BB] focus:border-ink focus:outline-none focus:ring-2 focus:ring-saffron/40 disabled:opacity-60'

export const inputClass = `${control} h-10`
export const selectClass = `${control} h-10 pr-8`
export const textareaClass = `${control} py-2.5 leading-relaxed`

export function Label({ className = '', ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`mb-1.5 block text-[13px] font-semibold text-body ${className}`} {...props} />
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputClass} ${className}`} {...props} />
}

export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${selectClass} ${className}`} {...props} />
}

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${textareaClass} ${className}`} {...props} />
}

/** A label above its control, with an optional hint below. */
export function Field({ label, htmlFor, hint, children, className = '' }: { label: ReactNode; htmlFor: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="mt-1.5 text-[12.5px] text-muted">{hint}</p>}
    </div>
  )
}
