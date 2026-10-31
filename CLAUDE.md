# CLAUDE.md — Gmart (Freshdirect) project memory

> **Rules for every session**
> 1. Read this file before making any change.
> 2. After every code change, update the relevant sections here (Change log, Known issues, Pending tasks, Decisions) in the same commit.
> 3. Don't break existing behaviour: check every consumer of an endpoint (admin, storefront, mobile) before changing its shape.

Last full codebase review: 2026-10-27.

---

## 1. What this is

**Gmart** (brand: Gmart Fresh, gmartfresh.com; code/infra names still say "freshdirect") is a grocery-delivery platform for India (INR, IST, Razorpay, Twilio OTP). It's a monorepo with four apps sharing one API:

| Dir | App | Stack | Deployed to |
|---|---|---|---|
| `freshdirect-backend/` | REST API + Celery worker | FastAPI 0.115, SQLAlchemy 2 async (asyncpg), Alembic, PostgreSQL, Redis 7, Celery 5 (beat embedded), Razorpay, Twilio Verify, Cloudinary, Expo Push | EC2 (`13.200.184.107`, Ubuntu) via Docker Compose → `https://api.gmartfresh.com` (ALB + ACM TLS → :8000) |
| `admin/` | Admin + Rider portal | React 19, Vite 8, TS, Tailwind 4, React Query, Zustand, react-hook-form + zod, Recharts, react-quill-new | EC2 nginx `/var/www/admin` (also historically Amplify `main.d1cr5kgmgeoc49.amplifyapp.com`) |
| `storefront/` | Customer web shop | React 19, Vite 8, TS, Tailwind 4, React Query, Zustand, DOMPurify | EC2 nginx `/var/www/shop` → `https://shop.gmartfresh.com` |
| `freshdirect/` | Customer mobile app | Expo SDK 54, RN 0.81, expo-router 6, Zustand, React Query, Reanimated 4, react-native-razorpay, expo-notifications, expo-updates | EAS build + OTA (`preview` and `production` channels). Android pkg `com.gmartfresh.app` |

