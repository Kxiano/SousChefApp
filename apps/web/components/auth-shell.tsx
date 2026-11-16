import { getTranslations } from 'next-intl/server'
import { ChefHat } from 'lucide-react'
import { Link } from '@/lib/navigation'
import { LocaleSwitcher } from '@/components/locale-switcher'
import { Suspense } from 'react'

/** Logo that links home. */
export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-ink">
        <ChefHat size={17} className="text-saffron" aria-hidden />
      </span>
      <span className="font-display text-[19px] font-extrabold tracking-[-0.01em]">Sous Chef</span>
    </Link>
  )
}

/**
 * The two-column frame for sign-in, setup, invites and the billing lock:
 * the task on the left, tonight's prep ticket on the right (hidden on phones).
 */
export async function AuthShell({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('AuthShell')
  return (
    <div className="flex min-h-screen flex-wrap bg-ground">
      <main className="flex min-w-0 flex-[1_1_480px] flex-col px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex items-center justify-between">
          <BrandMark />
          <Suspense><LocaleSwitcher /></Suspense>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px] animate-enter">{children}</div>
        </div>
      </main>

      <aside className="hidden min-w-0 flex-[1_1_480px] flex-col justify-center gap-7 bg-ink p-12 text-ground lg:flex">
        <p className="max-w-[460px] font-display text-[clamp(26px,2.6vw,34px)] font-bold leading-[1.15]">{t('tagline')}</p>
        <div className="max-w-[360px] rounded-[4px] bg-surface p-[22px] pb-[26px] font-mono text-[14px] text-ink shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)]" aria-hidden>
          <p className="flex justify-between font-bold"><span>{t('ticket_title')}</span><span>17:00</span></p>
          <p className="my-3 border-b border-dashed border-[#B9BEC4]" />
          <p className="mb-2 flex justify-between"><span>Ragù</span><span>×40</span></p>
          <p className="mb-2 flex justify-between"><span>Focaccia</span><span>{t('ticket_trays', { count: 6 })}</span></p>
          <p className="mb-2 flex justify-between"><span>Tiramisù</span><span>×24</span></p>
          <p className="mt-3 flex justify-between border-t border-dashed border-[#B9BEC4] pt-3 font-bold text-paprika"><span>{t('ticket_order')}</span><span>Pancetta 0.7 kg</span></p>
        </div>
      </aside>
    </div>
  )
}
