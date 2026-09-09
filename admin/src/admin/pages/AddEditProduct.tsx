import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createProduct, getProduct, updateProduct, getCategories } from '../api/products'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Upload, X, ImagePlus, Info, Image as ImageIcon, Search as SearchIcon, Eye, Tag as TagIcon, Save } from 'lucide-react'
import api from '../api/axios'
import RichTextEditor from '../components/RichTextEditor'
import CDNImageInput from '../components/CDNImageInput'

const BADGE_PRESETS = [
  { label: 'Bestseller', color: '#28c38a' },
  { label: 'New', color: '#fd761a' },
  { label: 'Season Special', color: '#fd761a' },
  { label: 'Artisan', color: '#9d4300' },
  { label: 'ORGANIC', color: '#28c38a' },
  { label: 'FRESH', color: '#005322' },
  { label: 'PREMIUM', color: '#fd761a' },
  { label: 'Sale', color: '#e53e3e' },
]

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  name_hi: z.string().optional().or(z.literal('')),
  description: z.string().min(1, 'Description is required'),
  price: z.coerce.number().positive('Price must be positive'),
  original_price: z.coerce.number().positive().optional().or(z.literal('')),
  stock: z.coerce.number().int().min(0, 'Stock cannot be negative'),
  unit: z.string().optional(),
  sku: z.string().optional().or(z.literal('')),
  slug: z.string().optional().or(z.literal('')),
  tags: z.string().optional().or(z.literal('')),
  meta_title: z.string().max(60).optional().or(z.literal('')),
  meta_description: z.string().max(160).optional().or(z.literal('')),
  primary_image_url: z.string().optional().or(z.literal('')),
  category_id: z.string().optional(),
  badge: z.string().optional().or(z.literal('')),
  badge_color: z.string().optional().or(z.literal('')),
  is_organic: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  origin: z.string().optional().or(z.literal('')),
  health_benefits: z.string().optional().or(z.literal('')),
  storage_tips: z.string().optional().or(z.literal('')),
  preparation_tips: z.string().optional().or(z.literal('')),
})

type ProductForm = z.infer<typeof schema>

type TabId = 'details' | 'media' | 'seo' | 'preview'
const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'details', label: 'Details', icon: Info },
  { id: 'media', label: 'Media', icon: ImageIcon },
  { id: 'seo', label: 'SEO', icon: SearchIcon },
  { id: 'preview', label: 'Preview', icon: Eye },
]

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
}

