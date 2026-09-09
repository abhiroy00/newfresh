---
name: project-feature-inventory
description: "Complete inventory of all screens, API endpoints, and admin pages built in the Gmart/Freshdirect app as of June 2026"
metadata: 
  node_type: memory
  type: project
  originSessionId: 77e6b97b-1a41-4f6c-a651-13c6e3a48f16
---

# Gmart / Freshdirect — Full Feature Inventory
> Last updated: June 2026

---

## Mobile App — React Native (Expo) `freshdirect/`
**Total screens: 24 | Shared components: 5**

### Auth Flow (2)
- `app/auth/login.tsx` — Phone number entry
- `app/auth/otp.tsx` — 6-digit OTP verification

### Onboarding (1)
- `app/onboarding.tsx` — First-launch walkthrough slides

### Tab Screens (5)
- `app/tabs/index.tsx` — Home: carousel, featured products, category grid
- `app/tabs/categories.tsx` — Browse all categories
- `app/tabs/cart.tsx` — Cart items, totals, checkout entry
- `app/tabs/orders.tsx` — Order history list
- `app/tabs/profile.tsx` — User info, addresses, settings links

### Product & Shopping (4)
- `app/product/[id].tsx` — Product detail with images, add to cart
- `app/search.tsx` — Full-text product search
- `app/vegetables.tsx` — Products filtered by category
- `app/categories.tsx` — All categories grid

### Checkout & Payment (3)
- `app/location.tsx` — Confirm delivery address
- `app/payment.tsx` — Payment method, order summary
- `app/order-success.tsx` — Confirmation screen post-payment

### Order Management (2)
- `app/order/[id].tsx` — Single order detail + status
- `app/track.tsx` — Live order tracking

### Profile & Settings (4)
- `app/profile-edit.tsx` — Edit name, email
- `app/notifications.tsx` — Push notification list
- `app/help.tsx` — FAQ / support
- `app/safety.tsx` — Safety info page

### Shared Components (5)
- `components/CartToast.tsx` — Animated slide-up toast on add-to-cart (with rapid-add animation reset)
- `components/ProductCard.tsx` — Reusable card with + / − quantity control
- `components/SwipeableCartItem.tsx` — Swipe-to-delete cart row
- `components/AddAddressModal.tsx` — Bottom sheet address form
- `components/ProductSkeleton.tsx` — Loading placeholder

---

## Backend API — FastAPI `freshdirect-backend/`
**Total endpoints: 67**

### Auth — `/api/v1/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/send-otp` | Send OTP to phone (Twilio / demo mode) |
| POST | `/verify-otp` | Verify OTP → returns JWT access + refresh tokens |
| POST | `/refresh` | Refresh access token |
| POST | `/logout` | Logout |

### Users — `/api/v1/users`
| Method | Path | Description |
|---|---|---|
| GET | `/me` | Get current user profile |
| PATCH | `/me` | Update profile (name, email) |
| GET | `/addresses` | List delivery addresses |
| POST | `/addresses` | Add new address |
| PATCH | `/addresses/{id}` | Update address |
| DELETE | `/addresses/{id}` | Delete address |

### Products — `/api/v1`
| Method | Path | Description |
|---|---|---|
| GET | `/carousel` | Active carousel banners |
| GET | `/categories` | All active categories with product counts |
| GET | `/products` | Product list (filter, search, sort, paginate) |
| GET | `/products/{id}` | Single product detail |
| POST | `/products/{id}/images` | Upload product image to Cloudinary |
| POST | `/categories` | Create category (admin) |
| GET | `/admin/categories/{id}` | Get category detail |
| PATCH | `/admin/categories/{id}` | Update category |
| DELETE | `/admin/categories/{id}` | Delete category |
| POST | `/admin/categories/{id}/image` | Upload category image to Cloudinary |
| POST | `/admin/products` | Create product |
| PATCH | `/admin/products/{id}` | Update product |
| DELETE | `/admin/products/{id}` | Soft delete product |

### Extended Products — `/api/v1`
| Method | Path | Description |
|---|---|---|
| PATCH | `/products/{id}/extended` | Update nutritional / extended fields |
| POST | `/products/bulk-price-upload` | CSV bulk price update |
| POST | `/products/{id}/schedule-price` | Schedule a future price change |
| GET | `/products/{id}/price-history` | Price change history |
| GET | `/products/{id}/configure-stock` | Get stock thresholds |
| PATCH | `/products/{id}/configure-stock` | Set stock thresholds |

### Cart — `/api/v1/cart`
| Method | Path | Description |
|---|---|---|
| GET | `` | Get current cart with totals |
| POST | `/items` | Add item to cart |
| PUT | `/items/{id}` | Update item quantity |
| DELETE | `/items/{id}` | Remove item |
| DELETE | `` | Clear entire cart |

### Orders — `/api/v1/orders`
| Method | Path | Description |
|---|---|---|
| POST | `` | Create order from cart |
| GET | `` | List user's orders |
| GET | `/{id}` | Get single order |
| POST | `/{id}/cancel` | Cancel order |
| PATCH | `/{id}/status` | Update order status |

