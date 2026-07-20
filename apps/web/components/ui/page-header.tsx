import Link from 'next/link'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: { label: string; href?: string; formAction?: string }
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>{title}</h1>
        {subtitle && (
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{subtitle}</p>
        )}
      </div>
      {action && action.href && (
        <Link
          href={action.href}
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--color-brand-500)',
            color: '#000',
            borderRadius: '8px',
            fontSize: '13.5px',
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'background 150ms var(--ease-out-strong), transform 150ms var(--ease-out-strong)',
          }}
          className="btn-primary"
        >
          {action.label}
        </Link>
      )}
      <style>{`
        .btn-primary:hover { background-color: var(--color-brand-400) !important; }
        .btn-primary:active { transform: scale(0.97); }
      `}</style>
    </div>
  )
}
