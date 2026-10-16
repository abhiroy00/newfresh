import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in" onClick={onCancel}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 relative animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${danger ? 'bg-error-container text-error' : 'bg-primary-fixed text-primary'}`}>
            <AlertTriangle size={22} />
          </div>
          <h2 className="text-lg font-extrabold text-on-surface-deep">{title}</h2>
          {message && <p className="text-sm text-on-surface-variant">{message}</p>}
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="btn-outline flex-1" disabled={loading}>
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-[0.9375rem] text-white transition-all ${
              danger ? 'bg-error' : 'bg-gradient-to-br from-primary to-primary-container'
            } disabled:opacity-50`}
          >
            {loading ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
