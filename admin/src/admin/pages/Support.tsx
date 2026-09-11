import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { MessageCircle, User } from 'lucide-react'

interface Ticket {
  id: string
  subject: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  user: { id: string; name: string; phone: string } | null
  created_at: string
  updated_at: string
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
}

export default function Support() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['support-tickets', statusFilter],
    queryFn: () =>
      api
        .get('/admin/support/tickets', { params: { status: statusFilter || undefined } })
        .then((r) => r.data as { items: Ticket[]; total: number }),
    refetchInterval: 15000,
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageCircle size={24} className="text-green-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support</h1>
            <p className="text-sm text-gray-500">{data?.total ?? 0} customer queries</p>
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading tickets...</div>
        ) : !data?.items?.length ? (
          <div className="p-12 text-center">
            <MessageCircle size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No support queries</p>
            <p className="text-gray-400 text-sm">Customer messages from Live Chat will show up here</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                {['Customer', 'Subject', 'Status', 'Last Updated'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.items.map((t) => (
                <tr
                  key={t.id}
                  className="hover:bg-gray-50 transition cursor-pointer"
                  onClick={() => navigate(`/support/${t.id}`)}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700">
                        <User size={16} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{t.user?.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-400">{t.user?.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-700">{t.subject}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[t.status]}`}>
                      {STATUS_LABELS[t.status]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-500">
                    {new Date(t.updated_at).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
