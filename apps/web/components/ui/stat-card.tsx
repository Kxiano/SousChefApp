import Link from 'next/link'

interface StatCardProps {
  label: string
  value: string
  icon: React.ReactNode
  href: string
  danger?: boolean
}

export function StatCard({ label, value, icon, href, danger }: StatCardProps) {
  return (
    <Link
      href={href}
      style={{
        display: 'block',
        padding: '16px',
        borderRadius: '12px',
        backgroundColor: 'var(--color-surface-2)',
        border: `1px solid ${danger ? 'rgba(239,68,68,0.4)' : 'var(--color-border)'}`,
        textDecoration: 'none',
        transition: 'border-color 200ms, transform 150ms var(--ease-out-strong)',
      }}
      className="stat-card"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ color: danger ? 'var(--color-danger)' : 'var(--color-brand-400)' }}>{icon}</span>
      </div>
      <p style={{ fontSize: '28px', fontWeight: 700, color: danger ? 'var(--color-danger)' : 'var(--color-text-primary)', margin: 0 }}>{value}</p>
      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{label}</p>
      <style>{`
        .stat-card:hover { border-color: var(--color-brand-500) !important; transform: translateY(-1px); }
        .stat-card:active { transform: scale(0.97); }
      `}</style>
    </Link>
  )
}
