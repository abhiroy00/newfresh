import { useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getOrder, updateOrderStatus } from '../api/orders'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import toast from 'react-hot-toast'
import {
  ArrowLeft, CheckCircle2, Bike, User, MapPin, Package, CreditCard,
  Phone, Mail, Printer, FileText, Receipt, Copy, Calendar, Clock, Download,
} from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

async function downloadPdf(el: HTMLElement | null, filename: string) {
  if (!el) return
  try {
    // A4 in points; consistent 40pt margins on all sides.
    const MARGIN = 40
    const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait', compress: true })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const contentW = pageW - MARGIN * 2
    const contentH = pageH - MARGIN * 2

    // High-DPI capture for crisp typography.
    const scale = Math.max(2, Math.min(3, window.devicePixelRatio || 2))
    const canvas = await html2canvas(el, {
      scale,
      backgroundColor: '#ffffff',
      useCORS: true,
      windowWidth: el.scrollWidth,
    })

    // Pixel height of one PDF page slice from the source canvas.
    const pxPerPage = Math.floor((canvas.width * contentH) / contentW)

    // Slice the source canvas into page-sized chunks so each page starts at a
    // clean break instead of translating one giant image with negative offsets.
    let rendered = 0
    let pageIndex = 0
    const sliceCanvas = document.createElement('canvas')
    const ctx = sliceCanvas.getContext('2d')!
    while (rendered < canvas.height) {
      const sliceH = Math.min(pxPerPage, canvas.height - rendered)
      sliceCanvas.width = canvas.width
      sliceCanvas.height = sliceH
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height)
      ctx.drawImage(canvas, 0, rendered, canvas.width, sliceH, 0, 0, canvas.width, sliceH)
      const imgData = sliceCanvas.toDataURL('image/jpeg', 0.95)
      const drawH = (sliceH * contentW) / canvas.width
      if (pageIndex > 0) pdf.addPage()
      pdf.addImage(imgData, 'JPEG', MARGIN, MARGIN, contentW, drawH, undefined, 'FAST')
      rendered += sliceH
      pageIndex += 1
    }
    pdf.save(`${filename}.pdf`)
  } catch (e) {
    console.error(e)
  }
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 ring-yellow-200',
  confirmed: 'bg-blue-100 text-blue-700 ring-blue-200',
  packing: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
  out_for_delivery: 'bg-orange-100 text-orange-700 ring-orange-200',
  delivered: 'bg-green-100 text-green-700 ring-green-200',
  cancelled: 'bg-red-100 text-red-700 ring-red-200',
}

type Tab = 'overview' | 'bill' | 'invoice'

const inr = (n: number) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

