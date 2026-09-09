import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { ArrowLeft, Save } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function ExtendedProducts() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [origin, setOrigin] = useState('')
  const [healthBenefits, setHealthBenefits] = useState('')
  const [minerals, setMinerals] = useState<any>({})
  const [vitamins, setVitamins] = useState<any>({})
  const [lowStockThreshold, setLowStockThreshold] = useState(10)

  // Fetch current product data
  const { data: product } = useQuery({
    queryKey: ['product', id],
    queryFn: () =>
      api.get(`/admin/products/${id}`).then(r => r.data),
  })

  useEffect(() => {
    if (product) {
      const d = product as any
      setOrigin(d.origin || '')
      setHealthBenefits(d.health_benefits || '')
      setMinerals(d.minerals || {})
      setVitamins(d.vitamins || {})
      setLowStockThreshold(d.low_stock_threshold || 10)
    }
  }, [product])

  const { mutate: updateExtended, isPending } = useMutation({
    mutationFn: () =>
      api.patch(`/admin/products/${id}/extended`, null, {
        params: {
          origin,
          health_benefits: healthBenefits,
          minerals: JSON.stringify(minerals),
          vitamins: JSON.stringify(vitamins),
          low_stock_threshold: lowStockThreshold,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product', id] })
      toast.success('Extended fields updated!')
    },
    onError: () => toast.error('Failed to update'),
  })

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <button
        onClick={() => navigate('/products')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-black"
      >
        <ArrowLeft size={16} /> Back to Products
      </button>

      <h1 className="text-2xl font-bold">Extended Product Fields</h1>

      {product && (
        <div className="space-y-6">
          {/* Origin */}
          <div className="bg-white rounded-2xl shadow p-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Origin / Region
            </label>
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="e.g. Kashmir, Konkan, Darjeeling"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Where this product comes from</p>
          </div>

          {/* Health Benefits */}
          <div className="bg-white rounded-2xl shadow p-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Health Benefits
            </label>
            <textarea
              value={healthBenefits}
              onChange={(e) => setHealthBenefits(e.target.value)}
              placeholder="Rich in antioxidants, promotes digestion, high in vitamin C..."
              rows={4}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Describe health benefits (supports markdown)</p>
          </div>

          {/* Minerals */}
          <div className="bg-white rounded-2xl shadow p-6">
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Minerals (per 100g)
            </label>
            <div className="space-y-2">
              {['iron', 'calcium', 'potassium', 'magnesium'].map((mineral) => (
                <div key={mineral} className="flex gap-2 items-center">
                  <label className="w-28 text-xs font-medium text-gray-700 capitalize">
                    {mineral}:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2.1mg"
                    value={minerals[mineral] || ''}
                    onChange={(e) =>
                      setMinerals({ ...minerals, [mineral]: e.target.value })
                    }
                    className="flex-1 border rounded-lg px-2 py-1 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Vitamins */}
          <div className="bg-white rounded-2xl shadow p-6">
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Vitamins (per 100g)
            </label>
            <div className="space-y-2">
              {['vitamin_a', 'vitamin_b6', 'vitamin_c', 'vitamin_e'].map((vitamin) => (
                <div key={vitamin} className="flex gap-2 items-center">
                  <label className="w-28 text-xs font-medium text-gray-700 capitalize">
                    {vitamin.replace('_', ' ')}:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 81IU or 8.7mg"
                    value={vitamins[vitamin] || ''}
                    onChange={(e) =>
                      setVitamins({ ...vitamins, [vitamin]: e.target.value })
                    }
                    className="flex-1 border rounded-lg px-2 py-1 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Stock Threshold */}
          <div className="bg-white rounded-2xl shadow p-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Low Stock Alert Threshold
            </label>
            <input
              type="number"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(Number(e.target.value))}
              min="0"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Alert when stock falls below this number</p>
          </div>

          {/* Save Button */}
          <button
            onClick={() => updateExtended()}
            disabled={isPending}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save size={18} /> {isPending ? 'Saving...' : 'Save Extended Fields'}
          </button>
        </div>
      )}
    </div>
  )
}
