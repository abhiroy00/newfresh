import { useState, useEffect } from 'react'
import { Home, Briefcase, MapPin, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { usersApi } from '@/api/endpoints'
import { useAuthStore } from '@/store/authStore'
import type { Address } from '@/types'

const LABELS = [
  { key: 'Home', icon: Home },
  { key: 'Work', icon: Briefcase },
  { key: 'Other', icon: MapPin },
]

const emptyForm = {
  label: 'Home', full_name: '', phone: '', line1: '', line2: '',
  city: '', state: '', pincode: '', landmark: '',
}

export default function AddressForm({
  editingAddress,
  makeDefault,
  onSaved,
  onCancel,
}: {
  editingAddress?: Address | null
  makeDefault?: boolean
  onSaved: (address: Address) => void
  onCancel?: () => void
}) {
  const user = useAuthStore((s) => s.user)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editingAddress) {
      setForm({
        label: editingAddress.label || 'Home',
        full_name: editingAddress.full_name || '',
        phone: (editingAddress.phone || '').replace(/\D/g, '').slice(-10),
        line1: editingAddress.line1 || '',
        line2: editingAddress.line2 || '',
        city: editingAddress.city || '',
        state: editingAddress.state || '',
        pincode: editingAddress.pincode || '',
        landmark: editingAddress.landmark || '',
      })
    } else {
      setForm({
        ...emptyForm,
        full_name: user?.name || '',
        phone: (user?.phone || '').replace(/\D/g, '').slice(-10),
      })
    }
  }, [editingAddress, user])

  const set = (key: keyof typeof emptyForm, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const phoneValid = /^\d{10}$/.test(form.phone)
  const pincodeValid = /^\d{6}$/.test(form.pincode)
  const canSave =
    form.full_name.trim().length >= 2 && phoneValid && form.line1.trim().length > 0 &&
    form.city.trim().length > 0 && form.state.trim().length > 0 && pincodeValid && !saving

  const handleSave = async () => {
    if (!canSave) {
      toast.error('Please fill in all required fields correctly')
      return
    }
    setSaving(true)
    try {
      const payload = {
        label: form.label,
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        line1: form.line1.trim(),
        line2: form.line2.trim() || undefined,
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        landmark: form.landmark.trim() || undefined,
      }
      const { data } = editingAddress
        ? await usersApi.updateAddress(editingAddress.id, payload)
        : await usersApi.createAddress({ ...payload, is_default: makeDefault })
      toast.success(editingAddress ? 'Address updated' : 'Address saved')
      onSaved(data.data)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Could not save address')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-bold text-on-surface-variant mb-2">Save as</p>
        <div className="flex gap-2">
          {LABELS.map(({ key, icon: Icon }) => {
            const active = form.label === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => set('label', key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold border ${active ? 'bg-primary text-white border-primary' : 'bg-white text-on-surface-variant border-outline-variant'}`}
              >
                <Icon size={13} /> {key}
              </button>
            )
          })}
        </div>
      </div>

      <Field label="Full Name" value={form.full_name} onChange={(v) => set('full_name', v)} placeholder="Recipient name" />
      <Field label="Phone" value={form.phone} onChange={(v) => set('phone', v.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile" />
      <Field label="Flat / House / Building" value={form.line1} onChange={(v) => set('line1', v)} placeholder="e.g. 12B, Green Apartments" />
      <Field label="Area / Street (optional)" value={form.line2} onChange={(v) => set('line2', v)} placeholder="Street, locality" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="City" value={form.city} onChange={(v) => set('city', v)} placeholder="City" />
        <Field label="State" value={form.state} onChange={(v) => set('state', v)} placeholder="State" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Pincode" value={form.pincode} onChange={(v) => set('pincode', v.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit" />
        <Field label="Landmark (optional)" value={form.landmark} onChange={(v) => set('landmark', v)} placeholder="Nearby landmark" />
      </div>

      <div className="flex gap-3 mt-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-outline flex-1">Cancel</button>
        )}
        <button type="button" onClick={handleSave} disabled={!canSave} className="btn-primary flex-1">
          {saving ? 'Saving...' : <><Check size={16} /> {editingAddress ? 'Update Address' : 'Save Address'}</>}
        </button>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const id = `address-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-on-surface-variant mb-1.5">{label}</label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field text-sm"
      />
    </div>
  )
}
