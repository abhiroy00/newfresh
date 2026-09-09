import { Link, useLocation } from 'react-router-dom'
import { ShieldAlert, ArrowLeft, LogIn, Home } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export default function Forbidden() {
  const { token, user, logout } = useAuthStore()
  const location = useLocation() as { state?: { message?: string; from?: string } }
  const message =
    location.state?.message ||
    "You don't have permission to access this page."
  const from = location.state?.from

  // Role-aware primary action.
  // - Admins → back to the admin dashboard
  // - Riders → back to the rider dashboard
  // - Signed in but neither → sign-in is the only sensible next step
  // - Signed out → sign in
  const isAdmin = !!user?.is_admin
  const isRider = !!user?.is_rider
  const primary: { to: string; label: string; icon: React.ReactNode } =
    !token || !user
      ? { to: '/login', label: 'Go to login', icon: <LogIn size={16} /> }
      : isAdmin
      ? { to: '/', label: 'Back to admin dashboard', icon: <Home size={16} /> }
      : isRider
      ? { to: '/rider', label: 'Back to rider dashboard', icon: <Home size={16} /> }
      : { to: '/login', label: 'Sign in with an authorized account', icon: <LogIn size={16} /> }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div
            className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-5"
            style={{ background: 'linear-gradient(135deg, #fee2e2, #fecaca)' }}
          >
            <ShieldAlert size={30} className="text-red-600" />
          </div>

          <p className="text-xs font-semibold tracking-widest text-red-600 uppercase">
            Error 403
          </p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Access denied</h1>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">{message}</p>

          {token && user && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-3 py-1">
              Signed in as
              <span className="font-medium text-gray-700">{user.email || user.name}</span>
              <span className="text-gray-300">·</span>
              <span className="font-medium">
                {isAdmin ? 'Admin' : isRider ? 'Rider' : 'Customer'}
              </span>
            </p>
          )}

          {from && (
            <p className="mt-3 text-xs text-gray-400 break-all">
              Attempted path: <span className="font-mono">{from}</span>
            </p>
          )}

          <div className="mt-7 space-y-2">
            <Link
              to={primary.to}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition"
              style={{ background: 'linear-gradient(135deg, #0f4c2a, #1a7a44)' }}
            >
              {primary.icon}
              {primary.label}
            </Link>

            {token && user && (
              <>
                <button
                  type="button"
                  onClick={() => window.history.back()}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition"
                >
                  <ArrowLeft size={16} />
                  Go back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    window.location.href = '/admin/login'
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-800 transition"
                >
                  Sign in with a different account
                </button>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          If you believe this is a mistake, contact your administrator.
        </p>
      </div>
    </div>
  )
}
