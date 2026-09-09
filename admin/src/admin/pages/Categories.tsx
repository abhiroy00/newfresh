import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Upload, X, Wrench, Package } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api/axios'

interface Category {
  id: string
  name: string
  slug: string
  emoji?: string
  image_url?: string
  color?: string
  is_active: boolean
  sort_order: number
  product_count?: number
  service_count?: number
}

export default function Categories() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    emoji: '',
    image_url: '',
    color: '#28c38a',
    sort_order: 0,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/categories')
      return data.data || []
    },
  })

  const { mutate: createCategory, isPending: isCreating } = useMutation({
    mutationFn: (payload: any) =>
      api.post('/categories', payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      setFormData({ name: '', emoji: '', image_url: '', color: '#28c38a', sort_order: 0 })
      setEditingId(null)
      setShowForm(false)
      toast.success('Category created!')
    },
    onError: () => toast.error('Failed to create category'),
  })

  const { mutate: updateCategory, isPending: isUpdating } = useMutation({
    mutationFn: (payload: any) =>
      api.patch(`/admin/categories/${editingId}`, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      setFormData({ name: '', emoji: '', image_url: '', color: '#28c38a', sort_order: 0 })
      setEditingId(null)
      setShowForm(false)
      toast.success('Category updated!')
    },
    onError: () => toast.error('Failed to update category'),
  })

  const { mutate: deleteCategory } = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Category deleted!')
    },
    onError: () => toast.error('Failed to delete'),
  })

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)

      if (editingId) {
        const { data } = await api.post(`/admin/categories/${editingId}/image`, formDataUpload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        setFormData({ ...formData, image_url: data.url })
        toast.success('Image uploaded!')
      } else {
        toast('Create category first, then upload image')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) {
      toast.error('Category name is required')
      return
    }
    if (editingId) {
      updateCategory(formData)
    } else {
      createCategory(formData)
    }
  }

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id)
    setFormData({
      name: cat.name,
      emoji: cat.emoji || '',
      image_url: cat.image_url || '',
      color: cat.color || '#28c38a',
      sort_order: cat.sort_order,
    })
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({ name: '', emoji: '', image_url: '', color: '#28c38a', sort_order: 0 })
  }

  const confirmDelete = (id: string, name: string) => {
    if (window.confirm(`Delete "${name}"?`)) deleteCategory(id)
  }

  const COLS = 7

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Categories</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary gap-1.5"
          >
            <Plus size={16} /> Add Category
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-6 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">{editingId ? 'Edit Category' : 'Create Category'}</h2>
            <button
              type="button"
              onClick={handleCancel}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Category name (e.g., Fresh Vegetables)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="col-span-2 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Emoji (optional)"
              value={formData.emoji}
              onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
              maxLength={2}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="border rounded-lg px-3 py-2 h-10"
            />

            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium text-gray-700">Category Image</label>
              <div className="flex gap-2">
                <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition flex-1">
                  <Upload size={16} className="text-gray-500" />
                  <span className="text-sm text-gray-600">{uploading ? 'Uploading...' : 'Upload Image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-gray-500 px-2 py-2">OR</span>
                <input
                  type="url"
                  placeholder="Paste image URL"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {formData.image_url && (
                <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 border">
                  <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <input
              type="number"
              placeholder="Sort order"
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
              className="col-span-2 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || isUpdating}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {editingId ? (isUpdating ? 'Updating...' : 'Update') : isCreating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Image</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">
                <span className="flex items-center gap-1">
                  <Package size={12} /> Products
                </span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="flex items-center gap-1">
                  <Wrench size={12} /> Services
                </span>
              </th>
              <th className="px-4 py-3 text-left">Sort</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(COLS)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : !data || data.length === 0 ? (
              <tr>
                <td colSpan={COLS} className="text-center py-10 text-gray-400">No categories found</td>
              </tr>
            ) : (
              data.map((cat: Category) => (
                <tr key={cat.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {cat.image_url ? (
                      <img
                        src={cat.image_url}
                        alt={cat.name}
                        className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            `https://placehold.co/40x40/EEE/31343C?text=${cat.emoji || '📦'}`
                        }}
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                        style={{ backgroundColor: cat.color || '#e8f5e9' }}
                      >
                        {cat.emoji}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{cat.name}</td>
                  <td className="px-4 py-3">
                    {(cat.product_count || 0) > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {cat.product_count}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {(cat.service_count || 0) > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                        {cat.service_count}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{cat.sort_order}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(cat)}
                        className="text-blue-600 hover:text-blue-700 p-1"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => confirmDelete(cat.id, cat.name)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
