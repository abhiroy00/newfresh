import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getOrders, updateOrderStatus } from '../api/orders'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Eye, Trash2, Search, X, Package } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 ring-yellow-200',
  confirmed: 'bg-blue-100 text-blue-700 ring-blue-200',
  packing: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
  shipped: 'bg-purple-100 text-purple-700 ring-purple-200',
  out_for_delivery: 'bg-orange-100 text-orange-700 ring-orange-200',
  delivered: 'bg-green-100 text-green-700 ring-green-200',
  cancelled: 'bg-red-100 text-red-700 ring-red-200',
}

export default function Orders() {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') ?? ''
  const urlSearch = searchParams.get('q') ?? ''
  const [search, setSearch] = useState(urlSearch)
  const [debounced, setDebounced] = useState(urlSearch)
  const [page, setPage] = useState(1)

  const setStatus = (next: string) => {
    const params = new URLSearchParams(searchParams)
    if (next) params.set('status', next); else params.delete('status')
    setSearchParams(params, { replace: true })
    setPage(1)
  }

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    if (debounced) params.set('q', debounced); else params.delete('q')
    setSearchParams(params, { replace: true })
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page, status, debounced],
    queryFn: () => getOrders(page, status, debounced),
  })

  const filtered = useMemo(() => {
    const items = data?.items ?? []
    if (!debounced) return items
    const q = debounced.toLowerCase()
    return items.filter((o: any) => {
      const hay = [
        o.id,
        o.order_number,
        o.user?.name,
        o.user?.email,
        o.user?.phone,
      ].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [data, debounced])

  const { mutate: changeStatus } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateOrderStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Status updated!')
    },
  })

  const { mutate: cancelOrder } = useMutation({
    mutationFn: (id: string) =>
      api.post(`/admin/orders/${id}/cancel`, null, {
        params: { reason: 'Cancelled by admin' },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Order cancelled!')
    },
    onError: () => toast.error('Failed to cancel order'),
  })

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-sm text-gray-500">
            {data?.total ?? filtered.length} order{(data?.total ?? filtered.length) === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, name, email, phone…"
              className="w-72 border rounded-lg pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 text-gray-400"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {Object.keys(STATUS_COLORS).map((s) => (
              <option key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              {['Order ID', 'Customer', 'Total', 'Items', 'Status', 'Date', 'Update', 'View'].map((h) => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}>
                  {[...Array(8)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-14 text-gray-400">
                  <Package size={32} className="mx-auto mb-2 text-gray-300" />
                  {debounced ? `No orders matching "${debounced}"` : 'No orders found'}
                </td>
              </tr>
            ) : (
              filtered.map((o: any) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">#{o.order_number ?? o.id?.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{o.user?.name}</p>
                      <p className="text-gray-400 text-xs">{o.user?.email || o.user?.phone}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold">₹{o.total?.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">{o.items?.length} items</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ring-1 capitalize ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-600 ring-gray-200'}`}>
                      {String(o.status).replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(o.created_at).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={o.status}
                      onChange={(e) => changeStatus({ id: o.id, status: e.target.value })}
                      className="text-xs border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {Object.keys(STATUS_COLORS).map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        to={`/orders/${o.id}`}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 inline-flex"
                        title="View details"
                      >
                        <Eye size={15} />
                      </Link>
                      {o.status !== 'delivered' && o.status !== 'cancelled' && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Cancel order ${(o.order_number ?? o.id).toString().slice(0, 8)}?`)) {
                              cancelOrder(o.id)
                            }
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition"
                          title="Cancel order"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {data?.total_pages > 1 && (
          <div className="flex justify-center items-center gap-2 p-4 border-t">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50">Prev</button>
            <span className="text-sm text-gray-500">Page {page} of {data.total_pages}</span>
            <button onClick={() => setPage((p) => p + 1)} disabled={page === data.total_pages}
              className="px-3 py-1 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50">Next</button>
          </div>
        )}
      </div>
    </div>
  )
}
