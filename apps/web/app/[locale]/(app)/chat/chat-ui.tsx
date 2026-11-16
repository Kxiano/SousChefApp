'use client'

import { ChefHat, Loader2, Send } from 'lucide-react'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

type Message = { id: string; role: 'user' | 'assistant'; content: string }

export function ChatUI({ initialMessages }: { initialMessages: Message[] }) {
  const t = useTranslations('Chat')
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = input.trim()
    if (!content || isLoading) return

    const userMessage = { id: crypto.randomUUID(), role: 'user' as const, content }
    const requestMessages = [...messages, userMessage]
    const assistantId = crypto.randomUUID()
    setMessages([...requestMessages, { id: assistantId, role: 'assistant', content: '' }])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: requestMessages }),
      })
      if (!response.ok || !response.body) throw new Error('Chat request failed')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let answer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        answer += decoder.decode(value, { stream: true })
        setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content: answer } : message))
      }
    } catch (error) {
      console.error('Chat request failed:', error)
      setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content: t('send_error') } : message))
    } finally { setIsLoading(false) }
  }

  const canSend = input.trim().length > 0 && !isLoading

  return (
    // Fills the screen under the page header: phone top bar + padding + header on small
    // screens, padding + header on desktop.
    <div className="mt-6 flex h-[calc(100dvh-15rem)] min-h-[420px] flex-col overflow-hidden rounded-card border border-line bg-surface lg:h-[calc(100dvh-12.5rem)]">
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-[16px] bg-ink">
              <ChefHat size={26} className="text-saffron" aria-hidden />
            </span>
            <p className="font-display text-[20px] font-bold">{t('empty_greeting')}</p>
            <p className="mt-1.5 max-w-sm text-[14.5px] text-muted">{t('empty_hint')}</p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-[760px] flex-col gap-3">
            {messages.map((message) =>
              message.role === 'user' ? (
                <p key={message.id} className="max-w-[85%] self-end whitespace-pre-wrap rounded-[14px] rounded-br-[4px] bg-ink px-4 py-2.5 text-[14.5px] leading-relaxed text-white sm:max-w-[75%]">
                  {message.content}
                </p>
              ) : message.content ? (
                <p key={message.id} className="max-w-[85%] self-start whitespace-pre-wrap rounded-[14px] rounded-bl-[4px] bg-[#F3F1EC] px-4 py-2.5 text-[14.5px] leading-relaxed text-ink sm:max-w-[75%]">
                  {message.content}
                </p>
              ) : null
            )}
            {isLoading && (
              <div className="flex items-center gap-2 self-start rounded-[14px] rounded-bl-[4px] bg-[#F3F1EC] px-4 py-3 text-muted">
                <Loader2 size={16} className="animate-spin" aria-label={t('thinking')} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-line bg-sunken p-3 sm:p-4">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t('placeholder')}
          aria-label={t('input_label')}
          disabled={isLoading}
          className="h-12 min-w-0 flex-1 rounded-[12px] border border-line-strong bg-surface px-4 text-[15px] text-ink placeholder:text-[#8A9097] transition-[border-color,box-shadow] duration-150 focus:border-ink focus:outline-none focus:ring-2 focus:ring-saffron/40 disabled:opacity-60"
        />
        <button
          type="submit"
          aria-label={t('send')}
          disabled={!canSend}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-saffron text-ink transition-[background-color,transform] duration-150 hover:bg-[#E59B0C] active:scale-[0.96] disabled:cursor-not-allowed disabled:bg-[#EFEDE7] disabled:text-muted"
        >
          <Send size={18} aria-hidden />
        </button>
      </form>
    </div>
  )
}
