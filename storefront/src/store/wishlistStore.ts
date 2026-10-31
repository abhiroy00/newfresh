import { create } from 'zustand'
import { wishlistApi } from '@/api/endpoints'
import type { WishlistItem } from '@/types'

interface WishlistState {
  items: WishlistItem[]
  productIds: Set<string>
  // Latest real like count per product touched this session, so every heart
  // shows the same figure even where the product list is cached.
  counts: Record<string, number>
  loading: boolean
  fetchWishlist: () => Promise<void>
  toggle: (productId: string, currentCount?: number) => Promise<void>
  reset: () => void
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: [],
  productIds: new Set(),
  counts: {},
  loading: false,

  fetchWishlist: async () => {
    if (!localStorage.getItem('auth_token')) {
      set({ items: [], productIds: new Set() })
      return
    }
    set({ loading: true })
    try {
      const { data } = await wishlistApi.list()
      const items = data.data as WishlistItem[]
      set({ items, productIds: new Set(items.map((i) => i.product_id)) })
    } catch {
      // leave wishlist as-is on a transient failure
    } finally {
      set({ loading: false })
    }
  },

  toggle: async (productId: string, currentCount?: number) => {
    const { items, productIds, counts } = get()
    const wishlisted = productIds.has(productId)
    if (currentCount !== undefined) {
      set({ counts: { ...counts, [productId]: Math.max(0, currentCount + (wishlisted ? -1 : 1)) } })
    }

    // Optimistic update so the heart icon feels instant.
    const nextIds = new Set(productIds)
    if (wishlisted) nextIds.delete(productId)
    else nextIds.add(productId)
    set({ productIds: nextIds, items: wishlisted ? items.filter((i) => i.product_id !== productId) : items })

    try {
      if (wishlisted) {
        const { data } = await wishlistApi.remove(productId)
        const real = data?.data?.like_count
        if (typeof real === 'number') set({ counts: { ...get().counts, [productId]: real } })
      } else {
        const { data } = await wishlistApi.add(productId)
        const item = data.data as WishlistItem
        set({ items: [item, ...get().items] })
        const real = item.product?.like_count
        if (typeof real === 'number') set({ counts: { ...get().counts, [productId]: real } })
      }
    } catch {
      // revert on failure
      set({ items, productIds, counts })
    }
  },

  reset: () => set({ items: [], productIds: new Set(), counts: {} }),
}))

window.addEventListener('gmart:logout', () => {
  useWishlistStore.getState().reset()
})
