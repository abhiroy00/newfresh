import { ordersApi } from '@/lib/api';
import { appAlert } from '@/lib/appAlert';
import { useCartStore } from '@/store/cartStore';

/**
 * Put a past order's items back in the cart (Zepto/Swiggy "Reorder").
 * Returns true when something was added, so the caller can open the cart.
 */
export async function reorderToCart(orderId: string): Promise<boolean> {
  try {
    const { data } = await ordersApi.reorder(orderId);
    const { added = [], skipped = [] } = data?.data || {};
    await useCartStore.getState().fetchCart();
    if (!added.length) {
      appAlert('Items unavailable', 'None of the items from this order are in stock right now.');
      return false;
    }
    if (skipped.length) {
      appAlert('Added to cart', `Some items are unavailable and were skipped: ${skipped.join(', ')}`);
    }
    return true;
  } catch (e: any) {
    const detail = e.response?.data?.detail;
    appAlert('Could not reorder', typeof detail === 'string' ? detail : 'Please try again.');
    return false;
  }
}
