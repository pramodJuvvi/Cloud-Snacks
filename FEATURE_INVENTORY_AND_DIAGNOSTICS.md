# CloudSnacks Feature Inventory & APK Diagnostics

**Date**: May 19, 2026  
**Status**: ⚠️ CRITICAL ISSUE IDENTIFIED - API Connection Failure on APK

---

## 📋 IMPLEMENTED FEATURES

### **Authentication System** ✅
- **User Registration** (`POST /auth/register`)
  - Accepts: name, email, password
  - Validates: Duplicate email prevention, password strength (min 8 chars)
  - Returns: Access token + user data
  - Frontend: AuthContext.tsx (`signUp()`)

- **User Login** (`POST /auth/login`)
  - Accepts: email, password
  - Returns: Access token + user data
  - Frontend: AuthContext.tsx (`signIn()`)

- **Session Management**
  - Persistent token storage (AsyncStorage)
  - Auto-restore session on app launch
  - Logout functionality (`signOut()`)
  - Frontend: AuthContext.tsx

- **Current User Endpoint** (`GET /auth/me`)
  - Requires: Bearer token
  - Returns: User info (id, name, email)

---

### **Snack Catalog System** ✅
- **List Snacks** (`GET /snacks`)
  - Returns: Array of snack objects with:
    - id, name, description, price, prep_minutes, calories, category, accent color
  - Categories: Protein, Fresh, Sweet, Crunch
  - Frontend: HomeScreen.tsx, API in client.ts (`getSnacks()`)

---

### **Shopping Cart System** ✅
- **Cart State Management**
  - Add snacks to cart with quantity tracking
  - Increment/decrement quantities
  - Clear entire cart
  - Real-time subtotal calculation
  - Frontend: CartContext.tsx

- **Cart Display**
  - CartScreen.tsx - Shows cart items with prices
  - Quantity adjustments
  - Subtotal display

---

### **Order Management System** ✅
- **Create Orders** (`POST /orders`)
  - Accepts:
    - Order items (snack_id + quantity)
    - Customer info (name, email, phone)
    - Delivery details (address, note)
    - Optional: Auth token for logged-in users
  - Calculates: Subtotal, delivery fee ($29), total
  - Returns: Order confirmation with order ID
  - Frontend: CartScreen.tsx (`createOrder()`)

- **View Order History** (`GET /orders/me`)
  - Requires: Bearer token (logged-in users only)
  - Returns: User's past orders with items and status
  - Frontend: AccountScreen.tsx

- **Admin - View All Orders** (`GET /admin/orders`)
  - Returns: All orders from all users
  - Frontend: AdminScreen.tsx (`getAdminOrders()`)

- **Admin - Update Order Status** (`PATCH /admin/orders/{order_id}/status`)
  - Allows: received → preparing → out_for_delivery → delivered/cancelled
  - Frontend: AdminScreen.tsx (`updateOrderStatus()`)

---

### **User Profiles & Account Management** ✅
- **Account Screen** (AccountScreen.tsx)
  - View logged-in user info
  - Order history with details
  - Logout functionality

- **Admin Screen** (AdminScreen.tsx)
  - View all customer orders
  - Update order status in real-time
  - Admin-only interface

---

### **Database Models** ✅
1. **User Model**
   - Fields: id, name, email, password (hashed)
   - Relationships: orders (one-to-many)

2. **Snack Model**
   - Fields: id, name, description, price, prep_minutes, calories, category, accent
   - Auto-seeded with default snacks

3. **Order Model**
   - Fields: id, user_id (nullable), customer_*, delivery_*, status, pricing
   - Relationships: user (optional), items (one-to-many)

4. **OrderItem Model**
   - Fields: id, order_id, snack_id, quantity, unit_price
   - Relationships: order, snack

---

## 🔴 ROOT CAUSE: WHY APK FEATURES ARE NOT WORKING

### **CRITICAL ISSUE: Hardcoded API URL Defaulting to Localhost**

**Problem Location**: `mobile-app/src/api/client.ts` (Line 1)
```typescript
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
```

