import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { MapPin, Plus, Pencil, Trash2, Star, Home, Briefcase } from 'lucide-react'
import { usersApi } from '@/api/endpoints'
import AddressForm from '@/components/address/AddressForm'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ErrorState from '@/components/ui/ErrorState'
import { useAuthStore } from '@/store/authStore'
import type { Address } from '@/types'

const LABEL_ICON: Record<string, any> = { Home, Work: Briefcase }

export default function Addresses() {
  const queryClient = useQueryClient()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const openLogin = useAuthStore((s) => s.openLogin)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Address | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const { data: addresses, isLoading, isError, refetch: refetchAddresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => (await usersApi.listAddresses()).data.data as Address[],
    enabled: isAuthenticated,
  })

  const refetch = () => queryClient.invalidateQueries({ queryKey: ['addresses'] })

  const handleSaved = () => {
    setShowForm(false)
    setEditing(null)
    refetch()
  }

  const handleDelete = async (id: string) => {
    setConfirmDeleteId(null)
    setDeletingId(id)
    try {
      await usersApi.deleteAddress(id)
      toast.success('Address deleted')
      refetch()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Could not delete address')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSetDefault = async (address: Address) => {
    try {
      await usersApi.updateAddress(address.id, { is_default: true })
      refetch()
    } catch {
      toast.error('Could not set as default')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20">
        <EmptyState
          icon={MapPin}
          title="Login to manage your addresses"
          action={<button onClick={openLogin} className="btn-primary mt-2">Login</button>}
        />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-on-surface-deep">My Addresses</h1>
        {!showForm && (
          <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary !py-2 !px-4 text-sm">
            <Plus size={16} /> Add New
          </button>
        )}
      </div>

      {showForm && (
        <div className="card p-5 mb-6">
          <h2 className="font-bold text-on-surface-deep mb-4">{editing ? 'Edit Address' : 'Add New Address'}</h2>
          <AddressForm
            editingAddress={editing}
            makeDefault={!addresses || addresses.length === 0}
            onSaved={handleSaved}
            onCancel={() => { setShowForm(false); setEditing(null) }}
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => <div key={i} className="card h-28 animate-pulse bg-surface-container-low" />)}
        </div>
      ) : isError ? (
        <ErrorState subtitle="Couldn't load your addresses." onRetry={() => refetchAddresses()} />
      ) : !addresses || addresses.length === 0 ? (
        !showForm && (
          <EmptyState
            icon={MapPin}
            title="No saved addresses"
            subtitle="Add an address to get your orders delivered."
            action={<button onClick={() => setShowForm(true)} className="btn-primary mt-2">Add Address</button>}
          />
        )
      ) : (
        <div className="flex flex-col gap-3">
          {addresses.map((addr) => {
            const Icon = LABEL_ICON[addr.label || ''] || MapPin
            return (
              <div key={addr.id} className="card p-4 flex gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center shrink-0">
                  <Icon size={17} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-on-surface-deep">{addr.label || 'Address'}</span>
                    {addr.is_default && (
                      <span className="text-[10px] font-bold text-primary bg-primary-fixed px-2 py-0.5 rounded-full">DEFAULT</span>
                    )}
                  </div>
                  <p className="text-sm text-on-surface-variant">{addr.full_name} · {addr.phone}</p>
                  <p className="text-sm text-on-surface-variant">
                    {[addr.line1, addr.line2, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    {!addr.is_default && (
                      <button onClick={() => handleSetDefault(addr)} className="flex items-center gap-1 text-xs font-semibold text-primary">
                        <Star size={12} /> Set as default
                      </button>
                    )}
                    <button onClick={() => { setEditing(addr); setShowForm(true) }} className="flex items-center gap-1 text-xs font-semibold text-on-surface-variant">
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(addr.id)}
                      disabled={deletingId === addr.id}
                      className="flex items-center gap-1 text-xs font-semibold text-error"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete this address?"
        message="This can't be undone."
        confirmLabel="Yes, Delete"
        danger
        loading={!!deletingId}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}
