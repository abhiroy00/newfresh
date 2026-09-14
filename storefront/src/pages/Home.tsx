import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Truck, ShieldCheck, Leaf, Clock } from 'lucide-react'
import { productsApi } from '@/api/endpoints'
import ProductCard from '@/components/product/ProductCard'
import ProductSkeleton from '@/components/ui/ProductSkeleton'
import SectionHeading from '@/components/ui/SectionHeading'
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
        <div className="relative mb-12">
          {/* Decorative color blobs for depth */}
          <div className="pointer-events-none absolute -top-8 -left-8 w-40 h-40 rounded-full bg-accent-mint/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -right-6 w-56 h-56 rounded-full bg-accent-orange/20 blur-3xl" />

          <Link
            key={slide}
            to={
              current.link_type === 'category' && current.link_value
                ? `/products?category=${current.link_value}`
                : current.link_type === 'product' && current.link_value
                ? `/product/${current.link_value}`
                : '/products'
            }
            className="relative block h-52 sm:h-72 md:h-96 rounded-[2rem] overflow-hidden shadow-2xl animate-fade-in"
          >
            <img src={current.image_url} alt={current.title} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
              {current.title && <h1 className="text-white text-2xl sm:text-4xl font-extrabold mb-1.5 drop-shadow-sm">{current.title}</h1>}
              {current.subtitle && <p className="text-white/90 text-sm sm:text-base mb-4 max-w-md">{current.subtitle}</p>}
              {current.button_text && (
                <span className="inline-block bg-primary text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-lg">
                  {current.button_text}
                </span>
              )}
            </div>
            {carousels.length > 1 && (
              <div className="absolute bottom-5 right-6 flex gap-1.5">
                {carousels.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === slide ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}
                  />
                ))}
              </div>
            )}
          </Link>
        </div>
      )}

      {/* Trust strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
        {[
          { icon: Truck, text: 'Fast Delivery', color: 'text-primary' },
          { icon: Leaf, text: 'Farm Fresh', color: 'text-accent-mint' },
          { icon: ShieldCheck, text: 'Quality Assured', color: 'text-primary' },
          { icon: Clock, text: 'On-Time, Always', color: 'text-accent-orange' },
        ].map((t) => (
          <div key={t.text} className="card card-hover flex items-center gap-3 px-4 py-4">
            <div className="icon-badge">
              <t.icon size={18} className={`${t.color} shrink-0`} />
            </div>
            <span className="text-xs sm:text-sm font-semibold text-on-surface">{t.text}</span>
          </div>
        ))}
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="mb-12">
          <SectionHeading title="Shop by Category" linkTo="/categories" linkLabel="See all" />
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/products?category=${cat.id}`}
                className="group flex flex-col items-center gap-2 shrink-0 w-20"
              >
                {cat.image_url ? (
                  <img
                    src={cat.image_url}
                    alt={cat.name}
                    className="w-20 h-20 rounded-2xl object-cover shadow-sm ring-2 ring-transparent group-hover:ring-primary group-hover:-translate-y-1 transition-all duration-200"
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl shadow-sm ring-2 ring-transparent group-hover:ring-primary group-hover:-translate-y-1 transition-all duration-200"
                    style={{ backgroundColor: cat.color || '#e8f5e9' }}
                  >
                    {cat.emoji || '🛒'}
                  </div>
                )}
                <span className="text-xs font-semibold text-on-surface text-center line-clamp-2 group-hover:text-primary transition-colors">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured */}
      {(featuredQuery.isLoading || (featuredQuery.data && featuredQuery.data.length > 0)) && (
        <section className="mb-12">
          <SectionHeading title="Featured Picks" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {featuredQuery.isLoading
              ? Array.from({ length: 4 }).map((_, i) => <ProductSkeleton key={i} />)
              : featuredQuery.data!.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* Fresh picks */}
      <section>
        <SectionHeading title="Today's Fresh Picks" linkTo="/products" linkLabel="View all" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {freshQuery.isLoading
            ? Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)
            : freshQuery.data!.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
    </div>
  )
}
