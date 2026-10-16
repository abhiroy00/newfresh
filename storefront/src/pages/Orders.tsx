import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Package, ChevronRight } from 'lucide-react'
import { ordersApi } from '@/api/endpoints'
import { useAuthStore } from '@/store/authStore'
import { formatPrice, formatDate } from '@/lib/format'
import EmptyState from '@/components/ui/EmptyState'
import ErrorState from '@/components/ui/ErrorState'
import type { Order } from '@/types'

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-surface-container-high text-on-surface-variant',
  CONFIRMED: 'bg-primary-fixed text-primary',
  PACKED: 'bg-primary-fixed text-primary',
  OUT_FOR_DELIVERY: 'bg-accent-orange/15 text-accent-orange',
  DELIVERED: 'bg-success-container text-success',
  CANCELLED: 'bg-error-container text-error',
}

export default function Orders() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const openLogin = useAuthStore((s) => s.openLogin)

  const { data, isLoading, isError, refetch } = useQuery({
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
      ) : isError ? (
        <ErrorState subtitle="Couldn't load your orders." onRetry={() => refetch()} />
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
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[order.status] || 'bg-surface-container-high text-on-surface-variant'}`}>
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
