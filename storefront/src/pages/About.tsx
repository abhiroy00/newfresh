import { Link } from 'react-router-dom'
import { Leaf, Truck, ShieldCheck, Clock, Heart, Users } from 'lucide-react'

const VALUES = [
  { icon: Leaf, title: 'Farm Fresh', sub: 'Sourced daily from trusted farms and local vendors — never stale, never stored for long.' },
  { icon: Truck, title: 'Fast Delivery', sub: 'Quick, reliable delivery to your doorstep, with real-time order tracking.' },
  { icon: ShieldCheck, title: 'Secure & Trusted', sub: 'Safe payments via UPI, cards and Cash on Delivery, with verified riders.' },
  { icon: Clock, title: 'Always On Time', sub: 'We plan every delivery slot carefully so your groceries arrive when you need them.' },
]

export default function About() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      {/* Hero */}
      <div className="relative mb-14 text-center">
        <div className="pointer-events-none absolute -top-10 left-1/4 w-40 h-40 rounded-full bg-accent-mint/20 blur-3xl" />
        <div className="pointer-events-none absolute -top-6 right-1/4 w-48 h-48 rounded-full bg-accent-orange/15 blur-3xl" />
        <div className="relative">
          <span className="inline-block text-xs font-bold text-primary bg-primary-fixed px-3 py-1 rounded-full mb-4">ABOUT GMART</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-on-surface-deep mb-4 tracking-tight">
            Fresh groceries, delivered with care
          </h1>
          <p className="text-sm sm:text-base text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
            Gmart was built on a simple idea — getting fresh fruits, vegetables, and everyday groceries
            shouldn't mean compromising on quality or waiting around. We work directly with farms and
            trusted vendors to bring you produce that's fresh, fairly priced, and delivered fast.
          </p>
        </div>
      </div>

      {/* Values */}
      <div className="mb-14">
        <div className="flex items-center gap-2.5 mb-6">
          <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-primary to-accent-mint" />
          <h2 className="text-xl font-extrabold text-on-surface-deep tracking-tight">What we stand for</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {VALUES.map((v) => (
            <div key={v.title} className="card p-5 flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center shrink-0">
                <v.icon size={20} className="text-primary" />
              </div>
              <div>
                <p className="font-bold text-on-surface-deep mb-1">{v.title}</p>
                <p className="text-sm text-on-surface-variant leading-relaxed">{v.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mission */}
      <div className="card p-6 sm:p-8 mb-14 flex flex-col sm:flex-row gap-5 items-start">
        <div className="w-12 h-12 rounded-2xl bg-primary-fixed flex items-center justify-center shrink-0">
          <Heart size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="font-bold text-lg text-on-surface-deep mb-2">Our Mission</h2>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            To make fresh, quality groceries accessible to every household — without the hassle of
            crowded markets or unreliable delivery. Every order is picked, packed, and checked with
            care, because what reaches your kitchen matters to us as much as it does to you.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center rounded-[1.25rem] shadow-lg p-8 sm:p-10 bg-gradient-to-br from-primary to-primary-container">
        <div className="flex justify-center mb-3">
          <Users size={28} className="text-white/90" />
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-2">Ready to shop fresh?</h2>
        <p className="text-sm text-white/80 mb-6 max-w-md mx-auto">
          Fresh groceries are just a few taps away. Start shopping and taste the difference.
        </p>
        <Link to="/products" className="inline-block bg-white text-primary font-bold text-sm px-6 py-3 rounded-full shadow-lg">
          Start Shopping
        </Link>
      </div>
    </div>
  )
}
