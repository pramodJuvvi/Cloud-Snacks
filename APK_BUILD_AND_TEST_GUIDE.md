# CloudSnacks - APK Build & Real Device Testing Guide

## 🎯 Quick Start: Get Your APK Working on Real Android Device

This guide will get you from "broken APK" to "fully functional app" in 5 minutes.

---

## ⚡ Quick Fix (5 Minutes)

### Step 1: Find Your Backend Server IP
On the machine running your backend:

**Windows (Command Prompt)**:
```cmd
ipconfig
```

Look for line like:
```
IPv4 Address . . . . . . . . : 192.168.x.x
```
Save this IP address (e.g., `192.168.1.100`)

**Mac/Linux**:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### Step 2: Update Environment Variables

Edit file: `mobile-app/.env.staging`

**BEFORE**:
```
EXPO_PUBLIC_API_URL=http://192.168.x.x:8000
```

**AFTER** (replace with YOUR actual IP):
```
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000
```

### Step 3: Build New APK

```bash
cd mobile-app
eas build --platform android --env staging
```

**Or without EAS** (if not set up):
```bash
cd mobile-app
npx expo run:android --release
```

### Step 4: Install & Test

```bash
adb install -r app-release.apk
```

Then open app and try:
1. **Register** new account
2. **Login** 
3. **Add snacks** to cart
4. **Place order**

✅ **All should work now!**

---

## 📱 Detailed Step-by-Step Instructions

### Prerequisites
- Android device with USB debugging enabled
- `adb` installed (`android-platform-tools`)
- Backend running on development machine
- Mobile app code on your machine

### Step 0: Enable USB Debugging on Android

1. On Android device: **Settings** → **About Phone**
2. Tap **Build Number** 7 times (until "Developer Mode enabled" message)
3. Back to **Settings** → **Developer Options**
4. Enable **USB Debugging**
5. Connect to computer via USB

### Step 1: Verify ADB Connection

```bash
adb devices
```

**Expected output**:
```
List of attached devices
XXXXXXXXX              device
```

If you see `unauthorized`, tap "Allow" on your phone.

### Step 2: Ensure Backend is Running

From `backend` folder:

```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected output**:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

⚠️ **KEEP THIS TERMINAL OPEN** while testing!

### Step 3: Get Your Machine's IP Address

**Windows**:
```cmd
ipconfig
```

Find your network adapter's IPv4 (e.g., `192.168.1.100`). This is your `BACKEND_IP`.

### Step 4: Update Mobile App Configuration

In `mobile-app/.env.staging`:
```
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000
```

(Replace `192.168.1.100` with your actual IP)

### Step 5: Build APK

#### Option A: Using EAS (Recommended if set up)
```bash
cd mobile-app
eas build --platform android --env staging
```

This takes 5-10 minutes. You'll get a download link.

#### Option B: Build Locally (Faster, 2-3 minutes)
```bash
cd mobile-app
npx expo run:android --release
```

Output APK is at:
```
./android/app/build/outputs/apk/release/app-release.apk
```

### Step 6: Install APK on Device

```bash
adb install -r ./android/app/build/outputs/apk/release/app-release.apk
```

Wait for "Success" message.

### Step 7: Test on Device

1. **Open CloudSnacks app** on your Android device
2. **Register**:
   - Name: Test User
   - Email: test@example.com
   - Password: testpass123
   - **Tap Register**
   - ✅ Should auto-login

3. **Browse Snacks**:
   - Swipe through available snacks
   - ✅ Should see prices and categories

4. **Add to Cart**:
   - Tap any snack "Add to Cart"
   - Verify cart count increases
   - **Tap Cart icon**
   - ✅ Should see item in cart

5. **Checkout**:
   - Tap "Checkout"
   - **Logged in**: Email & name auto-filled
   - Fill: Phone number, Address, Delivery note (optional)
   - Tap "Place Order"
   - ✅ Should see order confirmation with Order ID

6. **View Order History**:
   - **Tap Account**
   - ✅ Should see order just created

---

## 🔍 Debugging: If Something Still Doesn't Work

### Issue 1: "Network Error" or "Failed to Fetch"

**Root Cause**: Wrong API URL or backend not reachable

**Debug Steps**:
```bash
# Test if device can reach backend
adb shell ping 192.168.1.100
```

**Solution**:
- Verify IP in `.env.staging`
- Verify backend is running
- Verify device is on same WiFi network as backend machine
- Try using `localhost` from Android emulator (not real device)

### Issue 2: "API Connection Timeout"

**Cause**: Port 8000 not accessible

**Fix**:
```bash
# Make sure backend is listening on 0.0.0.0 (not just 127.0.0.1)
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Issue 3: Registration fails with no error message

