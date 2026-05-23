# Cloud Snacks Mobile

Open-source mobile app starter for Cloud Snacks.

## Stack

- Expo
- React Native
- TypeScript
- React Navigation
- FastAPI backend integration

## Run locally

Install dependencies:

```powershell
npm install
```

Start the mobile app:

```powershell
npm run start
```

## Build Android APK

Install Android Studio's SDK first if Gradle reports `SDK location not found`.

Build an installable APK:

```powershell
.\build-apk.ps1 -BackendUrl "http://192.168.1.8:8000"
```

APK output:

```text
android\app\build\outputs\apk\release\app-release.apk
```

Start the backend from `../backend`:

```powershell
.\\venv\\Scripts\\activate
uvicorn app.main:app --reload
```

If testing from a physical phone, set the backend URL to your computer IP:

```powershell
$env:EXPO_PUBLIC_API_URL="http://YOUR_LOCAL_IP:8000"
npm run start
```

## Current features

- Snack catalog loaded from `GET /snacks`
- Search and category filters
- Snack detail modal with ingredients and allergens
- Cart quantity controls
- Order summary and `POST /orders` checkout
- Checkout contact, phone, address, and delivery note fields
- Order confirmation after checkout
- Register, login, sign out, and local token restore
- Authenticated order history on the Account screen
- Order tracking timeline
- Dedicated customer Track tab for active deliveries
- Admin test tab for advancing/cancelling order status
- Backend health check screen
- TypeScript project setup

## Backend API used by the app

- `GET /`
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /snacks`
- `POST /orders`
- `GET /orders/me`
- `GET /orders/{order_id}`

## Next build steps

- Add backend endpoints for snacks and orders
- Add user registration and login screens
- Persist cart items locally
- Add payment and order tracking flows
