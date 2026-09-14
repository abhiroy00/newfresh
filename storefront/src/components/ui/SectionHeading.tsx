import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export default function SectionHeading({
  title,
  linkTo,
  linkLabel = 'View all',
}: {
  title: string
  linkTo?: string
  linkLabel?: string
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-primary to-accent-mint" />
        <h2 className="text-xl font-extrabold text-on-surface-deep tracking-tight">{title}</h2>
      </div>
      {linkTo && (
        <Link to={linkTo} className="text-sm font-semibold text-primary flex items-center gap-0.5 hover:gap-1.5 transition-all">
          {linkLabel} <ChevronRight size={15} />
        </Link>
      )}
    </div>
  )
}
