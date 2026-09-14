import { Minus, Plus } from 'lucide-react'

export default function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  size = 'md',
}: {
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  size?: 'sm' | 'md'
}) {
  const dim = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9'
  return (
    <div className="inline-flex items-center gap-3 bg-surface-container-low rounded-full px-1 py-1">
      <button
        type="button"
        className={`${dim} rounded-full flex items-center justify-center border-1.5 border-primary text-primary disabled:opacity-40 disabled:cursor-not-allowed bg-white`}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        <Minus size={14} />
      </button>
      <span className="min-w-[1.5rem] text-center font-bold text-on-surface-deep">{value}</span>
      <button
        type="button"
        className={`${dim} rounded-full flex items-center justify-center bg-primary text-white disabled:opacity-40 disabled:cursor-not-allowed`}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}
