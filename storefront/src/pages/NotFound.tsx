import { Link } from 'react-router-dom'
import { CompassIcon } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center flex flex-col items-center gap-4">
      <div className="w-20 h-20 rounded-full bg-surface-container-low flex items-center justify-center">
        <CompassIcon size={36} className="text-outline" />
      </div>
      <h1 className="text-3xl font-extrabold text-on-surface-deep">404</h1>
      <p className="text-on-surface-variant">This page took a wrong turn. Let's get you back on track.</p>
      <Link to="/" className="btn-primary">Back to Home</Link>
    </div>
  )
}
