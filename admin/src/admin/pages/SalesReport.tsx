import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'
import { useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts'
import { Download, TrendingUp, ShoppingBag, Wallet, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import toast from 'react-hot-toast'

const inr = (n: number) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
function toISO(d: Date) { return d.toISOString().slice(0, 10) }
const PRESETS = [
  { label: '7d', days: 6 },
  { label: '30d', days: 29 },
  { label: '90d', days: 89 },
]

export default function SalesReport() {
  const today = new Date()
  const [startDate, setStartDate] = useState(toISO(new Date(today.getTime() - 29 * 86400000)))
  const [endDate, setEndDate] = useState(toISO(today))

  const applyPreset = (days: number) => {
    const end = new Date()
    const start = new Date(); start.setDate(end.getDate() - days)
    setStartDate(toISO(start)); setEndDate(toISO(end))
  }

  const { data: report, isLoading } = useQuery({
    queryKey: ['sales-report', startDate, endDate],
    queryFn: () =>
      api.get('/admin/reports/sales', {
        params: { start_date: startDate || undefined, end_date: endDate || undefined },
      }).then(r => r.data.data),
  })

  const chartData = useMemo(() =>
    (report?.daily_breakdown || []).map((d: any) => ({
      ...d,
      dateLabel: new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    })),
  [report])

  const trend = useMemo(() => {
    if (!chartData.length || chartData.length < 2) return { pct: 0, up: true }
    const half = Math.floor(chartData.length / 2)
    const a = chartData.slice(0, half).reduce((s: number, d: any) => s + (d.revenue || 0), 0)
    const b = chartData.slice(half).reduce((s: number, d: any) => s + (d.revenue || 0), 0)
    if (!a) return { pct: 0, up: true }
    const pct = ((b - a) / a) * 100
    return { pct, up: pct >= 0 }
  }, [chartData])

  const handleExportCSV = () => {
    if (!report) return
    let csv = 'Date,Revenue,Orders\n'
    report.daily_breakdown?.forEach((d: any) => { csv += `${d.date},${d.revenue},${d.orders}\n` })
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a'); a.href = url; a.download = 'sales-report.csv'; a.click()
    toast.success('Report downloaded!')
  }

  const stats = [
    { label: 'Total Revenue', value: inr(report?.total_revenue || 0), icon: Wallet, tint: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', ico: 'text-emerald-600' },
    { label: 'Total Orders', value: report?.total_orders ?? 0, icon: ShoppingBag, tint: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', ico: 'text-blue-600' },
    { label: 'Avg Order Value', value: inr(report?.avg_order_value || 0), icon: TrendingUp, tint: 'from-violet-500 to-violet-600', bg: 'bg-violet-50', ico: 'text-violet-600' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Sales Report</h1>
          <p className="text-sm text-gray-500">Revenue analytics for {startDate} → {endDate}</p>
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
        <input type="date" value={startDate} max={endDate} onChange={(e) => setStartDate(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <span className="text-gray-400 text-sm">to</span>
        <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <div className="flex gap-1 ml-auto bg-gray-100 rounded-lg p-1">
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => applyPreset(p.days)}
              className="px-3 py-1 rounded-md text-xs font-semibold text-gray-600 hover:bg-white hover:shadow-sm transition">
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((s, i) => {
            const Icon = s.icon
            return (
              <div key={s.label} className="relative overflow-hidden bg-white rounded-2xl shadow p-6 hover:shadow-md transition">
                <div className={`absolute -right-6 -top-6 w-28 h-28 rounded-full bg-gradient-to-br ${s.tint} opacity-10`} />
                <div className={`w-11 h-11 rounded-xl ${s.bg} ${s.ico} flex items-center justify-center`}>
                  <Icon size={20} />
                </div>
                <p className="text-sm text-gray-500 mt-4">{s.label}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-3xl font-bold text-gray-900">{s.value}</p>
                  {i === 0 && chartData.length >= 2 && (
                    <span className={`text-xs font-semibold flex items-center gap-0.5 ${trend.up ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {trend.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {Math.abs(trend.pct).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Revenue trend */}
      {!isLoading && chartData.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-semibold">Revenue Trend</h2>
              <p className="text-xs text-gray-500">Daily revenue over selected period</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                tickFormatter={(v) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                formatter={(v: number) => inr(v)}
              />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Orders bars */}
      {!isLoading && chartData.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-semibold mb-1">Orders per Day</h2>
          <p className="text-xs text-gray-500 mb-4">Daily order volume</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
              <defs>
                <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22a05a" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#1a7a44" stopOpacity={0.9} />
                </linearGradient>
              </defs>
              <Bar dataKey="orders" fill="url(#orderGrad)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      {!isLoading && chartData.length > 0 && (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <h3 className="font-semibold p-5 border-b">Daily Breakdown</h3>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-right">Revenue</th>
                <th className="px-6 py-3 text-right">Orders</th>
                <th className="px-6 py-3 text-right">Avg Order Value</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {chartData.map((day: any) => (
                <tr key={day.date} className="hover:bg-gray-50">
                  <td className="px-6 py-3">{day.dateLabel}</td>
                  <td className="px-6 py-3 text-right font-semibold text-emerald-700">{inr(day.revenue)}</td>
                  <td className="px-6 py-3 text-right">{day.orders}</td>
                  <td className="px-6 py-3 text-right text-gray-600">
                    {day.orders ? inr(day.revenue / day.orders) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