export default function AddEditProduct() {
  const { id } = useParams()
  const isEdit = !!id && id !== 'new'
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [uploading, setUploading] = useState(false)
  const [gallery, setGallery] = useState<{ id: string; url: string }[]>([])
  const [galleryUrl, setGalleryUrl] = useState('')
  const [galleryBusy, setGalleryBusy] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('details')

  const { data: product } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProduct(id!),
    enabled: isEdit,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

  const { register, handleSubmit, reset, watch, setValue, getValues, formState: { errors, isSubmitting } } = useForm<ProductForm>({ resolver: zodResolver(schema) })
  const hydratedId = useRef<string | null>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !isEdit) return
    setUploading(true)
    try {
      const formData = new FormData(); formData.append('file', file)
      const { data } = await api.post(`/products/${id}/images`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setValue('primary_image_url', data.url); toast.success('Image uploaded!')
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Upload failed') }
    finally { setUploading(false) }
  }

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length || !isEdit) return
    setGalleryBusy(true)
    try {
      for (const file of files) {
        const fd = new FormData(); fd.append('file', file)
        const { data } = await api.post(`/products/${id}/images`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        setGallery((g) => [...g, { id: data.id, url: data.url }])
      }
      toast.success(`${files.length} image${files.length > 1 ? 's' : ''} added`)
      qc.invalidateQueries({ queryKey: ['products'] })
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Upload failed') }
    finally { setGalleryBusy(false); e.target.value = '' }
  }

  const handleGalleryUrlAdd = async () => {
    if (!galleryUrl.trim() || !isEdit) return
    setGalleryBusy(true)
    try {
      const { data } = await api.post(`/products/${id}/images/url`, { url: galleryUrl.trim() })
      setGallery((g) => [...g, { id: data.id, url: data.url }]); setGalleryUrl(''); toast.success('Image added')
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed to add image') }
    finally { setGalleryBusy(false) }
  }

  const handleGalleryDelete = async (imageId: string) => {
    try {
      await api.delete(`/products/${id}/images/${imageId}`)
      setGallery((g) => g.filter((img) => img.id !== imageId)); toast.success('Image removed')
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed to remove image') }
  }

  useEffect(() => {
    if (product && hydratedId.current !== product.id) {
      hydratedId.current = product.id
      setGallery(product.images || [])
      const [nameEn, ...hiParts] = (product.name || '').split(' / ')
      reset({
        ...product, name: nameEn, name_hi: hiParts.join(' / '),
        unit: product.unit || '', sku: product.sku || '', slug: product.slug || '',
        tags: Array.isArray(product.tags) ? product.tags.join(', ') : (product.tags || ''),
        meta_title: product.meta_title || '', meta_description: product.meta_description || '',
        primary_image_url: product.primary_image_url || product.images?.[0]?.url || '',
        category_id: product.category?.id || '', badge: product.badge || '', badge_color: product.badge_color || '',
        original_price: product.original_price || '', is_organic: product.is_organic ?? false, is_featured: product.is_featured ?? false,
        origin: product.origin || '', health_benefits: product.health_benefits || '',
        storage_tips: Array.isArray(product.storage_tips) ? product.storage_tips.join('\n') : (product.storage_tips || ''),
        preparation_tips: Array.isArray(product.preparation_tips) ? product.preparation_tips.join('\n') : (product.preparation_tips || ''),
      })
    }
  }, [product, reset])

  useEffect(() => {
    if (product && categories.length > 0 && !getValues('category_id')) {
      setValue('category_id', product.category?.id || '', { shouldDirty: false })
    }
  }, [categories.length, product, getValues, setValue])

  const { mutateAsync: save } = useMutation({
    mutationFn: (data: ProductForm) => {
      const { name_hi, tags, storage_tips, preparation_tips, ...rest } = data
      const payload: Record<string, unknown> = { ...rest, name: name_hi?.trim() ? `${data.name.trim()} / ${name_hi.trim()}` : data.name.trim() }
      if (typeof tags === 'string') payload.tags = tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      if (typeof storage_tips === 'string') payload.storage_tips = storage_tips.split('\n').map((t: string) => t.trim()).filter(Boolean)
      if (typeof preparation_tips === 'string') payload.preparation_tips = preparation_tips.split('\n').map((t: string) => t.trim()).filter(Boolean)
      return isEdit ? updateProduct(id!, payload) : createProduct(payload as any)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success(isEdit ? 'Product updated!' : 'Product created!'); navigate('/products') },
    onError: () => toast.error('Something went wrong'),
  })

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'linear-gradient(180deg, #f5faf5 0%, #eff5ee 100%)' }}>
      {/* Header */}
      <div className="bg-white/80 backdrop-blur border-b border-green-100 shrink-0">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate('/products')} className="p-1.5 hover:bg-green-50 rounded-lg transition shrink-0">
              <ArrowLeft size={20} className="text-gray-500" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">
                {isEdit ? (product?.name ? `Edit: ${product.name.split(' / ')[0]}` : 'Edit Product') : 'Add New Product'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => navigate('/products')} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" form="product-form" disabled={isSubmitting} className="btn-primary gap-1.5">
              <Save size={15} /> {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 px-6 border-t border-green-50">
          {TABS.map((t) => {
            const Icon = t.icon; const active = activeTab === t.id
            return (
              <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all duration-200 ${active ? 'border-green-600 text-green-700' : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'}`}>
                <Icon size={13} /> {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Body — Sticky Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Main content area (scrolls) */}
        <div className="flex-1 overflow-y-auto p-6 animate-fade-in">
          <form id="product-form" onSubmit={handleSubmit((d) => save(d))} className="max-w-4xl space-y-5">

            {/* ─── DETAILS TAB ─── */}
            {activeTab === 'details' && (
              <>
                {/* Description - full width */}
                <div className="bg-white rounded-2xl border border-green-100 p-6" style={{ boxShadow: '0 1px 3px rgba(0,50,20,0.04), 0 4px 12px rgba(0,50,20,0.06)' }}>
                  <h2 className="text-base font-bold text-gray-900 mb-3">Description <span className="text-xs font-normal text-gray-400">*</span></h2>
                  <RichTextEditor value={watch('description')} onChange={(val) => setValue('description', val)} placeholder="Write a detailed product description..." />
                  {errors.description && <p className="text-red-500 text-xs mt-2">{errors.description.message}</p>}
                </div>
              </>
            )}

            {/* ─── MEDIA TAB ─── */}
            {activeTab === 'media' && (
              <div className="space-y-5">
                <div className="bg-white rounded-2xl border border-green-100 p-6" style={{ boxShadow: '0 1px 3px rgba(0,50,20,0.04), 0 4px 12px rgba(0,50,20,0.06)' }}>
                  <h2 className="text-base font-bold text-gray-900 mb-4">Primary Image</h2>
                  <div className="space-y-4">
                    <label className="flex items-center justify-center gap-3 px-4 py-5 border-2 border-dashed border-green-200 rounded-xl cursor-pointer hover:border-green-400 hover:bg-green-50/50 transition flex-1">
                      <Upload size={18} className="text-green-600" />
                      <div>
                        <span className="text-sm font-medium text-gray-700">{uploading ? 'Uploading...' : 'Upload image'}</span>
                        <p className="text-xs text-gray-400 mt-0.5">Click to select file</p>
                      </div>
                      <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="hidden" />
                    </label>
                    <div className="flex items-center gap-2"><div className="flex-1 h-px bg-green-100" /><span className="text-xs text-gray-400">OR paste URL</span><div className="flex-1 h-px bg-green-100" /></div>
                    <CDNImageInput value={watch('primary_image_url') ?? ''} onChange={(val) => setValue('primary_image_url', val)} placeholder="https://cdn.example.com/image.jpeg" />
                    {watch('primary_image_url') && (
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <img src={watch('primary_image_url')} alt="Preview" className="w-full max-h-56 rounded-lg object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-green-100 p-6" style={{ boxShadow: '0 1px 3px rgba(0,50,20,0.04), 0 4px 12px rgba(0,50,20,0.06)' }}>
                  <h2 className="text-base font-bold text-gray-900 mb-1">Gallery Images</h2>
                  <p className="text-xs text-gray-400 mb-4">Extra photos for the image carousel</p>
                  {!isEdit ? (
                    <p className="text-sm text-gray-400 bg-gray-50 border border-dashed border-green-200 rounded-xl px-4 py-6 text-center">Save the product first, then add gallery images</p>
                  ) : (
                    <div className="space-y-3">
                      {gallery.length > 0 && (
                        <div className="grid grid-cols-5 gap-3">
                          {gallery.map((img) => (
                            <div key={img.id} className="relative group border border-gray-100 rounded-lg overflow-hidden bg-gray-50">
                              <img src={img.url} alt="" className="w-full h-20 object-cover" />
                              <button type="button" onClick={() => handleGalleryDelete(img.id)}
                                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"><X size={10} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                      <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-green-200 rounded-xl cursor-pointer hover:border-green-400 hover:bg-green-50/50 transition">
                        <ImagePlus size={15} className="text-green-600" /> <span className="text-sm text-gray-600">{galleryBusy ? 'Uploading...' : 'Upload images (multi-select)'}</span>
                        <input type="file" accept="image/*" multiple onChange={handleGalleryUpload} disabled={galleryBusy} className="hidden" />
                      </label>
                      <div className="flex gap-2">
                        <input type="text" value={galleryUrl} onChange={(e) => setGalleryUrl(e.target.value)} placeholder="or paste CDN URL" className="flex-1 input-field" />
                        <button type="button" onClick={handleGalleryUrlAdd} disabled={galleryBusy || !galleryUrl.trim()} className="btn-primary text-xs">Add</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── SEO TAB ─── */}
            {activeTab === 'seo' && (
              <div className="space-y-5">
                <div className="bg-white rounded-2xl border border-green-100 p-6" style={{ boxShadow: '0 1px 3px rgba(0,50,20,0.04), 0 4px 12px rgba(0,50,20,0.06)' }}>
                  <h2 className="text-base font-bold text-gray-900 mb-4">Identifiers & SEO</h2>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">SKU</label>
                      <input {...register('sku')} type="text" placeholder="e.g. FRUIT-APPLE-500G" className="input-field font-mono" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Slug</label>
                      <div className="flex gap-2">
                        <input {...register('slug')} type="text" placeholder="fresh-tomatoes" className="input-field flex-1 font-mono" />
                        <button type="button" onClick={() => setValue('slug', slugify(watch('name') || ''))} className="px-3 py-2 bg-green-50 hover:bg-green-100 rounded-lg text-xs font-semibold text-green-700">Generate</button>
                      </div>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-600 mb-1"><TagIcon size={11} className="inline mr-1" />Tags (comma-separated)</label>
                    <input {...register('tags')} type="text" placeholder="fresh, seasonal, imported" className="input-field" />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-1"><label className="text-xs font-medium text-gray-600">Meta Title</label><span className="text-xs text-gray-400">{(watch('meta_title') || '').length}/60</span></div>
                      <input {...register('meta_title')} type="text" placeholder="Best Fresh Tomatoes | Gmart" className="input-field" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1"><label className="text-xs font-medium text-gray-600">Meta Description</label><span className="text-xs text-gray-400">{(watch('meta_description') || '').length}/160</span></div>
                      <textarea {...register('meta_description')} rows={3} placeholder="Buy farm-fresh tomatoes delivered to your door..." className="input-field" />
                    </div>
                    <div className="border border-green-100 rounded-xl p-4 bg-green-50/30">
                      <p className="text-[10px] text-gray-400 mb-1">Search Preview</p>
                      <p className="text-sm text-green-700 font-medium">{watch('meta_title') || watch('name') || 'Product Title'}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{watch('meta_description') || 'Product description will appear here...'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── PREVIEW TAB ─── */}
            {activeTab === 'preview' && (
              <div className="grid grid-cols-2 gap-5">
                <div className="bg-white rounded-2xl border border-green-100 p-6" style={{ boxShadow: '0 1px 3px rgba(0,50,20,0.04), 0 4px 12px rgba(0,50,20,0.06)' }}>
                  <h2 className="text-base font-bold text-gray-900 mb-4">Card Preview</h2>
                  <div className="max-w-[200px] mx-auto border border-gray-100 rounded-2xl overflow-hidden bg-white">
                    <div className="relative bg-gray-50 aspect-square flex items-center justify-center">
                      {watch('primary_image_url') ? <img src={watch('primary_image_url')} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={32} className="text-gray-300" />}
                      {watch('badge') && <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-white text-[10px] font-bold" style={{ backgroundColor: watch('badge_color') || '#28c38a' }}>{watch('badge')}</span>}
                      {watch('is_organic') && <span className="absolute top-2 right-2 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">ORGANIC</span>}
                    </div>
                    <div className="p-2.5">
                      <p className="text-[10px] text-gray-400">{watch('unit') || '—'}</p>
                      <p className="text-xs font-semibold text-gray-800 line-clamp-2">{watch('name') || 'Product name'}{watch('name_hi') ? ` / ${watch('name_hi')}` : ''}</p>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-sm font-bold text-gray-900">₹{watch('price') || 0}</span>
                        {watch('original_price') ? <span className="text-[10px] text-gray-400 line-through">₹{watch('original_price')}</span> : null}
                      </div>
                      <div className="mt-2 w-full bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold py-1 rounded-lg text-center">ADD</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-green-100 p-6" style={{ boxShadow: '0 1px 3px rgba(0,50,20,0.04), 0 4px 12px rgba(0,50,20,0.06)' }}>
                  <h2 className="text-base font-bold text-gray-900 mb-4">Detail Preview</h2>
                  <div className="space-y-3">
                    {watch('primary_image_url') && <img src={watch('primary_image_url')} alt="" className="w-full max-h-48 object-contain rounded-lg bg-gray-50" />}
                    <h3 className="text-lg font-bold text-gray-900">{watch('name') || 'Product name'}{watch('name_hi') ? <span className="text-gray-400 font-medium text-sm ml-1"> / {watch('name_hi')}</span> : null}</h3>
                    <p className="text-sm text-gray-500">{watch('unit')}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-green-700">₹{watch('price') || 0}</span>
                      {watch('original_price') ? <span className="text-sm text-gray-400 line-through">₹{watch('original_price')}</span> : null}
                    </div>
                    <div className="text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: watch('description') || '<p class="text-gray-400 italic">No description yet.</p>' }} />
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* RIGHT: Sticky sidebar form fields (scrolls independently) */}
        <div className="w-[340px] shrink-0 border-l border-green-100 bg-white/60 backdrop-blur overflow-y-auto p-4 space-y-3">
          {/* Product Name */}
          <div className="bg-white rounded-xl border border-green-100 p-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Product Name *</label>
              <input {...register('name')} type="text" placeholder="e.g. Fresh Tomatoes" className="input-field" />
              {errors.name && <p className="text-red-500 text-[10px] mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Name (Hindi)</label>
              <input {...register('name_hi')} type="text" placeholder="e.g. ताज़े टमाटर" className="input-field" />
            </div>
            {watch('name') && watch('name_hi') && (
              <div className="bg-green-50 rounded-lg px-3 py-2"><p className="text-[10px] text-gray-500">Display:</p><p className="text-xs font-medium text-gray-800">{watch('name')} / {watch('name_hi')}</p></div>
            )}
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-xl border border-green-100 p-4 space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pricing</h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Price (₹) *</label>
              <input {...register('price')} type="number" placeholder="49" className="input-field" />
              {errors.price && <p className="text-red-500 text-[10px] mt-1">{errors.price.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Original Price</label>
              <input {...register('original_price')} type="number" placeholder="65 (optional)" className="input-field" />
            </div>
          </div>

          {/* Inventory */}
          <div className="bg-white rounded-xl border border-green-100 p-4 space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Inventory</h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Stock *</label>
              <input {...register('stock')} type="number" placeholder="100" className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
              <input {...register('unit')} type="text" placeholder="500g, 1 kg, 6 pcs" className="input-field" />
            </div>
          </div>

          {/* Category */}
          <div className="bg-white rounded-xl border border-green-100 p-4">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Category</label>
            <select {...register('category_id')} className="input-field">
              <option value="">Select category</option>
              {categories.map((cat: any) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>

          {/* Badge */}
          <div className="bg-white rounded-xl border border-green-100 p-4 space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Badge</h3>
            <div className="flex flex-wrap gap-1.5">
              {BADGE_PRESETS.map((p) => (
                <button key={p.label} type="button" onClick={() => { setValue('badge', p.label); setValue('badge_color', p.color) }}
                  className="px-2 py-0.5 rounded-full text-white text-[10px] font-bold" style={{ backgroundColor: p.color }}>{p.label}</button>
              ))}
              <button type="button" onClick={() => { setValue('badge', ''); setValue('badge_color', '') }} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-400">Clear</button>
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <input {...register('badge')} type="text" placeholder="Badge text" className="input-field" />
              </div>
              <input type="color" value={watch('badge_color') || '#28c38a'} onChange={(e) => setValue('badge_color', e.target.value)} className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5" />
            </div>
          </div>

          {/* Flags */}
          <div className="bg-white rounded-xl border border-green-100 p-4 space-y-2.5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Flags</h3>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" {...register('is_organic')} className="w-4 h-4 rounded accent-green-600" />
              <span className="text-sm text-gray-700">Organic product</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" {...register('is_featured')} className="w-4 h-4 rounded accent-green-600" />
              <span className="text-sm text-gray-700">Featured on home</span>
            </label>
          </div>

          {/* Product Info */}
          <div className="bg-white rounded-xl border border-green-100 p-4 space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Product Info</h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">🌍 Origin</label>
              <input {...register('origin')} type="text" placeholder="e.g. Kashmir, Konkan" className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">❤️ Health Benefits</label>
              <textarea {...register('health_benefits')} rows={2} placeholder="Rich in vitamins..." className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">📦 Storage Tips</label>
              <textarea {...register('storage_tips')} rows={3} placeholder="One tip per line" className="input-field font-mono text-xs" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">🍳 Preparation Tips</label>
              <textarea {...register('preparation_tips')} rows={3} placeholder="One tip per line" className="input-field font-mono text-xs" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}