# CloudSnacks - Complete Fix Checklist

Use this checklist to verify everything is working and to guide your implementation.

---

## ✅ Phase 1: Understanding (5 minutes)

- [ ] Read `00_START_HERE.md`
- [ ] Read `README_FEATURE_STATUS.md` "CRITICAL ISSUE IDENTIFIED" section
- [ ] Understand: APK fails because API URL = localhost
- [ ] Understand: Solution = set EXPO_PUBLIC_API_URL before build

---

## ✅ Phase 2: Quick Fix (10 minutes)

- [ ] Find your machine's IP address (ipconfig on Windows)
  - Write it down: `___________`

- [ ] Edit `mobile-app/.env.staging`:
  ```
  EXPO_PUBLIC_API_URL=http://YOUR_IP:8000
  ```

- [ ] Start backend server:
  ```
  cd backend
  python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
  ```
  - [ ] Verify message: "Uvicorn running on http://0.0.0.0:8000"
  - [ ] Keep terminal open

- [ ] Build new APK:
  ```
  cd mobile-app
  eas build --platform android --env staging
  ```
  - [ ] Wait for build to complete
  - [ ] Note APK download link/location

---

## ✅ Phase 3: Test on Real Device (15 minutes)

**Prerequisites**:
- [ ] Android phone with USB debugging enabled
- [ ] USB cable connected to computer
- [ ] `adb` installed and working

**Installation**:
- [ ] Run: `adb install -r app-release.apk`
- [ ] Wait for "Success" message

**Manual Testing** (use checklist from TESTING_AND_DEBUGGING_GUIDE.md):
- [ ] Open CloudSnacks app on phone
- [ ] Try to register new account
  - [ ] Should work (API is now reachable!)
  - [ ] Should auto-login after registration
  - [ ] Should see snacks on home screen

- [ ] Try core features:
  - [ ] Add snack to cart
  - [ ] View cart
  - [ ] Try to checkout
  - [ ] Verify order created
  - [ ] Check account screen for order history

---

## ✅ Phase 4: Run Automated Tests (10 minutes)

**Backend Tests**:
- [ ] Install: `cd backend && pip install -r requirements-dev.txt`
- [ ] Run: `pytest tests/ -v`
- [ ] Expected: 25+ tests passing ✅

**Frontend Tests**:
- [ ] Install: `cd mobile-app && npm install --save-dev jest @testing-library/react-native @testing-library/jest-native`
- [ ] Run: `npm test -- --coverage`
- [ ] Expected: 10+ tests passing ✅

---

## ✅ Phase 5: Comprehensive Testing (30 minutes)

Use detailed checklist from **TESTING_AND_DEBUGGING_GUIDE.md**:

**Authentication Tests**:
- [ ] Register with new email
- [ ] Register with duplicate email (should fail)
- [ ] Login with correct credentials
- [ ] Login with wrong password (should fail)
- [ ] Logout
- [ ] Session persists after app restart

**Catalog & Cart Tests**:
- [ ] Browse snacks (should show 10+)
- [ ] Add snack to cart
- [ ] Add same snack again (quantity increases)
- [ ] View cart
- [ ] Increase/decrease quantities
- [ ] Remove items
- [ ] Clear cart

**Order Tests**:
- [ ] Checkout as guest (no login)
- [ ] Verify order confirmation
- [ ] Checkout as logged-in user (email auto-filled)
- [ ] View order in history
- [ ] Check order status

**Admin Tests** (if available):
- [ ] View all orders
- [ ] Update order status
- [ ] Verify status changes reflect

---

## ✅ Phase 6: Deployment to Cloud (Optional but Recommended)

**Choose deployment platform**:
- [ ] Railway (easiest): railway.app
- [ ] Render: render.com  
- [ ] AWS: EC2
- [ ] Google Cloud: Cloud Run

**After deployment**:
- [ ] Note new API URL: `_______________________________`

- [ ] Edit `mobile-app/.env.production`:
  ```
  EXPO_PUBLIC_API_URL=https://your-api-url.com
  ```

