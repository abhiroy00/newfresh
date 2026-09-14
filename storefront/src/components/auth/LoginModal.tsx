import { useState, useEffect, useRef } from 'react'
import { X, Phone, ShieldCheck, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'

export default function LoginModal() {
  const open = useAuthStore((s) => s.loginModalOpen)
  const closeLogin = useAuthStore((s) => s.closeLogin)
  const sendOtp = useAuthStore((s) => s.sendOtp)
  const verifyOtp = useAuthStore((s) => s.verifyOtp)
  const fetchCart = useCartStore((s) => s.fetchCart)

  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setStep('phone')
      setPhone('')
      setOtp('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  if (!open) return null

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const digits = phone.replace(/\D/g, '')
    if (digits.length !== 10) {
      toast.error('Enter a valid 10-digit mobile number')
      return
    }
    setLoading(true)
    try {
      await sendOtp(`+91${digits}`)
      setStep('otp')
      setTimeout(() => inputRef.current?.focus(), 50)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Could not send OTP. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    const digits = phone.replace(/\D/g, '')
    if (otp.length !== 6) {
      toast.error('Enter the 6-digit code')
      return
    }
    setLoading(true)
    try {
      await verifyOtp(`+91${digits}`, otp)
      toast.success('Welcome to Gmart!')
      fetchCart()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Invalid OTP. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in" onClick={closeLogin}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 relative animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closeLogin}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="flex flex-col items-center text-center gap-2 mb-6">
          <img src="/logo.png" alt="Gmart" className="w-14 h-14 rounded-2xl shadow" />
          <h2 className="text-xl font-extrabold text-on-surface-deep mt-2">
            {step === 'phone' ? 'Login to Gmart' : 'Verify your number'}
          </h2>
          <p className="text-sm text-on-surface-variant">
            {step === 'phone'
              ? 'Fresh groceries, delivered fast. Login to continue.'
              : `We sent a 6-digit code to +91 ${phone}`}
          </p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
            <div className="relative">
              <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
              <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant">+91</span>
              <input
                ref={inputRef}
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="98765 43210"
                className="input-field pl-16"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <div className="relative">
              <ShieldCheck size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                className="input-field pl-11 tracking-[0.3em] text-center font-bold"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="flex items-center justify-center gap-1 text-sm font-semibold text-primary"
            >
              <ArrowLeft size={14} /> Change number
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
