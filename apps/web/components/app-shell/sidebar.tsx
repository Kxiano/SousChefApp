'use client'

import { useState } from 'react'
import {
  BookOpen, Calculator, Calendar, ChefHat, CreditCard, LayoutDashboard, LogOut, Menu, MessageSquare,
  Package, ShoppingCart, StickyNote, TrendingUp, Users, UtensilsCrossed, X,
} from 'lucide-react'
import { Link, usePathname } from '@/lib/navigation'
import { LocaleSwitcher } from '@/components/locale-switcher'

const ICONS = {
  dashboard: LayoutDashboard, calculator: Calculator, portions: UtensilsCrossed, chat: MessageSquare,
  inventory: Package, recipes: BookOpen, purchases: ShoppingCart, bestSellers: TrendingUp,
  shifts: Calendar, notes: StickyNote, team: Users,
}
export type NavIcon = keyof typeof ICONS

export type NavGroup = { label: string; items: { href: string; label: string; icon: NavIcon; badge?: number }[] }

export interface SidebarProps {
  restaurantName: string
  userLine: string
  groups: NavGroup[]
  trial: { title: string; cta: string; percent: number } | null
  labels: { billing: string; signOut: string; openMenu: string; closeMenu: string; app: string }
}

/** The app's navigation: a fixed column on desktop, a drawer behind a menu button on phones. */
export function Sidebar(props: SidebarProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* Phone top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
        <Brand name={props.restaurantName} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={props.labels.openMenu}
          aria-expanded={open}
          className="flex h-11 w-11 items-center justify-center rounded-control border border-line-strong bg-surface"
        >
          <Menu size={18} aria-hidden />
        </button>
      </div>

      {open && <div className="fixed inset-0 z-40 bg-ink/40 animate-fade lg:hidden" onClick={() => setOpen(false)} aria-hidden />}

      <aside
        aria-label={props.labels.app}
        className={`fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col gap-6 overflow-y-auto border-r border-line bg-surface px-3.5 py-4 transition-transform duration-200 ease-[var(--ease-out-strong)] lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-2">
          <Brand name={props.restaurantName} />
          <button type="button" onClick={() => setOpen(false)} aria-label={props.labels.closeMenu} className="flex h-10 w-10 items-center justify-center rounded-control text-muted hover:bg-ground lg:hidden">
            <X size={18} aria-hidden />
          </button>
        </div>

        <nav className="flex flex-col gap-5">
          {props.groups.map((group) => (
            <div key={group.label} className="flex flex-col gap-0.5">
              <p className="mb-1 px-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#6B7178]">{group.label}</p>
              {group.items.map((item) => {
                const Icon = ICONS[item.icon]
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center justify-between gap-2.5 rounded-[9px] px-2.5 py-2 text-[14px] transition-colors duration-150 ${
                      active ? 'bg-ink font-semibold text-white' : 'text-body hover:bg-ground hover:text-ink'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon size={16} aria-hidden />
                      {item.label}
                    </span>
                    {item.badge ? (
                      <span className="rounded-full bg-paprika px-1.5 font-mono text-[11.5px] font-bold text-white">{item.badge}</span>
                    ) : null}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-2.5">
          {props.trial && (
            <Link href="/billing" className="block rounded-[12px] border border-[#F6DFA6] bg-[#FFF6E0] p-3 transition-colors hover:bg-saffron-soft">
              <p className="text-[13px] font-bold text-[#6B4600]">{props.trial.title}</p>
              <div className="my-2 h-1.5 overflow-hidden rounded-full bg-[#F6DFA6]">
                <div className="h-full bg-saffron" style={{ width: `${props.trial.percent}%` }} />
              </div>
              <p className="text-[12px] text-[#6B4600]">{props.trial.cta}</p>
            </Link>
          )}
          <Link href="/billing" className="flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[14px] text-body hover:bg-ground hover:text-ink">
            <CreditCard size={16} aria-hidden /> {props.labels.billing}
          </Link>
          <form action="/auth/signout" method="POST">
            <button type="submit" className="flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left text-[14px] text-body hover:bg-ground hover:text-ink">
              <LogOut size={16} aria-hidden /> {props.labels.signOut}
            </button>
          </form>
          <div className="flex items-center justify-between gap-2 border-t border-line px-2.5 pt-3 text-[12.5px]">
            <span className="truncate text-muted">{props.userLine}</span>
            <LocaleSwitcher />
          </div>
        </div>
      </aside>
    </>
  )
}

function Brand({ name }: { name: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-ink">
        <ChefHat size={17} className="text-saffron" aria-hidden />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate font-display text-[16px] font-extrabold">{name}</p>
        <p className="text-[12px] text-muted">Sous Chef</p>
      </div>
    </div>
  )
}
