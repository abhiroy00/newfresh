import { useState, useEffect, useRef } from 'react'
import { X, Phone, ShieldCheck, ArrowLeft, Mail, Lock, User as UserIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { useWishlistStore } from '@/store/wishlistStore'

type Method = 'phone' | 'email'
type EmailMode = 'login' | 'signup'

export default function LoginModal() {
  const open = useAuthStore((s) => s.loginModalOpen)
  const closeLogin = useAuthStore((s) => s.closeLogin)
  const sendOtp = useAuthStore((s) => s.sendOtp)
  const verifyOtp = useAuthStore((s) => s.verifyOtp)
  const loginEmail = useAuthStore((s) => s.loginEmail)
  const signupEmail = useAuthStore((s) => s.signupEmail)
  const fetchCart = useCartStore((s) => s.fetchCart)
  const fetchWishlist = useWishlistStore((s) => s.fetchWishlist)

  const [method, setMethod] = useState<Method>('phone')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')

  const [emailMode, setEmailMode] = useState<EmailMode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setMethod('phone')
      setStep('phone')
      setPhone('')
      setOtp('')
      setEmailMode('login')
      setName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  if (!open) return null

  const onSuccess = () => {
    toast.success(emailMode === 'signup' ? 'Welcome to Gmart!' : 'Welcome back!')
    fetchCart()
    fetchWishlist()
  }

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
      onSuccess()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Invalid OTP. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.error('Enter your email and password')
      return
    }
    setLoading(true)
    try {
      await loginEmail(email.trim(), password)
      onSuccess()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Enter your email')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await signupEmail(name.trim() || undefined, email.trim(), password)
      onSuccess()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Could not create account. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const title =
    method === 'phone'
      ? step === 'phone' ? 'Login to Gmart' : 'Verify your number'
      : emailMode === 'login' ? 'Login to Gmart' : 'Create your account'

  const subtitle =
    method === 'phone'
      ? step === 'phone' ? 'Fresh groceries, delivered fast. Login to continue.' : `We sent a 6-digit code to +91 ${phone}`
      : emailMode === 'login' ? 'Fresh groceries, delivered fast. Login to continue.' : 'Just a few details to get started.'

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

        <div className="flex flex-col items-center text-center gap-2 mb-5">
          <img src="/logo.png" alt="Gmart" className="w-14 h-14 rounded-2xl shadow" />
          <h2 className="text-xl font-extrabold text-on-surface-deep mt-2">{title}</h2>
          <p className="text-sm text-on-surface-variant">{subtitle}</p>
        </div>

        {!(method === 'phone' && step === 'otp') && (
          <div className="flex bg-surface-container-low rounded-full p-1 mb-5">
            <button
              type="button"
              onClick={() => setMethod('phone')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-semibold transition-colors ${method === 'phone' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant'}`}
            >
              <Phone size={14} /> Phone
            </button>
            <button
              type="button"
              onClick={() => setMethod('email')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-semibold transition-colors ${method === 'email' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant'}`}
            >
              <Mail size={14} /> Email
            </button>
          </div>
        )}

        {method === 'phone' ? (
          step === 'phone' ? (
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
          )
        ) : emailMode === 'login' ? (
          <form onSubmit={handleEmailLogin} className="flex flex-col gap-3.5">
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
              <input
                ref={inputRef}
                type="email"
                placeholder="you@example.com"
                className="input-field pl-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
              <input
                type="password"
                placeholder="Password"
                className="input-field pl-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary w-full mt-1" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
            <button
              type="button"
              onClick={() => { setEmailMode('signup'); setPassword(''); setConfirmPassword('') }}
              className="text-sm font-semibold text-primary"
            >
              New here? Create account
            </button>
          </form>
        ) : (
          <form onSubmit={handleEmailSignup} className="flex flex-col gap-3.5">
            <div className="relative">
              <UserIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
              <input
                type="text"
                placeholder="Your name (optional)"
                className="input-field pl-11"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
              <input
                type="email"
                placeholder="you@example.com"
                className="input-field pl-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
              <input
                type="password"
                placeholder="Password (min. 8 characters)"
                className="input-field pl-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
              <input
                type="password"
                placeholder="Confirm password"
                className="input-field pl-11"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary w-full mt-1" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
            <button
              type="button"
              onClick={() => { setEmailMode('login'); setPassword(''); setConfirmPassword('') }}
              className="text-sm font-semibold text-primary"
            >
              Already have an account? Login
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
