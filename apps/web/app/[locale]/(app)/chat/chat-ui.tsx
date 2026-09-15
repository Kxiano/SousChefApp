'use client'

import { Send, Bot, User, Loader2 } from 'lucide-react'
import { FormEvent, useEffect, useRef, useState } from 'react'

type Message = { id: string; role: 'user' | 'assistant'; content: string }

export function ChatUI({ initialMessages }: { initialMessages: Message[] }) {
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
      setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content: 'Sorry, I could not send that message. Please try again.' } : message))
    } finally { setIsLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        {messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
            <Bot size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
            <p>Hi! I&apos;m your AI Sous Chef.</p><p style={{ fontSize: '14px', marginTop: '8px' }}>Ask me about inventory, recipes, or tell me to log a sale.</p>
          </div>
        ) : <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
          {messages.map((message) => <div key={message.id} style={{ display: 'flex', gap: '16px', flexDirection: message.role === 'user' ? 'row-reverse' : 'row' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, backgroundColor: message.role === 'user' ? 'var(--color-brand-500)' : 'var(--color-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {message.role === 'user' ? <User size={18} color="#000" /> : <Bot size={18} color="var(--color-brand-400)" />}
            </div>
            <div style={{ maxWidth: '75%', padding: '12px 16px', borderRadius: '12px', backgroundColor: message.role === 'user' ? 'var(--color-surface-2)' : 'transparent', border: message.role === 'user' ? '1px solid var(--color-border)' : 'none', color: 'var(--color-text-primary)', fontSize: '14.5px', lineHeight: '1.6' }}><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{message.content}</p></div>
          </div>)}
          {isLoading && <div style={{ display: 'flex', gap: '16px' }}><div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, backgroundColor: 'var(--color-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={18} color="var(--color-brand-400)" /></div><div style={{ display: 'flex', alignItems: 'center', height: '36px' }}><Loader2 size={18} className="animate-spin" color="var(--color-text-muted)" /></div></div>}
          <div ref={messagesEndRef} />
        </div>}
      </div>
      <div style={{ padding: '24px 32px', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <form onSubmit={handleSubmit} style={{ maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
          <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask your AI Chef..." disabled={isLoading} style={{ width: '100%', padding: '16px 20px', paddingRight: '56px', borderRadius: '16px', backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontSize: '15px', outline: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', transition: 'border-color 200ms' }} className="chat-input" />
          <button type="submit" disabled={isLoading || !input.trim()} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', width: '40px', height: '40px', borderRadius: '12px', backgroundColor: input.trim() && !isLoading ? 'var(--color-brand-500)' : 'var(--color-surface-4)', border: 'none', color: input.trim() && !isLoading ? '#000' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed', transition: 'background 150ms, color 150ms' }}><Send size={18} style={{ marginLeft: '2px' }} /></button>
        </form>
      </div>
      <style>{`.chat-input:focus { border-color: var(--color-brand-500) !important; } .animate-spin { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
