import { create } from 'zustand'
import { wishlistApi } from '@/api/endpoints'
import type { WishlistItem } from '@/types'

interface WishlistState {
  items: WishlistItem[]
  productIds: Set<string>
  loading: boolean
  fetchWishlist: () => Promise<void>
  toggle: (productId: string) => Promise<void>
  reset: () => void
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: [],
  productIds: new Set(),
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

  toggle: async (productId: string) => {
    const { items, productIds } = get()
    const wishlisted = productIds.has(productId)

    // Optimistic update so the heart icon feels instant.
    const nextIds = new Set(productIds)
    if (wishlisted) nextIds.delete(productId)
    else nextIds.add(productId)
    set({ productIds: nextIds, items: wishlisted ? items.filter((i) => i.product_id !== productId) : items })

    try {
      if (wishlisted) {
        await wishlistApi.remove(productId)
      } else {
        const { data } = await wishlistApi.add(productId)
        set({ items: [data.data as WishlistItem, ...get().items] })
      }
    } catch {
      // revert on failure
      set({ items, productIds })
    }
  },

  reset: () => set({ items: [], productIds: new Set() }),
}))

window.addEventListener('gmart:logout', () => {
  useWishlistStore.getState().reset()
})
