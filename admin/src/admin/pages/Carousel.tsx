import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import api from '../api/axios'
import CDNImageInput from '../components/CDNImageInput'

interface CarouselItem {
  id: string
  title: string
  subtitle?: string
  image_url: string
  link_type: 'category' | 'product' | 'external'
  link_value?: string
  button_text?: string
  display_order: number
  is_active: boolean
  starts_at?: string
  ends_at?: string
}

const fetchCarousels = async (): Promise<CarouselItem[]> => {
  const res = await api.get('/admin/carousel')
  return res.data.items || []
}

const createCarousel = async (data: Partial<CarouselItem>) => {
  const res = await api.post('/admin/carousel', data)
  return res.data
}

const updateCarousel = async (id: string, data: Partial<CarouselItem>) => {
  const res = await api.put(`/admin/carousel/${id}`, data)
  return res.data
}

const deleteCarousel = async (id: string) => {
  const res = await api.delete(`/admin/carousel/${id}`)
  return res.data
}

export default function CarouselPage() {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<CarouselItem>>({
    title: '',
    subtitle: '',
    image_url: '',
    link_type: 'category',
    button_text: 'Shop Now',
    is_active: true,
    display_order: 0,
  })

  const { data: carousels = [], isLoading } = useQuery({
    queryKey: ['carousels'],
    queryFn: fetchCarousels,
  })

  const createMut = useMutation({
    mutationFn: createCarousel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carousels'] })
      resetForm()
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CarouselItem> }) =>
      updateCarousel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carousels'] })
      resetForm()
    },
  })

  const deleteMut = useMutation({
    mutationFn: deleteCarousel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carousels'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.image_url) {
      alert('Please fill in title and image')
      return
    }

    if (editingId) {
      updateMut.mutate({ id: editingId, data: formData })
    } else {
      createMut.mutate(formData)
    }
  }

  const handleEdit = (carousel: CarouselItem) => {
    setFormData(carousel)
    setEditingId(carousel.id)
    setIsOpen(true)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      subtitle: '',
      image_url: '',
      link_type: 'category',
      button_text: 'Shop Now',
      is_active: true,
      display_order: 0,
    })
    setEditingId(null)
    setIsOpen(false)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Carousel Management</h1>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          <Plus size={20} /> Add Carousel
        </button>
      </div>

      {isOpen && (
        <div className="bg-white rounded-2xl shadow p-6 border-l-4 border-blue-500">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit Carousel' : 'Add New Carousel'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g., Summer Fresh Deals"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subtitle</label>
                <input
                  type="text"
                  value={formData.subtitle || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, subtitle: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  placeholder="Optional tagline"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Image URL *</label>
              <CDNImageInput
                value={formData.image_url || ''}
                onChange={(url) => setFormData({ ...formData, image_url: url })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Link Type</label>
                <select
                  value={formData.link_type || 'category'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      link_type: e.target.value as any,
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="category">Category</option>
                  <option value="product">Product</option>
                  <option value="external">External URL</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Link Value</label>
                <input
                  type="text"
                  value={formData.link_value || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, link_value: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  placeholder="Category ID or Product ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Button Text</label>
                <input
                  type="text"
                  value={formData.button_text || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, button_text: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  placeholder="Shop Now"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Display Order</label>
                <input
                  type="number"
                  value={formData.display_order || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      display_order: parseInt(e.target.value),
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Starts At</label>
                <input
                  type="datetime-local"
                  value={
                    formData.starts_at
                      ? new Date(formData.starts_at)
                          .toISOString()
                          .slice(0, 16)
                      : ''
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      starts_at: e.target.value
                        ? new Date(e.target.value).toISOString()
                        : undefined,
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ends At</label>
                <input
                  type="datetime-local"
                  value={
                    formData.ends_at
                      ? new Date(formData.ends_at)
                          .toISOString()
                          .slice(0, 16)
                      : ''
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      ends_at: e.target.value
                        ? new Date(e.target.value).toISOString()
                        : undefined,
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active ?? true}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
                className="rounded"
              />
              <label className="text-sm font-medium">Active</label>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createMut.isPending || updateMut.isPending}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      ) : carousels.length === 0 ? (
        <div className="bg-gray-100 rounded-lg p-8 text-center">
          <p className="text-gray-600">No carousel items yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {carousels.map((carousel) => (
            <div
              key={carousel.id}
              className="bg-white rounded-lg shadow p-4 flex gap-4"
            >
              <img
                src={carousel.image_url}
                alt={carousel.title}
                className="w-32 h-32 object-cover rounded"
              />
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">{carousel.title}</h3>
                    {carousel.subtitle && (
                      <p className="text-sm text-gray-600">{carousel.subtitle}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(carousel)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            'Are you sure you want to delete this carousel?'
                          )
                        ) {
                          deleteMut.mutate(carousel.id)
                        }
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <span className="font-medium">Link:</span> {carousel.link_type} →{' '}
                    {carousel.link_value || 'N/A'}
                  </p>
                  <p>
                    <span className="font-medium">Order:</span> {carousel.display_order} |{' '}
                    <span className="font-medium">Status:</span>{' '}
                    {carousel.is_active ? '🟢 Active' : '🔴 Inactive'}
                  </p>
                  {carousel.starts_at && (
                    <p>
                      <span className="font-medium">Valid:</span>{' '}
                      {new Date(carousel.starts_at).toLocaleDateString()} to{' '}
                      {carousel.ends_at
                        ? new Date(carousel.ends_at).toLocaleDateString()
                        : 'No end date'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
