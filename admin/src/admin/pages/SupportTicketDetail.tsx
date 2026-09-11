import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { ArrowLeft, Send, User, Phone } from 'lucide-react'

interface Message {
  id: string
  sender_type: 'customer' | 'admin'
  message: string
  created_at: string
}

interface TicketDetail {
  id: string
  subject: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  user: { id: string; name: string; phone: string } | null
  messages: Message[]
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed',
}

export default function SupportTicketDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [reply, setReply] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['support-ticket', id],
    queryFn: () => api.get(`/admin/support/tickets/${id}`).then((r) => r.data as TicketDetail),
    refetchInterval: 8000,
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data?.messages?.length])

  const { mutate: sendReply, isPending: sending } = useMutation({
    mutationFn: (message: string) => api.post(`/admin/support/tickets/${id}/messages`, { message }),
    onSuccess: () => {
      setReply('')
      qc.invalidateQueries({ queryKey: ['support-ticket', id] })
      qc.invalidateQueries({ queryKey: ['support-tickets'] })
    },
    onError: () => toast.error('Failed to send reply'),
  })

  const { mutate: setStatus } = useMutation({
    mutationFn: (status: string) => api.patch(`/admin/support/tickets/${id}/status`, { status }),
    onSuccess: () => {
      toast.success('Status updated')
      qc.invalidateQueries({ queryKey: ['support-ticket', id] })
      qc.invalidateQueries({ queryKey: ['support-tickets'] })
    },
    onError: () => toast.error('Failed to update status'),
  })

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reply.trim()) return
    sendReply(reply.trim())
  }

  if (isLoading || !data) {
    return <div className="p-8 text-center text-gray-400">Loading conversation...</div>
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <button onClick={() => navigate('/support')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft size={16} /> Back to Support
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700">
            <User size={18} />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{data.user?.name || 'Unknown'}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Phone size={11} /> {data.user?.phone}
            </p>
          </div>
        </div>
        <select
          value={data.status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
        >
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 h-[50vh] overflow-y-auto flex flex-col gap-3">
        {data.messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                m.sender_type === 'admin'
                  ? 'bg-green-600 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}
            >
              {m.message}
              <div className={`text-[10px] mt-1 ${m.sender_type === 'admin' ? 'text-green-100' : 'text-gray-400'}`}>
                {new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2">
        <input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Type a reply..."
          disabled={data.status === 'closed'}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={sending || !reply.trim() || data.status === 'closed'}
          className="w-12 h-12 flex items-center justify-center rounded-xl text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #0f4c2a, #1a7a44)' }}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  )
}
