import { createSousChefAgent } from '@/lib/ai/sous-chef-agent'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@sous-chef/db'
import { AIMessageChunk } from '@langchain/core/messages'

export const maxDuration = 30

type ChatMessage = { role: 'user' | 'assistant'; content: string }

function isChatMessage(message: unknown): message is ChatMessage {
  if (!message || typeof message !== 'object') return false
  const candidate = message as Record<string, unknown>
  return (candidate.role === 'user' || candidate.role === 'assistant') && typeof candidate.content === 'string' && candidate.content.trim().length > 0
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile) return new Response('Unauthorized', { status: 401 })

  let body: { messages?: unknown }
  try { body = await req.json() } catch { return new Response('Invalid JSON body.', { status: 400 }) }
  if (!Array.isArray(body.messages) || !body.messages.every(isChatMessage)) return new Response('Messages must be non-empty user or assistant text messages.', { status: 400 })

  const messages = body.messages.slice(-50)
  const lastMessage = messages.at(-1)
  if (!lastMessage || lastMessage.role !== 'user') return new Response('The final message must be from the user.', { status: 400 })

  await prisma.chatMessage.create({ data: { restaurantId: profile.restaurantId, profileId: profile.id, role: 'user', content: lastMessage.content } })

  const encoder = new TextEncoder()
  let responseText = ''
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const agent = createSousChefAgent({ restaurantId: profile.restaurantId, profileId: profile.id })
        const events = await agent.stream({ messages }, { streamMode: 'messages' })
        for await (const event of events) {
          const [chunk] = event as unknown as [AIMessageChunk, unknown]
          if (typeof chunk.content !== 'string' || !chunk.content || (typeof chunk.getType === 'function' && chunk.getType() !== 'ai')) continue
          responseText += chunk.content
          controller.enqueue(encoder.encode(chunk.content))
        }
      } catch (error) {
        console.error('Sous Chef agent failed:', error)
        const fallback = 'Sorry, I could not complete that request. Please try again.'
        responseText ||= fallback
        controller.enqueue(encoder.encode(fallback))
      } finally {
        if (responseText) await prisma.chatMessage.create({ data: { restaurantId: profile.restaurantId, profileId: profile.id, role: 'assistant', content: responseText } })
        controller.close()
      }
    },
  })

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' } })
}
