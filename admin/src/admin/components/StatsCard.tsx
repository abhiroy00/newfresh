interface StatsCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
  sub?: string
}

const colorMap: Record<string, { bg: string; iconBg: string }> = {
  'bg-blue-500': { bg: 'from-blue-500 to-blue-600', iconBg: 'bg-white/20' },
  'bg-green-500': { bg: 'from-emerald-500 to-green-600', iconBg: 'bg-white/20' },
  'bg-purple-500': { bg: 'from-purple-500 to-purple-600', iconBg: 'bg-white/20' },
  'bg-orange-500': { bg: 'from-amber-500 to-orange-500', iconBg: 'bg-white/20' },
  'bg-red-500': { bg: 'from-rose-500 to-red-500', iconBg: 'bg-white/20' },
}

export default function StatsCard({ label, value, icon, color, sub }: StatsCardProps) {
  const c = colorMap[color] || colorMap['bg-blue-500']
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 text-white bg-gradient-to-br ${c.bg} transition-all duration-200 hover:scale-[1.02] hover:shadow-lg`}
    >
      {/* Background pattern */}
      <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute -bottom-2 -left-2 w-16 h-16 rounded-full bg-white/8" />

      <div className="relative">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-sm font-medium text-white/70">{label}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {sub && <p className="text-xs text-white/60">{sub}</p>}
          </div>
          <div className={`${c.iconBg} rounded-xl p-2.5`}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  )
}