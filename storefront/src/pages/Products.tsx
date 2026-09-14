import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, SlidersHorizontal, Leaf, ChevronLeft, ChevronRight, PackageSearch } from 'lucide-react'
import { productsApi } from '@/api/endpoints'
import ProductCard from '@/components/product/ProductCard'
import ProductSkeleton from '@/components/ui/ProductSkeleton'
import EmptyState from '@/components/ui/EmptyState'
import { useDebounce } from '@/hooks/useDebounce'
import type { Category, Product } from '@/types'

const SORT_OPTIONS = [
  { value: 'created_at_desc', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
]

export default function Products() {
  const [params, setParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState(params.get('search') || '')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const debouncedSearch = useDebounce(searchInput)

  const page = Number(params.get('page') || 1)
  const categoryId = params.get('category') || ''
  const sort = params.get('sort') || 'created_at_desc'
  const organicOnly = params.get('organic') === '1'

  useEffect(() => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (debouncedSearch) next.set('search', debouncedSearch)
      else next.delete('search')
      next.delete('page')
      return next
    }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await productsApi.categories()).data.data as Category[],
  })

  const productsQuery = useQuery({
    queryKey: ['products', { page, categoryId, search: params.get('search'), sort, organicOnly }],
    queryFn: async () => {
      const res = await productsApi.list({
        page,
        per_page: 20,
        category_id: categoryId || undefined,
        search: params.get('search') || undefined,
        sort,
        is_organic: organicOnly || undefined,
      })
      return res.data as { data: Product[]; total: number; page: number; pages: number }
    },
  })

  const setParam = (key: string, value: string | null) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      next.delete('page')
      return next
    })
  }

  const activeCategory = categoriesQuery.data?.find((c) => c.id === categoryId)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <h1 className="text-2xl font-extrabold text-on-surface-deep">
          {activeCategory ? activeCategory.name : 'All Products'}
        </h1>
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className="btn-outline !py-2 !px-4 text-sm md:hidden"
        >
          <SlidersHorizontal size={15} /> Filters
        </button>
      </div>

      <div className="flex gap-8">
        {/* Sidebar filters */}
        <aside className={`${filtersOpen ? 'block' : 'hidden'} md:block w-full md:w-56 shrink-0`}>
          <div className="card p-4 mb-4">
            <div className="relative mb-4">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
              <input
                type="text"
                placeholder="Search..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="input-field pl-9 text-sm"
              />
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-on-surface mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={organicOnly}
                onChange={(e) => setParam('organic', e.target.checked ? '1' : null)}
                className="w-4 h-4 accent-primary"
              />
              <Leaf size={14} className="text-accent-mint" /> Organic only
            </label>

            <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-2">Sort by</p>
            <select
              value={sort}
              onChange={(e) => setParam('sort', e.target.value)}
              className="input-field text-sm mb-4"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-2">Category</p>
            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
              <button
                onClick={() => setParam('category', null)}
                className={`text-left text-sm px-2 py-1.5 rounded-lg ${!categoryId ? 'bg-primary-fixed text-primary font-semibold' : 'text-on-surface hover:bg-surface-container-low'}`}
              >
                All
              </button>
              {categoriesQuery.data?.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setParam('category', c.id)}
                  className={`text-left text-sm px-2 py-1.5 rounded-lg ${categoryId === c.id ? 'bg-primary-fixed text-primary font-semibold' : 'text-on-surface hover:bg-surface-container-low'}`}
                >
                  {c.emoji} {c.name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Grid */}
        <div className="flex-1 min-w-0">
          {productsQuery.isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => <ProductSkeleton key={i} />)}
            </div>
          ) : productsQuery.data && productsQuery.data.data.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {productsQuery.data.data.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>

              {productsQuery.data.pages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-8">
                  <button
                    disabled={page <= 1}
                    onClick={() => setParams((prev) => { const n = new URLSearchParams(prev); n.set('page', String(page - 1)); return n })}
                    className="w-9 h-9 rounded-full border border-outline-variant flex items-center justify-center disabled:opacity-30"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm font-semibold text-on-surface-variant">
                    Page {page} of {productsQuery.data.pages}
                  </span>
                  <button
                    disabled={page >= productsQuery.data.pages}
                    onClick={() => setParams((prev) => { const n = new URLSearchParams(prev); n.set('page', String(page + 1)); return n })}
                    className="w-9 h-9 rounded-full border border-outline-variant flex items-center justify-center disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <EmptyState icon={PackageSearch} title="No products found" subtitle="Try a different search or filter." />
          )}
        </div>
      </div>
    </div>
  )
}
