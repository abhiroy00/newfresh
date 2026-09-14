import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Package, ArrowRight } from 'lucide-react'
import { ordersApi } from '@/api/endpoints'
import { formatPrice } from '@/lib/format'
import type { Order } from '@/types'

export default function OrderSuccess() {
  const { id } = useParams<{ id: string }>()

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => (await ordersApi.detail(id!)).data.data as Order,
    enabled: !!id,
  })

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="w-20 h-20 rounded-full bg-success-container flex items-center justify-center mx-auto mb-5">
        <CheckCircle2 size={40} className="text-success" />
      </div>
      <h1 className="text-2xl font-extrabold text-on-surface-deep mb-2">Order Placed!</h1>
      <p className="text-on-surface-variant mb-6">
        {isLoading ? 'Loading your order...' : `Your order #${order?.order_number} has been placed successfully.`}
      </p>

      {order && (
        <div className="card p-5 text-left mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Package size={18} className="text-primary" />
            <span className="font-bold text-on-surface-deep">Order #{order.order_number}</span>
          </div>
          <div className="flex justify-between text-sm text-on-surface-variant mb-1">
            <span>Items</span><span>{order.items.length}</span>
          </div>
          <div className="flex justify-between text-sm text-on-surface-variant mb-1">
            <span>Payment</span><span>{order.payment_method === 'COD' ? 'Cash on Delivery' : order.payment_method}</span>
          </div>
          <div className="flex justify-between font-bold text-on-surface-deep border-t border-outline-variant pt-3 mt-2">
            <span>Total Paid</span><span className="text-primary">{formatPrice(order.total)}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {order && (
          <Link to={`/orders/${order.id}`} className="btn-outline">
            Track Order <ArrowRight size={15} />
          </Link>
        )}
        <Link to="/products" className="btn-primary">Continue Shopping</Link>
      </div>
    </div>
  )
}