**Why It Fails on Real Android Device**:
1. **Development**: `http://127.0.0.1:8000` works because you're running on the same machine/emulator
2. **APK Build**: When building APK for production:
   - The `EXPO_PUBLIC_API_URL` environment variable is NOT set
   - Falls back to `http://127.0.0.1:8000`
   - Real Android device tries to connect to its own localhost:8000
   - Backend server is NOT running on the device → **ALL API CALLS FAIL**
   - Result: Registration, Login, Orders, Everything breaks silently

### **Network Configuration Issues**:
- ✅ Cleartext traffic (HTTP) is enabled in `app.json` (`usesCleartextTraffic: true`)
- ❌ But without a proper API_URL, it doesn't matter

---

## 🧪 TESTING CHECKLIST

### **Unit Tests Missing**:
- [ ] User registration validation
- [ ] User login authentication
- [ ] Password hashing verification
- [ ] Order calculation (subtotal, delivery fee, total)
- [ ] Cart state management
- [ ] Token expiration handling

### **Integration Tests Missing**:
- [ ] Register → Auto-login flow
- [ ] Add to cart → Checkout → Order creation
- [ ] Login → View order history
- [ ] Admin order status updates

### **Manual Testing (Current Issues)**:

#### **On Development Machine (Works)**:
- [ ] Register new user
- [ ] Login with credentials
- [ ] Browse snacks
- [ ] Add items to cart
- [ ] Place order (guest or logged-in)
- [ ] View order history (if logged in)

#### **On Real Android Device (Currently Broken)**:
- [ ] ❌ Registration fails (API unreachable)
- [ ] ❌ Login fails (API unreachable)
- [ ] ❌ Snacks don't load (API unreachable)
- [ ] ❌ Orders can't be placed (API unreachable)

**Error Symptoms**:
- Network timeout errors
- "Backend responded with undefined" messages
- App appears to freeze on API calls

---

## ✅ REQUIRED FIXES

### **1. Set API URL for APK Build** (CRITICAL)
**File**: `mobile-app/.env.production` (Create this)
```
EXPO_PUBLIC_API_URL=https://your-backend-api-url.com
```

Then build APK with:
```bash
eas build --platform android --env production
```

OR for local testing with IP address:
```
EXPO_PUBLIC_API_URL=http://192.168.x.x:8000
```

### **2. Add Environment Configuration** 
- Create `.env.development` for dev builds
- Create `.env.production` for production APK
- Create `.env.staging` for staging builds

### **3. Backend URL Management**
- Deploy backend to a real server (not localhost)
- Use HTTPS for production
- Configure CORS properly for your domain

### **4. Add Tests**
- Backend: pytest integration tests
- Frontend: Jest/React Native Testing Library tests
- E2E: Detox tests for critical user flows

---

## 📊 Feature Completion Status

| Feature | Backend | Frontend | Tests | Status |
|---------|---------|----------|-------|--------|
| User Registration | ✅ | ✅ | ❌ | Complete (broken on APK) |
| User Login | ✅ | ✅ | ❌ | Complete (broken on APK) |
| View Snacks | ✅ | ✅ | ❌ | Complete (broken on APK) |
| Shopping Cart | ✅ | ✅ | ❌ | Complete |
| Create Orders | ✅ | ✅ | ❌ | Complete (broken on APK) |
| Order History | ✅ | ✅ | ❌ | Complete (broken on APK) |
| Admin Orders | ✅ | ✅ | ❌ | Complete (broken on APK) |
| Order Status Update | ✅ | ✅ | ❌ | Complete (broken on APK) |

---

## 🚀 NEXT STEPS

1. **IMMEDIATE**: Configure `EXPO_PUBLIC_API_URL` environment variable for APK builds
2. **SHORT TERM**: Set up backend hosting (AWS, Railway, Render, etc.)
3. **MEDIUM TERM**: Add comprehensive test suite
4. **LONG TERM**: Add more features (payment integration, notifications, etc.)

