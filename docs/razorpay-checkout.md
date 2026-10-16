# Razorpay Standard Checkout

The Vite React storefront uses the existing FastAPI payment routes:

- `POST /api/v1/payments/create-order` with `{ "order_id": "internal order UUID" }`.
- `POST /api/v1/payments/verify` with the internal `order_id` and Checkout's
  `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`.

Both routes require the customer's bearer token. The amount is calculated from
the database order, never trusted from the browser. The minimum is 100 paise.
Order creation returns the public key ID along with the Razorpay order ID,
amount, and currency. No frontend environment credential is necessary.
The key secret stays in `freshdirect-backend/.env`, which Git ignores.

## Local testing

1. Run PostgreSQL and Redis using the existing backend setup, and apply migrations.
2. In `freshdirect-backend`, install `pip install -r requirements.txt`, then start
   `python -m uvicorn app.main:app --reload`. If the shell has `DEBUG=release`,
   set `$env:DEBUG='false'` first in PowerShell.
3. In `storefront`, run `npm install` and `npm run dev`.
   `VITE_API_BASE_URL` defaults to `http://localhost:8000/api/v1`.
4. Sign in, add a product, add/select an address, select UPI or card, and click Pay.
5. Complete a payment using Razorpay's documented test methods. Confirm the order
   success screen and the paid order in the backend.
6. Dismiss the modal and retry; the same pending order should be used. Exercise
   a failed test payment to check the visible error and retry flow.

Run backend regression tests from `freshdirect-backend` with
`python -m unittest discover -s tests -v`. Build the storefront with `npm run build`.

## Dashboard setup

Enable automatic capture for test payments in the Razorpay Dashboard. Signature
verification authenticates the callback; capture confirms funds. Configure a
webhook to `/api/v1/payments/webhook` for `payment.captured` and set a matching
`RAZORPAY_WEBHOOK_SECRET` in the backend environment. The webhook secret is
separate from the API key secret. Use an HTTPS reachable URL for Dashboard events.

Before deployment, configure the credentials in the server's environment and
restart it. Local `.env` changes do not update deployed services.

Reference: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
