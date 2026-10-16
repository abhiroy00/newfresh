import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import CartDrawer from '@/components/cart/CartDrawer'
import LoginModal from '@/components/auth/LoginModal'
import ErrorBoundary from '@/components/ErrorBoundary'

export default function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Keyed by path so navigating away from a crashed page recovers it, instead of staying stuck until a full reload. */}
        <ErrorBoundary key={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
      <CartDrawer />
      <LoginModal />
    </div>
  )
}
