import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import Sidebar from './components/Sidebar'
import { Menu } from 'lucide-react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import AddEditProduct from './pages/AddEditProduct'
import Categories from './pages/Categories'
import Inventory from './pages/Inventory'
import Carousel from './pages/Carousel'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Users from './pages/Users'
import SalesReport from './pages/SalesReport'
import OrdersReport from './pages/OrdersReport'
import ExtendedProducts from './pages/ExtendedProducts'
import Settings from './pages/Settings'
import Riders from './pages/Riders'
import RiderOrders from './pages/RiderOrders'
import RiderDashboard from './pages/RiderDashboard'
import Support from './pages/Support'
import SupportTicketDetail from './pages/SupportTicketDetail'

import Forbidden from './pages/Forbidden'

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'linear-gradient(180deg, #f5faf5 0%, #eff5ee 100%)' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-black">
            <Menu size={22} />
          </button>
          <span className="font-semibold text-gray-800">Gmart</span>
        </div>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

/**
 * AdminOnly — hard gate for every /admin/* page.
 *
 * Runs on every navigation (useLocation forces re-render) and re-reads the
 * session from the auth store, so directly typing /admin/orders, refreshing,
 * or using the back button all go through the same check. Non-admins never
 * see the requested page — they get the dedicated 403 view instead.
 */
function AdminOnly({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuthStore()
  const location = useLocation()

  // Not signed in → login (preserve intended destination for post-login redirect).
  if (!token || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }

  // Rider accounts have their own portal; don't leak admin URLs to them.
  if (user.is_rider && !user.is_admin) {
    return <Navigate to="/rider" replace />
  }

  // Authenticated but not an admin → show the explicit 403 page.
  if (!user.is_admin) {
    return (
      <Navigate
        to="/403"
        replace
        state={{
          message: 'This area is restricted to administrators.',
          from: location.pathname,
        }}
      />
    )
  }

  return <>{children}</>
}

function RiderOnly({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuthStore()
  const location = useLocation()
  if (!token || !user) return <Navigate to="/login" replace />
  if (!user.is_rider) {
    return (
      <Navigate
        to="/403"
        replace
        state={{
          message: 'This area is restricted to delivery riders.',
          from: location.pathname,
        }}
      />
    )
  }
  return <>{children}</>
}

/**
 * AdminLayout — a route-level layout that re-runs the AdminOnly guard for
 * every matched child. Using nested <Route> + <Outlet /> means React Router
 * mounts this component (and re-runs the gate) before ANY child element is
 * rendered — direct URLs, refreshes, back/forward, and in-app links all go
 * through the same check. No child page can render without admin access.
 */
function AdminLayout() {
  return (
    <AdminOnly>
      <Layout>
        <Outlet />
      </Layout>
    </AdminOnly>
  )
}

function RiderLayout() {
  return (
    <RiderOnly>
      <Layout>
        <Outlet />
      </Layout>
    </RiderOnly>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/403" element={<Forbidden />} />

          {/* Rider portal — guarded per child via nested layout */}
          <Route path="/rider" element={<RiderLayout />}>
            <Route index element={<RiderDashboard />} />
            <Route path="orders" element={<RiderOrders />} />
            <Route path="*" element={<Navigate to="/rider" replace />} />
          </Route>

          {/* Admin portal — every child is gated by AdminLayout */}
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="products/new" element={<AddEditProduct />} />
            <Route path="products/:id/edit" element={<AddEditProduct />} />
            <Route path="products/:id/extended" element={<ExtendedProducts />} />
            <Route path="categories" element={<Categories />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="carousel" element={<Carousel />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="users" element={<Users />} />
            <Route path="riders" element={<Riders />} />
            <Route path="support" element={<Support />} />
            <Route path="support/:id" element={<SupportTicketDetail />} />
            <Route path="reports/sales" element={<SalesReport />} />
            <Route path="reports/orders" element={<OrdersReport />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
