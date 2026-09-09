import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProducts, updateStock } from '../api/products'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Search, Minus, Plus, Save, AlertTriangle } from 'lucide-react'

const LOW_STOCK_THRESHOLD = 10

export default function Inventory() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [lowOnly, setLowOnly] = useState(false)
  // Local edits keyed by product id so each row is independently editable.
  const [drafts, setDrafts] = useState<Record<string, number>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', page, search],
    queryFn: () => getProducts(page, search),
  })

  // Reset local drafts whenever the fetched data changes.
  useEffect(() => {
    if (data?.items) {
      const next: Record<string, number> = {}
      data.items.forEach((p: any) => { next[p.id] = p.stock })
      setDrafts(next)
    }
  }, [data])

  const { mutateAsync: save, isPending } = useMutation({
    mutationFn: ({ id, stock }: { id: string; stock: number }) => updateStock(id, stock),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Stock updated')
    },
    onError: () => toast.error('Failed to update stock'),
  })

  const rows = useMemo(() => {
    const items = data?.items ?? []
    return lowOnly ? items.filter((p: any) => (drafts[p.id] ?? p.stock) <= LOW_STOCK_THRESHOLD) : items
  }, [data, lowOnly, drafts])

  const lowCount = useMemo(
    () => (data?.items ?? []).filter((p: any) => p.stock <= LOW_STOCK_THRESHOLD).length,
    [data],
  )

  const setDraft = (id: string, value: number) =>
    setDrafts((d) => ({ ...d, [id]: Math.max(0, value) }))

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-gray-500">Update stock levels in real time.</p>
        </div>
        {lowCount > 0 && (
          <div className="flex items-center gap-2 bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-lg text-sm">
            <AlertTriangle size={15} /> {lowCount} item{lowCount > 1 ? 's' : ''} low on stock
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search products..."
            className="w-full max-w-xs border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
          Low stock only
        </label>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              {['Image', 'Name', 'Unit', 'Current', 'New Stock', 'Action'].map((h) => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">No products found</td>
              </tr>
            ) : (
              rows.map((p: any) => {
                const draft = drafts[p.id] ?? p.stock
                const isLow = p.stock <= LOW_STOCK_THRESHOLD
                const dirty = draft !== p.stock
                return (
                  <tr key={p.id} className={`hover:bg-gray-50 ${isLow ? 'bg-red-50/40' : ''}`}>
                    <td className="px-4 py-3">
                      <img
                        src={p.primary_image_url || p.images?.[0] || 'https://placehold.co/40x40/EEE/31343C'}
                        alt={p.name}
                        className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/40x40/EEE/31343C' }}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500">{p.unit || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          p.stock > LOW_STOCK_THRESHOLD
                            ? 'bg-green-100 text-green-700'
                            : p.stock > 0
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {p.stock > 0 ? p.stock : 'Out of stock'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setDraft(p.id, draft - 1)}
                          className="p-1.5 rounded-lg border hover:bg-gray-50"
                        >
                          <Minus size={14} />
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={draft}
                          onChange={(e) => setDraft(p.id, parseInt(e.target.value || '0', 10))}
                          className="w-16 border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => setDraft(p.id, draft + 1)}
                          className="p-1.5 rounded-lg border hover:bg-gray-50"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        disabled={!dirty || isPending}
                        onClick={() => save({ id: p.id, stock: draft })}
                        className="btn-primary text-xs px-3 py-1.5"
                      >
                        <Save size={13} /> Save
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {(data?.total_pages ?? 0) > 1 && (
          <div className="flex justify-center items-center gap-2 p-4 border-t">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50"
            >
              Prev
            </button>
            <span className="text-sm text-gray-500">Page {page} of {data?.total_pages}</span>
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
