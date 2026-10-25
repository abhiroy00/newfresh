import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  ShoppingBag, IndianRupee, TrendingUp, AlertCircle, Truck,
  BarChart3, RefreshCw, Calendar, PauseCircle, PlayCircle, Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import StatsCard from '../components/StatsCard'

const toISO = (d: Date) => d.toISOString().slice(0, 10)
const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

// Error that remembers which endpoint failed so the UI can surface it.
class EndpointError extends Error {
  endpoint: string
  status?: number
  constructor(endpoint: string, message: string, status?: number) {
    super(message)
    this.endpoint = endpoint
    this.status = status
    this.name = 'EndpointError'
  }
}

const fetchEndpoint = async <T,>(url: string, params: Record<string, string>): Promise<T> => {
  try {
    const res = await api.get(url, { params })
    return res.data as T
  } catch (err: any) {
    const status = err?.response?.status
    const msg = err?.response?.data?.detail || err?.message || 'Request failed'
    throw new EndpointError(url, msg, status)
  }
}

const getStats = async (startDate: string, endDate: string) => {
  const params = { start_date: startDate, end_date: endDate }
  const [realtime, dashboard] = await Promise.all([
    fetchEndpoint<{ data: any }>('/admin/dashboard/realtime', params),
    fetchEndpoint<any>('/admin/stats', params),
  ])
  return { ...realtime.data, ...dashboard }
}

const PRESETS: Array<{ label: string; days: number }> = [
  { label: '7d', days: 6 },
  { label: '30d', days: 29 },
  { label: '90d', days: 89 },
]

