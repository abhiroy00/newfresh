import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { UserPlus, Bike, Trash2, Phone, Mail } from 'lucide-react'

interface Rider {
  id: string
  name: string
  email: string
  phone: string
  is_active: boolean
  created_at: string
}

interface CreateForm {
  name: string
  email: string
  phone: string
  password: string
}

const empty: CreateForm = { name: '', email: '', phone: '', password: '' }

export default function Riders() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CreateForm>(empty)

  const { data, isLoading } = useQuery({
    queryKey: ['riders'],
    queryFn: () => api.get('/admin/riders').then(r => r.data.items as Rider[]),
  })

  const { mutate: createRider, isPending: creating } = useMutation({
    mutationFn: (payload: CreateForm) => api.post('/admin/riders', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['riders'] })
      toast.success('Rider created')
      setForm(empty)
      setShowForm(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to create rider'),
  })

  const { mutate: deactivate } = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/riders/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['riders'] })
      toast.success('Rider deactivated')
    },
    onError: () => toast.error('Failed to deactivate'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.phone || !form.password) {
      toast.error('All fields are required')
      return
    }
    createRider(form)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bike size={24} className="text-green-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Riders</h1>
            <p className="text-sm text-gray-500">{data?.length ?? 0} delivery riders</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #0f4c2a, #1a7a44)' }}
        >
          <UserPlus size={16} />
          Add Rider
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">New Rider Account</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            {[
              { key: 'name', label: 'Full Name', type: 'text', placeholder: 'Rahul Kumar' },
              { key: 'phone', label: 'Phone', type: 'tel', placeholder: '9876543210' },
              { key: 'email', label: 'Email', type: 'email', placeholder: 'rider@gmart.com' },
              { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key} className="space-y-1">
                <label className="text-sm font-medium text-gray-700">{label}</label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={form[key as keyof CreateForm]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white"
                />
              </div>
            ))}
            <div className="col-span-2 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(empty) }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-5 py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #0f4c2a, #1a7a44)' }}
              >
                {creating ? 'Creating...' : 'Create Rider'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Riders Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading riders...</div>
        ) : !data?.length ? (
          <div className="p-12 text-center">
            <Bike size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No riders yet</p>
            <p className="text-gray-400 text-sm">Add your first delivery rider above</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                {['Rider', 'Contact', 'Status', 'Joined', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">
                        {r.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{r.name}</p>
                        <p className="text-xs text-gray-400">{r.id.slice(0, 8)}…</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Phone size={12} />
                        <span>{r.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <Mail size={12} />
                        <span>{r.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      r.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {r.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-500">
                    {new Date(r.created_at).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-5 py-4">
                    {r.is_active && (
                      <button
                        onClick={() => {
                          if (confirm(`Deactivate ${r.name}?`)) deactivate(r.id)
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Deactivate"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
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
