import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react'
import { SUPPORT_PHONE, SUPPORT_EMAIL } from '@/lib/constants'

const CHANNELS = [
  {
    icon: Phone,
    title: 'Call Us',
    sub: 'Speak to our support team directly',
    action: { label: SUPPORT_PHONE, href: `tel:${SUPPORT_PHONE}` },
  },
  {
    icon: Mail,
    title: 'Email Us',
    sub: "We'll get back to you within 24 hours",
    action: { label: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
  },
]

export default function Contact() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface-deep mb-2 text-center">Contact Us</h1>
      <p className="text-sm text-on-surface-variant text-center max-w-lg mx-auto mb-10">
        Have a question about an order, a product, or anything else? Reach out — we're happy to help.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {CHANNELS.map((c) => (
          <div key={c.title} className="card p-5 flex flex-col items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-surface-container-low flex items-center justify-center">
              <c.icon size={19} className="text-primary" />
            </div>
            <div>
              <p className="font-bold text-on-surface-deep">{c.title}</p>
              <p className="text-xs text-on-surface-variant mb-2">{c.sub}</p>
              <a href={c.action.href} className="text-sm font-semibold text-primary">{c.action.label}</a>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5 flex items-start gap-4 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-surface-container-low flex items-center justify-center shrink-0">
          <MessageCircle size={19} className="text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-on-surface-deep mb-1">Chat with Support</p>
          <p className="text-sm text-on-surface-variant mb-3">
            Already a customer? Log in to chat with us directly about an order or account issue.
          </p>
          <Link to="/support" className="btn-outline !py-2 !px-4 text-sm inline-flex">Go to Help Center</Link>
        </div>
      </div>

      <div className="card p-5 flex items-start gap-3">
        <MapPin size={18} className="text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-sm text-on-surface-deep mb-0.5">Service Area</p>
          <p className="text-sm text-on-surface-variant">Serving your city, India</p>
        </div>
      </div>
    </div>
  )
}
