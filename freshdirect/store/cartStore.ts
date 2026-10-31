import { create } from 'zustand';
import { cartApi } from '@/lib/api';
import { appAlert } from '@/lib/appAlert';

export type CartItem = {
  id: string;
  product_id: string;
  quantity: number;
  price_at_add: number;
  item_total: number;
  product?: {
    id: string;
    name: string;
    unit: string;
    price: number;
    primary_image_url?: string;
  };
};

type CartState = {
  items: CartItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  loading: boolean;
  fetchCart: () => Promise<void>;
  addItem: (product_id: string, quantity?: number, productDetails?: any) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  reset: () => void;
  totalItems: () => number;
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  subtotal: 0,
  delivery_fee: 0,
  total: 0,
  loading: false,

  fetchCart: async () => {
    try {
      set({ loading: true });
      const { data } = await cartApi.get();
      const cart = data.data;
      set({
        items: cart.items || [],
        subtotal: cart.subtotal,
        delivery_fee: cart.delivery_fee,
        total: cart.total,
      });
      // The server drops products an admin deactivated; say so instead of
      // letting them vanish (and the total change) without explanation.
      const removed: string[] = cart.removed_unavailable || [];
      if (removed.length) {
        appAlert(
          'Cart updated',
          `${removed.join(', ')} ${removed.length === 1 ? 'is' : 'are'} no longer available and ${removed.length === 1 ? 'was' : 'were'} removed from your cart.`,
        );
      }
    } catch (e) {
      console.warn('Failed to fetch cart:', e);
    } finally {
      set({ loading: false });
    }
  },

  addItem: async (product_id, quantity = 1, productDetails?: any) => {
    const prev = get().items;

    // Optimistic update: add item immediately to feel instant
    const existing = prev.find((i) => i.product_id === product_id);
    if (existing) {
      // Bump the existing row — the server merges quantities, so a second
      // temp row would flash a duplicate until the response lands.
      set({
        items: prev.map((i) =>
          i.product_id === product_id
            ? { ...i, quantity: i.quantity + quantity, item_total: i.price_at_add * (i.quantity + quantity) }
            : i
        ),
      });
    } else if (productDetails) {
      const newItem: CartItem = {
        id: `temp-${Date.now()}`, // Temporary ID
        product_id,
        quantity,
        price_at_add: productDetails.price,
        item_total: productDetails.price * quantity,
        product: {
          id: productDetails.id,
          name: productDetails.name,
          unit: productDetails.unit,
          price: productDetails.price,
          // ProductCard passes the mapped shape (`image`), detail passes the API shape.
          primary_image_url: productDetails.primary_image_url || productDetails.image,
        },
      };
      set({ items: [...prev, newItem] });
    }

    // Make API call in the background
    try {
      const { data } = await cartApi.addItem(product_id, quantity);
      const cart = data.data;
      set({
        items: cart.items || [],
        subtotal: cart.subtotal,
        delivery_fee: cart.delivery_fee,
        total: cart.total,
      });
    } catch (e: any) {
      // Rollback if API fails, and say why — the caller already showed an
      // "added" toast, so a silent rollback looks like the item vanished.
      set({ items: prev });
      const detail = e.response?.data?.detail;
      appAlert(
        'Could not add to cart',
        typeof detail === 'string' ? detail : 'Please check your connection and try again.',
      );
      console.warn('Failed to add item:', detail || e);
    }
  },

  removeItem: async (itemId) => {
    // Optimistic remove
    const prev = get().items;
    set({ items: prev.filter((i) => i.id !== itemId) });
    try {
      const { data } = await cartApi.removeItem(itemId);
      const cart = data.data;
      set({
        items: cart.items || [],
        subtotal: cart.subtotal,
        delivery_fee: cart.delivery_fee,
        total: cart.total,
      });
    } catch (e: any) {
      if (e?.response?.status === 404) {
        // Item no longer exists on server — keep it removed locally and sync
        await get().fetchCart();
      } else {
        set({ items: prev });
      }
      console.warn('Failed to remove item:', e);
    }
  },

  updateQuantity: async (itemId, quantity) => {
    if (quantity <= 0) return get().removeItem(itemId);
    // Optimistic update
    const prev = get().items;
    set({ items: prev.map((i) => (i.id === itemId ? { ...i, quantity } : i)) });
    try {
      const { data } = await cartApi.updateItem(itemId, quantity);
      const cart = data.data;
      set({
        items: cart.items || [],
        subtotal: cart.subtotal,
        delivery_fee: cart.delivery_fee,
        total: cart.total,
      });
    } catch (e: any) {
      if (e?.response?.status === 404) {
        // Item no longer exists on server — sync to get current state
        await get().fetchCart();
      } else {
        set({ items: prev });
      }
      console.warn('Failed to update quantity:', e);
    }
  },

  clearCart: async () => {
    try {
      await cartApi.clear();
    } catch (e) {
      console.warn('Failed to clear cart:', e);
    } finally {
      // Always reset locally — after placing an order the server cart is
      // already emptied, so the UI must reflect an empty cart either way.
      set({ items: [], subtotal: 0, delivery_fee: 0, total: 0 });
    }
  },

  // Local-only wipe (logout) — the server cart belongs to the old user and stays.
  reset: () => set({ items: [], subtotal: 0, delivery_fee: 0, total: 0 }),

  totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));
