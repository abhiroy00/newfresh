import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Send, LifeBuoy, Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import { supportApi } from '@/api/endpoints'
import { useAuthStore } from '@/store/authStore'
import { SUPPORT_PHONE } from '@/lib/constants'
import { formatDateTime } from '@/lib/format'
import type { SupportTicket } from '@/types'

export default function Support() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const openLogin = useAuthStore((s) => s.openLogin)
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: tickets } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: async () => (await supportApi.listTickets()).data.data as SupportTicket[],
    enabled: isAuthenticated,
  })

  const activeTicketId = tickets?.find((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS')?.id || tickets?.[0]?.id

  const { data: ticket } = useQuery({
    queryKey: ['support-ticket', activeTicketId],
    queryFn: async () => (await supportApi.getTicket(activeTicketId!)).data.data as SupportTicket,
    enabled: !!activeTicketId,
    refetchInterval: 10_000,
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [ticket?.messages?.length])

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="font-bold text-lg text-on-surface-deep mb-4">Login to chat with support</p>
        <button onClick={openLogin} className="btn-primary">Login</button>
      </div>
    )
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = message.trim()
    if (!text || sending) return
    setSending(true)
    setMessage('')
    try {
      if (ticket) {
        await supportApi.sendMessage(ticket.id, text)
      } else {
        await supportApi.startOrContinue(text, 'Support Query')
      }
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] })
      queryClient.invalidateQueries({ queryKey: ['support-ticket', activeTicketId] })
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Could not send message')
      setMessage(text)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-extrabold text-on-surface-deep flex items-center gap-2"><LifeBuoy size={22} className="text-primary" /> Support</h1>
        <a href={`tel:${SUPPORT_PHONE}`} className="btn-outline !py-2 !px-4 text-sm"><Phone size={14} /> Call Us</a>
      </div>

      <div className="card flex flex-col h-[65vh]">
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {!ticket || ticket.messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 text-on-surface-variant">
              <LifeBuoy size={32} className="text-outline" />
              <p className="font-semibold">How can we help?</p>
              <p className="text-sm max-w-xs">Send us a message about your order, payment, or anything else — our team usually replies quickly.</p>
            </div>
          ) : (
            ticket.messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender_type === 'CUSTOMER' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${m.sender_type === 'CUSTOMER' ? 'bg-primary text-white rounded-br-sm' : 'bg-surface-container-low text-on-surface rounded-bl-sm'}`}>
                  <p className="text-sm">{m.message}</p>
                  <p className={`text-[10px] mt-1 ${m.sender_type === 'CUSTOMER' ? 'text-white/70' : 'text-on-surface-variant'}`}>{formatDateTime(m.created_at)}</p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="border-t border-outline-variant p-3 flex gap-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="input-field flex-1"
          />
          <button type="submit" disabled={sending || !message.trim()} className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center shrink-0 disabled:opacity-50">
            <Send size={17} />
          </button>
        </form>
      </div>
    </div>
  )
}
