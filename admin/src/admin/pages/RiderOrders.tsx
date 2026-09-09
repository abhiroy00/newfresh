import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { MapPin, Phone, Package, ChevronDown, ChevronUp, CheckCircle, Truck } from 'lucide-react'

const STATUS_STYLE: Record<string, string> = {
  pending:          'bg-yellow-100 text-yellow-700',
  confirmed:        'bg-blue-100 text-blue-700',
  packing:          'bg-purple-100 text-purple-700',
  out_for_delivery: 'bg-orange-100 text-orange-700',
  delivered:        'bg-green-100 text-green-700',
  cancelled:        'bg-red-100 text-red-600',
}

export default function RiderOrders() {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['rider-orders'],
    queryFn: () => api.get('/rider/orders').then(r => r.data.items),
    refetchInterval: 30_000,
  })

  const { mutate: updateStatus, isPending } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/rider/orders/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rider-orders'] })
      toast.success('Status updated')
    },
    onError: () => toast.error('Failed to update status'),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">Loading deliveries...</div>
  )

  const orders = data ?? []
  const active = orders.filter((o: any) => !['delivered', 'cancelled'].includes(o.status))
  const done = orders.filter((o: any) => ['delivered', 'cancelled'].includes(o.status))

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Deliveries</h1>
        <p className="text-sm text-gray-500 mt-1">{active.length} active · {done.length} completed</p>
      </div>

      {orders.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Package size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-500">No deliveries assigned yet</p>
          <p className="text-sm text-gray-400 mt-1">Admin will assign orders to you shortly</p>
        </div>
      )}

      {active.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Active</h2>
          {active.map((order: any) => (
            <OrderCard
              key={order.id}
              order={order}
              expanded={expanded === order.id}
              onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
              onUpdateStatus={(status) => updateStatus({ id: order.id, status })}
              isPending={isPending}
            />
          ))}
        </section>
      )}

      {done.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Completed</h2>
          {done.map((order: any) => (
            <OrderCard
              key={order.id}
              order={order}
              expanded={expanded === order.id}
              onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
              onUpdateStatus={(status) => updateStatus({ id: order.id, status })}
              isPending={isPending}
            />
          ))}
        </section>
      )}
    </div>
  )
}

function OrderCard({ order, expanded, onToggle, onUpdateStatus, isPending }: {
  order: any
  expanded: boolean
  onToggle: () => void
  onUpdateStatus: (s: string) => void
  isPending: boolean
}) {
  const addr = order.address

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-start justify-between p-4 text-left hover:bg-gray-50 transition"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-gray-900">#{order.order_number}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {order.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-sm text-gray-600 font-medium">{order.customer?.name}</p>
          {addr && (
            <div className="flex items-start gap-1.5 mt-1 text-xs text-gray-400">
              <MapPin size={11} className="mt-0.5 shrink-0" />
              <span className="truncate">{addr.line1}, {addr.city}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 ml-3 shrink-0">
          <span className="font-bold text-gray-900">₹{order.total?.toLocaleString('en-IN')}</span>
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {/* Customer contact */}
          <div className="flex items-center gap-3">
            <a
              href={`tel:${order.customer?.phone}`}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100 transition"
            >
              <Phone size={14} />
              {order.customer?.phone}
            </a>
          </div>

          {/* Full address */}
          {addr && (
            <div className="bg-gray-50 rounded-xl p-3 space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase">Delivery Address</p>
              <p className="text-sm text-gray-800 font-medium">{addr.full_name}</p>
              <p className="text-sm text-gray-600">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
              <p className="text-sm text-gray-600">{addr.city}, {addr.state} — {addr.pincode}</p>
              {addr.landmark && <p className="text-xs text-gray-400">Near: {addr.landmark}</p>}
              {addr.phone && (
                <a href={`tel:${addr.phone}`} className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <Phone size={10} /> {addr.phone}
                </a>
              )}
            </div>
          )}

          {/* Items */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Items</p>
            <div className="space-y-2">
              {order.items?.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {item.product_image_url && (
                      <img src={item.product_image_url} className="w-8 h-8 rounded-lg object-cover" alt="" />
                    )}
                    <span className="text-gray-800">{item.product_name}</span>
                    <span className="text-gray-400 text-xs">× {item.quantity} {item.unit}</span>
                  </div>
                  <span className="font-medium">₹{item.total_price?.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          {order.status === 'confirmed' || order.status === 'packing' ? (
            <button
              onClick={() => onUpdateStatus('out_for_delivery')}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-60 transition"
            >
              <Truck size={16} />
              Mark Out for Delivery
            </button>
          ) : order.status === 'out_for_delivery' ? (
            <button
              onClick={() => onUpdateStatus('delivered')}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 transition"
            >
              <CheckCircle size={16} />
              Mark as Delivered
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
