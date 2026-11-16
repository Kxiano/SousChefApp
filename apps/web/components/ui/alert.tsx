import { AlertTriangle, CheckCircle2 } from 'lucide-react'

const tones = {
  error: { box: 'border-[#F3C9BF] bg-paprika-soft text-paprika-dark', Icon: AlertTriangle },
  success: { box: 'border-[#BFDCC9] bg-basil-soft text-basil', Icon: CheckCircle2 },
}

export function Alert({ tone = 'error', children, className = '' }: { tone?: keyof typeof tones; children: React.ReactNode; className?: string }) {
  const { box, Icon } = tones[tone]
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`mt-5 flex items-start gap-2.5 rounded-control border px-3.5 py-2.5 text-[14px] animate-fade ${box} ${className}`}
    >
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  )
}
