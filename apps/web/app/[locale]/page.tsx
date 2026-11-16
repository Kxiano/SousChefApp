import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getFormatter, getTranslations } from 'next-intl/server'
import { Link } from '@/lib/navigation'
import { BrandMark } from '@/components/auth-shell'
import { LocaleSwitcher } from '@/components/locale-switcher'
import { buttonClass } from '@/components/ui/button'
import { DEFAULT_MONTHLY_PRICE, PLANS } from '@/lib/billing'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Landing')
  return { title: { absolute: t('meta_title') }, description: t('meta_description') }
}

// The hero's prep calculator: a real-looking ticket, the way the app shows it.
const PREP_ROWS = [
  { key: 'beef', need: 6, stock: 9.5 },
  { key: 'tomatoes', need: 8, stock: 12 },
  { key: 'pancetta', need: 1.6, stock: 0.9 },
  { key: 'soffritto', need: 3.2, stock: 4 },
] as const

export default async function Home() {
  const [t, format] = await Promise.all([getTranslations('Landing'), getFormatter()])
  const kg = (value: number) => `${format.number(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`
  const money = (value: number) => format.number(value, { style: 'currency', currency: 'EUR', minimumFractionDigits: value % 1 ? 2 : 0 })
  const annualPerMonth = (PLANS.annual.defaultAmount * (100 - PLANS.annual.offerPercent)) / 100 / 12

  return (
    <div className="min-h-screen bg-ground text-ink">
      {/* Nav */}
      <header className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <BrandMark />
        <nav aria-label={t('nav_label')} className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[14.5px]">
          <a href="#features" className="hidden text-body hover:text-ink sm:inline">{t('nav_features')}</a>
          <a href="#pricing" className="hidden text-body hover:text-ink sm:inline">{t('nav_pricing')}</a>
          <Suspense><LocaleSwitcher /></Suspense>
          <Link href="/login" className="text-body hover:text-ink">{t('nav_login')}</Link>
          <Link href="/login" className={buttonClass('dark', 'md')}>{t('nav_cta')}</Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-14 px-5 pt-10 pb-20 sm:px-8 sm:pt-12">
        <div className="min-w-0 flex-[1_1_420px] animate-enter">
          <p className="inline-flex items-center gap-2 rounded-full bg-basil-soft px-3 py-1.5 text-[13px] font-semibold text-basil">
            <span className="h-[7px] w-[7px] rounded-full bg-basil" aria-hidden /> {t('hero_badge')}
          </p>
          <h1 className="mt-5 font-display text-[clamp(40px,5.4vw,68px)] font-extrabold leading-[1.02] tracking-[-0.03em]">
            {t('hero_title')}
          </h1>
          <p className="mt-6 max-w-[520px] text-[18px] leading-relaxed text-[#4A5057]">{t('hero_body')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className={buttonClass('primary', 'lg', 'h-[52px] px-6 text-[16px] font-bold')}>{t('hero_cta')}</Link>
            <a href="#features" className={buttonClass('secondary', 'lg', 'h-[52px] px-5 text-[16px]')}>{t('hero_secondary')}</a>
          </div>
          <p className="mt-5 text-[13.5px] text-muted">{t('hero_languages')}</p>
        </div>

        <div className="min-w-0 flex-[1_1_520px] animate-enter [animation-delay:120ms]">
          <div className="overflow-hidden rounded-[18px] border border-line bg-surface shadow-[0_30px_60px_-30px_rgba(22,24,27,0.35)]">
            <div className="flex items-center justify-between gap-3 border-b border-line-soft px-5 py-3.5">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">{t('demo_label')}</p>
                <p className="mt-0.5 truncate font-display text-[20px] font-bold">{t('demo_recipe')} × 40</p>
              </div>
              <span className="shrink-0 rounded-[8px] bg-saffron-soft px-2.5 py-1.5 font-mono text-[13px] font-bold text-saffron-dark">
                {t('demo_cost', { cost: money(2.18) })}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[460px] border-collapse text-[14px]">
                <thead>
                  <tr className="text-left text-[11.5px] uppercase tracking-[0.06em] text-muted">
                    <th className="px-5 py-2.5 font-semibold">{t('demo_col_ingredient')}</th>
                    <th className="px-2 py-2.5 text-right font-semibold">{t('demo_col_need')}</th>
                    <th className="px-2 py-2.5 text-right font-semibold">{t('demo_col_stock')}</th>
                    <th className="px-5 py-2.5 text-right font-semibold">{t('demo_col_status')}</th>
                  </tr>
                </thead>
                <tbody className="font-mono tabular">
                  {PREP_ROWS.map((row) => {
                    const short = row.stock < row.need
                    return (
                      <tr key={row.key} className={`border-t border-line-soft ${short ? 'bg-[#FCF1EE]' : ''}`}>
                        <td className="px-5 py-3 font-sans font-medium">{t(`demo_items.${row.key}`)}</td>
                        <td className="px-2 py-3 text-right">{kg(row.need)}</td>
                        <td className={`px-2 py-3 text-right ${short ? 'font-bold text-paprika' : ''}`}>{kg(row.stock)}</td>
                        <td className={`px-5 py-3 text-right font-sans font-semibold ${short ? 'text-paprika' : 'text-basil'}`}>
                          {short ? t('demo_short', { amount: format.number(row.need - row.stock, { maximumFractionDigits: 2 }) }) : t('demo_ready')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-2.5 border-t border-line-soft bg-sunken px-5 py-4">
              <span className={buttonClass('dark', 'md', 'pointer-events-none')}>{t('demo_order')}</span>
              <span className={buttonClass('secondary', 'md', 'pointer-events-none')}>{t('demo_prep')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-ink text-ground">
        <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 sm:py-24">
          <h2 className="max-w-[720px] font-display text-[clamp(32px,4vw,48px)] font-extrabold leading-[1.05] tracking-[-0.02em]">{t('features_title')}</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <article className="rounded-[16px] border border-[#2D3137] bg-ink-2 p-[22px] transition-transform duration-200 hover:-translate-y-0.5">
              <div className="rounded-[12px] bg-surface p-3.5 text-[13.5px] text-ink">
                <p className="flex justify-between"><span className="font-semibold">{t('f1_card_title')}</span><span className="font-mono font-bold text-paprika">{t('f1_card_count')}</span></p>
                <p className="mt-2.5 flex justify-between font-mono"><span className="font-sans">Parmigiano</span>0.4 / 2 kg</p>
                <p className="mt-1.5 flex justify-between font-mono"><span className="font-sans">{t('f1_card_basil')}</span>0.1 / 0.5 kg</p>
              </div>
              <h3 className="mt-5 mb-1.5 font-display text-[22px] font-bold">{t('f1_title')}</h3>
              <p className="text-[15px] leading-relaxed text-[#B9BEC4]">{t('f1_body')}</p>
            </article>
            <article className="rounded-[16px] border border-[#2D3137] bg-ink-2 p-[22px] transition-transform duration-200 hover:-translate-y-0.5">
              <div className="rounded-[12px] bg-surface p-3.5 text-[13.5px] text-ink">
                <p className="font-semibold">Margherita</p>
                <p className="mt-2.5 flex justify-between font-mono"><span className="font-sans">{t('f2_card_cost')}</span>{money(1.42)}</p>
                <p className="mt-1.5 flex justify-between font-mono"><span className="font-sans">{t('f2_card_yield')}</span>{t('f2_card_portions', { count: 24 })}</p>
              </div>
              <h3 className="mt-5 mb-1.5 font-display text-[22px] font-bold">{t('f2_title')}</h3>
              <p className="text-[15px] leading-relaxed text-[#B9BEC4]">{t('f2_body')}</p>
            </article>
            <article className="rounded-[16px] border border-[#2D3137] bg-ink-2 p-[22px] transition-transform duration-200 hover:-translate-y-0.5">
              <div className="flex flex-col gap-2 rounded-[12px] bg-surface p-3.5 text-[13.5px] text-ink">
                <p className="self-end rounded-[10px_10px_2px_10px] bg-ink px-3 py-2 text-white">{t('f3_card_user')}</p>
                <p className="rounded-[10px_10px_10px_2px] bg-[#F3F1EC] px-3 py-2">{t('f3_card_reply')}</p>
              </div>
              <h3 className="mt-5 mb-1.5 font-display text-[22px] font-bold">{t('f3_title')}</h3>
              <p className="text-[15px] leading-relaxed text-[#B9BEC4]">{t('f3_body')}</p>
            </article>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 sm:py-24">
        <div className="flex flex-wrap items-end justify-between gap-10">
          <div className="flex-[1_1_420px]">
            <h2 className="font-display text-[clamp(32px,4vw,48px)] font-extrabold leading-[1.05] tracking-[-0.02em]">{t('pricing_title')}</h2>
            <p className="mt-4 max-w-[540px] text-[17px] leading-relaxed text-[#4A5057]">
              {t('pricing_body', { price: money(DEFAULT_MONTHLY_PRICE), annual: money(annualPerMonth), percent: PLANS.annual.offerPercent })}
            </p>
          </div>
          <Link href="/login" className={buttonClass('primary', 'lg', 'h-[52px] px-6 text-[16px] font-bold')}>{t('hero_cta')}</Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-3 px-5 py-7 text-[13.5px] text-muted sm:px-8">
          <span>© {new Date().getFullYear()} Sous Chef</span>
          <span>English · Português (Brasil)</span>
        </div>
      </footer>
    </div>
  )
}
