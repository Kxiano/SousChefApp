import { prisma } from '@sous-chef/db'
import { requireProfile } from '@/lib/auth'
import type { Metadata } from 'next'
import { getFormatter, getTranslations } from 'next-intl/server'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, EmptyState } from '@/components/ui/card'
import { Label, Textarea } from '@/components/ui/form'
import { buttonClass } from '@/components/ui/button'
import { createNote, deleteNote } from './actions'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Notes')
  return { title: t('title') }
}

export default async function NotesPage() {
  const profile = await requireProfile()
  const [t, format] = await Promise.all([getTranslations('Notes'), getFormatter()])

  const notes = await prisma.note.findMany({
    where: { restaurantId: profile.restaurantId },
    orderBy: [{ isUrgent: 'desc' }, { createdAt: 'desc' }],
    include: { author: true },
  })

  return (
    <div className="max-w-[780px]">
      <PageHeader title={t('title')} subtitle={t('subtitle', { count: notes.length })} />

      {/* Post a note */}
      <Card className="mt-7 p-4 sm:p-5">
        <form action={createNote}>
          <Label htmlFor="note-content">{t('note_label')}</Label>
          <Textarea id="note-content" name="content" required placeholder={t('placeholder')} rows={3} className="resize-y" />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <label className="flex min-h-10 cursor-pointer items-center gap-2 text-[14px] text-body">
              <input type="checkbox" name="isUrgent" value="true" className="h-4 w-4 accent-paprika" />
              <AlertTriangle size={15} className="text-paprika" aria-hidden />
              {t('mark_urgent')}
            </label>
            <button type="submit" className={buttonClass('primary')}>{t('post')}</button>
          </div>
        </form>
      </Card>

      {/* Notes feed */}
      <div className="mt-7 flex flex-col gap-3">
        {notes.length === 0 ? (
          <EmptyState>{t('empty')}</EmptyState>
        ) : (
          notes.map((note) => {
            const canDelete = note.authorId === profile.id || profile.role === 'owner'
            const meta = `${note.author.displayName ?? t('team_member')} · ${format.dateTime(note.createdAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
            return note.isUrgent ? (
              <article key={note.id} className="flex items-start gap-3 rounded-card bg-ink p-5 text-ground">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-saffron">{t('urgent')}</p>
                  <p className="mt-2 whitespace-pre-wrap font-display text-[19px] leading-snug">{note.content}</p>
                  <p className="mt-2.5 text-[13px] text-[#B9BEC4]">{meta}</p>
                </div>
                {canDelete && (
                  <form action={deleteNote.bind(null, note.id)}>
                    <button
                      type="submit"
                      aria-label={t('delete')}
                      className="flex h-10 w-10 items-center justify-center rounded-control border border-[#2D3137] text-[#B9BEC4] transition-colors hover:border-paprika hover:text-white"
                    >
                      <Trash2 size={15} aria-hidden />
                    </button>
                  </form>
                )}
              </article>
            ) : (
              <Card key={note.id} className="flex items-start gap-3 p-5">
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{note.content}</p>
                  <p className="mt-2 text-[13px] text-muted">{meta}</p>
                </div>
                {canDelete && (
                  <form action={deleteNote.bind(null, note.id)}>
                    <button
                      type="submit"
                      aria-label={t('delete')}
                      className="flex h-10 w-10 items-center justify-center rounded-control border border-line text-muted transition-colors hover:border-[#F1C7BE] hover:text-paprika"
                    >
                      <Trash2 size={15} aria-hidden />
                    </button>
                  </form>
                )}
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
