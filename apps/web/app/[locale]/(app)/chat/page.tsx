import { createClient } from '@/utils/supabase/server'
import { prisma } from '@sous-chef/db'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { ChatUI } from './chat-ui'

export const metadata: Metadata = { title: 'AI Chef' }

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile) redirect('/login')

  const restaurantId = profile.restaurantId

  // Fetch past messages for this user (limited to last 50 for context)
  const pastMessages = await prisma.chatMessage.findMany({
    where: { restaurantId, profileId: profile.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  // Format messages for Vercel AI SDK
  const initialMessages = pastMessages.reverse().map(msg => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    // Vercel AI SDK expects tool invocations if any exist.
    // For simplicity, we just pass the text content for history, 
    // but we could map `functionCalls` here if needed.
  }))

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '24px 32px',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        flexShrink: 0,
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>AI Chef Assistant</h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
          Ask me about inventory, recipes, or tell me to log a sale.
        </p>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <ChatUI initialMessages={initialMessages} />
      </div>
    </div>
  )
}
