import { useState } from 'react'
import { CheckCircle, KeyRound } from 'lucide-react'

/**
 * "Mark as Delivered" for riders. When the order has a delivery OTP the rider
 * must type the 4-digit code the customer sees in their Gmart app; the
 * backend rejects a wrong code.
 */
export default function DeliverWithOtp({
  otpRequired,
  isPending,
  onConfirm,
}: {
  otpRequired: boolean
  isPending: boolean
  onConfirm: (otp?: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [otp, setOtp] = useState('')

  if (!otpRequired) {
    return (
      <button
        onClick={() => onConfirm()}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 transition"
      >
        <CheckCircle size={16} />
        Mark as Delivered
      </button>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition"
      >
        <KeyRound size={16} />
        Enter OTP & Mark Delivered
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">Ask the customer for the 4-digit delivery OTP shown in their app.</p>
      <div className="flex gap-2">
        <input
          autoFocus
          inputMode="numeric"
          maxLength={4}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="• • • •"
          className="flex-1 text-center tracking-[0.5em] text-lg font-bold border-2 border-gray-200 focus:border-green-600 rounded-xl py-2 outline-none"
        />
        <button
          onClick={() => onConfirm(otp)}
          disabled={otp.length !== 4 || isPending}
          className="px-4 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition"
        >
          Confirm
        </button>
      </div>
    </div>
  )
}
