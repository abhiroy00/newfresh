import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, ShoppingCart, User, Menu, X, Package, MapPin, LogOut, LifeBuoy } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'

export default function Header() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

  const itemCount = useCartStore((s) => s.item_count)
  const openDrawer = useCartStore((s) => s.openDrawer)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const openLogin = useAuthStore((s) => s.openLogin)
  const logout = useAuthStore((s) => s.logout)

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    navigate(`/products?search=${encodeURIComponent(query.trim())}`)
    setMobileOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-outline-variant">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 h-16">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src="/logo.png" alt="Gmart" className="w-9 h-9 rounded-xl shadow-sm" />
            <span className="font-extrabold text-lg text-primary hidden sm:block">Gmart</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-on-surface shrink-0">
            <Link to="/products" className="hover:text-primary transition-colors">All Products</Link>
            <Link to="/categories" className="hover:text-primary transition-colors">Categories</Link>
          </nav>

          <form onSubmit={submitSearch} className="hidden sm:flex flex-1 max-w-md relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
            <input
              type="text"
              placeholder="Search fresh produce..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input-field pl-10 py-2 bg-white"
            />
          </form>

          <div className="flex items-center gap-2 ml-auto shrink-0">
            <button
              onClick={openDrawer}
              className="relative w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-low transition-colors"
              aria-label="Cart"
            >
              <ShoppingCart size={20} className="text-on-surface" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-accent-orange text-white text-[10px] font-bold rounded-full w-4.5 h-4.5 min-w-[18px] h-[18px] flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>

            {isAuthenticated ? (
              <div className="relative hidden md:block">
                <button
                  onClick={() => setAccountOpen((v) => !v)}
                  onBlur={() => setTimeout(() => setAccountOpen(false), 150)}
                  className="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold"
                >
                  {(user?.name || user?.phone || 'U').charAt(0).toUpperCase()}
                </button>
                {accountOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-outline-variant py-2 animate-fade-in">
                    <Link to="/account" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface-container-low"><User size={15}/> My Account</Link>
                    <Link to="/orders" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface-container-low"><Package size={15}/> My Orders</Link>
                    <Link to="/addresses" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface-container-low"><MapPin size={15}/> Addresses</Link>
                    <Link to="/support" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface-container-low"><LifeBuoy size={15}/> Support</Link>
                    <button onClick={() => logout()} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-error hover:bg-error-container text-left"><LogOut size={15}/> Logout</button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={openLogin} className="hidden md:inline-flex btn-primary !py-2 !px-4 text-sm">
                Login
              </button>
            )}

            <button
              className="md:hidden w-10 h-10 rounded-full flex items-center justify-center"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-4 flex flex-col gap-3 animate-fade-in">
            <form onSubmit={submitSearch} className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
              <input
                type="text"
                placeholder="Search fresh produce..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="input-field pl-10 bg-white"
              />
            </form>
            <Link to="/products" onClick={() => setMobileOpen(false)} className="font-semibold text-sm py-1">All Products</Link>
            <Link to="/categories" onClick={() => setMobileOpen(false)} className="font-semibold text-sm py-1">Categories</Link>
            {isAuthenticated ? (
              <>
                <Link to="/account" onClick={() => setMobileOpen(false)} className="font-semibold text-sm py-1">My Account</Link>
                <Link to="/orders" onClick={() => setMobileOpen(false)} className="font-semibold text-sm py-1">My Orders</Link>
                <Link to="/addresses" onClick={() => setMobileOpen(false)} className="font-semibold text-sm py-1">Addresses</Link>
                <Link to="/support" onClick={() => setMobileOpen(false)} className="font-semibold text-sm py-1">Support</Link>
                <button onClick={() => { logout(); setMobileOpen(false) }} className="text-left font-semibold text-sm py-1 text-error">Logout</button>
              </>
            ) : (
              <button onClick={() => { openLogin(); setMobileOpen(false) }} className="btn-primary w-full !py-2.5">Login</button>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
