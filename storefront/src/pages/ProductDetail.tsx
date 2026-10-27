import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Leaf, ShoppingCart, Check, MapPin, Info, Heart, Sparkles,
  Thermometer, ChefHat, Truck, Shield, Award,
} from 'lucide-react'
import { productsApi } from '@/api/endpoints'
import { formatPrice } from '@/lib/format'
import QuantityStepper from '@/components/ui/QuantityStepper'
import MarkdownText from '@/components/ui/MarkdownText'
import ErrorState from '@/components/ui/ErrorState'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { useWishlistStore } from '@/store/wishlistStore'
import type { Product } from '@/types'

const NUTRIENT_ICONS: Record<string, string> = {
  iron: '🩸', calcium: '🦴', potassium: '🍌', magnesium: '💪',
  zinc: '🛡️', phosphorus: '🦷', sodium: '🧂', fiber: '🌾',
  vitamin_a: '👁️', vitamin_c: '🍊', vitamin_d: '☀️', vitamin_e: '✨',
  vitamin_k: '🩹', vitamin_b6: '🧠', vitamin_b12: '⚡', folate: '🧬',
  protein: '🥩', carbs: '🍞',
}

const TRUST_BADGES = [
  { icon: Truck, text: 'Fast Delivery' },
  { icon: Shield, text: 'Quality Assured' },
  { icon: Award, text: 'Trusted Seller' },
]

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const [quantity, setQuantity] = useState(1)
  const [imageIndex, setImageIndex] = useState(0)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  const addItem = useCartStore((s) => s.addItem)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const openLogin = useAuthStore((s) => s.openLogin)
  const toggleWishlist = useWishlistStore((s) => s.toggle)
  const wishlisted = useWishlistStore((s) => s.productIds.has(id || ''))

  const { data: product, isLoading, isError, refetch } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => (await productsApi.detail(id!)).data.data as Product,
    enabled: !!id,
  })

  if (isError) {
    return <ErrorState subtitle="Couldn't load this product." onRetry={() => refetch()} />
  }

  if (isLoading || !product) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-on-surface-variant">
        {isLoading ? 'Loading...' : 'Product not found'}
      </div>
    )
  }

  const galleryUrls = (product.images || []).slice().sort((a, b) => a.sort_order - b.sort_order).map((i) => i.url)
  const imageUrls = [
    ...(product.primary_image_url ? [product.primary_image_url] : []),
    ...galleryUrls.filter((u) => u !== product.primary_image_url),
  ]
  const discount = product.original_price && product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : null

  const minerals = product.minerals ? Object.entries(product.minerals) : []
  const vitamins = product.vitamins ? Object.entries(product.vitamins) : []
  const hasNutrition = minerals.length > 0 || vitamins.length > 0

  const storageTips = product.storage_tips?.length ? product.storage_tips : ['Store in a cool, dry place', 'Check packaging for best-before date']
  const preparationTips = product.preparation_tips?.length ? product.preparation_tips : ['Wash thoroughly before use', 'Handle with clean hands']

  const handleAdd = async () => {
    if (!isAuthenticated) {
      toast('Please login to add items to your cart')
      openLogin()
      return
    }
    setAdding(true)
    try {
      await addItem(product.id, quantity)
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    } catch {
      toast.error('Could not add to cart.')
    } finally {
      setAdding(false)
    }
  }

  const handleToggleWishlist = () => {
    if (!isAuthenticated) {
      toast('Please login to save items to your wishlist')
      openLogin()
      return
    }
    toggleWishlist(product.id)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <div className="grid md:grid-cols-2 gap-8 mb-10">
        {/* Gallery */}
        <div>
          <div className="relative aspect-square rounded-3xl overflow-hidden bg-surface-container-low mb-3">
            {imageUrls.length > 0 ? (
              <>
                <img src={imageUrls[imageIndex]} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover scale-125 blur-2xl opacity-70" />
                <img src={imageUrls[imageIndex]} alt={product.name} className="relative w-full h-full object-contain" />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center"><Leaf size={64} className="text-outline" /></div>
            )}
          </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {product.badge && (
            <span className="text-[11px] font-bold uppercase text-white px-2.5 py-1 rounded-full" style={{ backgroundColor: product.badge_color || '#005322' }}>
              {product.badge}
            </span>
          )}
          {product.is_organic && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-white bg-accent-mint px-2.5 py-1 rounded-full">
              <Leaf size={10} fill="white" /> Organic
            </span>
          )}
        </div>
          {imageUrls.length > 1 && (
            <div className="flex gap-2">
              {imageUrls.map((url, i) => (
                <button
                  key={url}
                  onClick={() => setImageIndex(i)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 ${i === imageIndex ? 'border-primary' : 'border-transparent'}`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <h1 className="text-2xl font-extrabold text-on-surface-deep mb-2">{product.name}</h1>
          <div className="flex items-baseline gap-2.5 flex-wrap mb-2">
            <span className="text-3xl font-extrabold text-primary">{formatPrice(product.price)}</span>
            <span className="text-sm text-on-surface-variant">/ {product.unit}</span>
            {product.original_price && product.original_price > product.price && (
              <>
                <span className="text-base text-outline line-through">{formatPrice(product.original_price)}</span>
                {discount && <span className="text-xs font-bold text-error bg-error-container px-2 py-0.5 rounded-full">{discount}% OFF</span>}
              </>
            )}
          </div>
          {product.origin && (
            <div className="inline-flex items-center gap-1.5 bg-surface-container-low text-accent-mint text-xs font-semibold px-3 py-1 rounded-full mb-4">
              <MapPin size={12} /> {product.origin}
            </div>
          )}

          {product.stock <= 0 ? (
            <p className="text-error font-bold mb-6">Out of stock</p>
          ) : (
            <div className="flex items-center justify-between card px-4 py-3.5 mb-6">
              <span className="font-semibold text-sm">Quantity</span>
              <QuantityStepper value={quantity} onChange={setQuantity} />
            </div>
          )}

          <div className="flex bg-surface-container-low rounded-2xl p-3 gap-1 mb-6">
            {TRUST_BADGES.map((t) => (
              <div key={t.text} className="flex-1 flex flex-col items-center gap-1 text-center">
                <t.icon size={16} className="text-primary" />
                <span className="text-[10px] font-semibold text-on-surface">{t.text}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleAdd}
              disabled={product.stock <= 0 || adding}
              className="btn-primary flex-1 !py-3.5 disabled:opacity-50"
            >
              {added ? <><Check size={18} /> Added!</> : <><ShoppingCart size={18} /> Add to Cart — {formatPrice(product.price * quantity)}</>}
            </button>
            <button
              onClick={handleToggleWishlist}
              className="w-14 shrink-0 rounded-full border-1.5 border-outline-variant flex items-center justify-center hover:scale-105 active:scale-90 transition-transform"
              aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
            >
              <Heart size={20} className={wishlisted ? 'text-error' : 'text-outline'} fill={wishlisted ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <Section icon={Info} iconColor="text-primary" title="About This Product">
          <MarkdownText>{product.description}</MarkdownText>
        </Section>
      )}

      {/* Health Benefits */}
      {product.health_benefits && (
        <Section icon={Heart} iconColor="text-error" title="Health Benefits" cardClass="bg-error-container border-l-4 border-error">
          <MarkdownText>{product.health_benefits}</MarkdownText>
        </Section>
      )}

      {/* Nutrition */}
      {hasNutrition && (
        <Section icon={Sparkles} iconColor="text-accent-orange" title="Nutritional Info">
          {minerals.length > 0 && (
            <>
              <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-2">Minerals</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                {minerals.map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 bg-surface-container-low rounded-xl px-3 py-2">
                    <span className="text-xl">{NUTRIENT_ICONS[k] || '🔹'}</span>
                    <div>
                      <p className="text-sm font-bold text-on-surface-deep">{String(v)}</p>
                      <p className="text-[11px] text-on-surface-variant capitalize">{k.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {vitamins.length > 0 && (
            <>
              <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-2">Vitamins</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {vitamins.map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 bg-surface-container-low rounded-xl px-3 py-2">
                    <span className="text-xl">{NUTRIENT_ICONS[k] || '💊'}</span>
                    <div>
                      <p className="text-sm font-bold text-on-surface-deep">{String(v)}</p>
                      <p className="text-[11px] text-on-surface-variant capitalize">{k.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Section>
      )}

      <div className="grid sm:grid-cols-2 gap-8">
        <Section icon={Thermometer} iconColor="text-primary" title="Storage Tips">
          <ul className="flex flex-col gap-2.5">
            {storageTips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-on-surface">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" /> {tip}
              </li>
            ))}
          </ul>
        </Section>
        <Section icon={ChefHat} iconColor="text-accent-orange" title="Preparation Tips">
          <ul className="flex flex-col gap-2.5">
            {preparationTips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-on-surface">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-orange mt-1.5 shrink-0" /> {tip}
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  )
}

function Section({
  icon: Icon, iconColor, title, children, cardClass = '',
}: { icon: any; iconColor: string; title: string; children: React.ReactNode; cardClass?: string }) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={18} className={iconColor} />
        <h2 className="font-bold text-on-surface-deep">{title}</h2>
      </div>
      <div className={`card p-4 ${cardClass}`}>{children}</div>
    </section>
  )
}
