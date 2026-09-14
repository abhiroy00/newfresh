import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Truck, ShieldCheck, Leaf, Clock } from 'lucide-react'
import { productsApi } from '@/api/endpoints'
import ProductCard from '@/components/product/ProductCard'
import ProductSkeleton from '@/components/ui/ProductSkeleton'
import type { Product, Category, Carousel } from '@/types'

export default function Home() {
  const [slide, setSlide] = useState(0)

  const carouselQuery = useQuery({
    queryKey: ['carousel'],
    queryFn: async () => (await productsApi.carousel()).data.data as Carousel[],
  })
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await productsApi.categories()).data.data as Category[],
  })
  const featuredQuery = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: async () => (await productsApi.list({ is_featured: true, per_page: 8 })).data.data as Product[],
  })
  const freshQuery = useQuery({
    queryKey: ['products', 'fresh'],
    queryFn: async () => (await productsApi.list({ per_page: 12, sort: 'created_at_desc' })).data.data as Product[],
  })

  const carousels = carouselQuery.data || []
  const categories = (categoriesQuery.data || []).filter((c) => (c.product_count || 0) > 0)

  useEffect(() => {
    if (carousels.length < 2) return
    const t = setInterval(() => setSlide((s) => (s + 1) % carousels.length), 5000)
    return () => clearInterval(t)
  }, [carousels.length])

  const current = carousels[slide]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {current && (
        <Link
          to={
            current.link_type === 'category' && current.link_value
              ? `/products?category=${current.link_value}`
              : current.link_type === 'product' && current.link_value
              ? `/product/${current.link_value}`
              : '/products'
          }
          className="relative block h-48 sm:h-64 md:h-80 rounded-3xl overflow-hidden shadow-lg mb-10"
        >
          <img src={current.image_url} alt={current.title} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
            {current.title && <h1 className="text-white text-2xl sm:text-3xl font-extrabold mb-1">{current.title}</h1>}
            {current.subtitle && <p className="text-white/90 text-sm sm:text-base mb-3">{current.subtitle}</p>}
            {current.button_text && (
              <span className="inline-block bg-primary text-white text-sm font-bold px-4 py-2 rounded-full">
                {current.button_text}
              </span>
            )}
          </div>
          {carousels.length > 1 && (
            <div className="absolute bottom-4 right-6 flex gap-1.5">
              {carousels.map((_, i) => (
                <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === slide ? 'bg-white' : 'bg-white/40'}`} />
              ))}
            </div>
          )}
        </Link>
      )}

      {/* Trust strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {[
          { icon: Truck, text: 'Fast Delivery' },
          { icon: Leaf, text: 'Farm Fresh' },
          { icon: ShieldCheck, text: 'Quality Assured' },
          { icon: Clock, text: 'On-Time, Always' },
        ].map((t) => (
          <div key={t.text} className="card flex items-center gap-2.5 px-4 py-3.5">
            <t.icon size={18} className="text-primary shrink-0" />
            <span className="text-xs sm:text-sm font-semibold text-on-surface">{t.text}</span>
          </div>
        ))}
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-extrabold text-on-surface-deep">Shop by Category</h2>
            <Link to="/categories" className="text-sm font-semibold text-primary flex items-center gap-0.5">
              See all <ChevronRight size={15} />
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/products?category=${cat.id}`}
                className="flex flex-col items-center gap-2 shrink-0 w-20"
              >
                {cat.image_url ? (
                  <img src={cat.image_url} alt={cat.name} className="w-20 h-20 rounded-2xl object-cover shadow-sm" />
                ) : (
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl shadow-sm"
                    style={{ backgroundColor: cat.color || '#e8f5e9' }}
                  >
                    {cat.emoji || '🛒'}
                  </div>
                )}
                <span className="text-xs font-semibold text-on-surface text-center line-clamp-2">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured */}
      {(featuredQuery.isLoading || (featuredQuery.data && featuredQuery.data.length > 0)) && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-extrabold text-on-surface-deep">Featured Picks</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {featuredQuery.isLoading
              ? Array.from({ length: 4 }).map((_, i) => <ProductSkeleton key={i} />)
              : featuredQuery.data!.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* Fresh picks */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-on-surface-deep">Today's Fresh Picks</h2>
          <Link to="/products" className="text-sm font-semibold text-primary flex items-center gap-0.5">
            View all <ChevronRight size={15} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {freshQuery.isLoading
            ? Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)
            : freshQuery.data!.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
    </div>
  )
}
