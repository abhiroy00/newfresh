import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

export default class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('Unhandled render error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center gap-3 px-4">
          <div className="w-16 h-16 rounded-full bg-error-container flex items-center justify-center">
            <AlertTriangle size={28} className="text-error" />
          </div>
          <p className="font-bold text-lg text-on-surface-deep">Something went wrong</p>
          <p className="text-sm text-on-surface-variant max-w-sm">
            This page ran into an unexpected error. Try reloading — if it keeps happening, let us know.
          </p>
          <button onClick={() => window.location.reload()} className="btn-primary mt-2">Reload Page</button>
        </div>
      )
    }
    return this.props.children
  }
}
