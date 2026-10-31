import { create } from 'zustand'
import toast from 'react-hot-toast'
import { cartApi } from '@/api/endpoints'
import type { Cart, CartItem } from '@/types'

interface CartState {
  items: CartItem[]
  subtotal: number
  delivery_fee: number
  total: number
  item_count: number
  loading: boolean
  drawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
  fetchCart: () => Promise<void>
  addItem: (productId: string, quantity?: number) => Promise<void>
  updateQuantity: (itemId: string, quantity: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  clear: () => Promise<void>
  reset: () => void
}

const empty = { items: [] as CartItem[], subtotal: 0, delivery_fee: 0, total: 0, item_count: 0 }

function applyCart(set: (partial: Partial<CartState>) => void, cart: Cart) {
  set({
    items: cart.items,
    subtotal: cart.subtotal,
    delivery_fee: cart.delivery_fee,
    total: cart.total,
    item_count: cart.item_count,
  })
  const removed = cart.removed_unavailable || []
  if (removed.length) {
    toast(`${removed.join(', ')} ${removed.length === 1 ? 'is' : 'are'} no longer available and ${removed.length === 1 ? 'was' : 'were'} removed from your cart.`)
  }
}

export const useCartStore = create<CartState>((set, get) => ({
  ...empty,
  loading: false,
  drawerOpen: false,

  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),

  fetchCart: async () => {
    if (!localStorage.getItem('auth_token')) {
      set({ ...empty })
      return
    }
    set({ loading: true })
    try {
      const { data } = await cartApi.get()
      applyCart(set, data.data)
    } catch {
      // leave cart as-is on a transient failure
    } finally {
      set({ loading: false })
    }
  },

  addItem: async (productId: string, quantity = 1) => {
    const { data } = await cartApi.addItem(productId, quantity)
    applyCart(set, data.data)
    set({ drawerOpen: true })
  },

  updateQuantity: async (itemId: string, quantity: number) => {
    const prevItems = get().items
    // Optimistic update so the stepper feels instant.
    set({
      items: prevItems.map((i) => (i.id === itemId ? { ...i, quantity, item_total: i.price_at_add * quantity } : i)),
    })
    try {
      const { data } = await cartApi.updateItem(itemId, quantity)
      applyCart(set, data.data)
    } catch {
      set({ items: prevItems })
    }
  },

  removeItem: async (itemId: string) => {
    const prevItems = get().items
    set({ items: prevItems.filter((i) => i.id !== itemId) })
    try {
      const { data } = await cartApi.removeItem(itemId)
      applyCart(set, data.data)
    } catch {
      set({ items: prevItems })
    }
  },

  clear: async () => {
    try {
      await cartApi.clear()
    } finally {
      set({ ...empty })
    }
  },

  reset: () => set({ ...empty }),
}))

window.addEventListener('gmart:logout', () => {
  useCartStore.getState().reset()
})
