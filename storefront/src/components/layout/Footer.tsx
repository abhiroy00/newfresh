import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin } from 'lucide-react'
import { SUPPORT_PHONE, SUPPORT_EMAIL } from '@/lib/constants'

export default function Footer() {
  return (
    <footer className="bg-white border-t border-outline-variant mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <img src="/logo.png" alt="Gmart" className="w-9 h-9 rounded-xl" />
            <span className="font-extrabold text-lg text-primary">Gmart</span>
          </div>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Fresh fruits, vegetables & groceries delivered to your door.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-sm text-on-surface-deep mb-3">Shop</h4>
          <ul className="flex flex-col gap-2 text-sm text-on-surface-variant">
            <li><Link to="/products" className="hover:text-primary">All Products</Link></li>
            <li><Link to="/categories" className="hover:text-primary">Categories</Link></li>
            <li><Link to="/orders" className="hover:text-primary">Track Order</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-sm text-on-surface-deep mb-3">Support</h4>
          <ul className="flex flex-col gap-2 text-sm text-on-surface-variant">
            <li><Link to="/support" className="hover:text-primary">Help Center</Link></li>
            <li><Link to="/privacy" className="hover:text-primary">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-primary">Terms & Conditions</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-sm text-on-surface-deep mb-3">Contact</h4>
          <ul className="flex flex-col gap-2.5 text-sm text-on-surface-variant">
            <li className="flex items-center gap-2"><Phone size={14} /> <a href={`tel:${SUPPORT_PHONE}`} className="hover:text-primary">{SUPPORT_PHONE}</a></li>
            <li className="flex items-center gap-2"><Mail size={14} /> <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-primary">{SUPPORT_EMAIL}</a></li>
            <li className="flex items-center gap-2"><MapPin size={14} /> Serving your city, India</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-outline-variant py-4 text-center text-xs text-on-surface-variant">
        © {new Date().getFullYear()} Gmart. All rights reserved.
      </div>
    </footer>
  )
}
