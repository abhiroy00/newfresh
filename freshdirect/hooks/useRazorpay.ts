import { useCallback } from 'react';
import { Platform } from 'react-native';
import { setStatusBarStyle } from 'expo-status-bar';
import { Colors } from '@/constants/theme';
import { paymentsApi } from '@/lib/api';

// @ts-ignore – react-native-razorpay has no TS types
import RazorpayCheckout from 'react-native-razorpay';

interface RazorpayOptions {
  key: string;
  amount: number;        // paise
  currency: string;
  name: string;
  description: string;
  order_id: string;      // Razorpay order ID
  prefill: {
    email?: string;
    contact?: string;
    name?: string;
  };
  theme: { color: string };
}

interface PaymentResult {
  success: boolean;
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  error?: string;
}

/**
 * Exact message used when the shopper backs out of checkout. The UI compares
 * against this to stay quiet on a deliberate cancel while still alerting on a
 * genuine failure — keep both sides importing this constant, not a literal.
 */
export const PAYMENT_CANCELLED = 'Payment cancelled';

const RAZORPAY_SCRIPT_ID = 'razorpay-checkout-js';
const RAZORPAY_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

// One shared promise so preloading and the actual checkout never race or
// append the script twice.
let scriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return Promise.resolve();
  }
  if ((window as any).Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.id = RAZORPAY_SCRIPT_ID;
    script.src = RAZORPAY_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Drop the cached promise so a later attempt can retry the download.
      scriptPromise = null;
      script.remove();
      reject(new Error('Failed to load Razorpay'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Warm the Razorpay bundle ahead of time so tapping Pay opens the sheet
 * immediately instead of waiting on a cold ~100KB script fetch. Safe to call
 * repeatedly; a no-op on native, where the SDK is already bundled.
 */
export function preloadRazorpay(): void {
  loadRazorpayScript().catch(() => {
    // Preloading is best-effort — openRazorpayWeb retries and reports failures.
  });
}

/**
 * Open Razorpay checkout on native (react-native-razorpay) or web (Razorpay script).
 */
async function openRazorpayCheckout(options: RazorpayOptions): Promise<PaymentResult> {
  if (Platform.OS === 'web') {
    return openRazorpayWeb(options);
  }
  return openRazorpayNative(options);
}

// react-native-razorpay surfaces these numeric codes on rejection.
const CODE_NETWORK_ERROR = 0;
const CODE_INVALID_OPTIONS = 1;
const CODE_PAYMENT_CANCELLED = 2;

/**
 * Turn a Razorpay SDK rejection into something safe to show a customer.
 *
 * On Android `error.description` is often the gateway's raw JSON error object
 * as a *string* — rendering it as-is puts `{"error":{"code":"BAD_REQUEST_ERROR"
 * ,"step":"payment_authentication"...}}` in front of the shopper.
 */
function describeRazorpayError(error: any): string {
  const raw = error?.description;

  let payload: any = null;
  if (raw && typeof raw === 'object') {
    payload = raw;
  } else if (typeof raw === 'string') {
    try {
      payload = JSON.parse(raw);
    } catch {
      // Not JSON — it's already a plain message, handled at the bottom.
    }
  }
  const inner = payload?.error ?? payload;

  if (error?.code === CODE_PAYMENT_CANCELLED || inner?.reason === 'payment_cancelled') {
    return PAYMENT_CANCELLED;
  }
  if (error?.code === CODE_NETWORK_ERROR) {
    return 'Network problem reaching the payment gateway. Check your connection and try again.';
  }
  if (error?.code === CODE_INVALID_OPTIONS) {
    return 'Could not start the payment. Please try again.';
  }

  switch (inner?.step) {
    case 'payment_authentication':
      return 'Your bank or UPI app could not authenticate this payment. No money was deducted — try again or pick another method.';
    case 'payment_initiation':
      return 'Your bank could not start this payment. Please try another method.';
  }

  // A plain-text description is safe to show; a parsed JSON blob never is.
  if (typeof raw === 'string' && !payload) return raw;
  return 'The payment did not go through. No money was deducted — please try again.';
}

async function openRazorpayNative(options: RazorpayOptions): Promise<PaymentResult> {
  try {
    const data = await RazorpayCheckout.open(options);
    return {
      success: true,
      razorpay_payment_id: data.razorpay_payment_id,
      razorpay_order_id: data.razorpay_order_id,
      razorpay_signature: data.razorpay_signature,
    };
  } catch (error: any) {
    // Keep the full gateway payload in the logs; show the shopper plain words.
    console.warn('Razorpay checkout failed:', error?.code, error?.description);
    return { success: false, error: describeRazorpayError(error) };
  } finally {
    // Razorpay's checkout Activity sets its own status bar style and doesn't
    // restore ours on the way out, which leaves the clock and battery icons
    // unreadable against the app's light background.
    setStatusBarStyle('dark', true);
  }
}

async function openRazorpayWeb(options: RazorpayOptions): Promise<PaymentResult> {
  try {
    await loadRazorpayScript();
  } catch {
    return { success: false, error: 'Failed to load Razorpay' };
  }

  return new Promise((resolve) => {
    const launch = () => {
      const rzp = new (window as any).Razorpay({
        key: options.key,
        amount: options.amount,
        currency: options.currency,
        name: options.name,
        description: options.description,
        order_id: options.order_id,
        prefill: options.prefill,
        theme: options.theme,
        handler: (response: any) => {
          resolve({
            success: true,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          });
        },
        modal: {
          ondismiss: () => {
            resolve({ success: false, error: PAYMENT_CANCELLED });
          },
        },
      });
      rzp.open();
    };

    launch();
  });
}

/**
 * Hook to handle the full Razorpay payment flow:
 * 1. Create Razorpay order on backend → get order_id, amount, key
 * 2. Open Razorpay checkout
 * 3. Verify payment on backend
 */
export function useRazorpay() {
  const startPayment = useCallback(
    async (
      orderId: string,
      userPrefill?: { name?: string; email?: string; phone?: string },
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        // Step 1: Create Razorpay order via backend
        const { data: orderRes } = await paymentsApi.createOrder(orderId);
        const paymentData = orderRes.data;

        if (!paymentData || !paymentData.razorpay_order_id) {
          return { success: false, error: 'Failed to initiate payment' };
        }

        // Step 2: Open Razorpay checkout
        const result = await openRazorpayCheckout({
          key: paymentData.key_id || '',
          amount: paymentData.amount,
          currency: paymentData.currency || 'INR',
          name: 'Gmart Fresh',
          description: `Order #${orderId.slice(0, 8)}`,
          order_id: paymentData.razorpay_order_id,
          prefill: {
            name: userPrefill?.name || '',
            email: userPrefill?.email || '',
            contact: userPrefill?.phone || '',
          },
          // Dark brand green, not the old generic #4CAF50: Razorpay tints its
          // header and status bar from this, and a mid-tone green leaves the
          // white system icons barely legible.
          theme: { color: Colors.primary },
        });

        if (!result.success) {
          return { success: false, error: result.error || 'Payment failed' };
        }

        // Step 3: Verify payment on backend
        await paymentsApi.verify({
          razorpay_order_id: result.razorpay_order_id!,
          razorpay_payment_id: result.razorpay_payment_id!,
          razorpay_signature: result.razorpay_signature!,
          order_id: orderId,
        });

        return { success: true };
      } catch (error: any) {
        const msg =
          error.response?.data?.detail ||
          error.message ||
          'Payment failed';
        return { success: false, error: msg };
      }
    },
    [],
  );

  return { startPayment };
}