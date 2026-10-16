import { useCallback } from 'react'
import { paymentsApi } from '@/api/endpoints'

export const PAYMENT_CANCELLED = 'Payment cancelled'

const SCRIPT_ID = 'razorpay-checkout-js'
const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'
let scriptPromise: Promise<void> | null = null

function loadRazorpayScript(): Promise<void> {
  if ((window as any).Razorpay) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      script.remove()
      reject(new Error('Failed to load Razorpay'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

export function preloadRazorpay(): void {
  loadRazorpayScript().catch(() => {})
}

interface PaymentResult {
  success: boolean
  razorpay_payment_id?: string
  razorpay_order_id?: string
  razorpay_signature?: string
  error?: string
}

function openRazorpayCheckout(options: {
  key: string; amount: number; currency: string; name: string
  description: string; order_id: string
  prefill: { email?: string; contact?: string; name?: string }
}): Promise<PaymentResult> {
  return new Promise((resolve) => {
    const rzp = new (window as any).Razorpay({
      ...options,
      theme: { color: '#005322' },
      handler: (response: any) => {
        resolve({
          success: true,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature,
        })
      },
      modal: {
        ondismiss: () => resolve({ success: false, error: PAYMENT_CANCELLED }),
      },
    })
    rzp.on('payment.failed', (response: any) => {
      resolve({ success: false, error: response?.error?.description || 'Payment failed. Please try again.' })
      rzp.close()
    })
    rzp.open()
  })
}

export function useRazorpay() {
  const startPayment = useCallback(
    async (orderId: string, userPrefill?: { name?: string; email?: string; phone?: string }): Promise<{ success: boolean; error?: string }> => {
      try {
        const { data: orderRes } = await paymentsApi.createOrder(orderId)
        const paymentData = orderRes.data
        if (!paymentData?.razorpay_order_id) {
          return { success: false, error: 'Failed to initiate payment' }
        }

        await loadRazorpayScript()

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
        })

        if (!result.success) {
          return { success: false, error: result.error || 'Payment failed' }
        }

        await paymentsApi.verify({
          razorpay_order_id: result.razorpay_order_id!,
          razorpay_payment_id: result.razorpay_payment_id!,
          razorpay_signature: result.razorpay_signature!,
          order_id: orderId,
        })

        return { success: true }
      } catch (error: any) {
        const msg = error?.response?.data?.detail || error?.message || 'Payment failed'
        return { success: false, error: typeof msg === 'string' ? msg : 'Payment failed' }
      }
    },
    []
  )

  return { startPayment }
}