Production DB is PostgreSQL outside the compose stack (RDS, via `DATABASE_URL` in the server's `.env`). Redis runs as a compose container.

---

## 2. Architecture

```
Mobile (Expo) ─┐
Storefront ────┼──HTTPS──> ALB (ACM) ──HTTP──> EC2:8000  gunicorn+uvicorn (2 workers)  app.main:app
Admin/Rider ───┘                                  │
                                                  ├── PostgreSQL (DATABASE_URL, RDS)
                                                  ├── Redis container (db0 cache/OTP/JWT blacklist, db1 broker, db2 results)
                                                  └── celery container: worker -B (beat embedded)
                                                         └── daily 20:00 IST "no order today" push
External: Razorpay (payments + webhook), Twilio Verify (SMS OTP), Cloudinary (images), Expo Push API.
```

### Backend layout (`freshdirect-backend/app/`)
- `main.py`: app, CORS/GZip/logging middleware, global JSON 500 handler (re-adds CORS headers), `/` and `/health`. Includes 3 routers.
- `core/config.py`: pydantic-settings `Settings` (reads `.env`). `ALLOWED_ORIGINS` is a JSON list. `CLOUDINARY_URL` is parsed into 3 parts.
- `core/database.py`: async engine, `get_db` dependency that **commits at end of request** (endpoints only `flush()`), rolls back on error.
- `core/redis_client.py`: OTP store, fixed-window rate limiter, JWT blacklist, JSON cache helpers (`categories:all` cached 5 min).
- `core/security.py`: HS256 JWT (access 30 min, refresh 30 days, `type` claim; there is **no `jti`**, so the blacklist key is the last 16 chars of the token), bcrypt, Razorpay HMAC checks.
- `api/v1/deps.py`: `get_current_user`, `get_current_admin` (`is_admin`), `get_current_rider` (`is_rider`).
- `api/v1/router.py`: prefix `/api/v1` with the endpoint modules: auth, users, products, cart, orders, payments, notifications, extended, support, wishlist.
- `api/admin.py`: prefix `/api/v1`: admin login (`/auth/login`), product POST/PUT/DELETE `/products...`, `/admin/orders|users|carousel|stats|dashboard/realtime|reports/*|riders|support/tickets|upload-image`.
- `api/rider.py`: `/api/v1/rider/orders` (list, detail, PATCH status: only `out_for_delivery`/`delivered`).
- `api/v1/endpoints/extended.py`: `/api/v1/admin/...` for extended product fields, bulk CSV price upload, schedule price, price history, stock thresholds, services CRUD, `AppSettings` (app/payment/tax/delivery config), delivery zones.
- `services/`: business logic (auth, cart, order, payment, product, notification, wishlist).
- `models/`: User (with `user_code` like `G-1234`, `is_admin`, `is_rider`, `password_hash`), Address, FamilyMember, Category, Product (+ JSON extended fields), ProductImage, Carousel, Service, Cart/CartItem, Order/OrderItem (enum status, address JSON snapshot, Razorpay ids, `rider_id`), FCMToken (actually stores Expo push tokens), SupportTicket/SupportMessage, WishlistItem, AppSettings, DeliveryZone. Note: `Service`, `AppSettings`, `DeliveryZone` are **not** exported from `models/__init__.py`. They're registered only because other modules import them (product.py defines Service; settings.py is imported by extended.py). Keep that in mind for Alembic autogenerate.
- `worker.py` / `tasks.py`: Celery app (`Asia/Kolkata`), tasks `send_order_push` (defined, **never dispatched**) and `send_daily_no_order_reminder` (beat, 20:00 IST, Hinglish copy).

### Response conventions (don't break these)
- Customer API (`/api/v1/*` from `router.py`): `{"success": true, "data": ..., "message"?: ...}`. Product list adds `total/page/per_page/pages`.
- Admin API (`api/admin.py`): mostly **raw objects** or `{items,total,page,per_page,total_pages}`. Admin `products.ts` remaps the customer `/products` shape to `items/total_pages`.
- Status enums are lowercase strings (`pending, confirmed, packing, out_for_delivery, delivered, cancelled, refunded`). Payment methods: `upi, card, cod, netbanking`.

### Auth flows
- Customers: phone OTP (`/auth/send-otp` → `/auth/verify-otp`; `OTP_DEMO_MODE=true` accepts any 6-digit code and returns `demo_otp`), or email/password (`/auth/login-email`, `/auth/signup-email`; email signups get a placeholder phone `e_<hex>`). `/users/me/set-password` lets OTP users add a password. Refresh with `/auth/refresh`. Logout blacklists the access token and, when it's sent, the refresh token.
- Admin/Rider: `/api/v1/auth/login` (email + password, user must be `is_admin` or `is_rider`). It returns **only an access token** (30 min) and the admin app has no refresh, so admins get bounced to login on expiry.
- Web clients keep tokens in `localStorage` (storefront: `auth_token`, `refresh_token`, `user`; admin: `admin_token`, `admin_user`). Mobile uses SecureStore (localStorage on web).
- On a 401, storefront and mobile try one refresh and clear the session **only** when the refresh itself returns 400/401, so network blips don't log users out. Storefront fires the `gmart:logout` window event so the cart/auth stores reset.

### Checkout and payment flow
1. `POST /orders {address_id, payment_method, notes}` validates stock, snapshots the address, decrements stock, clears the cart, and creates a `pending` order (`FD-XXXXXXXX`, ETA +4 h).
2. Online payment: `POST /payments/create-order {order_id}` creates a Razorpay order, or reuses the existing `razorpay_order_id` on retry. The amount always comes from the DB (minimum 100 paise). Then `POST /payments/verify` checks the signature against **this order's** razorpay_order_id. It's idempotent and sets the order to `paid` + `confirmed`.
3. Webhook `POST /payments/webhook` (`payment.captured`) is the backup path; it needs `RAZORPAY_WEBHOOK_SECRET` (returns 503 if unset).
4. Delivery fee = `DELIVERY_FEE` (49) unless subtotal ≥ `FREE_DELIVERY_THRESHOLD` (499). Both come from **env settings**, and the storefront hardcodes 499 in `src/lib/constants.ts`.
5. Tests: `freshdirect-backend/tests/test_payment_checkout.py` and `test_cart_unavailable.py` (unittest, mocks DB). See `docs/razorpay-checkout.md`.

### Mobile app notes
- `EXPO_PUBLIC_API_URL` is the **host only** (`https://api.gmartfresh.com`); `/api/v1` is appended in `lib/api.ts`. Web apps' `VITE_API_BASE_URL` **includes** `/api/v1`.
- Push: `hooks/usePushNotifications.ts` gets an Expo push token (EAS projectId) and calls `/notifications/register-token`.
- Don't fall back to `constants/data.ts` demo PRODUCTS/CATEGORIES ids in real flows: they don't exist on the server. (CATEGORIES is still used as a visual fallback on home/categories tabs.)
- Axios responses: the body is `res.data`, and the payload is `res.data.data`.
- RN layout gotcha: children of a horizontal `ScrollView` need explicit pixel heights; a `%` height collapses to 0.
- OTA: `runtimeVersion.policy = appVersion` (1.0.1). Native dependency changes need a new EAS build plus a version bump, because OTA alone won't deliver them.
- Check what a runtime receives: `curl -H 'expo-platform: android' -H 'expo-runtime-version: 1.0.0' -H 'expo-channel-name: production' -H 'expo-protocol-version: 1' -H 'accept: multipart/mixed' https://u.expo.dev/b6905e08-88ee-4257-ae81-1d5b6318baf3 | grep -o '"createdAt":"[^"]*"'`
- **Bumping `expo.version` in app.json cuts off every installed build from future OTA updates** (the runtime changes). Only bump it together with a new APK/AAB that users actually install. Builds from 1.0.0 are stuck on the original code.

---

## 3. CI/CD (`.github/workflows/`, push to `main`, path-filtered)

| Workflow | Trigger | Does |
|---|---|---|
| `backend.yml` | `freshdirect-backend/**` | ruff (`E,W,F`, ignore `E501,F821`) → rsync to `~/app/freshdirect-backend` (excludes `.env`) → prune images → `docker compose -f docker-compose.prod.yml build && up -d --remove-orphans` → `alembic upgrade head`. Also patches `.env` CORS to include `shop.gmartfresh.com`. SSH script `command_timeout: 30m`: cold rebuilds (build cache is pruned each deploy) take ~6 to 10+ min, and the 10 min default killed the `99acab3` deploy. |
| `admin.yml` | `admin/**` | `tsc --noEmit` → build with `VITE_API_BASE_URL=https://api.gmartfresh.com/api/v1` → tar over SSH to `/var/www/admin` → reload nginx |
| `storefront.yml` | `storefront/**` | `tsc -b` → build → writes nginx vhost for shop.gmartfresh.com → deploy `/var/www/shop` |
| `mobile.yml` | `freshdirect/**` | `tsc --noEmit` → OTA `eas update` to preview + production on push; EAS builds only on manual dispatch |

Secrets: `EC2_HOST`, `EC2_SSH_KEY`, `EXPO_TOKEN`. Production secrets live only in the EC2 `.env`.

**Stale docs:** `DEPLOYMENT.md`, `infra/` (Terraform/ECS/Fargate, `task-definition.json`), `setup-aws.sh`, the root `amplify.yml`/`infra/amplify.yml`, and `project_feature_inventory.md` describe an older ECS/Amplify setup and older feature counts. The **live** setup is EC2 + Docker Compose + nginx as described above. `docs/aws-https-setup.md` (ALB/ACM) is current.

---

## 4. Local development

```bash
# Backend (needs Postgres + Redis; compose runs redis/api/celery/flower but NOT postgres)
cd freshdirect-backend && cp .env.example .env
docker compose up --build          # api :8000 (reload), flower :5555, redis :6379
docker compose exec api alembic upgrade head
docker compose exec api python scripts/seed.py   # 6 categories, ~20 products, admin admin@example.com / ChangeMe123! (SEED_ADMIN_* env)
# or without docker: pip install -r requirements.txt; uvicorn app.main:app --reload
# PowerShell gotcha: if DEBUG=release is set in the shell, set $env:DEBUG='false'
# Tests: python -m unittest discover -s tests -v
# Lint (same as CI): ruff check . --select E,W,F --ignore E501,F821

cd admin && npm ci && npm run dev          # :5173, type-check: npx tsc --noEmit
cd storefront && npm ci && npm run dev     # type-check: npx tsc -b
cd freshdirect && npm ci && npx expo start # type-check: npx tsc --noEmit
```

### Migrations
- Alembic head is currently **`add_family_members`**. The chain is linear except for one merge (`5d7942d7e6d2`). Revision ids are a mix of hex and descriptive names. Always set `down_revision` to the current head.
- Chain: `273d831cd4c1` → `add_phase2_3_fields` → {`add_carousels_table` → `drop_product_rating_review` → `a1b2c3d4e5f6` (password_hash) → `b2c3d4e5f6a7` (riders) → `c3d4e5f6a7b8` (service category_id)} + {`add_storage_preparation`} → merge `5d7942d7e6d2` → `d4e5f6a7b8c9` (support) → `e5f6a7b8c9d0` (wishlist) → `add_user_code` → `add_family_members`.
- Prod runs `alembic upgrade head` automatically on deploy, so migrations must be safe on existing data (backfill before adding NOT NULL).
- Postgres enums: SQLAlchemy binds enum **names** (uppercase, e.g. `PENDING`) for `Enum(PyEnum)` columns. See commit `ba075f5`; match that when writing enum migrations.
- `create_carousel_table.py` is a legacy `create_all` helper. Don't use it; use Alembic.

---

## 5. Known issues / tech debt (found in review 2026-10-27, not yet fixed)

Ordered by severity. Verify each one before fixing.

1. **Security: admin login fallback passwords.** `api/admin.py` `admin_login` accepts the password `admin123`, or the user's phone number, for any admin/rider with no `password_hash`. This should be removed once every admin has a real password.
2. **Admin product editor drops extended fields.** `AddEditProduct.tsx` sends `origin`, `health_benefits`, `storage_tips`, `preparation_tips`, `tags` to `POST/PUT /products` (api/admin.py), which only whitelists basic keys. Those fields are silently ignored. (`PATCH /admin/products/{id}` in products.py uses the `ProductUpdate` schema, which *does* support them.)
3. **`ExtendedProducts.tsx` page is broken.** It does `GET /admin/products/{id}`, which doesn't exist (405), and sends the PATCH `/admin/products/{id}/extended` payload as query params while the backend expects a JSON body. Route `products/:id/extended` isn't linked from the UI.
4. **Order status push never fires.** The Celery task `send_order_push` exists but nothing calls `.delay()` on admin/rider status changes.
5. **Admin cancel (`POST /admin/orders/{id}/cancel`)** doesn't restock items, set `cancelled_at`/`cancellation_reason`, or refund paid orders (there's a TODO). The customer cancel restocks but doesn't refund either.
6. **Admin settings don't affect checkout.** The `AppSettings` delivery config (min order, free-delivery threshold, fee), GST config, payment methods, and DB-stored Razorpay keys are saved but never read by cart/order/payment code, which use env vars. `min_order_value` isn't enforced, and GST isn't applied.
7. **Scheduled price changes are never applied.** `scheduled_price`/`scheduled_price_date` are stored, but there's no Celery beat task to apply them.
8. **Refresh tokens:** `/auth/refresh` doesn't check `is_active` and doesn't blacklist the old refresh token on rotation. Mobile `authApi.logout()` doesn't send the refresh token. Admin has no refresh at all (see Auth flows).
9. Admin `getOrders` sends a `search` param that `/admin/orders` ignores.
10. `cache_delete_pattern` uses `KEYS` (blocking). That's fine at the current scale.
11. Stale deployment docs/infra (see section 3).
12. Mobile: there's no stock awareness in the UI (out-of-stock products can still be tapped "add"; the server rejects them and the app now alerts). The categories screen loads at most 100 products and filters client-side. `profile-edit`/`help`/`safety`/`track` weren't changed in the 2026-10-31 sweep.
13. Mobile: paid orders can't be self-cancelled (deliberate until refunds exist; see 5). Support handles them.

