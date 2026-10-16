export interface Category {
  id: string
  name: string
  slug: string
  emoji?: string | null
  image_url?: string | null
  color?: string | null
  product_count?: number
}

export interface ProductImage {
  id: string
  url: string
  sort_order: number
}

export interface Product {
  id: string
  name: string
  slug: string
  description?: string | null
  price: number
  original_price?: number | null
  unit: string
  stock: number
  is_organic: boolean
  is_featured: boolean
  badge?: string | null
  badge_color?: string | null
  primary_image_url?: string | null
  origin?: string | null
  health_benefits?: string | null
  minerals?: Record<string, string> | null
  vitamins?: Record<string, string> | null
  storage_tips?: string[] | null
  preparation_tips?: string[] | null
  category?: Category | null
  images: ProductImage[]
  created_at: string
}

export interface CartItem {
  id: string
  product_id: string
  quantity: number
  price_at_add: number
  item_total: number
  product?: Product | null
}

export interface Cart {
  id: string
  items: CartItem[]
  subtotal: number
  delivery_fee: number
  total: number
  item_count: number
}

export interface WishlistItem {
  id: string
  product_id: string
  created_at: string
  product: Product
}

export interface Address {
  id: string
  label?: string | null
  full_name: string
  phone: string
  line1: string
  line2?: string | null
  city: string
  state: string
  pincode: string
  landmark?: string | null
  latitude?: number | null
  longitude?: number | null
  is_default: boolean
}

export interface User {
  id: string
  name?: string | null
  email?: string | null
  phone: string
  has_password: boolean
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PACKED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
export type PaymentMethod = 'UPI' | 'CARD' | 'COD'

export interface OrderItem {
  id: string
  product_id?: string | null
  product_name: string
  product_image_url?: string | null
  product_unit: string
  quantity: number
  unit_price: number
  total_price: number
}

export interface Order {
  id: string
  order_number: string
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method?: PaymentMethod | null
  subtotal: number
  delivery_fee: number
  discount: number
  total: number
  notes?: string | null
  razorpay_order_id?: string | null
  address?: Address | Record<string, any> | null
  rider?: { id: string; name: string; phone: string } | null
  items: OrderItem[]
  estimated_delivery_at?: string | null
  delivered_at?: string | null
  cancelled_at?: string | null
  cancellation_reason?: string | null
  created_at: string
}

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
export type SenderType = 'CUSTOMER' | 'ADMIN'

export interface SupportMessage {
  id: string
  sender_type: SenderType
  message: string
  created_at: string
}

export interface SupportTicket {
  id: string
  subject: string
  status: TicketStatus
  messages: SupportMessage[]
  created_at: string
  updated_at?: string
}

export interface Carousel {
  id: string
  title: string
  subtitle?: string | null
  image_url: string
  link_type: 'category' | 'product' | 'external'
  link_value?: string | null
  button_text?: string | null
  display_order: number
}
