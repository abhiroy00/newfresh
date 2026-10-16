import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { MapPin, Smartphone, CreditCard, Banknote, Check, Plus } from 'lucide-react'
import { usersApi, ordersApi } from '@/api/endpoints'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { useRazorpay, preloadRazorpay, PAYMENT_CANCELLED } from '@/hooks/useRazorpay'
import { formatPrice } from '@/lib/format'
import AddressForm from '@/components/address/AddressForm'
import type { Address } from '@/types'

const PAYMENT_METHODS = [
  { id: 'UPI', icon: Smartphone, label: 'UPI / GPay / PhonePe', sub: 'Instant transfer', badge: 'POPULAR' },
  { id: 'CARD', icon: CreditCard, label: 'Credit / Debit Card', sub: 'Visa, Mastercard, RuPay' },
  { id: 'COD', icon: Banknote, label: 'Cash on Delivery', sub: 'Pay when delivered' },
]
const ONLINE_METHODS = ['UPI', 'CARD']

export default function Checkout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { items, subtotal, delivery_fee, total, clear, fetchCart } = useCartStore()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const openLogin = useAuthStore((s) => s.openLogin)
  const { startPayment } = useRazorpay()

  const [selectedMethod, setSelectedMethod] = useState('UPI')
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null)

  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => (await usersApi.listAddresses()).data.data as Address[],
    enabled: isAuthenticated,
  })

  useEffect(() => { preloadRazorpay() }, [])

  useEffect(() => {
    if (addresses && addresses.length > 0 && !selectedAddressId) {
      const def = addresses.find((a) => a.is_default) || addresses[0]
      setSelectedAddressId(def.id)
    }
    if (addresses && addresses.length === 0) setShowAddressForm(true)
  }, [addresses, selectedAddressId])

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="font-bold text-lg text-on-surface-deep mb-4">Login to continue checkout</p>
        <button onClick={openLogin} className="btn-primary">Login</button>
      </div>
    )
  }

  if (items.length === 0 && !pendingOrderId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="font-bold text-lg text-on-surface-deep mb-4">Your cart is empty</p>
        <Link to="/products" className="btn-primary">Start Shopping</Link>
      </div>
    )
  }

  const handleAddressSaved = (addr: Address) => {
    setShowAddressForm(false)
    setSelectedAddressId(addr.id)
    queryClient.invalidateQueries({ queryKey: ['addresses'] })
  }

  const handlePlaceOrder = async () => {
    if (placing) return
    if (!selectedAddressId) {
      toast.error('Please select a delivery address')
      return
    }
    setPlacing(true)
    try {
      let orderId = pendingOrderId
      if (!orderId) {
        const { data: orderRes } = await ordersApi.create({ address_id: selectedAddressId, payment_method: selectedMethod.toLowerCase() })
        orderId = orderRes.data.id as string
        setPendingOrderId(orderId)
      }

      if (ONLINE_METHODS.includes(selectedMethod)) {
        const result = await startPayment(orderId, { name: user?.name ?? undefined, email: user?.email ?? undefined, phone: user?.phone })
        if (!result.success) {
          if (result.error && result.error !== PAYMENT_CANCELLED) toast.error(result.error)
          setPlacing(false)
          return
        }
      }

      await clear()
      navigate(`/order-success/${orderId}`)
    } catch (e: any) {
      const detail = typeof e.response?.data?.detail === 'string' ? e.response.data.detail : e.response?.data?.message
      toast.error(detail || 'Could not place your order. Please try again.')
      fetchCart()
    } finally {
      setPlacing(false)
    }
  }

  const currentAddr = addresses?.find((a) => a.id === selectedAddressId)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-extrabold text-on-surface-deep mb-6">Checkout</h1>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 flex flex-col gap-6">
          {/* Address */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-on-surface-deep">Delivery Address</h2>
              {!showAddressForm && addresses && addresses.length > 0 && (
                <button onClick={() => { setShowAddressForm(true) }} className="text-sm font-semibold text-primary flex items-center gap-1">
                  <Plus size={14} /> Add New
                </button>
              )}
            </div>

            {showAddressForm ? (
              <div className="card p-5">
                <AddressForm
                  makeDefault={!addresses || addresses.length === 0}
                  onSaved={handleAddressSaved}
                  onCancel={addresses && addresses.length > 0 ? () => setShowAddressForm(false) : undefined}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {addresses?.map((addr) => (
                  <label
                    key={addr.id}
                    className={`card p-4 flex items-start gap-3 cursor-pointer border-1.5 ${selectedAddressId === addr.id ? 'border-primary bg-surface-container-low' : 'border-transparent'}`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddressId === addr.id}
                      onChange={() => setSelectedAddressId(addr.id)}
                      className="mt-1 accent-primary"
                    />
                    <MapPin size={16} className="text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-on-surface-deep">{addr.label} · {addr.full_name}</p>
                      <p className="text-xs text-on-surface-variant">
                        {[addr.line1, addr.line2, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* Payment methods */}
          <section>
            <h2 className="font-bold text-on-surface-deep mb-3">Payment Method</h2>
            <div className="flex flex-col gap-2.5">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  disabled={placing || !!pendingOrderId}
                  onClick={() => setSelectedMethod(m.id)}
                  className={`card flex items-center gap-3 p-4 text-left border-1.5 ${selectedMethod === m.id ? 'border-primary bg-surface-container-low' : 'border-transparent'}`}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${selectedMethod === m.id ? 'bg-surface-container-high' : 'bg-surface-container-low'}`}>
                    <m.icon size={19} className={selectedMethod === m.id ? 'text-primary' : 'text-outline'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-on-surface">{m.label}</span>
                      {m.badge && <span className="text-[9px] font-bold text-primary bg-primary-fixed px-1.5 py-0.5 rounded-full">{m.badge}</span>}
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5">{m.sub}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedMethod === m.id ? 'bg-primary border-primary' : 'border-outline-variant'}`}>
                    {selectedMethod === m.id && <Check size={11} color="#fff" />}
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Summary */}
        <div className="card p-5 h-fit sticky top-24">
          <h2 className="font-bold text-on-surface-deep mb-4">Order Summary</h2>
          <div className="flex flex-col gap-2.5 mb-4 max-h-56 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-on-surface-variant line-clamp-1 pr-2">{item.quantity} × {item.product?.name}</span>
                <span className="font-semibold text-on-surface shrink-0">{formatPrice(item.item_total)}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 border-t border-outline-variant pt-3 mb-4">
            <div className="flex justify-between text-sm text-on-surface-variant">
              <span>Subtotal</span><span className="font-semibold text-on-surface">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-on-surface-variant">
              <span>Delivery</span>
              <span className={`font-semibold ${delivery_fee === 0 ? 'text-accent-mint' : 'text-on-surface'}`}>
                {delivery_fee === 0 ? 'FREE' : formatPrice(delivery_fee)}
              </span>
            </div>
          </div>
          <div className="flex justify-between font-extrabold text-lg text-on-surface-deep border-t border-outline-variant pt-4 mb-5">
            <span>Total</span><span className="text-primary">{formatPrice(total)}</span>
          </div>
          <button onClick={handlePlaceOrder} disabled={placing} className="btn-primary w-full disabled:opacity-60">
            {placing ? 'Placing order...' : selectedMethod === 'COD' ? `Place Order (COD)` : `Pay ${formatPrice(total)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
