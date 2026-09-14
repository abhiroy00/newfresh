import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin, Facebook, Instagram, Twitter, ShieldCheck, Truck, Leaf } from 'lucide-react'
import { SUPPORT_PHONE, SUPPORT_EMAIL } from '@/lib/constants'

export default function Footer() {
  return (
    <footer className="mt-16 bg-on-surface-deep text-white">
      {/* Trust strip */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Truck, title: 'Fast Delivery', sub: 'Fresh to your door, on time' },
            { icon: Leaf, title: 'Farm Fresh', sub: 'Sourced daily, never stale' },
            { icon: ShieldCheck, title: 'Secure Payments', sub: 'UPI, Cards & Cash on Delivery' },
          ].map((t) => (
            <div key={t.title} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <t.icon size={18} className="text-accent-mint" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{t.title}</p>
                <p className="text-xs text-white/60">{t.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <img src="/logo.png" alt="Gmart" className="w-10 h-10 rounded-xl" />
            <span className="font-extrabold text-xl text-white">Gmart</span>
          </div>
          <p className="text-sm text-white/60 leading-relaxed max-w-xs mb-5">
            Fresh fruits, vegetables & groceries delivered to your door — quality you can taste, prices you'll love.
          </p>
          <div className="flex items-center gap-2">
            {[Facebook, Instagram, Twitter].map((Icon, i) => (
              <a
                key={i}
                href="#"
                onClick={(e) => e.preventDefault()}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-primary-fixed hover:text-primary text-white flex items-center justify-center transition-colors"
              >
                <Icon size={15} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-bold text-sm text-white mb-4 tracking-wide uppercase">Shop</h4>
          <ul className="flex flex-col gap-2.5 text-sm text-white/60">
            <li><Link to="/products" className="hover:text-accent-mint transition-colors">All Products</Link></li>
            <li><Link to="/categories" className="hover:text-accent-mint transition-colors">Categories</Link></li>
            <li><Link to="/orders" className="hover:text-accent-mint transition-colors">Track Order</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-sm text-white mb-4 tracking-wide uppercase">Support</h4>
          <ul className="flex flex-col gap-2.5 text-sm text-white/60">
            <li><Link to="/support" className="hover:text-accent-mint transition-colors">Help Center</Link></li>
            <li><Link to="/privacy" className="hover:text-accent-mint transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-accent-mint transition-colors">Terms & Conditions</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-sm text-white mb-4 tracking-wide uppercase">Contact</h4>
          <ul className="flex flex-col gap-3 text-sm text-white/60">
            <li className="flex items-center gap-2.5">
              <Phone size={14} className="text-accent-mint shrink-0" />
              <a href={`tel:${SUPPORT_PHONE}`} className="hover:text-white transition-colors">{SUPPORT_PHONE}</a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail size={14} className="text-accent-mint shrink-0" />
              <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-white transition-colors break-all">{SUPPORT_EMAIL}</a>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin size={14} className="text-accent-mint shrink-0 mt-0.5" />
              <span>Serving your city, India</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/50">© {new Date().getFullYear()} Gmart. All rights reserved.</p>
          <div className="flex items-center gap-2">
            {['UPI', 'Cards', 'COD'].map((m) => (
              <span key={m} className="text-[10px] font-bold text-white/70 border border-white/15 rounded-md px-2 py-1">{m}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
