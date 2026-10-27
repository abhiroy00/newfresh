import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Leaf, Plus, ShoppingCart, Check, Heart } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Product } from '@/types'
import { formatPrice } from '@/lib/format'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { useWishlistStore } from '@/store/wishlistStore'

export default function ProductCard({ product }: { product: Product }) {
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const addItem = useCartStore((s) => s.addItem)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const openLogin = useAuthStore((s) => s.openLogin)
  const wishlisted = useWishlistStore((s) => s.productIds.has(product.id))
  const toggleWishlist = useWishlistStore((s) => s.toggle)

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) {
      toast('Please login to save items to your wishlist')
      openLogin()
      return
    }
    toggleWishlist(product.id)
  }

  const discount =
    product.original_price && product.original_price > product.price
      ? Math.round((1 - product.price / product.original_price) * 100)
      : null

  const outOfStock = product.stock <= 0

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) {
      toast('Please login to add items to your cart')
      openLogin()
      return
    }
    if (outOfStock || adding) return
    setAdding(true)
    try {
      await addItem(product.id, 1)
      setAdded(true)
      setTimeout(() => setAdded(false), 1500)
    } catch {
      toast.error('Could not add to cart. Please try again.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <Link
      to={`/product/${product.id}`}
      className="card card-hover group relative flex flex-col overflow-hidden"
    >
      <div className="relative aspect-square bg-white overflow-hidden">
        {product.primary_image_url ? (
          <img
            src={product.primary_image_url}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Leaf className="text-outline" size={40} />
          </div>
        )}

        <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end">
          <button
            type="button"
            onClick={handleToggleWishlist}
            className="w-7 h-7 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-sm hover:scale-110 active:scale-90 transition-transform"
            aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
          >
            <Heart size={14} className={wishlisted ? 'text-error' : 'text-outline'} fill={wishlisted ? 'currentColor' : 'none'} />
          </button>
        </div>

        {outOfStock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-sm font-bold text-on-surface-variant">Out of stock</span>
          </div>
        )}
      </div>

      {(product.badge || product.is_organic || discount) && (
        <div className="px-3 pt-2.5 flex flex-wrap gap-1 items-center">
          {product.badge && (
            <span
              className="text-[10px] font-bold uppercase text-white px-2 py-0.5 rounded-full"
              style={{ backgroundColor: product.badge_color || '#005322' }}
            >
              {product.badge}
            </span>
          )}
          {product.is_organic && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-accent-mint px-2 py-0.5 rounded-full">
              <Leaf size={9} fill="white" /> Organic
            </span>
          )}
          {discount && (
            <span className="text-[10px] font-bold text-error bg-error-container px-2 py-0.5 rounded-full">
              {discount}% OFF
            </span>
          )}
        </div>
      )}

      <div className="px-3 pb-3 pt-2 flex flex-col gap-1 flex-1">
        <h3 className="text-sm font-semibold text-on-surface-deep line-clamp-2 leading-snug min-h-[2.5rem]">
          {product.name}
        </h3>
        <span className="text-xs text-on-surface-variant">{product.unit}</span>

        <div className="flex items-center justify-between mt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-primary">{formatPrice(product.price)}</span>
            {product.original_price && product.original_price > product.price && (
              <span className="text-xs text-outline line-through">{formatPrice(product.original_price)}</span>
            )}
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={outOfStock || adding}
            className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-40 hover:scale-110 active:scale-90 transition-transform shadow-md"
            aria-label="Add to cart"
          >
            {added ? <Check size={16} /> : adding ? <ShoppingCart size={14} className="animate-pulse" /> : <Plus size={16} />}
          </button>
        </div>
      </div>
    </Link>
  )
}
