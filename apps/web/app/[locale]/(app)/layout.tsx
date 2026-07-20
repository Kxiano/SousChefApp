import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import {
  LayoutDashboard,
  Package,
  BookOpen,
  Calculator,
  UtensilsCrossed,
  ShoppingCart,
  Calendar,
  TrendingUp,
  MessageSquare,
  StickyNote,
  ChefHat,
  LogOut,
} from 'lucide-react'

const NAV_KEYS = [
  { href: '/dashboard',        key: 'dashboard',   icon: LayoutDashboard },
  { href: '/ingredients',      key: 'inventory',   icon: Package },
  { href: '/recipes',          key: 'recipes',     icon: BookOpen },
  { href: '/calculator',       key: 'calculator',  icon: Calculator },
  { href: '/portions',         key: 'portions',    icon: UtensilsCrossed },
  { href: '/purchase-orders',  key: 'purchases',   icon: ShoppingCart },
  { href: '/shifts',           key: 'shifts',      icon: Calendar },
  { href: '/best-sellers',     key: 'best_sellers',icon: TrendingUp },
  { href: '/notes',            key: 'notes',       icon: StickyNote },
  { href: '/chat',             key: 'ai_chef',     icon: MessageSquare },
]

export default async function AppLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const t = await getTranslations('Navigation')

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside
        style={{
          width: '220px',
          flexShrink: 0,
          backgroundColor: 'var(--color-surface-2)',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          overflowY: 'auto',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '8px',
              backgroundColor: 'var(--color-brand-500)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ChefHat size={16} color="#000" />
            </div>
            <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--color-text-primary)' }}>
              Sous Chef
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px' }}>
          {NAV_KEYS.map(({ href, key, icon: Icon }) => (
            <Link
              key={href}
              href={`/${locale}${href}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 10px',
                borderRadius: '8px',
                fontSize: '13.5px',
                color: 'var(--color-text-secondary)',
                textDecoration: 'none',
                transition: 'background 150ms var(--ease-out-strong), color 150ms',
              }}
              className="nav-link"
            >
              <Icon size={16} />
              {t(key as any)}
            </Link>
          ))}
        </nav>

        {/* User + logout */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', padding: '0 10px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.email}
          </p>
          <div style={{ display: 'flex', gap: '4px', padding: '0 10px 8px' }}>
            <Link href="/en/dashboard" className="text-xs text-[var(--color-text-muted)] hover:text-white">EN</Link>
            <span className="text-xs text-[var(--color-text-muted)]">|</span>
            <Link href="/pt-BR/dashboard" className="text-xs text-[var(--color-text-muted)] hover:text-white">PT</Link>
          </div>
          <form action="/api/stripe/portal" method="POST" style={{ marginBottom: '4px' }}>
            <button
              type="submit"
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 10px', borderRadius: '8px', fontSize: '13.5px',
                color: 'var(--color-text-muted)', background: 'none', border: 'none',
                cursor: 'pointer', width: '100%', transition: 'color 150ms',
                textAlign: 'left'
              }}
              className="nav-link"
            >
              <TrendingUp size={16} />
              {t('manage_billing')}
            </button>
          </form>
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 10px', borderRadius: '8px', fontSize: '13.5px',
                color: 'var(--color-text-muted)', background: 'none', border: 'none',
                cursor: 'pointer', width: '100%', transition: 'color 150ms',
                textAlign: 'left'
              }}
              className="nav-link"
            >
              <LogOut size={16} />
              {t('sign_out')}
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>

      <style>{`
        .nav-link:hover {
          background: var(--color-surface-3);
          color: var(--color-text-primary);
        }
        .nav-link:active {
          transform: scale(0.97);
        }
      `}</style>
    </div>
  )
}
