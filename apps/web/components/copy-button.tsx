'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { buttonClass } from '@/components/ui/button'

export function CopyButton({ value }: { value: string }) {
  const t = useTranslations('Common')
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked (e.g. non-HTTPS); the link stays selectable in the field.
    }
  }

  return (
    <button type="button" onClick={copy} className={buttonClass('secondary', 'sm', 'h-10 sm:h-8')} aria-live="polite">
      {copied ? <Check size={14} className="text-basil" aria-hidden /> : <Copy size={14} aria-hidden />}
      {copied ? t('copied') : t('copy')}
    </button>
  )
}
