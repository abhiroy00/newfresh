import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Package, ChevronRight } from 'lucide-react'
import { ordersApi } from '@/api/endpoints'
import { useAuthStore } from '@/store/authStore'
import { formatPrice, formatDate } from '@/lib/format'
import EmptyState from '@/components/ui/EmptyState'
import type { Order } from '@/types'

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PACKED: 'bg-blue-100 text-blue-800',
  OUT_FOR_DELIVERY: 'bg-orange-100 text-orange-800',
  DELIVERED: 'bg-success-container text-success',
  CANCELLED: 'bg-error-container text-error',
}

export default function Orders() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const openLogin = useAuthStore((s) => s.openLogin)

  const { data, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => (await ordersApi.list({ per_page: 30 })).data.data as Order[],
    enabled: isAuthenticated,
  })

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20">
        <EmptyState icon={Package} title="Login to see your orders" action={<button onClick={openLogin} className="btn-primary mt-2">Login</button>} />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-extrabold text-on-surface-deep mb-6">My Orders</h1>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-24 animate-pulse bg-surface-container-low" />)}
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState icon={Package} title="No orders yet" subtitle="Your placed orders will show up here." action={<Link to="/products" className="btn-primary mt-2">Start Shopping</Link>} />
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((order) => (
            <Link key={order.id} to={`/orders/${order.id}`} className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-xl bg-surface-container-low flex items-center justify-center shrink-0">
                <Package size={19} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-bold text-sm text-on-surface-deep">#{order.order_number}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[order.status] || 'bg-gray-100 text-gray-700'}`}>
                    {order.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant">{formatDate(order.created_at)} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="text-right shrink-0 flex items-center gap-2">
                <span className="font-bold text-on-surface-deep">{formatPrice(order.total)}</span>
                <ChevronRight size={16} className="text-outline" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
