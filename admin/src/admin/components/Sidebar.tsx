import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingBag, Users, LogOut, Store,
  Boxes, Tag, BarChart3, Settings as SettingsIcon, Image, Bike, Gauge, X,
  ChevronLeft, Sparkles, Wrench, MessageCircle,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import type { ReactNode } from 'react'

const adminLinks: Array<
  | { divider: true; label: string }
  | { divider?: false; to: string; icon: ReactNode; label: string; adminOnly?: boolean }
> = [
  { to: '/', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { divider: true, label: 'Catalogue' },
  { to: '/products', icon: <Package size={18} />, label: 'Products' },
  { to: '/categories', icon: <Tag size={18} />, label: 'Categories' },
  { to: '/carousel', icon: <Image size={18} />, label: 'Carousel' },
  { to: '/inventory', icon: <Boxes size={18} />, label: 'Inventory' },
  { divider: true, label: 'Operations' },
  { to: '/orders', icon: <ShoppingBag size={18} />, label: 'Orders' },
  { to: '/users', icon: <Users size={18} />, label: 'Users', adminOnly: true },
  { to: '/riders', icon: <Bike size={18} />, label: 'Riders', adminOnly: true },
  { to: '/support', icon: <MessageCircle size={18} />, label: 'Support', adminOnly: true },
  { divider: true, label: 'Analytics' },
  { to: '/reports/sales', icon: <BarChart3 size={18} />, label: 'Sales Report', adminOnly: true },
  { to: '/reports/orders', icon: <BarChart3 size={18} />, label: 'Orders Report', adminOnly: true },
  { divider: true, label: 'Configuration' },
  { to: '/settings', icon: <SettingsIcon size={18} />, label: 'Settings', adminOnly: true },
]

const riderLinks = [
  { to: '/rider', icon: <Gauge size={18} />, label: 'Dashboard' },
  { to: '/rider/orders', icon: <ShoppingBag size={18} />, label: 'My Deliveries' },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { logout, user } = useAuthStore()
  const location = useLocation()
  const isAdmin = !!user?.is_admin
  const filteredAdminLinks = adminLinks.filter(
    (l) => l.divider || !('adminOnly' in l) || !l.adminOnly || isAdmin,
  )
  const links = user?.is_rider ? riderLinks : filteredAdminLinks

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 h-screen flex flex-col shrink-0 overflow-hidden
        transition-transform duration-300 ease-out
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
        style={{
          background: 'linear-gradient(180deg, #0a1f14 0%, #0d2b1a 30%, #0f3322 100%)',
        }}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #22a05a, #1a7a44)' }}
            >
              <Store size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-none text-white">Gmart</h2>
              <p className="text-xs text-emerald-400/80 mt-0.5">
                {user?.is_rider ? 'Rider Portal' : 'Admin Panel'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition">
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto min-h-0">
          {links.map((l: any) => (
            l.divider ? (
              <div key={l.label} className="pt-5 mt-4 border-t border-white/10 first:pt-2 first:mt-0 first:border-0">
                <p className="px-3 pb-2 text-[11px] font-semibold text-emerald-400/60 uppercase tracking-wider">{l.label}</p>
              </div>
            ) : (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/' || l.to === '/rider'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-white/60 hover:text-white hover:bg-white/8'
                  }`
                }
              >
                {l.icon} {l.label}
              </NavLink>
            )
          ))}
        </nav>

        {/* User & Logout */}
        <div className="px-3 pb-3 pt-2 space-y-2 border-t border-white/10 shrink-0">
          {user && (
            <div className="px-3 py-2.5 rounded-xl bg-white/8 backdrop-blur-sm border border-white/10">
              <p className="text-[10px] text-emerald-400/60 uppercase tracking-wider font-semibold">Logged in as</p>
              <p className="text-sm font-medium text-white truncate mt-0.5">{user.name || user.email}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-white/50 hover:text-white hover:bg-white/8 rounded-xl transition-all duration-200 w-full"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>
    </>
  )
}