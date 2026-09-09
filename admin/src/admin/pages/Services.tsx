import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useState } from 'react'
import { Plus, Edit2, Trash2, Search, X, Check } from 'lucide-react'
import CDNImageInput from '../components/CDNImageInput'

const EMPTY_FORM = {
  name: '',
  description: '',
  pricing_unit: 'per_garment',
  base_price: '',
  image_url: '',
  category_id: '',
}

export default function Services() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['services', page, search],
    queryFn: () =>
      api.get('/admin/services', { params: { page, search } }).then(r => r.data),
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data.data || []),
  })

  const categories: any[] = categoriesData || []

  const buildParams = () => {
    const price = parseFloat(formData.base_price)
    if (!formData.name.trim()) throw new Error('Name is required')
    if (isNaN(price) || price <= 0) throw new Error('Enter a valid price')
    return {
      name: formData.name.trim(),
      description: formData.description || undefined,
      pricing_unit: formData.pricing_unit,
      base_price: price,
      image_url: formData.image_url || undefined,
      category_id: formData.category_id || undefined,
    }
  }

  const { mutate: createService, isPending: isCreating } = useMutation({
    mutationFn: () => api.post('/admin/services', null, { params: buildParams() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] })
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Service created!')
      setFormData(EMPTY_FORM)
      setShowForm(false)
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || err.message || 'Failed to create service'),
  })

  const { mutate: updateService, isPending: isUpdating } = useMutation({
    mutationFn: () => api.patch(`/admin/services/${editingId}`, null, { params: buildParams() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] })
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Service updated!')
      setFormData(EMPTY_FORM)
      setEditingId(null)
      setShowForm(false)
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || err.message || 'Failed to update service'),
  })

  const { mutate: deleteService } = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/services/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] })
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Service deleted!')
    },
    onError: () => toast.error('Failed to delete'),
  })

  const handleEdit = (service: any) => {
    setEditingId(service.id)
    setFormData({
      name: service.name,
      description: service.description || '',
      pricing_unit: service.pricing_unit,
      base_price: String(service.base_price ?? ''),
      image_url: service.image_url || '',
      category_id: service.category_id || '',
    })
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData(EMPTY_FORM)
  }

  const handleSubmit = () => {
    if (editingId) updateService()
    else createService()
  }

  const getCategoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name || ''

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Services</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
          >
            <Plus size={16} /> Add Service
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">{editingId ? 'Edit Service' : 'New Service'}</h2>
            <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Service name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="col-span-2 border rounded-lg px-3 py-2 text-sm"
            />
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="col-span-2 border rounded-lg px-3 py-2 text-sm"
            />
            <select
              value={formData.pricing_unit}
              onChange={(e) => setFormData({ ...formData, pricing_unit: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="per_garment">Per Garment</option>
              <option value="per_kg">Per Kg</option>
              <option value="per_hour">Per Hour</option>
              <option value="per_visit">Per Visit</option>
              <option value="per_item">Per Item</option>
            </select>
            <input
              type="number"
              placeholder="Base price *"
              min="0"
              value={formData.base_price}
              onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Category</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.emoji ? `${cat.emoji} ` : ''}{cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Service Image</label>
              <CDNImageInput
                value={formData.image_url}
                onChange={(url) => setFormData({ ...formData, image_url: url })}
                placeholder="Upload or paste image URL"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSubmit}
              disabled={isCreating || isUpdating}
              className="flex items-center gap-2 flex-1 justify-center bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
            >
              <Check size={15} />
              {editingId ? (isUpdating ? 'Saving...' : 'Save Changes') : (isCreating ? 'Creating...' : 'Create')}
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search services..."
          className="w-full max-w-xs border rounded-lg pl-9 pr-3 py-2 text-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              {['Image', 'Name', 'Category', 'Unit', 'Base Price', 'Status', 'Actions'].map((h) => (
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
            ) : isError ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-red-400">Failed to load services</td>
              </tr>
            ) : !data?.data?.length ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-400">No services found</td>
              </tr>
            ) : (
              data?.data?.map((service: any) => (
                <tr key={service.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {service.image_url ? (
                      <img src={service.image_url} alt={service.name} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">N/A</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{service.name}</td>
                  <td className="px-4 py-3">
                    {service.category_id ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                        {getCategoryName(service.category_id) || service.category_id}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                    {service.pricing_unit.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {service.base_price != null ? `₹${service.base_price}` : <span className="text-red-400 text-xs">Invalid price</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      service.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {service.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(service)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete ${service.name}?`)) deleteService(service.id)
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
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

        {data?.total_pages > 1 && (
          <div className="flex justify-center items-center gap-2 p-4 border-t">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-lg border text-sm disabled:opacity-40"
            >
              Prev
            </button>
            <span className="text-sm text-gray-500">Page {page} of {data.total_pages}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === data.total_pages}
              className="px-3 py-1 rounded-lg border text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
