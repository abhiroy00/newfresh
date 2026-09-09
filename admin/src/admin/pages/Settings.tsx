import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useState, useEffect } from 'react'
import {
  Save, Settings as SettingsIcon, Smartphone, CreditCard, Percent, Truck,
  Phone, Mail, MessageCircle, Store, Eye, EyeOff, IndianRupee, Plus, X,
} from 'lucide-react'

type TabId = 'app' | 'payment' | 'tax' | 'delivery'

const TABS: { id: TabId; label: string; icon: any; hint: string }[] = [
  { id: 'app', label: 'App Config', icon: Smartphone, hint: 'Brand & support info' },
  { id: 'payment', label: 'Payment Gateway', icon: CreditCard, hint: 'Razorpay & methods' },
  { id: 'tax', label: 'Tax Configuration', icon: Percent, hint: 'GST by category' },
  { id: 'delivery', label: 'Delivery', icon: Truck, hint: 'Fees & minimums' },
]

function Field({ label, icon, children, hint }: { label: string; icon?: any; children: React.ReactNode; hint?: string }) {
  const Icon = icon
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
        {Icon ? <Icon size={13} className="text-gray-400" /> : null}
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function SaveBar({ onSave, isSaving }: { onSave: () => void; isSaving: boolean }) {
  return (
    <div className="flex justify-end pt-2">
      <button
        onClick={onSave}
        disabled={isSaving}
        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow hover:shadow-md disabled:opacity-50 transition"
      >
        <Save size={16} /> {isSaving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  )
}

const input =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition'

export default function Settings() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabId>('app')

  const [appName, setAppName] = useState('')
  const [supportPhone, setSupportPhone] = useState('')
  const [supportWhatsapp, setSupportWhatsapp] = useState('')
  const [supportEmail, setSupportEmail] = useState('')
  const [appStoreLink, setAppStoreLink] = useState('')
  const [playStoreLink, setPlayStoreLink] = useState('')

  const [razorpayKeyId, setRazorpayKeyId] = useState('')
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('')
  const [showKeyId, setShowKeyId] = useState(false)
  const [showKeySecret, setShowKeySecret] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<Record<string, boolean>>({ upi: true, card: true, netbanking: true, cod: false })

  const [gstConfig, setGstConfig] = useState<Record<string, number>>({})
  const [newCategoryName, setNewCategoryName] = useState('')

  const [minOrderValue, setMinOrderValue] = useState(199)
  const [freeDeliveryAbove, setFreeDeliveryAbove] = useState(499)
  const [baseDeliveryFee, setBaseDeliveryFee] = useState(49)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/admin/settings').then(r => r.data.data),
  })

  useEffect(() => {
    if (settings) {
      const d = settings as any
      setAppName(d.app_name || '')
      setSupportPhone(d.support_phone || '')
      setSupportWhatsapp(d.support_whatsapp || '')
      setSupportEmail(d.support_email || '')
      setAppStoreLink(d.app_store_link || '')
      setPlayStoreLink(d.play_store_link || '')
      setRazorpayKeyId(d.razorpay_key_id || '')
      setRazorpayKeySecret(d.razorpay_key_secret || '')
      setPaymentMethods(d.payment_methods_enabled || { upi: true, card: true, netbanking: true, cod: false })
      setGstConfig(d.gst_config || {})
      setMinOrderValue(d.min_order_value || 199)
      setFreeDeliveryAbove(d.free_delivery_above || 499)
      setBaseDeliveryFee(d.base_delivery_fee || 49)
    }
  }, [settings])

  const { mutate: updateAppConfig, isPending: isSavingApp } = useMutation({
    mutationFn: () => api.patch('/admin/settings/app-config', {
      app_name: appName, support_phone: supportPhone, support_whatsapp: supportWhatsapp,
      support_email: supportEmail, app_store_link: appStoreLink, play_store_link: playStoreLink,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); toast.success('App configuration updated!') },
    onError: () => toast.error('Failed to update'),
  })

  const { mutate: updatePaymentConfig, isPending: isSavingPayment } = useMutation({
    mutationFn: () => api.patch('/admin/settings/payment-gateway', {
      razorpay_key_id: razorpayKeyId, razorpay_key_secret: razorpayKeySecret, payment_methods_enabled: paymentMethods,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); toast.success('Payment configuration updated!') },
    onError: () => toast.error('Failed to update'),
  })

  const { mutate: updateTaxConfig, isPending: isSavingTax } = useMutation({
    mutationFn: () => api.patch('/admin/settings/tax-config', { gst_config: gstConfig }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); toast.success('Tax configuration updated!') },
    onError: () => toast.error('Failed to update'),
  })

  const { mutate: updateDeliveryConfig, isPending: isSavingDelivery } = useMutation({
    mutationFn: () => api.patch('/admin/settings/delivery-config', {
      min_order_value: minOrderValue, free_delivery_above: freeDeliveryAbove, base_delivery_fee: baseDeliveryFee,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); toast.success('Delivery configuration updated!') },
    onError: () => toast.error('Failed to update'),
  })

  if (isLoading) return <div className="p-6 text-gray-400">Loading settings...</div>

  const activeMeta = TABS.find(t => t.id === activeTab)!

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-lg">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
            <SettingsIcon size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Platform Settings</h1>
            <p className="text-sm text-white/60">Configure your app, payments, tax and delivery</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar tabs */}
        <nav className="space-y-1">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${
                  active ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                  <Icon size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.label}</p>
                  <p className="text-xs text-gray-400">{t.hint}</p>
                </div>
              </button>
            )
          })}
        </nav>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow p-6 space-y-5">
            <div className="flex items-center gap-2 pb-4 border-b">
              <activeMeta.icon size={18} className="text-blue-600" />
              <h2 className="font-semibold text-lg">{activeMeta.label}</h2>
            </div>

            {activeTab === 'app' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Field label="App Name" icon={Store}>
                    <input value={appName} onChange={e => setAppName(e.target.value)} className={input} placeholder="e.g. FreshMart" />
                  </Field>
                </div>
                <Field label="Support Phone" icon={Phone}>
                  <input type="tel" value={supportPhone} onChange={e => setSupportPhone(e.target.value)} className={input} placeholder="+91 98765 43210" />
                </Field>
                <Field label="Support WhatsApp" icon={MessageCircle}>
                  <input type="tel" value={supportWhatsapp} onChange={e => setSupportWhatsapp(e.target.value)} className={input} placeholder="+91 98765 43210" />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Support Email" icon={Mail}>
                    <input type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} className={input} placeholder="support@example.com" />
                  </Field>
                </div>
                <Field label="App Store Link">
                  <input type="url" value={appStoreLink} onChange={e => setAppStoreLink(e.target.value)} className={input} placeholder="https://apps.apple.com/…" />
                </Field>
                <Field label="Play Store Link">
                  <input type="url" value={playStoreLink} onChange={e => setPlayStoreLink(e.target.value)} className={input} placeholder="https://play.google.com/…" />
                </Field>
                <div className="md:col-span-2">
                  <SaveBar onSave={updateAppConfig} isSaving={isSavingApp} />
                </div>
              </div>
            )}

            {activeTab === 'payment' && (
              <div className="space-y-5">
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                  Keep API keys private. Never share your Razorpay secret in public channels.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Razorpay Key ID">
                    <div className="relative">
                      <input type={showKeyId ? 'text' : 'password'} value={razorpayKeyId} onChange={e => setRazorpayKeyId(e.target.value)} className={input + ' pr-10 font-mono'} placeholder="rzp_live_…" />
                      <button type="button" onClick={() => setShowKeyId(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-700">
                        {showKeyId ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </Field>
                  <Field label="Razorpay Key Secret">
                    <div className="relative">
                      <input type={showKeySecret ? 'text' : 'password'} value={razorpayKeySecret} onChange={e => setRazorpayKeySecret(e.target.value)} className={input + ' pr-10 font-mono'} placeholder="••••••••" />
                      <button type="button" onClick={() => setShowKeySecret(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-700">
                        {showKeySecret ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </Field>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Enabled Payment Methods</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(paymentMethods).map(([method, enabled]) => (
                      <label key={method} className={`flex items-center justify-between gap-2 px-4 py-3 rounded-xl border cursor-pointer transition ${
                        enabled ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}>
                        <span className="text-sm font-semibold capitalize text-gray-700">{method}</span>
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => setPaymentMethods({ ...paymentMethods, [method]: e.target.checked })}
                          className="w-4 h-4 rounded accent-blue-600"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <SaveBar onSave={updatePaymentConfig} isSaving={isSavingPayment} />
              </div>
            )}

            {activeTab === 'tax' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Set GST rate per category. Add new categories as needed.</p>
                <div className="space-y-2">
                  {Object.entries(gstConfig).length === 0 && (
                    <p className="text-sm text-gray-400 border border-dashed rounded-xl px-4 py-6 text-center">
                      No categories yet. Add one below.
                    </p>
                  )}
                  {Object.entries(gstConfig).map(([category, rate]) => (
                    <div key={category} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2">
                      <label className="flex-1 text-sm font-medium text-gray-700 capitalize pl-2">{category}</label>
                      <div className="relative">
                        <input
                          type="number" min={0} max={100} step={0.5}
                          value={rate}
                          onChange={e => setGstConfig({ ...gstConfig, [category]: parseFloat(e.target.value) })}
                          className={input + ' w-28 pr-7'}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                      </div>
                      <button
                        onClick={() => {
                          const next = { ...gstConfig }; delete next[category]; setGstConfig(next)
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <input
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    placeholder="Category name (e.g. fruits)"
                    className={input}
                  />
                  <button
                    onClick={() => {
                      const key = newCategoryName.trim().toLowerCase()
                      if (!key) return
                      if (gstConfig[key] !== undefined) { toast.error('Already exists'); return }
                      setGstConfig({ ...gstConfig, [key]: 5 })
                      setNewCategoryName('')
                    }}
                    className="btn-primary gap-1"
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>

                <SaveBar onSave={updateTaxConfig} isSaving={isSavingTax} />
              </div>
            )}

            {activeTab === 'delivery' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Minimum Order" icon={IndianRupee} hint="Orders below this amount are blocked">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                      <input type="number" min={0} value={minOrderValue} onChange={e => setMinOrderValue(Number(e.target.value))} className={input + ' pl-7'} />
                    </div>
                  </Field>
                  <Field label="Free Delivery Above" icon={IndianRupee} hint="Waive delivery fee above this cart total">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                      <input type="number" min={0} value={freeDeliveryAbove} onChange={e => setFreeDeliveryAbove(Number(e.target.value))} className={input + ' pl-7'} />
                    </div>
                  </Field>
                  <Field label="Base Delivery Fee" icon={IndianRupee} hint="Charged when threshold not met">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                      <input type="number" min={0} value={baseDeliveryFee} onChange={e => setBaseDeliveryFee(Number(e.target.value))} className={input + ' pl-7'} />
                    </div>
                  </Field>
                </div>

                <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-100 p-4 text-sm text-gray-700">
                  <p className="font-semibold text-gray-900 mb-1">Preview</p>
                  Orders under <b>₹{minOrderValue}</b> are blocked. Orders over <b>₹{freeDeliveryAbove}</b> get free delivery.
                  Otherwise, a <b>₹{baseDeliveryFee}</b> delivery fee is added.
                </div>

                <SaveBar onSave={updateDeliveryConfig} isSaving={isSavingDelivery} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