---

## 6. Decisions (keep unless deliberately revisited)

- Single EC2 host + Docker Compose instead of ECS: cost and simplicity. Celery beat runs **embedded** (`worker -B`) because there's a single worker, so no duplicate schedules (`0560383`).
- TLS terminates at the ALB (ACM). EC2 serves plain HTTP; nginx serves the SPAs on :80.
- Deploys prune Docker images **before** building (the disk filled up, `82db0c6`). Build cache is bounded with `docker builder prune --keep-storage 2GB`, not wiped: a full wipe forced a cold pip reinstall each deploy, which overloaded the t3.small and hit the SSH timeout (2026-10-31).
- `get_db` commits per request, so endpoints use `flush()`, not `commit()`. The one exception: a change that must survive an error response (e.g. `create_order` purging unavailable cart items) commits explicitly before raising, because `get_db` rolls back on exceptions.
- Deactivated products are removed from carts automatically (`_purge_unavailable`) instead of blocking checkout.
- Cart/order serialization returns plain dicts, never ORM objects, to avoid recursion and `MissingGreenlet` in async.
- Razorpay amounts are always computed server-side. Verify must match the order's own `razorpay_order_id`.
- Network errors during token refresh must never log the user out (`dd199c3`).
- Deactivated users are rejected at login, not one call later (`b9b3e0a`).
- Product descriptions are admin rich text (HTML). Storefront sanitizes with DOMPurify; mobile renders HTML (`aec30e0`, `99c810e`).
- Support phone: `9955476677` (`storefront/src/lib/constants.ts`).
- Email signup must not attach a password to an existing OTP account that has the same email (account-takeover guard).