const REFRESH_OPTIONS: Array<{ label: string; seconds: number }> = [
  { label: 'Off', seconds: 0 },
  { label: '15s', seconds: 15 },
  { label: '30s', seconds: 30 },
  { label: '1m', seconds: 60 },
  { label: '5m', seconds: 300 },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [startDate, setStartDate] = useState<string>(toISO(daysAgo(6)))
  const [endDate, setEndDate] = useState<string>(toISO(new Date()))
  const [refreshSeconds, setRefreshSeconds] = useState<number>(() => {
    if (typeof window === 'undefined') return 30
    const raw = window.localStorage.getItem('dashboard:refreshSeconds')
    const parsed = raw == null ? NaN : Number(raw)
    return REFRESH_OPTIONS.some((o) => o.seconds === parsed) ? parsed : 30
  })
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('dashboard:refreshSeconds', String(refreshSeconds))
  }, [refreshSeconds])
  const [isPageVisible, setIsPageVisible] = useState<boolean>(
    typeof document === 'undefined' ? true : document.visibilityState !== 'hidden',
  )

  // Pause auto-refresh when the tab is hidden.
  useEffect(() => {
    const onVisibility = () => setIsPageVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const applyPreset = (days: number) => {
    setStartDate(toISO(daysAgo(days)))
    setEndDate(toISO(new Date()))
  }

  const { data: stats, isLoading, isError, error, refetch, isFetching, failureCount } = useQuery({
    queryKey: ['dashboard-stats', startDate, endDate],
    queryFn: () => getStats(startDate, endDate),
    // Exponential backoff: 1s, 2s, 4s (capped 30s). Skip retry on 4xx client errors.
    retry: (attempt, err) => {
      const status = err instanceof EndpointError ? err.status : undefined
      if (status && status >= 400 && status < 500) return false
      return attempt < 3
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
    // Pause polling when tab hidden or interval is Off.
    refetchInterval: refreshSeconds > 0 && isPageVisible ? refreshSeconds * 1000 : false,
    refetchIntervalInBackground: false,
  })

  const failedEndpoint = error instanceof EndpointError ? error.endpoint : null
  const failedStatus = error instanceof EndpointError ? error.status : undefined

  const cards = [
    {
      label: 'Active Orders',
      value: stats?.active_orders ?? '—',
      icon: <TrendingUp size={28} />,
      color: 'bg-blue-500',
      sub: 'Pending + In Transit',
      onClick: () => navigate('/orders'),
    },
    {
      label: 'Orders Today',
      value: stats?.orders_today ?? '—',
      icon: <ShoppingBag size={28} />,
      color: 'bg-green-500',
      sub: 'Placed today',
      onClick: () => navigate(`/orders?date=${toISO(new Date())}`),
    },
    {
      label: 'Revenue Today',
      value: stats ? `₹${(stats.revenue_today || 0).toLocaleString('en-IN')}` : '—',
      icon: <IndianRupee size={28} />,
      color: 'bg-purple-500',
      sub: 'Delivered orders',
      onClick: () => navigate(`/orders?status=delivered&date=${toISO(new Date())}`),
    },
    {
      label: 'Pending Deliveries',
      value: stats?.pending_deliveries ?? '—',
      icon: <Truck size={28} />,
      color: 'bg-orange-500',
      sub: 'Out for delivery',
      onClick: () => navigate('/orders?status=shipped'),
    },
    {
      label: 'Low Stock Alerts',
      value: stats?.low_stock_alerts ?? '—',
      icon: <AlertCircle size={28} />,
      color: 'bg-red-500',
      sub: 'Below 10 units',
      onClick: () => navigate('/products?status=low_stock'),
    },
    {
      label: 'Family Members',
      value: stats?.total_family_members ?? '—',
      icon: <Users size={28} />,
      color: 'bg-teal-500',
      sub: stats?.avg_family_size ? `Avg ${stats.avg_family_size} per household` : 'Added via profile',
      onClick: () => navigate('/users'),
    },
  ]

  const dailyRevenue: Array<{ date: string; revenue: number }> = stats?.daily_revenue ?? []
  const ordersByStatus: Array<{ status: string; count: number }> = stats?.orders_by_status ?? []
  const recentOrders: any[] = stats?.recent_orders ?? []

  const drillIntoDate = (date?: string) => {
    if (!date) return
    navigate(`/orders?date=${encodeURIComponent(date)}`)
  }
  const drillIntoStatus = (status: string) => {
    navigate(`/orders?status=${encodeURIComponent(status)}`)
  }

  const ChartSkeleton = ({ height = 220 }: { height?: number }) => (
    <div className="animate-pulse bg-gray-100 rounded-lg" style={{ height }} />
  )

  const ChartError = ({ height = 220 }: { height?: number }) => (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm px-4 text-center"
      style={{ height }}
    >
      <AlertCircle size={22} />
      <span>Couldn't load data</span>
      {failedEndpoint && (
        <code className="text-[11px] font-mono text-red-500 bg-red-100/60 px-1.5 py-0.5 rounded">
          {failedStatus ? `${failedStatus} ` : ''}{failedEndpoint}
        </code>
      )}
      <button
        onClick={() => refetch()}
        className="mt-1 flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-lg bg-white border border-red-200 hover:bg-red-100"
      >
        <RefreshCw size={12} /> Retry
      </button>
    </div>
  )

  const ChartEmpty = ({ height = 220, label = 'No data yet' }: { height?: number; label?: string }) => (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-lg bg-gray-50 border border-dashed border-gray-200 text-gray-400 text-sm"
      style={{ height }}
    >
      <BarChart3 size={22} />
      <span>{label}</span>
    </div>
  )

  const autoRefreshOn = refreshSeconds > 0
  const autoRefreshPaused = autoRefreshOn && !isPageVisible

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border rounded-lg px-2.5 py-1.5 text-sm">
            <Calendar size={14} className="text-gray-400" />
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent focus:outline-none text-gray-700"
            />
            <span className="text-gray-400">→</span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={toISO(new Date())}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent focus:outline-none text-gray-700"
            />
          </div>
          <div className="flex items-center gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.days)}
                className="text-xs font-medium px-2.5 py-1.5 rounded-lg border bg-white text-gray-600 hover:bg-gray-50"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Auto-refresh control */}
          <div
            className="flex items-center gap-1.5 bg-white border rounded-lg px-2.5 py-1.5 text-sm"
            title={autoRefreshPaused ? 'Paused (tab hidden)' : autoRefreshOn ? 'Auto-refresh on' : 'Auto-refresh off'}
          >
            {autoRefreshPaused ? (
              <PauseCircle size={14} className="text-amber-500" />
            ) : autoRefreshOn ? (
              <PlayCircle size={14} className="text-green-500" />
            ) : (
              <PauseCircle size={14} className="text-gray-400" />
            )}
            <span className="text-xs text-gray-500">Auto</span>
            <select
              value={refreshSeconds}
              onChange={(e) => setRefreshSeconds(Number(e.target.value))}
              className="bg-transparent focus:outline-none text-gray-700 text-sm"
            >
              {REFRESH_OPTIONS.map((o) => (
                <option key={o.seconds} value={o.seconds}>{o.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border bg-white disabled:opacity-50"
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {isError && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle size={16} className="shrink-0" />
            <span className="truncate">
              Failed to load dashboard data
              {failedEndpoint && (
                <>
                  {' from '}
                  <code className="font-mono text-red-800 bg-red-100 px-1 py-0.5 rounded">
                    {failedStatus ? `${failedStatus} ` : ''}{failedEndpoint}
                  </code>
                </>
              )}
              {error instanceof Error ? ` — ${error.message}` : ''}
              {failureCount > 1 && ` (retried ${failureCount - 1}×)`}
            </span>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-lg bg-white border border-red-200 hover:bg-red-100 shrink-0"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {cards.map((c) => (
            <button
              key={c.label}
              onClick={c.onClick}
              className="text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-2xl transition hover:-translate-y-0.5"
              title={`View ${c.label.toLowerCase()}`}
            >
              <StatsCard label={c.label} value={c.value} icon={c.icon} color={c.color} sub={c.sub} />
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-2xl shadow p-6 col-span-2 lg:col-span-1">
          <h2 className="font-semibold mb-4">Revenue – {startDate} to {endDate}</h2>
          {isLoading ? (
            <ChartSkeleton />
          ) : isError ? (
            <ChartError />
          ) : dailyRevenue.length === 0 ? (
            <ChartEmpty label="No revenue in the selected range" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={dailyRevenue}
                onClick={(state: any) => drillIntoDate(state?.activePayload?.[0]?.payload?.date)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`₹${v}`, 'Revenue']} />
                <defs>
                  <linearGradient id="dashRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22a05a" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#1a7a44" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <Bar
                  dataKey="revenue"
                  fill="url(#dashRevGrad)"
                  radius={[6, 6, 0, 0]}
                  cursor="pointer"
                  onClick={(entry: any) => drillIntoDate(entry?.date)}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
          {!isLoading && !isError && dailyRevenue.length > 0 && (
            <p className="mt-2 text-xs text-gray-400">Click a bar to view that day's orders.</p>
          )}
        </div>

        {/* Orders by Status */}
        <div className="bg-white rounded-2xl shadow p-6 col-span-2 lg:col-span-1">
          <h2 className="font-semibold mb-4">Orders by Status</h2>
          {isLoading ? (
            <ChartSkeleton />
          ) : isError ? (
            <ChartError />
          ) : ordersByStatus.length === 0 ? (
            <ChartEmpty label="No orders yet" />
          ) : (
            <div className="space-y-3 mt-2">
              {ordersByStatus.map((s) => (
                <button
                  key={s.status}
                  onClick={() => drillIntoStatus(s.status)}
                  className="w-full text-left group focus:outline-none"
                  title={`View ${s.status} orders`}
                >
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize group-hover:text-blue-600">{s.status}</span>
                    <span className="font-medium">{s.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        background: 'linear-gradient(90deg, #1a7a44, #22a05a)',
                        width: `${(s.count / (stats?.total_orders || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="font-semibold mb-4">Recent Orders</h2>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <ChartError height={140} />
        ) : recentOrders.length === 0 ? (
          <ChartEmpty height={140} label="No recent orders" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs uppercase border-b">
                <th className="pb-2">Order</th>
                <th className="pb-2">Customer</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentOrders.map((o: any) => (
                <tr
                  key={o.id}
                  onClick={() => navigate(`/orders/${o.id}`)}
                  className="py-2 cursor-pointer hover:bg-gray-50"
                >
                  <td className="py-2 font-mono text-xs">#{o.id?.slice(0, 8)}</td>
                  <td className="py-2">{o.user?.name}</td>
                  <td className="py-2 font-semibold">₹{o.total}</td>
                  <td className="py-2">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 capitalize">
                      {o.status}
                    </span>
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
