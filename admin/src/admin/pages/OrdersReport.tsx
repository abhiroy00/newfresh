import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'
import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Download, ShoppingBag, CheckCircle2, XCircle, TrendingUp, Wallet, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  packing: '#6366f1',
  out_for_delivery: '#f97316',
  shipped: '#8b5cf6',
  delivered: '#10b981',
  cancelled: '#ef4444',
}
const FALLBACK = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

const inr = (n: number) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

function toISO(d: Date) { return d.toISOString().slice(0, 10) }
const PRESETS = [
  { label: '7d', days: 6 },
  { label: '30d', days: 29 },
  { label: '90d', days: 89 },
]

export default function OrdersReport() {
  const today = new Date()
  const [startDate, setStartDate] = useState(toISO(new Date(today.getTime() - 29 * 86400000)))
  const [endDate, setEndDate] = useState(toISO(today))

  const applyPreset = (days: number) => {
    const end = new Date()
    const start = new Date(); start.setDate(end.getDate() - days)
    setStartDate(toISO(start)); setEndDate(toISO(end))
  }

  const { data: report, isLoading } = useQuery({
    queryKey: ['orders-report', startDate, endDate],
    queryFn: () =>
      api.get('/admin/reports/orders', {
        params: { start_date: startDate || undefined, end_date: endDate || undefined },
      }).then(r => r.data.data),
  })

  const chartData = useMemo(() => Object.entries(report?.status_breakdown || {}).map(([status, count]) => ({
    name: status.replace(/_/g, ' '),
    key: status,
    value: count as number,
  })), [report])

  const handleExportCSV = () => {
    if (!report) return
    const csv = `Orders Report
Range,${startDate} to ${endDate}
Total Orders,${report.total_orders}
Delivered Orders,${report.delivered_orders}
Cancelled Orders,${report.cancelled_orders}
Fulfillment Rate (%),${report.fulfillment_rate}
Cancellation Rate (%),${report.cancellation_rate}
Average Order Value,₹${report.avg_order_value}
Total Value,₹${report.total_value}

Status Breakdown
${Object.entries(report.status_breakdown).map(([s, c]) => `${s},${c}`).join('\n')}`
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a'); a.href = url; a.download = 'orders-report.csv'; a.click()
    toast.success('Report downloaded!')
  }

  const stats = [
    {
      label: 'Total Orders', value: report?.total_orders ?? 0,
      icon: ShoppingBag, tint: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', ico: 'text-blue-600',
    },
    {
      label: 'Delivered', value: report?.delivered_orders ?? 0, sub: `${(report?.fulfillment_rate || 0).toFixed(1)}% fulfillment`,
      icon: CheckCircle2, tint: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', ico: 'text-emerald-600',
    },
    {
      label: 'Cancelled', value: report?.cancelled_orders ?? 0, sub: `${(report?.cancellation_rate || 0).toFixed(1)}% cancel rate`,
      icon: XCircle, tint: 'from-rose-500 to-rose-600', bg: 'bg-rose-50', ico: 'text-rose-600',
    },
    {
      label: 'Avg Order Value', value: inr(report?.avg_order_value || 0),
      icon: TrendingUp, tint: 'from-violet-500 to-violet-600', bg: 'bg-violet-50', ico: 'text-violet-600',
    },
    {
      label: 'Total Value', value: inr(report?.total_value || 0), sub: 'Delivered orders',
      icon: Wallet, tint: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', ico: 'text-amber-600',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Orders Report</h1>
          <p className="text-sm text-gray-500">Analytics for {startDate} → {endDate}</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={!report}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow hover:shadow-md disabled:opacity-50"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow p-5 flex flex-wrap items-center gap-3">
        <Calendar size={16} className="text-gray-400" />
        <input
          type="date" value={startDate} max={endDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-gray-400 text-sm">to</span>
        <input
          type="date" value={endDate} min={startDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-1 ml-auto bg-gray-100 rounded-lg p-1">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => applyPreset(p.days)}
              className="px-3 py-1 rounded-md text-xs font-semibold text-gray-600 hover:bg-white hover:shadow-sm transition"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {stats.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.label} className="relative overflow-hidden bg-white rounded-2xl shadow p-5 hover:shadow-md transition">
                <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br ${s.tint} opacity-10`} />
                <div className={`w-10 h-10 rounded-xl ${s.bg} ${s.ico} flex items-center justify-center`}>
                  <Icon size={18} />
                </div>
                <p className="text-sm text-gray-500 mt-3">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
                {s.sub && <p className="text-xs text-gray-400 mt-1">{s.sub}</p>}
              </div>
            )
          })}
        </div>
      )}

      {/* Chart + breakdown */}
      {!isLoading && chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl shadow p-6 lg:col-span-3">
            <h2 className="font-semibold mb-1">Orders by Status</h2>
            <p className="text-xs text-gray-500 mb-4">Distribution across order lifecycle</p>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%" cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((d, i) => (
                    <Cell key={d.key} fill={STATUS_COLORS[d.key] || FALLBACK[i % FALLBACK.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                  formatter={(v: number, n: string) => [v, String(n).replace(/_/g, ' ')]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl shadow p-6 lg:col-span-2">
            <h3 className="font-semibold mb-4">Status Breakdown</h3>
            <div className="space-y-3">
              {chartData.map((d, i) => {
                const pct = ((d.value / (report?.total_orders || 1)) * 100)
                const color = STATUS_COLORS[d.key] || FALLBACK[i % FALLBACK.length]
                return (
                  <div key={d.key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                        {d.name}
                      </span>
                      <span className="font-semibold">{d.value} <span className="text-gray-400 font-normal">({pct.toFixed(1)}%)</span></span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
