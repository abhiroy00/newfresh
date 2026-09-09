# Gmart — Mobile App

React Native / Expo customer-facing app for the Gmart fresh grocery platform.

## Stack

- **Framework:** Expo SDK 54 + Expo Router (file-based routing)
- **Language:** TypeScript
- **State / Data:** Zustand + TanStack Query v5
- **UI:** React Native + Moti animations + Shopify Skia
- **Auth:** OTP via phone number, JWT stored in Expo SecureStore
- **Payments:** Razorpay
- **Push notifications:** Expo Notifications + FCM

## Project structure

```
app/
  _layout.tsx          # Root layout, auth guard
  index.tsx            # Home / landing
  onboarding.tsx       # First-launch onboarding
  location.tsx         # Location picker
  search.tsx           # Product search
  vegetables.tsx       # Category browse
  categories.tsx       # All categories
  payment.tsx          # Checkout & payment
  order-success.tsx    # Post-payment confirmation
  track.tsx            # Live order tracking
  notifications.tsx    # Notification centre
  safety.tsx           # Safety info page
  help.tsx             # Help & support
  auth/
    login.tsx          # Phone number entry
    otp.tsx            # OTP verification
  tabs/
    _layout.tsx        # Bottom tab navigator
    index.tsx          # Home feed (tab)
    categories.tsx     # Categories (tab)
    cart.tsx           # Cart (tab)
    orders.tsx         # My orders (tab)
    profile.tsx        # Profile (tab)
  product/
    [id].tsx           # Product detail
  order/
    [id].tsx           # Order detail
  profile-edit.tsx     # Edit profile
```

## Getting started

```bash
cd freshdirect
npm install
npx expo start     # opens Expo dev server, auto-loads .env
```

Scan the QR code with the **Expo Go** app on your phone, or press `a` for Android emulator / `i` for iOS simulator.

## Environment

Create a `.env` file at `freshdirect/`:

```
EXPO_PUBLIC_API_URL=https://api.gmartfresh.com
```

For local development point it at your backend:

```
EXPO_PUBLIC_API_URL=http://192.168.x.x:8000
```

## Building for production

```bash
# EAS build (requires Expo account + eas-cli)
npx eas build --platform android --profile production
npx eas build --platform ios --profile production
```

## Related packages

| Package | Purpose |
|---|---|
| `admin/` | React + Vite admin panel |
| `freshdirect-backend/` | FastAPI backend |
