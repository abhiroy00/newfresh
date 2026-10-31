import { create } from 'zustand';
import { wishlistApi } from '@/lib/api';
import { appAlert } from '@/lib/appAlert';

type LikesState = {
  liked: Record<string, true>;
  // Latest real like count per product we've touched this session — product
  // lists may be cached, so this keeps every heart showing the same figure.
  counts: Record<string, number>;
  load: () => Promise<void>;
  isLiked: (productId: string) => boolean;
  countFor: (productId: string, fallback: number) => number;
  toggle: (productId: string, currentCount: number) => Promise<void>;
  reset: () => void;
};

export const useLikesStore = create<LikesState>((set, get) => ({
  liked: {},
  counts: {},

  load: async () => {
    try {
      const { data } = await wishlistApi.list();
      const liked: Record<string, true> = {};
      const counts: Record<string, number> = { ...get().counts };
      for (const item of data.data || []) {
        liked[item.product_id] = true;
        if (typeof item.product?.like_count === 'number') counts[item.product_id] = item.product.like_count;
      }
      set({ liked, counts });
    } catch (e) {
      console.warn('Failed to load likes:', e);
    }
  },

  isLiked: (productId) => !!get().liked[productId],

  countFor: (productId, fallback) => get().counts[productId] ?? fallback,

  toggle: async (productId, currentCount) => {
    const wasLiked = !!get().liked[productId];
    const prevLiked = get().liked;
    const prevCounts = get().counts;
    // Optimistic: flip the heart and bump the figure immediately.
    const liked = { ...prevLiked };
    if (wasLiked) delete liked[productId]; else liked[productId] = true;
    set({
      liked,
      counts: { ...prevCounts, [productId]: Math.max(0, currentCount + (wasLiked ? -1 : 1)) },
    });
    try {
      const { data } = wasLiked ? await wishlistApi.remove(productId) : await wishlistApi.add(productId);
      const real = wasLiked ? data?.data?.like_count : data?.data?.product?.like_count;
      if (typeof real === 'number') set({ counts: { ...get().counts, [productId]: real } });
    } catch (e: any) {
      // 404 on remove = already not liked server-side; keep the local state.
      if (wasLiked && e?.response?.status === 404) return;
      set({ liked: prevLiked, counts: prevCounts });
      appAlert('Could not update like', 'Please check your connection and try again.');
    }
  },

  reset: () => set({ liked: {}, counts: {} }),
}));
