export default function ProductSkeleton() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="aspect-square bg-surface-container-low" />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-3.5 bg-surface-container-low rounded w-4/5" />
        <div className="h-3 bg-surface-container-low rounded w-1/3" />
        <div className="h-4 bg-surface-container-low rounded w-1/2 mt-1" />
      </div>
    </div>
  )
}
