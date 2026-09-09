import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import { Bike, CheckCircle, Truck, Package, Clock, ChevronRight, Phone, MapPin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const STATUS_STYLE: Record<string, string> = {
  pending:          'bg-yellow-100 text-yellow-700',
  confirmed:        'bg-blue-100 text-blue-700',
  packing:          'bg-purple-100 text-purple-700',
  out_for_delivery: 'bg-orange-100 text-orange-700',
  delivered:        'bg-green-100 text-green-700',
  cancelled:        'bg-red-100 text-red-600',
}

export default function RiderDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['rider-orders'],
    queryFn: () => api.get('/rider/orders').then(r => r.data.items as any[]),
    refetchInterval: 30_000,
  })

  const { mutate: updateStatus, isPending } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/rider/orders/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rider-orders'] })
      toast.success('Status updated')
    },
    onError: () => toast.error('Failed to update'),
  })

  const orders = data ?? []
  const active    = orders.filter((o: any) => !['delivered', 'cancelled'].includes(o.status))
  const delivered = orders.filter((o: any) => o.status === 'delivered')
  const outNow    = orders.filter((o: any) => o.status === 'out_for_delivery')
  const pending   = orders.filter((o: any) => ['confirmed', 'packing'].includes(o.status))

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>
  )

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">

      {/* Greeting */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold"
          style={{ background: 'linear-gradient(135deg, #0f4c2a, #1a7a44)' }}>
          {user?.name?.[0]?.toUpperCase() ?? 'R'}
        </div>
        <div>
          <p className="text-sm text-gray-500">{greeting}</p>
          <h1 className="text-xl font-bold text-gray-900">{user?.name ?? 'Rider'}</h1>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={<Package size={20} className="text-blue-500" />}
          label="Assigned"
          value={active.length}
          bg="bg-blue-50"
        />
        <StatCard
          icon={<Truck size={20} className="text-orange-500" />}
          label="Out for Delivery"
          value={outNow.length}
          bg="bg-orange-50"
        />
        <StatCard
          icon={<CheckCircle size={20} className="text-green-600" />}
          label="Delivered"
          value={delivered.length}
          bg="bg-green-50"
        />
      </div>

      {/* Active orders */}
      {active.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Active Orders</h2>
            <button
              onClick={() => navigate('/rider/orders')}
              className="text-sm text-green-700 font-medium flex items-center gap-1 hover:underline"
            >
              View all <ChevronRight size={14} />
            </button>
          </div>

          {active.slice(0, 5).map((order: any) => (
            <ActiveOrderCard
              key={order.id}
              order={order}
              onUpdate={(status) => updateStatus({ id: order.id, status })}
              isPending={isPending}
            />
          ))}
        </section>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Bike size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="font-medium text-gray-500">No active deliveries</p>
          <p className="text-sm text-gray-400 mt-1">New orders will appear here</p>
        </div>
      )}

      {/* Today pending pickup */}
      {pending.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
            <Clock size={14} />
            Awaiting Pickup ({pending.length})
          </div>
          {pending.map((order: any) => (
            <div key={order.id}
              className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-gray-900">#{order.order_number}</p>
                <p className="text-xs text-gray-500">{order.customer?.name}</p>
              </div>
              <button
                onClick={() => updateStatus({ id: order.id, status: 'out_for_delivery' })}
                disabled={isPending}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 transition"
              >
                Pick Up
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, bg }: {
  icon: React.ReactNode; label: string; value: number; bg: string
}) {
  return (
    <div className={`${bg} rounded-2xl p-4 flex flex-col gap-2`}>
      {icon}
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
    </div>
  )
}

function ActiveOrderCard({ order, onUpdate, isPending }: {
  order: any; onUpdate: (s: string) => void; isPending: boolean
}) {
  const addr = order.address

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900">#{order.order_number}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {order.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-0.5">{order.customer?.name}</p>
        </div>
        <span className="font-bold text-gray-900">₹{order.total?.toLocaleString('en-IN')}</span>
      </div>

      {addr && (
        <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
          <MapPin size={12} className="mt-0.5 shrink-0 text-gray-400" />
          <span>{addr.line1}, {addr.city} — {addr.pincode}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        {order.customer?.phone && (
          <a
            href={`tel:${order.customer.phone}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 transition"
          >
            <Phone size={12} /> Call
          </a>
        )}
        {order.status === 'out_for_delivery' ? (
          <button
            onClick={() => onUpdate('delivered')}
            disabled={isPending}
            className="flex-1 py-1.5 rounded-xl text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition"
          >
            Mark Delivered
          </button>
        ) : (
          <button
            onClick={() => onUpdate('out_for_delivery')}
            disabled={isPending}
            className="flex-1 py-1.5 rounded-xl text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 transition"
          >
            Start Delivery
          </button>
        )}
      </div>
    </div>
  )
}