**Cause**: API returning error but app not showing it

**Debug**: Check backend console for error:
```
app/main.py - ERROR - ValueError: ...
```

**Common causes**:
- Database not initialized
- Missing snacks in database (seed not run)

**Fix**:
```bash
# In backend folder
python -c "from app.database import Base, engine; Base.metadata.create_all(bind=engine)"
python -c "from app.seed import seed_snacks; from app.database import SessionLocal; seed_snacks(SessionLocal())"
```

### Issue 4: "CORS" or "Invalid Token" Errors

**Status**: Should not occur - CORS already enabled

**If it does occur**:
```python
# Check app/main.py has CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Issue 5: App installs but won't open

**Cause**: Usually network or configuration issue

**Solution**:
1. Clear app data: `adb shell pm clear com.cloudsnacks.mobile`
2. Uninstall: `adb uninstall com.cloudsnacks.mobile`
3. Reinstall: `adb install -r app-release.apk`

---

## 📊 Test Verification Checklist

Use this to verify each feature works:

### Authentication
- [ ] Registration with new email → Works
- [ ] Duplicate registration → Shows error
- [ ] Login with correct credentials → Works
- [ ] Login with wrong password → Shows error
- [ ] Session persists after app restart → ✅
- [ ] Logout clears session → ✅

### Shopping
- [ ] Browse snacks → Shows 10+ snacks
- [ ] Add to cart → Cart count increases
- [ ] View cart → Items appear with prices
- [ ] Increase quantity → Price updates
- [ ] Decrease quantity → Price updates
- [ ] Remove item (qty 0) → Item disappears
- [ ] Clear cart → All items gone

### Orders
- [ ] Guest checkout (no login) → Works
- [ ] Logged-in checkout → Pre-fills email/name
- [ ] Order appears in history → ✅
- [ ] Order shows correct items/prices → ✅
- [ ] Order has unique ID → ✅

### Admin
- [ ] View all orders → Shows all orders
- [ ] Update order status → Reflects immediately
- [ ] Status changes: received → preparing → out_for_delivery → delivered

---

## 🎯 Performance Checklist

Test on actual Android device:

- [ ] App launches in < 3 seconds
- [ ] Snacks load in < 2 seconds
- [ ] Checkout submits in < 3 seconds
- [ ] Navigation is smooth (no lag)
- [ ] Memory usage reasonable (< 100MB)

---

## 🚀 Production Deployment

Once testing is complete and working:

### 1. Deploy Backend to Cloud

Choose one:
- **Railway** (easiest): railway.app
- **Render**: render.com
- **AWS**: EC2 instance
- **Google Cloud**: Cloud Run

Example with Railway:
```bash
cd backend
git add .
git commit -m "Ready for production"
railway up
```

After deployment, note your URL (e.g., `https://cloudsnacks-api-prod.railway.app`)

### 2. Update Production Environment

Edit `mobile-app/.env.production`:
```
EXPO_PUBLIC_API_URL=https://cloudsnacks-api-prod.railway.app
```

### 3. Build for Production

```bash
cd mobile-app
eas build --platform android --env production
```

### 4. Release to Google Play Store

1. Create Google Play Developer account
2. Create app listing
3. Upload APK from EAS
4. Fill store listing details
5. Submit for review

---

## 💡 Tips

1. **Keep terminal with backend open** while testing
2. **Same WiFi network** required for real device testing
3. **Clear app cache** if behavior seems stuck: `adb shell pm clear com.cloudsnacks.mobile`
4. **Check API URL** first if anything fails - it's usually the culprit!
5. **Use physical device for final testing** before deploying to Play Store

---

## 📞 Still Having Issues?

Check in this order:
1. Is backend running? (Check terminal)
2. Is API URL correct? (Check `.env.staging`)
3. Is device on same WiFi? 
4. Can device reach backend? (`adb shell ping ...`)
5. Any error messages in backend console?

Good luck! 🚀

