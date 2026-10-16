import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { productsApi } from '@/api/endpoints'
import ErrorState from '@/components/ui/ErrorState'
import type { Category } from '@/types'

export default function Categories() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await productsApi.categories()).data.data as Category[],
  })

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-extrabold text-on-surface-deep mb-6">All Categories</h1>
        <ErrorState subtitle="Couldn't load categories." onRetry={() => refetch()} />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-extrabold text-on-surface-deep mb-6">All Categories</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="card aspect-square animate-pulse bg-surface-container-low" />
            ))
          : data?.map((cat) => (
              <Link
                key={cat.id}
                to={`/products?category=${cat.id}`}
                className="card flex flex-col items-center justify-center gap-2 aspect-square p-4 hover:shadow-lg transition-shadow"
              >
                {cat.image_url ? (
                  <img src={cat.image_url} alt={cat.name} className="w-16 h-16 rounded-2xl object-cover" />
                ) : (
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                    style={{ backgroundColor: cat.color || '#e8f5e9' }}
                  >
                    {cat.emoji || '🛒'}
                  </div>
                )}
                <span className="text-sm font-semibold text-on-surface text-center">{cat.name}</span>
                {typeof cat.product_count === 'number' && (
                  <span className="text-xs text-on-surface-variant">{cat.product_count} items</span>
                )}
              </Link>
            ))}
      </div>
    </div>
  )
}
