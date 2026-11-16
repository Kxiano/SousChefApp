import type { ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'primary' | 'dark' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease-out-strong)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-saffron text-ink hover:bg-[#E59B0C]',
  dark: 'bg-ink text-white hover:bg-[#2A2D31]',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-sunken hover:border-[#C9C5BB]',
  ghost: 'text-body hover:bg-[#EFEDE7] hover:text-ink',
  danger: 'bg-surface text-paprika border border-[#F1C7BE] hover:bg-paprika-soft',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] rounded-[8px]',
  md: 'h-10 px-4 text-sm rounded-control',
  lg: 'h-12 px-5 text-[15px] rounded-[12px]',
}

/** Classes for anything that should look like a button (a <button>, a Link, an <a>). */
export function buttonClass(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', extra = '') {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`.trim()
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />
}
