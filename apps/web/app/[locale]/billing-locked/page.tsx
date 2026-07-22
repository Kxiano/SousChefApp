import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Billing Locked' }

export default function BillingLockedPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[var(--color-surface)] p-6">
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
          <AlertTriangle className="h-10 w-10 text-red-500" />
        </div>
        
        <h1 className="mb-2 text-3xl font-bold text-[var(--color-text-primary)]">
          Account Locked
        </h1>
        
        <p className="mb-8 text-[var(--color-text-secondary)]">
          Your kitchen&apos;s subscription has expired or a payment failed. Please update your billing information to regain access to Sous Chef.
        </p>

        <form action="/api/stripe/portal" method="POST" className="w-full">
          <button 
            type="submit"
            className="flex w-full items-center justify-center rounded-lg bg-[var(--color-brand-500)] px-6 py-3 font-semibold text-black transition-colors hover:bg-[var(--color-brand-600)]"
          >
            Manage Billing & Subscribe
          </button>
        </form>

        <Link 
          href="/auth/signout" 
          className="mt-6 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          Sign out
        </Link>
      </div>
    </div>
  )
}
