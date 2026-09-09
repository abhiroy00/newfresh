/**
 * CDN Image URL Optimizer
 * Helps format and optimize image URLs for better performance
 */

export interface ImageOptimizationOptions {
  width?: number
  height?: number
  quality?: number // 0-100
  format?: 'auto' | 'jpg' | 'png' | 'webp'
  dpr?: number // device pixel ratio
  aspectRatio?: string // e.g., "16:9", "1:1"
}

/**
 * Optimize a CDN image URL with transformation parameters
 * Supports ImageKit (ik-seo), Cloudinary, and other CDN services
 */
export function optimizeCDNUrl(
  url: string,
  options: ImageOptimizationOptions = {}
): string {
  // Default optimization options
  const defaults: ImageOptimizationOptions = {
    width: 470,
    quality: 80,
    format: 'auto',
    dpr: 2,
  }

  const opts = { ...defaults, ...options }

  // Check if URL is ImageKit (ik-seo)
  if (url.includes('/ik-seo/')) {
    return optimizeImageKitUrl(url, opts)
  }

  // Check if URL is Cloudinary
  if (url.includes('cloudinary.com')) {
    return optimizeCloudinaryUrl(url, opts)
  }

  // Return original URL if not recognized
  return url
}

function optimizeImageKitUrl(
  url: string,
  options: ImageOptimizationOptions
): string {
  // ImageKit transformation format: /tr:param1-value1,param2-value2/
  const transformations: string[] = []

  if (options.width) transformations.push(`w-${options.width}`)
  if (options.height) transformations.push(`h-${options.height}`)
  if (options.aspectRatio) transformations.push(`ar-${options.aspectRatio.replace(':', '-')}`)
  if (options.quality) transformations.push(`q-${options.quality}`)
  if (options.format) transformations.push(`f-${options.format}`)
  if (options.dpr) transformations.push(`dpr-${options.dpr}`)

  // Add progressive rendering
  transformations.push('pr-true')

  // If URL already has transformations, replace them
  if (url.includes('/tr:')) {
    return url.replace(/\/tr:[^/]+\//, `/tr:${transformations.join(',')}/`)
  }

  // Add transformations to URL
  const [baseUrl, path] = url.split('/ik-seo/')
  return `${baseUrl}/ik-seo/tr:${transformations.join(',')}/${path}`
}

function optimizeCloudinaryUrl(
  url: string,
  options: ImageOptimizationOptions
): string {
  // Cloudinary transformation format: /c_fill,w_470,q_80.../
  const transformations: string[] = ['c_fill']

  if (options.width) transformations.push(`w_${options.width}`)
  if (options.height) transformations.push(`h_${options.height}`)
  if (options.quality) transformations.push(`q_${options.quality}`)
  if (options.format && options.format !== 'auto') transformations.push(`f_${options.format}`)
  if (options.dpr) transformations.push(`dpr_${options.dpr}`)

  // If URL already has transformations, replace them
  if (url.includes('/upload/')) {
    return url.replace(/\/upload\/[^/]*\//, `/upload/${transformations.join(',')}/`)
  }

  return url
}

/**
 * Get recommended CDN URL for product images
 * Common sizes: 470px (product list), 800px (detail page), 1200px (hero)
 */
export function getResponsiveImageUrl(
  url: string,
  size: 'thumbnail' | 'list' | 'detail' | 'hero' = 'list'
): string {
  const sizeMap = {
    thumbnail: { width: 200, quality: 60 },
    list: { width: 470, quality: 80 },
    detail: { width: 800, quality: 85 },
    hero: { width: 1200, quality: 90 },
  }

  return optimizeCDNUrl(url, sizeMap[size])
}

/**
 * Validate if URL is a valid CDN/image URL
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
    const pathname = urlObj.pathname.toLowerCase()

    return validExtensions.some((ext) => pathname.includes(ext))
  } catch {
    return false
  }
}

/**
 * Extract image information from URL
 */
export function getImageInfo(url: string) {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname

    return {
      hostname: urlObj.hostname,
      path: pathname,
      isImageKit: urlObj.hostname.includes('ik-seo'),
      isCloudinary: urlObj.hostname.includes('cloudinary'),
      format: pathname.split('.').pop()?.toLowerCase() || 'unknown',
    }
  } catch {
    return null
  }
}
