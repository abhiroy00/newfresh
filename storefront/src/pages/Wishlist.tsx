import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useWishlistStore } from '@/store/wishlistStore'
import ProductCard from '@/components/product/ProductCard'
import ProductSkeleton from '@/components/ui/ProductSkeleton'
import EmptyState from '@/components/ui/EmptyState'

export default function Wishlist() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const openLogin = useAuthStore((s) => s.openLogin)
  const items = useWishlistStore((s) => s.items)
  const loading = useWishlistStore((s) => s.loading)
  const fetchWishlist = useWishlistStore((s) => s.fetchWishlist)

  useEffect(() => {
    if (isAuthenticated) fetchWishlist()
  }, [isAuthenticated, fetchWishlist])

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20">
        <EmptyState
          icon={Heart}
          title="Login to see your wishlist"
          action={<button onClick={openLogin} className="btn-primary mt-2">Login</button>}
        />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-extrabold text-on-surface-deep mb-6">My Wishlist</h1>

      {loading && items.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty"
          subtitle="Save products you love and find them here later."
          action={<Link to="/products" className="btn-primary mt-2">Start Shopping</Link>}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map((item) => <ProductCard key={item.id} product={item.product} />)}
        </div>
      )}
    </div>
  )
}
