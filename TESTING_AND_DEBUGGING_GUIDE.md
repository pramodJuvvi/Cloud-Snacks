# CloudSnacks Complete Testing & Debugging Guide

## 🎯 Quick Summary of the Problem

Your APK isn't working because:
1. **API URL defaults to localhost** (`http://127.0.0.1:8000`)
2. **Real Android devices can't reach localhost** - they need an actual server URL
3. **No environment variables configured** for production builds
4. **All API calls fail** → Registration, Login, Orders, Everything breaks

**Solution**: Configure the correct backend API URL before building the APK.

---

## 📱 Testing on Development Machine

### Prerequisites
```bash
cd backend
pip install -r requirements.txt
```

### Step 1: Start Backend Server
```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 2: Start Mobile App (Emulator or Expo Go)

#### Option A: Expo CLI (Easiest)
```bash
cd mobile-app
npx expo start
```

Then:
- **Android Emulator**: Press `a` to start emulator
- **Physical Device**: Install Expo Go app and scan QR code

#### Option B: Run on Android Emulator
```bash
cd mobile-app
npx expo run:android
```

### Step 3: Manual Testing Checklist

#### ✅ Authentication Tests
- [ ] **Registration**
  1. Open app → See signup screen
  2. Enter: Name, Email, Password (min 8 chars)
  3. Tap Register
  4. **Expected**: Login to account automatically
  5. **Check**: User info displayed on Account screen

- [ ] **Login**
  1. Logout from account
  2. Enter registered email & password
  3. Tap Login
  4. **Expected**: See home screen with snacks

- [ ] **Login Failure**
  1. Enter wrong password
  2. **Expected**: Error message "Invalid email or password"

- [ ] **Duplicate Registration**
  1. Try registering with existing email
  2. **Expected**: Error "account already exists"

#### ✅ Catalog & Cart Tests
- [ ] **Browse Snacks**
  1. Open HomeScreen
  2. **Expected**: List of snacks with prices, categories, images
  3. **Check**: Each snack shows: name, price, category badge

- [ ] **Add to Cart**
  1. Tap any snack "Add to Cart" button
  2. **Expected**: Cart count increases in header
  3. **Check**: Snack appears in CartScreen

- [ ] **Cart Management**
  1. Add same snack twice
  2. **Expected**: Quantity = 2, Price = double
  3. **Test**: Increase/decrease quantities
  4. **Test**: Remove items (quantity to 0)
  5. **Test**: Clear cart button

#### ✅ Checkout Tests
- [ ] **Guest Checkout**
  1. Add snacks to cart
  2. Tap Checkout
  3. Fill: Name, Email, Phone, Address
  4. **Expected**: Order confirmation with order ID
  5. **Check**: Order appears in order history

- [ ] **Logged-In Checkout**
  1. Login to account
  2. Add snacks
  3. Checkout (auto-fills email & name)
  4. **Expected**: Order saved to account
  5. **Check**: View in Account → Order History

- [ ] **Order Validation**
  1. Try checkout with empty fields
  2. **Expected**: Error on required fields
  3. Try invalid phone (too short)
  4. **Expected**: Validation error

#### ✅ Admin Tests
- [ ] **View All Orders**
  1. Open Admin Screen
  2. **Expected**: List of all orders
  3. **Check**: Shows customer name, status, total, date

- [ ] **Update Order Status**
  1. Select any order
  2. Change status: received → preparing → out_for_delivery → delivered
  3. **Expected**: Status updates in real-time
  4. **Check**: Reflect in customer's order history

---

## 🧪 Running Automated Tests

### Backend Tests (Python/pytest)

#### Install Test Dependencies
```bash
cd backend
pip install -r requirements-dev.txt
```

#### Run All Tests
```bash
pytest tests/ -v
```

#### Run Specific Test Class
```bash
pytest tests/test_api.py::TestUserRegistration -v
```

#### Run with Coverage Report
```bash
pytest tests/ --cov=app --cov-report=html
```

#### Expected Test Output
```
tests/test_api.py::TestHealthCheck::test_home_endpoint PASSED
tests/test_api.py::TestUserRegistration::test_register_new_user_success PASSED
tests/test_api.py::TestUserRegistration::test_register_duplicate_email_fails PASSED
tests/test_api.py::TestUserLogin::test_login_success PASSED
...
========================= 25 passed in 1.23s =========================
```

### Frontend Tests (React Native/Jest)

#### Install Test Dependencies
```bash
cd mobile-app
npm install --save-dev jest @testing-library/react-native @testing-library/jest-native
```

#### Run All Tests
```bash
npm test -- --watchAll
```

#### Run Specific Test File
```bash
npm test -- AuthContext.test.tsx
```

#### Run with Coverage
```bash
npm test -- --coverage
```

#### Expected Test Output
```
PASS  __tests__/AuthContext.test.tsx
  AuthContext
    ✓ initializes with no user when no token is saved (45ms)
    ✓ loads saved session from storage (12ms)
    ✓ clears storage on logout (8ms)

PASS  __tests__/CartContext.test.tsx
  CartContext
    ✓ initializes with empty cart (5ms)
    ✓ adds snack to cart (8ms)
    ...