- [ ] Build production APK:
  ```
  eas build --platform android --env production
  ```

- [ ] Test on real device to verify cloud backend works

---

## ✅ Feature Verification Matrix

Mark ✅ when each feature works on your real device:

### Authentication
- [ ] Registration
- [ ] Login
- [ ] Logout
- [ ] Session persistence

### Shopping
- [ ] Browse snacks
- [ ] Add to cart
- [ ] View cart
- [ ] Adjust quantities
- [ ] Clear cart

### Checkout
- [ ] Guest checkout
- [ ] Logged-in checkout
- [ ] Order confirmation
- [ ] Correct total calculation

### Account
- [ ] View profile
- [ ] View order history
- [ ] Order details display

### Admin (if applicable)
- [ ] View all orders
- [ ] Update order status
- [ ] Status changes reflected

---

## 🆘 Troubleshooting Checklist

If something doesn't work:

**"Network error" or timeout**:
- [ ] Backend running? (check terminal)
- [ ] Correct IP in .env.staging? (use ipconfig)
- [ ] Device on same WiFi as backend? 
- [ ] Port 8000 accessible? (try ping)

**"Registration fails silently"**:
- [ ] Check backend terminal for error messages
- [ ] Try test with curl first: `curl http://IP:8000/auth/register`

**"App won't launch"**:
- [ ] Clear app data: `adb shell pm clear com.cloudsnacks.mobile`
- [ ] Uninstall and reinstall APK

**"Snacks don't load"**:
- [ ] Backend seeded snacks? (check startup logs)
- [ ] Database initialized? (check backend console)

**"Tests won't run"**:
- [ ] Dependencies installed? (`pip install -r requirements-dev.txt`)
- [ ] Python version correct? (3.8+)
- [ ] Node version correct? (14+)

---

## 📊 Success Criteria

You're done when:

- [x] All 10 features are implemented ✅ (Already done!)
- [ ] 25+ backend tests pass ✅ (Need to run)
- [ ] 10+ frontend tests pass ✅ (Need to run)
- [ ] Registration works on real device ✅ (After env fix)
- [ ] Orders can be placed on real device ✅ (After env fix)
- [ ] Order history displays correctly ✅ (After env fix)
- [ ] Manual test checklist 100% complete ✅ (After testing)

---

## 🎯 Time Estimates

| Phase | Time | Status |
|-------|------|--------|
| Understanding problem | 5 min | ⏱️ Do this now |
| Quick fix | 10 min | ⏱️ Do this now |
| Test on device | 15 min | ⏱️ Do this now |
| Run tests | 10 min | ⏳ Next |
| Full testing | 30 min | ⏳ Then |
| Cloud deployment | 30 min | ⏳ Optional |
| **Total** | **100 min** | **~1.5 hours** |

---

## ✨ Quick Summary

1. **Set API URL** (5 min): Edit `.env.staging` with your machine's IP
2. **Build APK** (10 min): `eas build --platform android --env staging`
3. **Test on phone** (15 min): Install APK and test features
4. **Run tests** (10 min): `pytest` and `npm test`
5. **Full test** (30 min): Follow comprehensive checklist
6. **Deploy** (30 min): Optional - deploy backend to cloud

---

## 📞 Help

If you get stuck:
1. Check troubleshooting section above
2. Review `TESTING_AND_DEBUGGING_GUIDE.md`
3. Check backend console for error messages
4. Use `adb logcat` to see app logs on device

---

## ✅ Final Checklist

Before considering "complete":

- [ ] Understand why APK was broken (API URL issue)
- [ ] Fixed environment variables
- [ ] Built new APK with correct API URL
- [ ] Tested all 10 features on real device
- [ ] Ran automated test suite (backend + frontend)
- [ ] Completed manual testing checklist
- [ ] Read documentation to understand architecture
- [ ] Ready to deploy to production (optional)

**You're done when all boxes are checked!** ✅

