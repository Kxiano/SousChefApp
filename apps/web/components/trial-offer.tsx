'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Check, Circle, Minus, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/lib/navigation'
import { dismissTrialReminder } from '@/app/[locale]/(app)/billing/actions'

export type OfferPlan = {
  id: 'semiannual' | 'annual'
  percent: number
  perMonth: string      // first-period price per month, formatted
  firstPeriod: string   // first-period total, formatted
  regular: string       // regular price per period, formatted
  regularPerMonth: string
}

export interface TrialOfferProps {
  name: string
  restaurant: string
  day: number
  totalDays: number
  daysLeft: number
  endsOn: string
  stats: { recipes: number; portions: number; teammates: number }
  plans: OfferPlan[]
  monthlyPrice: string
}

/** The mid-trial offer owners see once, from day 15 of their free trial. */
export function TrialOffer(props: TrialOfferProps) {
  const t = useTranslations('TrialOffer')
  const [open, setOpen] = useState(true)
  const [plan, setPlan] = useState<OfferPlan['id']>('annual')
  const [, startTransition] = useTransition()
  const dialogRef = useRef<HTMLDivElement>(null)
  const selected = props.plans.find((p) => p.id === plan) ?? props.plans[0]

  const close = () => {
    setOpen(false)
    startTransition(() => dismissTrialReminder())
  }

  useEffect(() => {
    if (!open) return
    dialogRef.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [open])

  if (!open || !selected) return null

  const strong = (chunks: React.ReactNode) => <strong className="font-semibold text-ink">{chunks}</strong>

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/55 p-0 animate-fade sm:items-center sm:p-6" onClick={close}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trial-offer-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[100dvh] w-full max-w-[880px] flex-col overflow-y-auto rounded-t-[22px] bg-surface shadow-[0_40px_80px_-30px_rgba(0,0,0,0.5)] outline-none animate-dialog sm:max-h-[92vh] sm:rounded-[22px] md:flex-row"
      >
        {/* Where they are, and the plans */}
        <div className="flex flex-1 flex-col p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <p className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-saffron-dark">
              {t('day', { day: props.day, total: props.totalDays })}
            </p>
            <button type="button" onClick={close} aria-label={t('close')} className="flex h-10 w-10 items-center justify-center rounded-control border border-line hover:bg-ground">
              <X size={16} aria-hidden />
            </button>
          </div>
          <div className="mt-3 mb-5 h-1.5 overflow-hidden rounded-full bg-[#F3EEE2]">
            <div className="h-full bg-saffron" style={{ width: `${Math.round((props.day / props.totalDays) * 100)}%` }} />
          </div>

          <h2 id="trial-offer-title" className="font-display text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-[30px]">
            {t('title', { name: props.name, restaurant: props.restaurant })}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[#4A5057]">
            {t.rich('progress', { ...props.stats, strong })} {t('progress_offer')}
          </p>

          <fieldset className="mt-5 flex flex-col gap-2.5">
            <legend className="mb-2 text-[13px] font-semibold">{t('choose_plan')}</legend>
            {props.plans.map((option) => {
              const checked = option.id === plan
              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center gap-3.5 rounded-[14px] px-4 py-3.5 transition-colors ${
                    checked ? 'border-2 border-ink bg-saffron-wash' : 'border border-line bg-surface hover:border-line-strong'
                  }`}
                >
                  <input type="radio" name="offer-plan" checked={checked} onChange={() => setPlan(option.id)} className="h-[18px] w-[18px] accent-ink" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-[15.5px] font-bold">
                      <span className="whitespace-nowrap">{t(`plans.${option.id}.name`)}</span>
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-bold ${option.id === 'annual' ? 'bg-ink text-saffron' : 'bg-saffron-soft text-saffron-dark'}`}>
                        {option.id === 'annual' ? t('best_value', { percent: option.percent }) : t('percent_off', { percent: option.percent })}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[13px] text-muted">{t(`plans.${option.id}.detail`, { percent: option.percent, regular: option.regular })}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-mono text-[18px] font-bold tabular">
                      {option.perMonth}<span className="text-[12px] text-muted">{t('per_month')}</span>
                    </span>
                    <span className="block font-mono text-[12px] text-muted tabular">
                      <s>{option.regularPerMonth}</s> · {t('first_period_total', { amount: option.firstPeriod })}
                    </span>
                  </span>
                </label>
              )
            })}
          </fieldset>

          <form action="/api/stripe/checkout" method="POST" className="mt-5">
            <input type="hidden" name="plan" value={selected.id} />
            <button type="submit" className="h-[52px] w-full rounded-[12px] bg-saffron text-[16px] font-extrabold text-ink transition-[background-color,transform] duration-150 hover:bg-[#E59B0C] active:scale-[0.98]">
              {t(`cta.${selected.id}`, { percent: selected.percent })}
            </button>
          </form>
          <p className="mt-2.5 text-center text-[13px] text-muted">{t('no_charge', { date: props.endsOn })}</p>
          <div className="mt-3.5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13.5px]">
            <button type="button" onClick={close} className="text-body underline underline-offset-2 hover:text-ink">{t('not_now')}</button>
            <Link href="/billing" onClick={close} className="text-body underline underline-offset-2 hover:text-ink">{t('compare')}</Link>
          </div>
        </div>

        {/* Honest pros and cons */}
        <div className="flex flex-col gap-5 border-t border-line bg-ground p-6 sm:p-8 md:w-[320px] md:shrink-0 md:border-t-0 md:border-l">
          <div>
            <h3 className="mb-3 text-[14px] font-bold">{t('pros_title')}</h3>
            <ul className="flex flex-col gap-2.5 text-[13.5px] leading-snug">
              {(['pro_discount', 'pro_free_days', 'pro_continuity'] as const).map((key) => (
                <li key={key} className="flex gap-2.5">
                  <Check size={18} strokeWidth={2.5} className="shrink-0 text-basil" aria-hidden />
                  <span>{t(key, { period: t(`period.${selected.id}`), days: props.daysLeft })}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-[14px] font-bold">{t('cons_title')}</h3>
            <ul className="flex flex-col gap-2.5 text-[13.5px] leading-snug text-[#4A5057]">
              <li className="flex gap-2.5"><Minus size={18} strokeWidth={2.5} className="shrink-0 text-paprika" aria-hidden /><span>{t('con_offer_ends', { date: props.endsOn })}</span></li>
              <li className="flex gap-2.5"><Minus size={18} strokeWidth={2.5} className="shrink-0 text-paprika" aria-hidden /><span>{t('con_pause')}</span></li>
              <li className="flex gap-2.5"><Circle size={10} strokeWidth={3} className="mx-1 mt-1 shrink-0 text-muted" aria-hidden /><span>{t('con_monthly', { price: props.monthlyPrice })}</span></li>
            </ul>
          </div>
          <p className="mt-auto text-[12.5px] leading-relaxed text-muted">{t('questions')}</p>
        </div>
      </div>
    </div>
  )
}
