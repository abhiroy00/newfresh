import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Trash2, Truck } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { formatPrice } from '@/lib/format'
import { FREE_DELIVERY_THRESHOLD } from '@/lib/constants'
import QuantityStepper from '@/components/ui/QuantityStepper'
import EmptyState from '@/components/ui/EmptyState'

export default function Cart() {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const openLogin = useAuthStore((s) => s.openLogin)
  const items = useCartStore((s) => s.items)
  const subtotal = useCartStore((s) => s.subtotal)
  const delivery_fee = useCartStore((s) => s.delivery_fee)
  const total = useCartStore((s) => s.total)
  const item_count = useCartStore((s) => s.item_count)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)

  if (!isAuthenticated) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <EmptyState
          icon={ShoppingCart}
          title="Login to view your cart"
          subtitle="Your cart items are saved to your account."
          action={<button onClick={openLogin} className="btn-primary mt-2">Login</button>}
        />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          subtitle="Add fresh produce to get started."
          action={<Link to="/products" className="btn-primary mt-2">Start Shopping</Link>}
        />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-extrabold text-on-surface-deep mb-1">Your Cart</h1>
      <p className="text-sm text-on-surface-variant mb-6">{item_count} item{item_count !== 1 ? 's' : ''}</p>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 flex flex-col gap-4">
          {subtotal < FREE_DELIVERY_THRESHOLD && (
            <div className="flex items-center gap-2 bg-surface-container-low border border-primary-fixed rounded-2xl px-4 py-3 text-sm text-on-surface">
              <Truck size={16} className="text-primary shrink-0" />
              Add <b className="text-primary">{formatPrice(FREE_DELIVERY_THRESHOLD - subtotal)}</b> more for FREE delivery!
            </div>
          )}

          {items.map((item) => (
            <div key={item.id} className="card flex gap-4 p-4">
              <Link to={`/product/${item.product_id}`} className="w-20 h-20 rounded-xl bg-surface-container-low overflow-hidden shrink-0">
                {item.product?.primary_image_url && (
                  <img src={item.product.primary_image_url} alt="" className="w-full h-full object-cover" />
                )}
              </Link>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <Link to={`/product/${item.product_id}`} className="font-semibold text-on-surface-deep hover:text-primary line-clamp-1">
                    {item.product?.name || 'Product'}
                  </Link>
                  <p className="text-sm text-on-surface-variant">{formatPrice(item.price_at_add)} · {item.product?.unit}</p>
                </div>
                <QuantityStepper size="sm" value={item.quantity} onChange={(q) => updateQuantity(item.id, q)} />
              </div>
              <div className="flex flex-col items-end justify-between">
                <button onClick={() => removeItem(item.id)} className="text-outline hover:text-error transition-colors" aria-label="Remove">
                  <Trash2 size={18} />
                </button>
                <span className="font-bold text-on-surface-deep">{formatPrice(item.item_total)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="card p-5 h-fit sticky top-24">
          <h2 className="font-bold text-on-surface-deep mb-4">Order Summary</h2>
          <div className="flex flex-col gap-2.5 mb-4">
            <div className="flex justify-between text-sm text-on-surface-variant">
              <span>Subtotal ({item_count} items)</span>
              <span className="font-semibold text-on-surface">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-on-surface-variant">
              <span>Delivery</span>
              <span className={`font-semibold ${delivery_fee === 0 ? 'text-accent-mint' : 'text-on-surface'}`}>
                {delivery_fee === 0 ? 'FREE' : formatPrice(delivery_fee)}
              </span>
            </div>
          </div>
          <div className="flex justify-between font-extrabold text-lg text-on-surface-deep border-t border-outline-variant pt-4 mb-5">
            <span>Total</span>
            <span className="text-primary">{formatPrice(total)}</span>
          </div>
          <button onClick={() => navigate('/checkout')} className="btn-primary w-full">Proceed to Checkout</button>
        </div>
      </div>
    </div>
  )
}
