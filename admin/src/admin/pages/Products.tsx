import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProducts, deleteProduct, getCategories } from '../api/products'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Pencil, Trash2, Plus, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'

type StatusFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
const STATUS_VALUES: StatusFilter[] = ['all', 'in_stock', 'low_stock', 'out_of_stock']

export default function Products() {
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const initialStatus = (STATUS_VALUES.includes(searchParams.get('status') as StatusFilter)
    ? (searchParams.get('status') as StatusFilter)
    : 'all')
  const initialCategory = searchParams.get('category') ?? 'all'

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string>(initialCategory)
  const [status, setStatus] = useState<StatusFilter>(initialStatus)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search],
    queryFn: () => getProducts(page, search),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

  const { mutate: remove } = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Product deleted!')
    },
    onError: () => toast.error('Failed to delete'),
  })

  const confirmDelete = (id: string, name: string) => {
    if (window.confirm(`Delete "${name}"?`)) remove(id)
  }

  const filteredItems = useMemo(() => {
    const items: any[] = data?.items ?? []
    return items.filter((p) => {
      if (categoryId !== 'all') {
        const cid = p.category?.id ?? p.category_id
        if (cid !== categoryId) return false
      }
      if (status !== 'all') {
        const stock = Number(p.stock ?? 0)
        if (status === 'out_of_stock' && stock > 0) return false
        if (status === 'low_stock' && !(stock > 0 && stock <= 10)) return false
        if (status === 'in_stock' && stock <= 10) return false
      }
      return true
    })
  }, [data, categoryId, status])

  const hasFilters = search || categoryId !== 'all' || status !== 'all'
  const clearFilters = () => {
    setSearch('')
    setCategoryId('all')
    setStatus('all')
    setPage(1)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link
          to="/products/new"
          className="btn-primary gap-1.5"
        >
          <Plus size={16} /> Add Product
        </Link>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search products..."
            className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All categories</option>
          {categories.map((c: any) => (
            <option key={c.id} value={c.id}>
              {c.emoji ? `${c.emoji} ` : ''}{c.name}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All statuses</option>
          <option value="in_stock">In stock</option>
          <option value="low_stock">Low stock (≤10)</option>
          <option value="out_of_stock">Out of stock</option>
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 px-2 py-2"
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              {['Image', 'Name', 'Price', 'Stock', 'Category', 'Badge', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-400">No products found</td>
              </tr>
            ) : (
              filteredItems.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <img
                      src={p.primary_image_url || p.images?.[0]?.url || 'https://placehold.co/40x40/EEE/31343C'}
                      alt={p.name}
                      className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/40x40/EEE/31343C' }}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">₹{p.price?.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        p.stock > 10
                          ? 'bg-green-100 text-green-700'
                          : p.stock > 0
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {p.stock > 0 ? p.stock : 'Out of stock'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.category?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    {p.badge ? (
                      <span
                        className="px-2 py-0.5 rounded-full text-white text-xs font-bold"
                        style={{ backgroundColor: p.badge_color || '#28c38a' }}
                      >
                        {p.badge}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        to={`/products/${p.id}/edit`}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition"
                      >
                        <Pencil size={15} />
                      </Link>
                      <button
                        onClick={() => confirmDelete(p.id, p.name)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {(data?.total_pages ?? 0) > 1 && (
          <div className="flex justify-center items-center gap-2 p-4 border-t">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50"
            >
              Prev
            </button>
            <span className="text-sm text-gray-500">
              Page {page} of {data?.total_pages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === (data?.total_pages ?? 1)}
              className="px-3 py-1 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
