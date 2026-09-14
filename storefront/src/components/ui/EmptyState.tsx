import type { LucideIcon } from 'lucide-react'

export default function EmptyState({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: LucideIcon
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 py-20 px-4">
      <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center">
        <Icon size={28} className="text-outline" />
      </div>
      <p className="font-bold text-lg text-on-surface-deep">{title}</p>
      {subtitle && <p className="text-sm text-on-surface-variant max-w-sm">{subtitle}</p>}
      {action}
    </div>
  )
}