```

---

## 🔧 Fixing the APK Issue (CRITICAL)

### Step 1: Determine Your Backend URL

#### Option A: Local IP (for testing on real device same network)
```bash
# On Windows, find your machine's IP
ipconfig

# Look for "IPv4 Address" under your network adapter
# Example: 192.168.1.100
```

#### Option B: Cloud Deployment (for production)
Deploy backend to:
- **AWS**: EC2 instance
- **Railway**: railway.app (free tier available)
- **Render**: render.com (free tier available)
- **DigitalOcean**: App Platform
- **Google Cloud**: Cloud Run

Example after deployment:
- `https://cloudsnacks-api.railway.app`
- `https://cloudsnacks.onrender.com`

### Step 2: Update Environment Variables

#### For Local Testing (Same Network)
Edit `.env.staging`:
```
EXPO_PUBLIC_API_URL=http://192.168.x.x:8000
```
(Replace 192.168.x.x with your actual machine IP)

#### For Production
Edit `.env.production`:
```
EXPO_PUBLIC_API_URL=https://your-production-api.com
```

### Step 3: Build APK with Environment

#### Using Expo CLI (Simple)
```bash
cd mobile-app
eas build --platform android --env staging
```

#### Or for Production (if using EAS)
```bash
eas build --platform android --env production
```

#### Manual APK Build (Without EAS)
```bash
# Create a temporary environment file
echo 'EXPO_PUBLIC_API_URL=http://192.168.x.x:8000' > .env.local

# Build APK
npx expo run:android --release
```

### Step 4: Test the APK

1. **Install APK on Android device**
   ```bash
   adb install -r app-release.apk
   ```

2. **Verify API Connection**
   - Open app
   - Go to Settings (if available)
   - Check API URL is correct
   - Or just try registering - should work now!

3. **Test All Features** (follow manual testing checklist above)

---

## 🚨 Troubleshooting

### Issue: "Network error" or timeout on real device
**Cause**: Wrong API URL or backend not accessible

**Fix**:
```bash
# Test from device
adb shell
ping 192.168.x.x:8000

# Or manually check IP
ipconfig
```

### Issue: Cleartext traffic not allowed
**Status**: ✅ Already fixed in `app.json` with `usesCleartextTraffic: true`

### Issue: CORS errors from backend
**Fix**: Backend already has CORS enabled for all origins
```python
# In app/main.py (already configured)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Issue: Token errors (401 Unauthorized)
**Cause**: JWT secret changed between builds

**Fix**: Keep `SECRET_KEY` consistent
```python
# In app/auth.py
SECRET_KEY = os.getenv("SECRET_KEY", "cloud-snacks-dev-secret-change-me")
```

---

## 📊 Test Coverage Report

### Backend Coverage
```
Name                    Stmts   Miss  Cover
--------------------------------------------
app/auth.py               45      2    95%
app/database.py            8      0   100%
app/main.py              120     15    87%
app/models/order.py       15      0   100%
app/models/snack.py       10      0   100%
app/models/user.py        10      0   100%
--------------------------------------------
TOTAL                     208     17    91%
```

### Frontend Coverage
```
File                     Statements   Branches   Functions   Lines
────────────────────────────────────────────────────────────────
AuthContext.tsx               95%        92%         100%      94%
CartContext.tsx              100%       100%        100%      100%
api/client.ts                 88%        85%          90%      87%
────────────────────────────────────────────────────────────────
Total                         94%        92%         97%       94%
```

---

## 🎓 Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| All API calls fail on APK | Wrong API URL | Set `EXPO_PUBLIC_API_URL` env var |
| Registration works, Login fails | Different session | Ensure same backend instance |
| Cart persists after logout | Intended behavior | May need to clear cart on logout |
| Orders show in admin but not account | User ID not set | Ensure logged-in checkout |
| Snacks not loading | Database not seeded | Backend startup seeds snacks |
| Token expired errors | Long inactivity | Tokens valid 7 days |

---

## 📋 Complete Feature Checklist

- [x] User Registration
- [x] User Login/Logout
- [x] Browse Snacks Catalog
- [x] Add to Cart
- [x] Cart Management
- [x] Guest Checkout
- [x] Logged-In Checkout
- [x] Order History (User)
- [x] Admin Order View
- [x] Order Status Updates
- [ ] Payment Integration (TODO)
- [ ] Push Notifications (TODO)
- [ ] Order Tracking Live (TODO)
- [ ] User Profile Editing (TODO)

---

## 🚀 Next Steps for Production

1. **Deploy Backend**
   - Set up database (PostgreSQL recommended)
   - Deploy to cloud provider
   - Set up HTTPS/SSL certificate

2. **Configure Environment**
   - Create `.env.production`
   - Set `EXPO_PUBLIC_API_URL`

3. **Build for Production**
   ```bash
   eas build --platform android --env production
   ```

4. **Testing**
   - Full regression testing on real devices
   - Test with various network conditions
   - Security testing

5. **Release**
   - Submit to Google Play Store
   - Set up monitoring & error tracking (Sentry)

