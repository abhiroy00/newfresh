import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUsers, deleteUser } from '../api/users'
import toast from 'react-hot-toast'
import { useState } from 'react'
import { Trash2, Search } from 'lucide-react'

export default function Users() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => getUsers(page, search),
  })

  const { mutate: remove } = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User deleted!')
    },
  })

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-gray-500">{data?.total ?? 0} total users</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search users..."
          className="w-full max-w-xs border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              {['#', 'Name', 'Email', 'Phone', 'Orders', 'Joined', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}>
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data?.items?.map((u: any, idx: number) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-400">{(page - 1) * 20 + idx + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-xs">
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                    <span className="font-medium">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3 text-gray-500">{u.phone ?? '—'}</td>
                <td className="px-4 py-3">{u.orders_count ?? 0}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(u.created_at).toLocaleDateString('en-IN')}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => window.confirm(`Delete ${u.name}?`) && remove(u.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data?.total_pages > 1 && (
          <div className="flex justify-center items-center gap-2 p-4 border-t">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50">Prev</button>
            <span className="text-sm text-gray-500">Page {page} of {data.total_pages}</span>
            <button onClick={() => setPage((p) => p + 1)} disabled={page === data.total_pages}
              className="px-3 py-1 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50">Next</button>
          </div>
        )}
      </div>
    </div>
  )
}