### Payments — `/api/v1/payments`
| Method | Path | Description |
|---|---|---|
| POST | `/create-order` | Create Razorpay order |
| POST | `/verify` | Verify Razorpay payment signature |
| POST | `/webhook` | Razorpay webhook handler |

### Notifications — `/api/v1`
| Method | Path | Description |
|---|---|---|
| POST | `/register-token` | Register FCM push token for device |

### Services & Settings — `/api/v1`
| Method | Path | Description |
|---|---|---|
| GET | `/services` | List service offerings |
| POST | `/services` | Create service |
| PATCH | `/services/{id}` | Update service |
| DELETE | `/services/{id}` | Delete service |
| GET | `/settings` | Get all app settings |
| PATCH | `/settings/app-config` | Update app config |
| PATCH | `/settings/payment-gateway` | Update payment gateway config |
| PATCH | `/settings/tax-config` | Update tax settings |
| PATCH | `/settings/delivery-config` | Update delivery settings |
| GET | `/delivery-zones` | List delivery zones |
| POST | `/delivery-zones` | Create delivery zone |
| PATCH | `/delivery-zones/{id}` | Update delivery zone |
| DELETE | `/delivery-zones/{id}` | Delete delivery zone |

### Admin API — `/api/v1`
| Method | Path | Description |
|---|---|---|
| POST | `/auth/login` | Admin email + password login |
| GET | `/auth/me` | Admin profile |
| GET | `/products` | Admin product list (paginated, searchable) |
| GET | `/products/{id}` | Admin product detail |
| POST | `/products` | Create product |
| PUT | `/products/{id}` | Update product |
| DELETE | `/products/{id}` | Soft delete product |
| GET | `/admin/orders` | List all orders (paginated, status filter) |
| GET | `/admin/orders/{id}` | Order detail with address snapshot |
| PATCH | `/admin/orders/{id}/status` | Update order status |
| POST | `/admin/orders/{id}/assign-driver` | Assign delivery driver |
| POST | `/admin/orders/{id}/cancel` | Admin cancel order |
| GET | `/admin/orders/{id}/timeline` | Order status timeline |
| GET | `/admin/users` | List users (paginated, searchable) |
| GET | `/admin/users/{id}` | User detail with order count |
| DELETE | `/admin/users/{id}` | Deactivate user |
| GET | `/admin/carousel` | List all carousel items |
| POST | `/admin/carousel` | Create carousel banner |
| PUT | `/admin/carousel/{id}` | Update carousel banner |
| DELETE | `/admin/carousel/{id}` | Delete carousel banner |
| GET | `/admin/stats` | Dashboard stats (revenue, orders, users, products) |
| GET | `/admin/dashboard/realtime` | Live counters (active orders, revenue today, low stock) |
| GET | `/admin/reports/sales` | Sales report with date range filter |
| GET | `/admin/reports/orders` | Order metrics (fulfillment rate, cancellation rate) |

---

## Admin Panel — React + Vite `admin/`
**Total pages: 15**

| Page | File | Description |
|---|---|---|
| Login | `Login.tsx` | Email + password admin login |
| Dashboard | `Dashboard.tsx` | KPI cards, revenue chart, recent orders, live counters |
| Products | `Products.tsx` | Product list with search and pagination |
| Add/Edit Product | `AddEditProduct.tsx` | Product form (create + edit with image upload) |
| Extended Products | `ExtendedProducts.tsx` | Nutritional info, bulk price upload, schedule price |
| Inventory | `Inventory.tsx` | Stock levels, low-stock alerts, configure thresholds |
| Categories | `Categories.tsx` | Category list, create/edit/delete, image upload |
| Carousel | `Carousel.tsx` | Banner management, reorder, activate/deactivate |
| Orders | `Orders.tsx` | Order list with status filter and pagination |
| Order Detail | `OrderDetail.tsx` | Full order detail, status update, timeline view |
| Users | `Users.tsx` | Customer list, search, deactivate |
| Sales Report | `SalesReport.tsx` | Revenue breakdown, daily chart, date range filter |
| Orders Report | `OrdersReport.tsx` | Fulfillment rate, cancellation rate, status breakdown |
| Services | `Services.tsx` | Service offerings management |
| Settings | `Settings.tsx` | App config, payment gateway, tax, delivery settings |

---

## Grand Total

| Layer | Count |
|---|---|
| Mobile screens | 24 |
| Mobile shared components | 5 |
| Backend API endpoints | 67 |
| Admin panel pages | 15 |
| **Total units built** | **111** |

---

## Tech Stack
- **Mobile**: React Native, Expo Router, Reanimated, Zustand, react-native-safe-area-context
- **Backend**: FastAPI, SQLAlchemy 2.0 async, Alembic, PostgreSQL (RDS), Redis, Celery, Cloudinary, Razorpay, Twilio
- **Admin**: React 18, Vite, TypeScript, Recharts, Axios
- **Infra**: EC2 (t3.small) + Docker Compose, RDS PostgreSQL, AWS Amplify, GitHub Actions CI/CD
