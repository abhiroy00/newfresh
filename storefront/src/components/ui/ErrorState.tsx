import { AlertTriangle } from 'lucide-react'

export default function ErrorState({
  title = 'Something went wrong',
  subtitle = "We couldn't load this. Please check your connection and try again.",
  onRetry,
}: {
  title?: string
  subtitle?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 py-20 px-4">
      <div className="w-16 h-16 rounded-full bg-error-container flex items-center justify-center">
        <AlertTriangle size={28} className="text-error" />
      </div>
      <p className="font-bold text-lg text-on-surface-deep">{title}</p>
      <p className="text-sm text-on-surface-variant max-w-sm">{subtitle}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary mt-2">Try Again</button>
      )}
    </div>
  )
}
