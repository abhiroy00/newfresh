import { useRef, useState } from 'react'
import { Copy, Check, Upload, Loader2 } from 'lucide-react'
import { optimizeCDNUrl, getImageInfo } from '../utils/cdnOptimizer'
import api from '../api/axios'
import toast from 'react-hot-toast'

interface CDNImageInputProps {
  value: string
  onChange: (url: string) => void
  placeholder?: string
}

export default function CDNImageInput({ value, onChange, placeholder }: CDNImageInputProps) {
  const [copied, setCopied] = useState(false)
  const [quality, setQuality] = useState(80)
  const [width, setWidth] = useState(470)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const imageInfo = getImageInfo(value)
  const isImageKit = imageInfo?.isImageKit || false

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    setUploading(true)
    try {
      const res = await api.post('/admin/upload-image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onChange(res.data.url)
      toast.success('Image uploaded')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleOptimize = () => {
    const optimized = optimizeCDNUrl(value, { width, quality, format: 'auto', dpr: 2 })
    onChange(optimized)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'https://cdn.example.com/image.jpg'}
          className="flex-1 border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Upload button */}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60"
          title="Upload image"
        >
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {uploading ? 'Uploading…' : 'Upload'}
        </button>

        {value && (
          <button
            type="button"
            onClick={handleCopy}
            className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            title="Copy URL"
          >
            {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-gray-600" />}
          </button>
        )}
      </div>

      {/* Preview */}
      {value && (
        <img
          src={value}
          alt="preview"
          className="h-24 rounded-lg object-cover border border-gray-200"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
      )}

      {/* Optimization Controls (only for ImageKit CDN) */}
      {isImageKit && value && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
          <p className="text-xs font-semibold text-blue-900">Optimize CDN URL:</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-blue-800 mb-1">Width: {width}px</label>
              <input type="range" min="200" max="2000" step="100" value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div>
              <label className="block text-xs font-medium text-blue-800 mb-1">Quality: {quality}%</label>
              <input type="range" min="30" max="100" step="5" value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer" />
            </div>
          </div>
          <button type="button" onClick={handleOptimize}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded-lg transition">
            Apply Optimization
          </button>
          <div className="flex gap-1 flex-wrap">
            {[
              { label: 'Thumbnail', w: 200, q: 60 },
              { label: 'List', w: 470, q: 80 },
              { label: 'Detail', w: 800, q: 85 },
              { label: 'Hero', w: 1200, q: 90 },
            ].map((preset) => (
              <button key={preset.label} type="button"
                onClick={() => { setWidth(preset.w); setQuality(preset.q) }}
                className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition">
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {imageInfo && !isImageKit && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
          <p className="text-xs text-gray-600">
            <span className="font-semibold">CDN:</span> {imageInfo.hostname}
          </p>
        </div>
      )}
    </div>
  )
}
