import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { Eye, EyeOff, ShoppingBag, TrendingUp, Package, Users } from 'lucide-react'

interface LoginForm {
  email: string
  password: string
}

const stats = [
  { icon: TrendingUp, label: 'Revenue tracked', value: '₹2.4L+' },
  { icon: Package, label: 'Orders managed', value: '1,200+' },
  { icon: Users, label: 'Customers served', value: '800+' },
]

export default function Login() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>()
  const { login } = useAuthStore()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await api.post('/auth/login', data)
      const user = res.data.user
      if (!user?.is_admin && !user?.is_rider) {
        toast.error('This account is not authorized to access the admin panel')
        return
      }
      login(res.data.access_token, user)
      toast.success('Welcome back!')
      navigate(user.is_rider ? '/rider' : '/')
    } catch {
      toast.error('Invalid credentials')
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left Panel ─────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'linear-gradient(135deg, #0f4c2a 0%, #1a7a44 50%, #22a05a 100%)' }}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-white -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-white translate-x-1/3 translate-y-1/3" />
          <div className="absolute top-1/2 right-0 w-48 h-48 rounded-full bg-white translate-x-1/2" />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <ShoppingBag size={22} className="text-green-700" />
          </div>
          <div>
            <p className="text-white font-bold text-xl leading-none">Gmart</p>
            <p className="text-green-200 text-xs">Admin Dashboard</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight">
              Manage your<br />store with ease
            </h2>
            <p className="mt-3 text-green-100 text-base leading-relaxed max-w-sm">
              Everything you need to run your grocery business — orders, inventory, analytics, and more.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <Icon size={18} className="text-green-200 mb-2" />
                <p className="text-white font-bold text-lg leading-none">{value}</p>
                <p className="text-green-200 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-green-300 text-xs">
          © 2026 Gmart. All rights reserved.
        </p>
      </div>

      {/* ── Right Panel ────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-green-700 rounded-xl flex items-center justify-center">
              <ShoppingBag size={20} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-xl leading-none text-gray-900">Gmart</p>
              <p className="text-gray-500 text-xs">Admin Dashboard</p>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
              <p className="text-gray-500 text-sm mt-1">Sign in to your admin account</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Email address</label>
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' }
                  })}
                  type="email"
                  placeholder="admin@gmart.com"
                  className={`w-full border rounded-xl px-4 py-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder:text-gray-400 ${
                    errors.email ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'
                  }`}
                />
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <input
                    {...register('password', { required: 'Password is required' })}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={`w-full border rounded-xl px-4 py-3 pr-11 text-sm transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder:text-gray-400 ${
                      errors.password ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: isSubmitting ? '#6b7280' : 'linear-gradient(135deg, #0f4c2a, #1a7a44)' }}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Signing in…
                  </span>
                ) : 'Sign In'}
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-6">
              Protected area · Unauthorized access is prohibited
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
