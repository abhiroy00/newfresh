import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { User, MapPin, Package, LifeBuoy, LogOut, Save, Heart, Lock } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { usersApi } from '@/api/endpoints'

export default function Account() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const openLogin = useAuthStore((s) => s.openLogin)
  const setUser = useAuthStore((s) => s.setUser)
  const logout = useAuthStore((s) => s.logout)

  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [saving, setSaving] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [settingPassword, setSettingPassword] = useState(false)

  useEffect(() => {
    setName(user?.name || '')
    setEmail(user?.email || '')
  }, [user])

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="font-bold text-lg text-on-surface-deep mb-4">Login to view your account</p>
        <button onClick={openLogin} className="btn-primary">Login</button>
      </div>
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data } = await usersApi.updateMe({ name: name.trim() || undefined, email: email.trim() || undefined })
      setUser(data.data)
      toast.success('Profile updated')
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Could not update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleSetPassword = async () => {
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setSettingPassword(true)
    try {
      const { data } = await usersApi.setPassword(newPassword)
      setUser(data.data)
      setNewPassword('')
      setConfirmPassword('')
      toast.success(user?.has_password ? 'Password updated' : 'Password set — you can now also log in with email')
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Could not set password')
    } finally {
      setSettingPassword(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-extrabold text-on-surface-deep mb-6">My Account</h1>

      <div className="card p-5 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-14 h-14 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-extrabold text-xl">
            {user?.name?.trim() ? user.name.trim().charAt(0).toUpperCase() : <User size={24} />}
          </div>
          <div>
            <p className="font-bold text-on-surface-deep">{user?.name || 'Add your name'}</p>
            <p className="text-sm text-on-surface-variant">{user?.phone}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="account-name" className="block text-xs font-bold text-on-surface-variant mb-1.5">Full Name</label>
            <input id="account-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="input-field" />
          </div>
          <div>
            <label htmlFor="account-email" className="block text-xs font-bold text-on-surface-variant mb-1.5">Email (optional)</label>
            <input id="account-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" className="input-field" />
          </div>
          <div>
            <label htmlFor="account-phone" className="block text-xs font-bold text-on-surface-variant mb-1.5">Mobile Number</label>
            <input id="account-phone" value={user?.phone || ''} disabled className="input-field bg-surface-container-low text-on-surface-variant" />
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary self-start">
            <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="card p-5 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Lock size={16} className="text-primary" />
          <h2 className="font-bold text-on-surface-deep">{user?.has_password ? 'Update Password' : 'Set a Password'}</h2>
        </div>
        <p className="text-sm text-on-surface-variant mb-4">
          {user?.has_password
            ? 'Change the password you use to log in with email.'
            : 'Add a password so you can also log in with email, not just phone OTP.'}
        </p>
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="account-new-password" className="block text-xs font-bold text-on-surface-variant mb-1.5">New Password</label>
            <input id="account-new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 8 characters" className="input-field" />
          </div>
          <div>
            <label htmlFor="account-confirm-password" className="block text-xs font-bold text-on-surface-variant mb-1.5">Confirm Password</label>
            <input id="account-confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" className="input-field" />
          </div>
          <button onClick={handleSetPassword} disabled={settingPassword} className="btn-primary self-start">
            <Lock size={15} /> {settingPassword ? 'Saving...' : user?.has_password ? 'Update Password' : 'Set Password'}
          </button>
        </div>
      </div>

      <div className="card divide-y divide-outline-variant overflow-hidden">
        <Link to="/orders" className="flex items-center gap-3 px-5 py-4 hover:bg-surface-container-low"><Package size={17} className="text-primary" /> <span className="font-semibold text-sm">My Orders</span></Link>
        <Link to="/wishlist" className="flex items-center gap-3 px-5 py-4 hover:bg-surface-container-low"><Heart size={17} className="text-primary" /> <span className="font-semibold text-sm">My Wishlist</span></Link>
        <Link to="/addresses" className="flex items-center gap-3 px-5 py-4 hover:bg-surface-container-low"><MapPin size={17} className="text-primary" /> <span className="font-semibold text-sm">My Addresses</span></Link>
        <Link to="/support" className="flex items-center gap-3 px-5 py-4 hover:bg-surface-container-low"><LifeBuoy size={17} className="text-primary" /> <span className="font-semibold text-sm">Help & Support</span></Link>
        <button onClick={() => logout()} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-error-container text-error text-left"><LogOut size={17} /> <span className="font-semibold text-sm">Logout</span></button>
      </div>
    </div>
  )
}
