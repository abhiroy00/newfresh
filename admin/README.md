# E-Commerce Admin Panel

A full-featured React + TypeScript admin panel for the FastAPI e-commerce backend.

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** – build tool
- **Tailwind CSS** – styling
- **React Query (@tanstack/react-query)** – server state
- **Zustand** – auth state
- **React Router v6** – routing
- **React Hook Form + Zod** – forms & validation
- **Recharts** – charts
- **Axios** – HTTP client
- **Lucide React** – icons
- **React Hot Toast** – notifications

## Setup

```bash
npm install
npm run dev
```

The dev server runs at http://localhost:5173

## Configuration

Update the `baseURL` in `src/api/axios.ts` to point to your FastAPI backend:

```ts
baseURL: 'http://localhost:8000/api'
```

## Pages

| Route | Page | Description |
|---|---|---|
| `/login` | Login | JWT login |
| `/` | Dashboard | Stats cards + revenue chart + order breakdown |
| `/products` | Products | List, search, paginate, delete |
| `/products/new` | Add Product | Create new product |
| `/products/:id/edit` | Edit Product | Update existing product |
| `/orders` | Orders | List, filter by status, update status inline |
| `/orders/:id` | Order Detail | Full order view with items |
| `/users` | Users | List, search, paginate, delete |

## Backend Admin API

All admin endpoints are served from `freshdirect-backend/app/api/admin.py`, mounted on `/api` to match the admin panel's `baseURL`.

| Endpoint | Purpose |
|---|---|
| `POST /api/auth/login` | Email + password admin login (accepts "admin123" or the user's phone as password in dev) |
| `GET /api/auth/me` | Get current admin user info |
| `GET /api/products` | Paginated product list with search (returns `items`, `total_pages`) |
| `GET /api/products/:id` | Single product detail |
| `POST /api/products` | Create product (JSON) |
| `PUT /api/products/:id` | Update product |
| `DELETE /api/products/:id` | Soft-delete product |
| `GET /api/orders` | Admin order list (all users, with status filter) |
| `GET /api/orders/:id` | Order detail with items, user, address |
| `PATCH /api/orders/:id/status` | Update order status |
| `GET /api/admin/users` | Paginated user list with search & order counts |
| `GET /api/admin/users/:id` | Single user detail |
| `DELETE /api/admin/users/:id` | Deactivate user |
| `GET /api/admin/stats` | Dashboard stats (revenue, totals, daily chart, orders by status, recent orders) |

## Stats API Response Shape

```json
{
  "revenue": 99999,
  "total_orders": 120,
  "total_products": 45,
  "total_users": 200,
  "daily_revenue": [{"date": "2026-06-01", "revenue": 5000}, ...],
  "orders_by_status": [{"status": "delivered", "count": 80}, ...],
  "recent_orders": [{"id": "...", "total": 499, "status": "pending", "user": {"name": "John"}}]
}
```

## Creating an Admin User

Run in your database:

```sql
UPDATE users SET email = 'admin@store.com', is_admin = true WHERE phone = '<your-phone>';
```

Then log in with email `admin@store.com` and password `admin123`.
