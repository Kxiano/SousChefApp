import { prisma } from '@sous-chef/db'
import { requireProfile } from '@/lib/auth'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { PageHeader } from '@/components/ui/page-header'
import { ChatUI } from './chat-ui'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Chat')
  return { title: t('title') }
}

export default async function ChatPage() {
  const profile = await requireProfile()
  const t = await getTranslations('Chat')

  // The last 50 messages of this user's conversation, oldest first.
  const pastMessages = await prisma.chatMessage.findMany({
    where: { restaurantId: profile.restaurantId, profileId: profile.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  const initialMessages = pastMessages.reverse().map((msg) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }))

  return (
    <div className="flex flex-col">
      <PageHeader title={t('heading')} subtitle={t('subtitle')} />
      <ChatUI initialMessages={initialMessages} />
    </div>
  )
}
