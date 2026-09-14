import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from '@/components/layout/Layout'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'

import Home from '@/pages/Home'
import Products from '@/pages/Products'
import Categories from '@/pages/Categories'
import ProductDetail from '@/pages/ProductDetail'
import Cart from '@/pages/Cart'
import Checkout from '@/pages/Checkout'
import OrderSuccess from '@/pages/OrderSuccess'
import Orders from '@/pages/Orders'
import OrderDetail from '@/pages/OrderDetail'
import Account from '@/pages/Account'
import Addresses from '@/pages/Addresses'
import Support from '@/pages/Support'
import Privacy from '@/pages/Privacy'
import Terms from '@/pages/Terms'
import NotFound from '@/pages/NotFound'

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate)
  const fetchCart = useCartStore((s) => s.fetchCart)

  useEffect(() => {
    (async () => {
      await hydrate()
      fetchCart()
    })()
  }, [hydrate, fetchCart])

  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{ style: { fontSize: '14px' } }} />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-success/:id" element={<OrderSuccess />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/account" element={<Account />} />
          <Route path="/addresses" element={<Addresses />} />
          <Route path="/support" element={<Support />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
