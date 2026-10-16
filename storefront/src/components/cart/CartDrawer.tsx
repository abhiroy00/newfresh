import { Link, useNavigate } from 'react-router-dom'
import { X, ShoppingCart, Trash2, Truck } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/format'
import { FREE_DELIVERY_THRESHOLD } from '@/lib/constants'
import QuantityStepper from '@/components/ui/QuantityStepper'

export default function CartDrawer() {
  const navigate = useNavigate()
  const open = useCartStore((s) => s.drawerOpen)
  const close = useCartStore((s) => s.closeDrawer)
  const items = useCartStore((s) => s.items)
  const subtotal = useCartStore((s) => s.subtotal)
  const delivery_fee = useCartStore((s) => s.delivery_fee)
  const total = useCartStore((s) => s.total)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)

  if (!open) return null

  const goCheckout = () => {
    close()
    navigate('/checkout')
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={close} />
      <div className="relative w-full max-w-md h-full bg-background flex flex-col shadow-2xl animate-slide-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant bg-white">
          <h2 className="font-extrabold text-lg text-on-surface-deep">Your Cart</h2>
          <button onClick={close} className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center">
            <X size={17} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center">
              <ShoppingCart size={28} className="text-outline" />
            </div>
            <p className="font-bold text-on-surface-deep">Your cart is empty</p>
            <p className="text-sm text-on-surface-variant">Add fresh produce to get started</p>
            <Link to="/products" onClick={close} className="btn-primary mt-2">Start Shopping</Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
              {subtotal < FREE_DELIVERY_THRESHOLD && (
                <div className="flex items-center gap-2 bg-surface-container-low border border-primary-fixed rounded-2xl px-3 py-2.5 text-xs text-on-surface">
                  <Truck size={14} className="text-primary shrink-0" />
                  Add <b className="text-primary">{formatPrice(FREE_DELIVERY_THRESHOLD - subtotal)}</b> more for FREE delivery!
                </div>
              )}

              {items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="w-16 h-16 rounded-xl bg-surface-container-low overflow-hidden shrink-0">
                    {item.product?.primary_image_url && (
                      <img src={item.product.primary_image_url} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-on-surface-deep line-clamp-1">{item.product?.name || 'Product'}</p>
                    <p className="text-xs text-on-surface-variant mb-1.5">{formatPrice(item.price_at_add)} · {item.product?.unit}</p>
                    <QuantityStepper size="sm" value={item.quantity} onChange={(q) => updateQuantity(item.id, q)} />
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button onClick={() => removeItem(item.id)} className="text-outline hover:text-error transition-colors" aria-label="Remove">
                      <Trash2 size={16} />
                    </button>
                    <span className="text-sm font-bold text-on-surface-deep">{formatPrice(item.item_total)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-outline-variant bg-white px-5 py-4 flex flex-col gap-3">
              <div className="flex justify-between text-sm text-on-surface-variant">
                <span>Subtotal</span>
                <span className="font-semibold text-on-surface">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-on-surface-variant">
                <span>Delivery</span>
                <span className={`font-semibold ${delivery_fee === 0 ? 'text-accent-mint' : 'text-on-surface'}`}>
                  {delivery_fee === 0 ? 'FREE' : formatPrice(delivery_fee)}
                </span>
              </div>
              <div className="flex justify-between font-extrabold text-on-surface-deep border-t border-outline-variant pt-3">
                <span>Total</span>
                <span className="text-primary">{formatPrice(total)}</span>
              </div>
              <button onClick={goCheckout} className="btn-primary w-full mt-1">Proceed to Checkout</button>
              <Link to="/cart" onClick={close} className="text-center text-sm font-semibold text-primary">View full cart</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
