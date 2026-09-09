# Gmart Backend — FastAPI

Complete FastAPI backend for the Gmart grocery delivery app.

## Stack
| Layer | Tech |
|-------|------|
| Framework | FastAPI 0.115 |
| Database | PostgreSQL 16 + SQLAlchemy 2.0 (async) |
| Migrations | Alembic |
| Cache / OTP | Redis 7 |
| Auth | JWT (HS256) + OTP via Twilio |
| Payments | Razorpay |
| Push Notifications | Firebase Admin SDK |
| Image Upload | Cloudinary |
| Task Queue | Celery + Redis |
| Containers | Docker + Docker Compose |

## Quick Start

```bash
# 1. Clone and setup
cp .env.example .env
# Edit .env with your secrets

# 2. Run with Docker Compose (recommended)
docker-compose up --build

# 3. Run migrations
docker-compose exec api alembic upgrade head

# 4. Seed demo data
docker-compose exec api python scripts/seed.py

# 5. Open API docs
# http://localhost:8000/docs
```

## Manual Setup (without Docker)
```bash
pip install -r requirements.txt
alembic upgrade head
python scripts/seed.py
uvicorn app.main:app --reload
```

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/auth/send-otp | Send 6-digit OTP to phone |
| POST | /api/v1/auth/verify-otp | Verify OTP, get JWT tokens |
| POST | /api/v1/auth/refresh | Refresh access token |
| POST | /api/v1/auth/logout | Logout (invalidate token) |

### Users
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/users/me | Get current user profile |
| PATCH | /api/v1/users/me | Update profile |
| GET | /api/v1/users/addresses | List addresses |
| POST | /api/v1/users/addresses | Add address |
| PATCH | /api/v1/users/addresses/{id} | Update address |
| DELETE | /api/v1/users/addresses/{id} | Delete address |

### Products
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/categories | List all categories |
| GET | /api/v1/products | List products (search, filter, paginate) |
| GET | /api/v1/products/{id} | Get product detail |
| POST | /api/v1/admin/products | Create product (admin) |
| PATCH | /api/v1/admin/products/{id} | Update product (admin) |
| DELETE | /api/v1/admin/products/{id} | Delete product (admin) |
| POST | /api/v1/admin/products/{id}/images | Upload product image |

### Cart
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/cart | Get cart with totals |
| POST | /api/v1/cart/items | Add item to cart |
| PUT | /api/v1/cart/items/{id} | Update item quantity |
| DELETE | /api/v1/cart/items/{id} | Remove item |
| DELETE | /api/v1/cart | Clear entire cart |

### Orders
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/orders | Place order from cart |
| GET | /api/v1/orders | List user orders (paginated) |
| GET | /api/v1/orders/{id} | Get order detail |
| POST | /api/v1/orders/{id}/cancel | Cancel order |
| PATCH | /api/v1/orders/{id}/status | Update status (admin) |

### Payments
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/payments/create-order | Create Razorpay order |
| POST | /api/v1/payments/verify | Verify payment signature |
| POST | /api/v1/payments/webhook | Razorpay webhook handler |

### Notifications
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/notifications/register-token | Register FCM device token |

### Admin Panel API (`/api`)
Dedicated endpoints for the React admin panel at `http://localhost:5173`.

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/login | Email + password admin login |
| GET | /api/auth/me | Get current admin user info |
| GET | /api/products | Paginated product list with search |
| GET | /api/products/{id} | Single product detail |
| POST | /api/products | Create product (JSON) |
| PUT | /api/products/{id} | Update product |
| DELETE | /api/products/{id} | Soft-delete product |
| GET | /api/orders | All orders (filterable by status) |
| GET | /api/orders/{id} | Order detail with items, user, address |
| PATCH | /api/orders/{id}/status | Update order status |
| GET | /api/admin/users | Paginated user list with order counts |
| GET | /api/admin/users/{id} | Single user detail |
| DELETE | /api/admin/users/{id} | Deactivate user |
| GET | /api/admin/stats | Dashboard stats (revenue, totals, charts) |

**Creating an admin user:**
```sql
UPDATE users SET email = 'admin@store.com', is_admin = true WHERE phone = '<your-phone>';
```
Login with `admin@store.com` / `admin123`.

## OTP Demo Mode
In `.env`, set `OTP_DEMO_MODE=true` (default). The API returns the OTP in the response — any 6-digit code also works. **Disable in production!**

## Project Structure
```
backend/
app/
  api/
    admin.py     # Admin panel endpoints (/api)
    v1/
      endpoints/ # auth, users, products, cart, orders, payments, notifications
      deps.py    # JWT auth dependency
      router.py  # Route registration
  core/
    config.py    # Settings (pydantic-settings)
    database.py  # SQLAlchemy async engine + session
    security.py  # JWT, OTP, Razorpay signature utils
    redis_client.py  # Redis helpers (OTP, cache, blacklist)
  models/        # SQLAlchemy ORM models
  schemas/       # Pydantic request/response schemas
  services/      # Business logic layer
  middleware.py  # Request logging
  main.py        # FastAPI app + lifespan
  worker.py      # Celery app
  tasks.py       # Celery tasks (push notifications)
alembic/         # DB migrations
scripts/
  seed.py        # Demo data (categories + 20 products)
Dockerfile
docker-compose.yml
.env.example
```
