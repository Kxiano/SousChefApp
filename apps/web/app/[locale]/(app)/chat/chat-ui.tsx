'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

export function ChatUI({ initialMessages }: { initialMessages: any[] }) {
  const { messages, sendMessage, status } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  })

  const [input, setInput] = useState('')
  const isLoading = status === 'submitted' || status === 'streaming'
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        {messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
            <Bot size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
            <p>Hi! I'm your AI Sous Chef.</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>Ask me about inventory, recipes, or tell me to log a sale.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
            {messages.map(m => (
              <div key={m.id} style={{
                display: 'flex', gap: '16px',
                flexDirection: m.role === 'user' ? 'row-reverse' : 'row'
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                  backgroundColor: m.role === 'user' ? 'var(--color-brand-500)' : 'var(--color-surface-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {m.role === 'user' ? <User size={18} color="#000" /> : <Bot size={18} color="var(--color-brand-400)" />}
                </div>
                <div style={{
                  maxWidth: '75%', padding: '12px 16px', borderRadius: '12px',
                  backgroundColor: m.role === 'user' ? 'var(--color-surface-2)' : 'transparent',
                  border: m.role === 'user' ? '1px solid var(--color-border)' : 'none',
                  color: 'var(--color-text-primary)', fontSize: '14.5px', lineHeight: '1.6',
                }}>
                  {m.parts?.map((part: any, i: number) => {
                    if (part.type === 'text') {
                      return <p key={i} style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{part.text}</p>
                    }
                    if (part.type === 'tool-invocation') {
                      return (
                        <div key={i} style={{
                          marginTop: '12px', padding: '10px 14px', borderRadius: '8px',
                          backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)',
                          fontSize: '12.5px', color: 'var(--color-text-secondary)',
                          display: 'flex', alignItems: 'center', gap: '8px'
                        }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-brand-500)', flexShrink: 0 }} />
                          <span style={{ fontFamily: 'monospace' }}>
                            {part.toolInvocation?.toolName ?? part.toolName}
                            {part.toolInvocation?.state === 'result' || part.state === 'result' ? ' ✓' : ' …'}
                          </span>
                        </div>
                      )
                    }
                    return null
                  }) ?? <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{(m as any).content}</p>}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                  backgroundColor: 'var(--color-surface-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Bot size={18} color="var(--color-brand-400)" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', height: '36px' }}>
                  <Loader2 size={18} className="animate-spin" color="var(--color-text-muted)" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: '24px 32px', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <form onSubmit={handleSubmit} style={{ maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask your AI Chef..."
            disabled={isLoading}
            style={{
              width: '100%', padding: '16px 20px', paddingRight: '56px', borderRadius: '16px',
              backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)', fontSize: '15px', outline: 'none',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              transition: 'border-color 200ms',
            }}
            className="chat-input"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            style={{
              position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
              width: '40px', height: '40px', borderRadius: '12px',
              backgroundColor: input.trim() && !isLoading ? 'var(--color-brand-500)' : 'var(--color-surface-4)',
              border: 'none', color: input.trim() && !isLoading ? '#000' : 'var(--color-text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
              transition: 'background 150ms, color 150ms',
            }}
          >
            <Send size={18} style={{ marginLeft: '2px' }} />
          </button>
        </form>
      </div>

      <style>{`
        .chat-input:focus { border-color: var(--color-brand-500) !important; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