---

## 7. Pending tasks / roadmap

- [ ] Fix known issues 1–4 (highest value: security, then broken admin editing, then pushes).
- [ ] Wire `AppSettings` into cart/order totals, or remove the unused settings UI.
- [ ] Refunds via the Razorpay API on cancel.
- [ ] Celery beat task to apply scheduled prices.
- [ ] Admin refresh-token support.
- [ ] Update or remove stale `DEPLOYMENT.md` / `infra/` / `project_feature_inventory.md`.
- [ ] Broader backend test coverage (only payment tests exist).

---

## 8. Change log (newest first)

Add one line per change: date, short description, files touched.

- 2026-10-31: **Runtime 1.0.0 builds were stuck on the Sep 11 bundle.** u.expo.dev showed the latest 1.0.0 update was dated 2026-09-11, while 1.0.1 had today's. `mobile.yml` now also publishes every OTA with `runtimeVersion` overridden to `1.0.0` (`bc81748`). That's safe because `package.json` is unchanged since `776ca78`. **Remove that step if a native dependency is added** (an old binary would crash on it), or once all users are on 1.0.1+.
- 2026-10-31: Backend deploy for `99acab3` was killed after 603 s by ssh-action's default 10 min `command_timeout`. Set `command_timeout: 30m` in `.github/workflows/backend.yml`. The redeploy (`948ad78`) then failed at rsync because the server was overloaded (health checks took 7 to 25 s), most likely by the orphaned build. Changed the build-cache prune to `--keep-storage 2GB` so deploys reuse the pip layer.
- 2026-10-31: **Orders blocked by deactivated products.** A cart item whose product an admin deactivated stayed in the cart (counted in the total), and `POST /orders` then failed every time with "Product <uuid> no longer available". Now `cart_service._purge_unavailable` removes such items on every `GET /cart` (response gains additive `removed_unavailable: [names]`), and `create_order` purges, **commits**, then raises a 400 naming the items. Mobile and storefront refresh the cart after a failed order and tell the customer what was removed. Tests: `tests/test_cart_unavailable.py`. Files: `freshdirect-backend/app/services/{cart,order}_service.py`, `freshdirect/store/cartStore.ts`, `freshdirect/app/payment.tsx`, `storefront/src/store/cartStore.ts`, `storefront/src/types/index.ts`.
- 2026-10-31: Mobile product detail: removed the blurred backdrop copy behind the hero image (one sharp `contain` image on white, matching the storefront's `dd64c98`). `freshdirect/app/product/[id].tsx`. Also found why a user's phone still showed the original screen (header over image, badges on image, raw HTML description): its APK is runtime **1.0.0**, and every OTA since the bump to 1.0.1 (`91b8407`, 2026-10-16) targets 1.0.1, so they never reach it. It needs a new APK.
- 2026-10-31: Mobile app bug sweep (code review + tsc + `expo export` bundle; not run on a device). Fixed:
  - Search always empty: it read `response.data` (the body) instead of `response.data.data`. Added a stale-response guard. `app/search.tsx`
  - Fake demo products (`constants/data.ts` PRODUCTS, ids like `p1`) shown on error/loading in home, categories and search, and always on `/vegetables`. Removed the fallbacks; home "View all" now goes to `/categories`; deleted `app/vegetables.tsx`. Categories fetch `per_page=100` (backend max).
  - Checkout retry: a cancelled/failed Razorpay payment left the order pending with the server cart emptied, so "Pay" again failed with "Cart is empty". Now reuses `pendingOrder` (like the storefront), keeps its totals, locks the address, blocks switching to COD. `app/payment.tsx`
  - Checkout "Change" address never applied (payment kept the old selection; location confirms by setting default). Newly saved address didn't stay selected on location. `app/payment.tsx`, `app/location.tsx`
  - Order detail: added Cancel (pending/confirmed, unpaid only, because there are no refunds yet) and "Complete Payment" for pending online orders. `app/order/[id].tsx`
  - Status labels: `packing`/`refunded` showed raw. `app/tabs/orders.tsx`, `app/order/[id].tsx`
  - Cold start: index redirected after a fixed 100 ms, so slow SecureStore sent logged-in users to login. Added `hydrated` to authStore. `store/authStore.ts`, `app/index.tsx`
  - Logout now revokes tokens server-side (sends refresh token) and resets the cart store. A rejected refresh now logs out the store and `_layout` routes to login. `lib/api.ts`, `app/tabs/profile.tsx`, `store/cartStore.ts`, `app/_layout.tsx`
  - Add to cart: failure (e.g. out of stock) was silent after the "added" toast, so it now alerts the server message. No duplicate optimistic row; correct image. `store/cartStore.ts`
  - Product detail Share button did nothing; now shares a shop.gmartfresh.com link. `app/product/[id].tsx`
- 2026-10-31: Fixed blank hero image on mobile product detail. The blurred-backdrop wrapper (`31a7800`) used `height: '100%'` inside a horizontal ScrollView, which resolved to 0. Slides now use an explicit `HERO_H = SCREEN_W / 1.25`. Files: `freshdirect/app/product/[id].tsx`.

- 2026-10-27: Created this CLAUDE.md after a full codebase review. No code changes.
- Before this file (from git history): product detail shows full image and renders HTML (mobile); family members on profile and admin; `user_code`; embedded celery beat; daily no-order push; email/password login; Razorpay checkout on storefront; storefront app (shop.gmartfresh.com); support tickets; rider system; wishlist; OTA updates enabled.