function printNode(el: HTMLElement | null, title: string) {
  if (!el) return
  const w = window.open('', '_blank', 'width=900,height=1000')
  if (!w) return
  w.document.write(`<html><head><title>${title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>@media print { @page { margin: 12mm; } } body { font-family: ui-sans-serif, system-ui, sans-serif; color: #111; }</style>
  </head><body class="p-8">${el.innerHTML}</body></html>`)
  w.document.close()
  setTimeout(() => { w.focus(); w.print() }, 400)
}

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [selectedRiderId, setSelectedRiderId] = useState('')
  const [showRiderSelect, setShowRiderSelect] = useState(false)
  const [tab, setTab] = useState<Tab>('overview')

  const billRef = useRef<HTMLDivElement>(null)
  const invoiceRef = useRef<HTMLDivElement>(null)

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => getOrder(id!),
  })

  const { data: riders } = useQuery({
    queryKey: ['riders'],
    queryFn: () => api.get('/admin/riders').then(r => r.data.items as { id: string; name: string; phone: string }[]),
  })

  const { data: timeline } = useQuery({
    queryKey: ['order-timeline', id],
    queryFn: () => api.get(`/admin/orders/${id}/timeline`).then(r => r.data.data),
    enabled: !!id,
  })

  const { mutate: changeStatus } = useMutation({
    mutationFn: (status: string) => updateOrderStatus(id!, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] })
      qc.invalidateQueries({ queryKey: ['order-timeline', id] })
      toast.success('Status updated!')
    },
  })

  const { mutate: assignRider, isPending: isAssigning } = useMutation({
    mutationFn: (riderId: string) =>
      api.post(`/admin/orders/${id}/assign-driver`, null, { params: { driver_id: riderId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] })
      setSelectedRiderId('')
      setShowRiderSelect(false)
      toast.success('Rider assigned!')
    },
    onError: () => toast.error('Failed to assign rider'),
  })

  const totals = useMemo(() => {
    if (!order) return { subtotal: 0, tax: 0, delivery: 0, discount: 0, total: 0 }
    const subtotal = order.subtotal ?? order.items?.reduce(
      (s: number, i: any) => s + (i.total_price ?? (i.unit_price ?? i.price_at_purchase ?? 0) * (i.quantity ?? 0)),
      0,
    ) ?? 0
    return {
      subtotal,
      tax: order.tax ?? order.gst ?? 0,
      delivery: order.delivery_fee ?? order.shipping ?? 0,
      discount: order.discount ?? 0,
      total: order.total ?? subtotal,
    }
  }, [order])

  if (isLoading) return <div className="p-6 text-gray-400">Loading...</div>
  if (!order) return <div className="p-6 text-gray-400">Order not found</div>

  const assignedRider = riders?.find(r => r.id === order.rider_id)
  const orderNo = order.order_number ?? `#${order.id?.slice(0, 8)}`
  const orderNoSafe = String(orderNo).replace(/^#/, '').replace(/[^\w-]+/g, '-')
  const billFilename = `Bill-Invoice-${orderNoSafe}`
  const taxFilename = `Tax-Invoice-${orderNoSafe}`
  const created = new Date(order.created_at)

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <button onClick={() => navigate('/orders')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-black transition">
        <ArrowLeft size={16} /> Back to Orders
      </button>

      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 shadow-lg">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 w-48 h-48 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="relative flex flex-wrap justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-white/60 uppercase tracking-wider">
              <Receipt size={14} /> Order
            </div>
            <h1 className="text-3xl font-bold mt-1 flex items-center gap-3">
              {orderNo}
              <button
                onClick={() => { navigator.clipboard.writeText(String(order.id)); toast.success('Order ID copied') }}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/70"
                title="Copy order ID"
              >
                <Copy size={16} />
              </button>
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-white/70">
              <span className="flex items-center gap-1.5"><Calendar size={14} /> {created.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              <span className="flex items-center gap-1.5"><Clock size={14} /> {created.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ring-1 capitalize ${STATUS_COLORS[order.status] || 'bg-gray-200 text-gray-800'}`}>
                {String(order.status).replace(/_/g, ' ')}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className="text-xs text-white/60 uppercase tracking-wider">Order Total</p>
            <p className="text-3xl font-bold">{inr(totals.total)}</p>
            <select
              value={order.status}
              onChange={(e) => changeStatus(e.target.value)}
              className="mt-2 bg-white/10 border border-white/20 backdrop-blur rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              {Object.keys(STATUS_COLORS).map((s) => (
                <option key={s} value={s} className="text-gray-900">{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { id: 'overview', label: 'Overview', icon: Package },
          { id: 'bill', label: 'Bill Invoice', icon: Receipt },
          { id: 'invoice', label: 'Order Invoice', icon: FileText },
        ] as { id: Tab; label: string; icon: any }[]).map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Icon size={15} /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Customer + Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl shadow p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <User size={16} />
                  </div>
                  <h2 className="font-semibold">Customer</h2>
                </div>
                <p className="font-medium text-gray-900">{order.user?.name || '—'}</p>
                {order.user?.email && (
                  <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                    <Mail size={12} /> {order.user.email}
                  </p>
                )}
                {order.user?.phone && (
                  <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                    <Phone size={12} /> {order.user.phone}
                  </p>
                )}
              </div>
              <div className="bg-white rounded-2xl shadow p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <MapPin size={16} />
                  </div>
                  <h2 className="font-semibold">Delivery Address</h2>
                </div>
                <p className="text-sm text-gray-700">{order.address?.line1 || '—'}</p>
                {order.address?.line2 && <p className="text-sm text-gray-700">{order.address.line2}</p>}
                <p className="text-sm text-gray-700">
                  {[order.address?.city, order.address?.state].filter(Boolean).join(', ')}
                </p>
                <p className="text-sm text-gray-700">{order.address?.pincode}</p>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b">
                <div className="flex items-center gap-2">
                  <Package size={18} className="text-gray-500" />
                  <h2 className="font-semibold">Order Items</h2>
                </div>
                <span className="text-xs text-gray-500">{order.items?.length} items</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="px-5 py-3 text-left">Product</th>
                    <th className="px-5 py-3 text-right">Price</th>
                    <th className="px-5 py-3 text-right">Qty</th>
                    <th className="px-5 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {order.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.product_image_url ?? item.product?.images?.[0] ?? 'https://placehold.co/40x40/EEE/31343C'}
                            className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                            alt=""
                          />
                          <div>
                            <p className="font-medium">{item.product_name ?? item.product?.name}</p>
                            {item.product?.unit && <p className="text-xs text-gray-400">{item.product.unit}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">{inr(item.unit_price ?? item.price_at_purchase)}</td>
                      <td className="px-5 py-3 text-right">{item.quantity}</td>
                      <td className="px-5 py-3 text-right font-semibold">
                        {inr(item.total_price ?? (item.price_at_purchase ?? item.unit_price ?? 0) * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-5 border-t bg-gray-50/50 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{inr(totals.subtotal)}</span></div>
                {totals.discount ? <div className="flex justify-between text-green-600"><span>Discount</span><span>− {inr(totals.discount)}</span></div> : null}
                {totals.delivery ? <div className="flex justify-between text-gray-600"><span>Delivery</span><span>{inr(totals.delivery)}</span></div> : null}
                {totals.tax ? <div className="flex justify-between text-gray-600"><span>Tax / GST</span><span>{inr(totals.tax)}</span></div> : null}
                <div className="flex justify-between pt-2 border-t border-gray-200 text-base font-bold text-gray-900">
                  <span>Total</span><span>{inr(totals.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Payment summary */}
            <div className="bg-white rounded-2xl shadow p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <CreditCard size={16} />
                </div>
                <h2 className="font-semibold">Payment</h2>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Method</span><span className="font-medium capitalize">{order.payment_method || 'N/A'}</span></div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    order.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                    order.payment_status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {order.payment_status || 'pending'}
                  </span>
                </div>
                {order.payment_id && (
                  <div className="flex justify-between"><span className="text-gray-500">Txn</span><span className="font-mono text-xs">{order.payment_id}</span></div>
                )}
              </div>
            </div>

            {/* Rider */}
            <div className="bg-white rounded-2xl shadow p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Bike size={16} />
                </div>
                <h2 className="font-semibold">Rider</h2>
              </div>

              {assignedRider && !showRiderSelect && (
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl mb-3">
                  <div>
                    <p className="font-medium text-gray-900">{assignedRider.name}</p>
                    <p className="text-sm text-gray-500">{assignedRider.phone}</p>
                  </div>
                  <button
                    onClick={() => setShowRiderSelect(true)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Change
                  </button>
                </div>
              )}

              {(!assignedRider || showRiderSelect) && (
                <div className="space-y-2">
                  <select
                    value={selectedRiderId}
                    onChange={e => setSelectedRiderId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select a rider…</option>
                    {riders?.filter(r => r.id !== order.rider_id).map(r => (
                      <option key={r.id} value={r.id}>{r.name} — {r.phone}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={() => selectedRiderId && assignRider(selectedRiderId)}
                      disabled={!selectedRiderId || isAssigning}
                      className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 bg-emerald-600 hover:bg-emerald-700"
                    >
                      {isAssigning ? 'Assigning…' : 'Assign'}
                    </button>
                    {showRiderSelect && (
                      <button
                        onClick={() => { setShowRiderSelect(false); setSelectedRiderId('') }}
                        className="px-3 py-2 rounded-xl text-sm border border-gray-200 text-gray-500 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!riders?.length && (
                <p className="text-sm text-gray-400">No riders available.</p>
              )}
            </div>

            {/* Timeline */}
            {timeline?.timeline?.length ? (
              <div className="bg-white rounded-2xl shadow p-5">
                <h2 className="font-semibold mb-4">Status Timeline</h2>
                <div className="space-y-3">
                  {timeline.timeline.map((event: any, idx: number) => {
                    const done = !!event.timestamp
                    return (
                      <div key={idx} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${done ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                            <CheckCircle2 size={14} />
                          </div>
                          {idx < timeline.timeline.length - 1 && (
                            <div className={`w-0.5 flex-1 min-h-[1.5rem] mt-1 ${done ? 'bg-emerald-300' : 'bg-gray-200'}`} />
                          )}
                        </div>
                        <div className="pb-2">
                          <p className={`text-sm font-medium ${done ? 'text-gray-900' : 'text-gray-400'}`}>{event.label}</p>
                          <p className="text-xs text-gray-500">
                            {event.timestamp ? new Date(event.timestamp).toLocaleString('en-IN') : 'Pending'}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* BILL INVOICE — customer receipt */}
      {tab === 'bill' && (
        <div className="space-y-3">
          <div className="flex justify-end gap-2">
            <button
              onClick={() => downloadPdf(billRef.current, billFilename)}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700"
            >
              <Download size={15} /> Download PDF
            </button>
            <button
              onClick={() => printNode(billRef.current, `Bill ${orderNo}`)}
              className="btn-primary gap-1.5"
            >
              <Printer size={15} /> Print
            </button>
          </div>
          <div ref={billRef} className="bg-white rounded-2xl shadow p-8 max-w-3xl mx-auto">
            <div className="flex justify-between items-start pb-6 border-b">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Bill Receipt</h2>
                <p className="text-sm text-gray-500 mt-1">Thank you for your order</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold text-gray-900">{orderNo}</p>
                <p className="text-gray-500">{created.toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 py-6">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Billed To</p>
                <p className="font-semibold text-gray-900">{order.user?.name}</p>
                {order.user?.phone && <p className="text-sm text-gray-600">{order.user.phone}</p>}
                {order.user?.email && <p className="text-sm text-gray-600">{order.user.email}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Deliver To</p>
                <p className="text-sm text-gray-700">{order.address?.line1}</p>
                {order.address?.line2 && <p className="text-sm text-gray-700">{order.address.line2}</p>}
                <p className="text-sm text-gray-700">{[order.address?.city, order.address?.state].filter(Boolean).join(', ')} {order.address?.pincode}</p>
              </div>
            </div>

            <table className="w-full text-sm border-t">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase">
                  <th className="py-3">Item</th>
                  <th className="py-3 text-center">Qty</th>
                  <th className="py-3 text-right">Price</th>
                  <th className="py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {order.items?.map((item: any) => (
                  <tr key={item.id}>
                    <td className="py-3">
                      <p className="font-medium">{item.product_name ?? item.product?.name}</p>
                      {item.product?.unit && <p className="text-xs text-gray-400">{item.product.unit}</p>}
                    </td>
                    <td className="py-3 text-center">{item.quantity}</td>
                    <td className="py-3 text-right">{inr(item.unit_price ?? item.price_at_purchase)}</td>
                    <td className="py-3 text-right font-medium">{inr(item.total_price ?? (item.price_at_purchase ?? item.unit_price ?? 0) * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-6 flex justify-end">
              <div className="w-full max-w-xs space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{inr(totals.subtotal)}</span></div>
                {totals.discount ? <div className="flex justify-between text-green-600"><span>Discount</span><span>− {inr(totals.discount)}</span></div> : null}
                {totals.delivery ? <div className="flex justify-between text-gray-600"><span>Delivery Fee</span><span>{inr(totals.delivery)}</span></div> : null}
                {totals.tax ? <div className="flex justify-between text-gray-600"><span>Tax</span><span>{inr(totals.tax)}</span></div> : null}
                <div className="flex justify-between pt-2 mt-2 border-t border-gray-300 text-base font-bold">
                  <span>Total Paid</span><span>{inr(totals.total)}</span>
                </div>
                <p className="text-xs text-gray-500 capitalize">Paid via {order.payment_method || 'N/A'}</p>
              </div>
            </div>

            <p className="mt-8 pt-4 border-t text-center text-xs text-gray-400">
              This is a customer bill receipt. For queries, contact support.
            </p>
          </div>
        </div>
      )}

      {/* ORDER INVOICE — GST tax invoice */}
      {tab === 'invoice' && (
        <div className="space-y-3">
          <div className="flex justify-end gap-2">
            <button
              onClick={() => downloadPdf(invoiceRef.current, taxFilename)}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700"
            >
              <Download size={15} /> Download PDF
            </button>
            <button
              onClick={() => printNode(invoiceRef.current, `Invoice ${orderNo}`)}
              className="btn-primary gap-1.5"
            >
              <Printer size={15} /> Print
            </button>
          </div>
          <div ref={invoiceRef} className="bg-white rounded-2xl shadow p-8 max-w-3xl mx-auto">
            <div className="flex justify-between items-start pb-6 border-b-2 border-gray-900">
              <div>
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">TAX INVOICE</h2>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Original for recipient</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold text-gray-900">Invoice # {orderNo}</p>
                <p className="text-gray-500">Date: {created.toLocaleDateString('en-IN')}</p>
                <p className="text-gray-500">Order ID: <span className="font-mono">{order.id?.slice(0, 12)}</span></p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 py-6 text-sm">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Seller</p>
                <p className="font-semibold text-gray-900">Your Company Pvt. Ltd.</p>
                <p className="text-gray-600">Registered Office Address</p>
                <p className="text-gray-600">GSTIN: 00XXXXX0000X0Z0</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Buyer</p>
                <p className="font-semibold text-gray-900">{order.user?.name}</p>
                <p className="text-gray-600">{order.address?.line1}</p>
                <p className="text-gray-600">{[order.address?.city, order.address?.state].filter(Boolean).join(', ')} {order.address?.pincode}</p>
                {order.user?.phone && <p className="text-gray-600">Ph: {order.user.phone}</p>}
              </div>
            </div>

            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] text-gray-600 uppercase bg-gray-50 border-y">
                  <th className="py-2 px-2">#</th>
                  <th className="py-2 px-2">Description</th>
                  <th className="py-2 px-2 text-center">HSN</th>
                  <th className="py-2 px-2 text-center">Qty</th>
                  <th className="py-2 px-2 text-right">Rate</th>
                  <th className="py-2 px-2 text-right">Taxable</th>
                  <th className="py-2 px-2 text-right">GST</th>
                  <th className="py-2 px-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {order.items?.map((item: any, i: number) => {
                  const price = item.unit_price ?? item.price_at_purchase ?? 0
                  const qty = item.quantity ?? 0
                  const taxable = price * qty
                  const gstRate = item.gst_rate ?? 5
                  const gst = (taxable * gstRate) / 100
                  return (
                    <tr key={item.id}>
                      <td className="py-2 px-2 text-gray-500">{i + 1}</td>
                      <td className="py-2 px-2 font-medium">{item.product_name ?? item.product?.name}</td>
                      <td className="py-2 px-2 text-center text-gray-500">{item.product?.hsn || '—'}</td>
                      <td className="py-2 px-2 text-center">{qty}</td>
                      <td className="py-2 px-2 text-right">{inr(price)}</td>
                      <td className="py-2 px-2 text-right">{inr(taxable)}</td>
                      <td className="py-2 px-2 text-right">{inr(gst)} <span className="text-gray-400">({gstRate}%)</span></td>
                      <td className="py-2 px-2 text-right font-medium">{inr(taxable + gst)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="mt-6 flex justify-end">
              <div className="w-full max-w-xs space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600"><span>Taxable value</span><span>{inr(totals.subtotal)}</span></div>
                {totals.tax ? (
                  <>
                    <div className="flex justify-between text-gray-600"><span>CGST</span><span>{inr(totals.tax / 2)}</span></div>
                    <div className="flex justify-between text-gray-600"><span>SGST</span><span>{inr(totals.tax / 2)}</span></div>
                  </>
                ) : null}
                {totals.delivery ? <div className="flex justify-between text-gray-600"><span>Delivery</span><span>{inr(totals.delivery)}</span></div> : null}
                {totals.discount ? <div className="flex justify-between text-green-600"><span>Discount</span><span>− {inr(totals.discount)}</span></div> : null}
                <div className="flex justify-between pt-2 mt-2 border-t-2 border-gray-900 text-base font-extrabold">
                  <span>Grand Total</span><span>{inr(totals.total)}</span>
                </div>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-6 text-xs text-gray-500 pt-4 border-t">
              <div>
                <p className="font-semibold text-gray-700 mb-1">Terms &amp; Conditions</p>
                <p>Goods once sold will not be taken back. Subject to jurisdiction of Company's registered state.</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-700 mb-8">Authorized Signatory</p>
                <p className="text-gray-500">For Your Company Pvt. Ltd.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
