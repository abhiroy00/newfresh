import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Package, MapPin, CheckCircle2, Circle, Truck, XCircle, PhoneCall } from 'lucide-react'
import { ordersApi } from '@/api/endpoints'
import { formatPrice, formatDateTime } from '@/lib/format'
import { SUPPORT_PHONE } from '@/lib/constants'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ErrorState from '@/components/ui/ErrorState'
import type { Order, OrderStatus } from '@/types'

const STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'PENDING', label: 'Order Placed' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'PACKED', label: 'Packed' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { key: 'DELIVERED', label: 'Delivered' },
]

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [cancelling, setCancelling] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => (await ordersApi.detail(id!)).data.data as Order,
    enabled: !!id,
  })

  if (isError) {
    return <ErrorState subtitle="Couldn't load this order." onRetry={() => refetch()} />
  }

  if (isLoading || !order) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-on-surface-variant">{isLoading ? 'Loading...' : 'Order not found'}</div>
  }

  const cancelled = order.status === 'CANCELLED'
  const currentStepIndex = STEPS.findIndex((s) => s.key === order.status)
  const canCancel = order.status === 'PENDING' || order.status === 'CONFIRMED'
  const address: any = order.address

  const handleCancel = async () => {
    setConfirmOpen(false)
    setCancelling(true)
    try {
      await ordersApi.cancel(order.id, 'Customer requested cancellation')
      toast.success('Order cancelled')
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Could not cancel order')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h1 className="text-2xl font-extrabold text-on-surface-deep">Order #{order.order_number}</h1>
        {canCancel && (
          <button onClick={() => setConfirmOpen(true)} disabled={cancelling} className="text-sm font-semibold text-error flex items-center gap-1">
            <XCircle size={15} /> {cancelling ? 'Cancelling...' : 'Cancel Order'}
          </button>
        )}
      </div>
      <p className="text-sm text-on-surface-variant mb-6">Placed on {formatDateTime(order.created_at)}</p>

      {/* Timeline */}
      <div className="card p-5 mb-6">
        {cancelled ? (
          <div className="flex items-center gap-3 text-error">
            <XCircle size={22} />
            <div>
              <p className="font-bold">Order Cancelled</p>
              {order.cancellation_reason && <p className="text-sm text-on-surface-variant">{order.cancellation_reason}</p>}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-0">
            {STEPS.map((step, i) => {
              const done = i <= currentStepIndex
              const isLast = i === STEPS.length - 1
              return (
                <div key={step.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    {done ? <CheckCircle2 size={20} className="text-primary" /> : <Circle size={20} className="text-outline-variant" />}
                    {!isLast && <div className={`w-0.5 flex-1 min-h-6 ${i < currentStepIndex ? 'bg-primary' : 'bg-outline-variant'}`} />}
                  </div>
                  <div className="pb-6">
                    <p className={`font-semibold text-sm ${done ? 'text-on-surface-deep' : 'text-on-surface-variant'}`}>{step.label}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {order.estimated_delivery_at && !cancelled && order.status !== 'DELIVERED' && (
          <p className="text-sm text-accent-mint font-semibold flex items-center gap-1.5 mt-1">
            <Truck size={14} /> Estimated delivery: {formatDateTime(order.estimated_delivery_at)}
          </p>
        )}
      </div>

      {/* Rider */}
      {order.rider && (
        <div className="card p-4 mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center"><Truck size={17} className="text-primary" /></div>
          <div className="flex-1">
            <p className="text-xs text-on-surface-variant">Delivery Partner</p>
            <p className="font-semibold text-sm text-on-surface-deep">{order.rider.name}</p>
          </div>
          <a href={`tel:${order.rider.phone}`} className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center"><PhoneCall size={15} /></a>
        </div>
      )}

      {/* Address */}
      {address && (
        <div className="card p-4 mb-6 flex gap-3">
          <MapPin size={17} className="text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-on-surface-deep">{address.full_name} · {address.phone}</p>
            <p className="text-sm text-on-surface-variant">{[address.line1, address.line2, address.city, address.state, address.pincode].filter(Boolean).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="card p-4 mb-6">
        <h2 className="font-bold text-on-surface-deep mb-3 flex items-center gap-2"><Package size={16} /> Items</h2>
        <div className="flex flex-col gap-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex gap-3">
              <div className="w-14 h-14 rounded-xl bg-surface-container-low overflow-hidden shrink-0">
                {item.product_image_url && <img src={item.product_image_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-on-surface-deep line-clamp-1">{item.product_name}</p>
                <p className="text-xs text-on-surface-variant">{item.quantity} × {formatPrice(item.unit_price)} · {item.product_unit}</p>
              </div>
              <span className="font-bold text-sm text-on-surface-deep shrink-0">{formatPrice(item.total_price)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bill summary */}
      <div className="card p-4 mb-6">
        <h2 className="font-bold text-on-surface-deep mb-3">Bill Summary</h2>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between text-on-surface-variant"><span>Subtotal</span><span className="font-semibold text-on-surface">{formatPrice(order.subtotal)}</span></div>
          <div className="flex justify-between text-on-surface-variant"><span>Delivery</span><span className="font-semibold text-on-surface">{order.delivery_fee === 0 ? 'FREE' : formatPrice(order.delivery_fee)}</span></div>
          {order.discount > 0 && <div className="flex justify-between text-on-surface-variant"><span>Discount</span><span className="font-semibold text-accent-mint">-{formatPrice(order.discount)}</span></div>}
          <div className="flex justify-between font-extrabold text-on-surface-deep border-t border-outline-variant pt-2 mt-1">
            <span>Total</span><span className="text-primary">{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Link to="/orders" className="text-sm font-semibold text-primary">← Back to Orders</Link>
        <Link to="/support" className="text-sm font-semibold text-on-surface-variant">Need help? Contact support</Link>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Cancel this order?"
        message="This can't be undone. You'll need to place a new order if you change your mind."
        confirmLabel="Yes, Cancel Order"
        cancelLabel="Keep Order"
        danger
        loading={cancelling}
        onConfirm={handleCancel}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
