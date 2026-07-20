import { createClient } from '@/utils/supabase/server'
import { prisma } from '@sous-chef/db'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { StickyNote, AlertTriangle, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { createNote, deleteNote } from './actions'

export const metadata: Metadata = { title: 'Note Board' }

export default async function NotesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile) redirect('/login')

  const notes = await prisma.note.findMany({
    where: { restaurantId: profile.restaurantId },
    orderBy: [{ isUrgent: 'desc' }, { createdAt: 'desc' }],
    include: { author: true },
  })

  return (
    <div style={{ padding: '32px', maxWidth: '780px' }}>
      <PageHeader
        title="Note Board"
        subtitle={`${notes.length} notes`}
      />

      {/* Post note form */}
      <form
        action={createNote}
        style={{
          marginTop: '28px',
          padding: '16px',
          backgroundColor: 'var(--color-surface-2)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
        }}
      >
        <label style={labelStyle}>Note</label>
        <textarea
          name="content"
          required
          placeholder="Leave a note for your team…"
          rows={3}
          style={{
            ...inputStyle,
            resize: 'vertical',
            fontFamily: 'inherit',
            lineHeight: '1.5',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" name="isUrgent" value="true" style={{ accentColor: 'var(--color-danger)' }} />
            <AlertTriangle size={14} color="var(--color-danger)" />
            Mark as urgent
          </label>
          <button type="submit" style={primaryBtnStyle} className="post-btn">
            Post Note
          </button>
        </div>
      </form>

      {/* Notes feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '28px' }}>
        {notes.length === 0 ? (
          <div style={emptyStyle}>No notes yet. Leave one for your team above.</div>
        ) : (
          notes.map(note => (
            <div
              key={note.id}
              style={{
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: note.isUrgent ? 'rgba(239,68,68,0.06)' : 'var(--color-surface-2)',
                border: `1px solid ${note.isUrgent ? 'rgba(239,68,68,0.25)' : 'var(--color-border)'}`,
                transition: 'transform 200ms var(--ease-out-strong)',
              }}
              className="note-card"
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                {/* Icon */}
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                  backgroundColor: note.isUrgent ? 'rgba(239,68,68,0.12)' : 'var(--color-surface-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {note.isUrgent
                    ? <AlertTriangle size={14} color="var(--color-danger)" />
                    : <StickyNote size={14} color="var(--color-brand-400)" />
                  }
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', color: 'var(--color-text-primary)', margin: 0, lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                    {note.content}
                  </p>
                  <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                    {note.author.displayName ?? 'Team member'}
                    {' · '}
                    {new Date(note.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {note.isUrgent && (
                      <span style={{ color: 'var(--color-danger)', fontWeight: 600, marginLeft: '6px' }}>URGENT</span>
                    )}
                  </p>
                </div>

                {/* Delete (own notes or owner) */}
                {(note.authorId === profile.id || profile.role === 'owner') && (
                  <form action={deleteNote.bind(null, note.id)}>
                    <button type="submit" style={deleteBtnStyle} className="delete-btn">
                      <Trash2 size={13} />
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .post-btn:hover { opacity: 0.85 !important; }
        .delete-btn:hover { color: var(--color-danger) !important; border-color: rgba(239,68,68,0.3) !important; }
        .note-card:hover { transform: translateY(-1px); }
        textarea::placeholder { color: var(--color-text-muted); }
      `}</style>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 500,
  color: 'var(--color-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em',
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: '8px',
  backgroundColor: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)', fontSize: '13.5px', outline: 'none',
}
const primaryBtnStyle: React.CSSProperties = {
  padding: '9px 20px', borderRadius: '8px', backgroundColor: 'var(--color-brand-500)',
  border: 'none', color: '#000', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
  transition: 'opacity 150ms',
}
const deleteBtnStyle: React.CSSProperties = {
  display: 'flex', padding: '6px', borderRadius: '7px',
  backgroundColor: 'transparent', border: '1px solid var(--color-border)',
  color: 'var(--color-text-muted)', cursor: 'pointer', transition: 'color 150ms, border-color 150ms',
}
const emptyStyle: React.CSSProperties = {
  padding: '48px 24px', textAlign: 'center', borderRadius: '12px',
  border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)', fontSize: '14px',
}
