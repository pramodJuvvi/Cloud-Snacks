# CloudSnacks - Mobile Testing Setup & Execution Guide

**Generated**: May 19, 2026  
**Purpose**: Complete mobile testing of all 10 implemented features

---

## 🚀 QUICK START (2 Steps)

### Step 1: Configure for Your Mobile Device
Find your machine IP and update configuration:

```bash
# Windows - Get your IP
ipconfig

# Look for: IPv4 Address like 192.168.1.100
```

Edit `mobile-app/.env.staging`:
```
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000
```

### Step 2: Start Testing Environment
```bash
# Terminal 1: Start Backend
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Build & run APK (or use Expo Go)
cd mobile-app
npx expo start
# Then press 'a' for Android, or scan QR code with Expo Go app
```

---

## 📱 MOBILE TESTING SCENARIOS

### **TEST SET 1: Authentication** (10 minutes)

#### Scenario 1.1: New User Registration
**Steps**:
1. Open app on mobile
2. Tap "Create Account" button
3. Fill form:
   - Name: `Test User 1`
   - Email: `testuser1@example.com`
   - Password: `TestPass123`
4. Tap "Register"

**Expected Results**:
- ✅ Form validation passes
- ✅ Registration succeeds (no error)
- ✅ Auto-login happens
- ✅ See snacks on home screen
- ✅ User profile shows on Account tab

**Backend Check**:
```bash
# In backend terminal, you should see registration logs
# Open database to verify user was created
sqlite3 backend/app.db
SELECT * FROM users WHERE email='testuser1@example.com';
# Should show: id=1, name='Test User 1', email='testuser1@example.com'
```

---

#### Scenario 1.2: Duplicate Registration Fails
**Steps**:
1. Logout from current session (Account tab → Logout button)
2. Tap "Create Account"
3. Fill same email from Scenario 1.1: `testuser1@example.com`
4. Fill different details for name
5. Tap "Register"

**Expected Results**:
- ✅ See error: "An account already exists for this email"
- ✅ Registration blocked
- ✅ Stay on registration screen

---

#### Scenario 1.3: Login with Correct Credentials
**Steps**:
1. Should already be on login screen (after error in 1.2)
2. Enter: `testuser1@example.com` / `TestPass123`
3. Tap "Login"

**Expected Results**:
- ✅ Login succeeds
- ✅ Auto-redirect to home screen
- ✅ User name appears on Account tab

**Backend Check**:
```bash
sqlite3 backend/app.db
# Token should be in AsyncStorage on device (can't directly view, but verify user loaded)
```

---

#### Scenario 1.4: Login with Wrong Password
**Steps**:
1. Logout (Account tab → Logout)
2. Tap "Login"
3. Enter: `testuser1@example.com` / `WrongPassword123`
4. Tap "Login"

**Expected Results**:
- ✅ See error: "Invalid email or password"
- ✅ Stay on login screen
- ✅ No redirect

---

#### Scenario 1.5: Session Persistence
**Steps**:
1. Login with correct credentials (testuser1@example.com / TestPass123)
2. Wait for home screen
3. Close app completely
4. Reopen app

**Expected Results**:
- ✅ App opens directly to home screen (not login)
- ✅ User still logged in
- ✅ No need to login again
- ✅ User info shows on Account tab

**What's happening**: Token stored in AsyncStorage, auto-restored on app launch

---

### **TEST SET 2: Shopping & Cart** (15 minutes)

#### Scenario 2.1: Browse Snacks
**Steps**:
1. Make sure logged in (do login from TEST SET 1 if needed)
2. Tap "Home" tab
3. Scroll through snacks

**Expected Results**:
- ✅ See 10+ snacks displayed
- ✅ Each snack shows:
  - Name
  - Description
  - Price (in currency)
  - Prep time (minutes)
  - Calories
  - Category badge (Protein/Fresh/Sweet/Crunch)
  - "Add to Cart" button
- ✅ No errors on screen

**Backend Check**:
```bash
sqlite3 backend/app.db
SELECT COUNT(*) FROM snacks;
# Should show 10+

SELECT * FROM snacks LIMIT 3;
# Should show snack details with all fields
```

---

#### Scenario 2.2: Add Single Snack to Cart
**Steps**:
1. On Home tab, see snacks list
2. Tap "Add to Cart" on first snack
3. Observe cart icon in header

**Expected Results**:
- ✅ Cart count increases by 1
- ✅ Visual feedback (button animation or toast)
- ✅ Snack added to cart
- ✅ No navigation away from home

---

#### Scenario 2.3: Add Same Snack Multiple Times
**Steps**:
1. Tap "Add to Cart" on same snack 3 more times
2. Check cart icon

**Expected Results**:
- ✅ Cart count now shows 4 (not 1 item with qty 4)
- ✅ OR if single item, quantity increments to 4
- ✅ Each tap adds to cart

---

#### Scenario 2.4: View Cart
**Steps**:
1. Tap "Cart" tab or Cart icon in header
2. View cart contents

**Expected Results**:
- ✅ See items added (same snack, quantity shown)
- ✅ Each item shows:
  - Snack name
  - Unit price
  - Quantity
  - Subtotal (unit_price × quantity)
- ✅ Subtotal displayed at bottom
- ✅ Buttons to:
  - Increase quantity
  - Decrease quantity
  - Remove item
  - Clear cart

---

#### Scenario 2.5: Adjust Quantities
**Steps**:
1. In Cart tab, find an item
2. Tap "+" button 3 times (increase quantity)
3. Tap "-" button 2 times (decrease quantity)
4. Check subtotal updates

**Expected Results**:
- ✅ Quantity changes with each tap
- ✅ Subtotal updates: `unit_price × new_quantity`
- ✅ Cart count updates in header
- ✅ No lag or errors

---

#### Scenario 2.6: Remove Item
**Steps**:
1. In Cart, find an item
2. Tap "-" button until quantity becomes 0

**Expected Results**:
- ✅ Item disappears from cart
- ✅ Subtotal recalculates
- ✅ Cart count decreases

---

#### Scenario 2.7: Add Different Snacks
**Steps**:
1. Go back to Home tab
2. Add 2-3 different snacks to cart
3. Go to Cart tab

**Expected Results**:
- ✅ See multiple different snacks in cart
- ✅ Each with correct quantity and subtotal
- ✅ Total subtotal = sum of all items
- ✅ Example:
  ```
  Snack A: $5 × 2 = $10
  Snack B: $7 × 1 = $7
  Snack C: $3 × 3 = $9
  ─────────────────────
  Subtotal: $26
  ```

---

#### Scenario 2.8: Clear Cart
**Steps**:
1. In Cart tab, tap "Clear Cart" button
2. Check cart contents

**Expected Results**:
- ✅ All items removed
- ✅ Cart shows empty message
- ✅ Cart count = 0
- ✅ Subtotal = $0

---

### **TEST SET 3: Checkout (Guest)** (10 minutes)

#### Scenario 3.1: Logout & Test Guest Checkout
**Steps**:
1. Go to Account tab
2. Tap "Logout"
3. Wait for redirect to login/signup screen
4. Go to Home tab
5. Add 2-3 snacks to cart (should work without login)
6. Go to Cart tab
7. Tap "Checkout" button

**Expected Results**:
- ✅ Checkout form appears (no login redirect)
- ✅ Form fields:
  - Customer Name (empty)
  - Customer Email (empty)
  - Customer Phone (empty)
  - Delivery Address (empty)
  - Delivery Notes (optional)
  - Order Summary showing items

---

#### Scenario 3.2: Fill Checkout Form
**Steps**:
1. Fill checkout form with:
   - Name: `Guest Buyer`
   - Email: `guest@example.com`
   - Phone: `1234567890`
   - Address: `123 Main Street, City, State 12345`
   - Notes: `Leave at door` (optional)
2. Review order summary
3. Tap "Place Order"

**Expected Results**:
- ✅ Order submits (no errors)
- ✅ Success screen appears with:
  - Order confirmation message
  - Order ID (unique number)
  - Order total including delivery fee ($29)
  - Items summary
- ✅ Option to continue shopping or view order

**Backend Check**:
```bash
sqlite3 backend/app.db
SELECT * FROM orders WHERE customer_email='guest@example.com';
# Should show:
# id, customer_name='Guest Buyer', customer_email, status='received', total=..., created_at

SELECT * FROM order_items WHERE order_id=<the_order_id>;
# Should show items in that order with quantities and prices
```

---

#### Scenario 3.3: Validate Form Fields
**Steps**:
1. Start new checkout (add items again if needed)
2. Try to submit with empty fields:
   - Leave Name blank, try submit → Should show error
   - Leave Email blank, try submit → Should show error
   - Leave Phone blank, try submit → Should show error
   - Leave Address blank, try submit → Should show error

**Expected Results**:
- ✅ Error messages for each required field
- ✅ Form doesn't submit
- ✅ Stays on checkout screen

---

#### Scenario 3.4: Verify Delivery Fee Calculation
**Steps**:
1. Add snacks with known prices
   - Example: Snack A ($5) × 2 + Snack B ($7) × 1
2. Subtotal = $17
3. Go to checkout
4. Check order total before submitting

**Expected Results**:
- ✅ Subtotal shown: $17
- ✅ Delivery fee shown: $29
- ✅ Total = $17 + $29 = $46
- ✅ Math is correct

---

### **TEST SET 4: Checkout (Logged In)** (5 minutes)

#### Scenario 4.1: Logged-In Checkout
**Steps**:
1. Login with testuser1@example.com / TestPass123
2. Add 2-3 snacks to cart
3. Go to Cart tab
4. Tap "Checkout"

**Expected Results**:
- ✅ Checkout form appears
- ✅ **Name auto-filled**: Should show `Test User 1`
- ✅ **Email auto-filled**: Should show `testuser1@example.com`
- ✅ **Phone & Address**: Still require input (not auto-filled)
- ✅ Less typing needed compared to guest checkout

---

#### Scenario 4.2: Complete Logged-In Order
**Steps**:
1. Phone field still empty, address still empty
2. Fill:
   - Phone: `9876543210`
   - Address: `456 Oak Avenue, Town, State 54321`
3. Tap "Place Order"

**Expected Results**:
- ✅ Order succeeds
- ✅ Order confirmation appears
- ✅ Order ID displayed
- ✅ Delivery fee ($29) included

**Backend Check**:
```bash
sqlite3 backend/app.db
SELECT * FROM orders WHERE customer_email='testuser1@example.com';
# Should show:
# This order linked to user (user_id will NOT be NULL)
# customer_name='Test User 1' (auto-filled)
# customer_email='testuser1@example.com'
```

---

### **TEST SET 5: Order History** (5 minutes)

#### Scenario 5.1: View Order History (After Login)
**Steps**:
1. Make sure logged in with testuser1@example.com
2. Go to Account tab
3. Look for "Order History" or "My Orders" section

**Expected Results**:
- ✅ See orders placed while logged in
- ✅ Should see order from Scenario 4.2
- ✅ Each order shows:
  - Order ID
  - Date/Time created
  - Total amount
  - Status (should be "received")
  - Number of items
- ✅ Orders sorted by newest first

---

#### Scenario 5.2: View Order Details
**Steps**:
1. In Order History, tap on one order
2. Expand/view details

**Expected Results**:
- ✅ Order expands to show:
  - Customer name
  - Customer email
  - Customer phone
  - Delivery address
  - Delivery notes
  - Items list with:
    - Snack name
    - Quantity
    - Unit price
    - Subtotal
  - Total including delivery fee
  - Current status

---

#### Scenario 5.3: Guest Orders Don't Show in History
**Steps**:
1. Logout (Account tab → Logout)
2. Login again with testuser1@example.com
3. Go to Account tab

**Expected Results**:
- ✅ Only see order from Scenario 4.2 (logged-in order)
- ✅ Do NOT see guest order from Scenario 3.2
- ✅ This is correct behavior (guest orders not tied to account)

**Why**: Guest orders (user_id = NULL) don't show in `GET /orders/me` endpoint

---

### **TEST SET 6: Admin Features** (5 minutes)

#### Scenario 6.1: Access Admin Dashboard
**Steps**:
1. Look for Admin tab or Admin button
2. Tap to open admin screen

**Expected Results**:
- ✅ Admin screen loads
- ✅ Shows list of ALL orders (from all users/guests)
- ✅ Includes:
  - Guest orders from Scenario 3.2
  - Logged-in orders from Scenario 4.2
- ✅ Each order shows:
  - Order ID
  - Customer name
  - Customer email
  - Status
  - Total
  - Date

---

#### Scenario 6.2: Update Order Status
**Steps**:
1. In Admin screen, find an order
2. Tap on it to expand/select it
3. Look for status update option (dropdown or buttons)
4. Change status:
   - `received` → `preparing`
5. Confirm/save

**Expected Results**:
- ✅ Status updates in real-time
- ✅ You see change immediately in list
- ✅ Updated status shows: `preparing`

**Backend Check**:
```bash
sqlite3 backend/app.db
SELECT id, customer_name, status FROM orders ORDER BY created_at DESC LIMIT 1;
# Should show: status='preparing' (changed from 'received')
```

---

#### Scenario 6.3: Status Progression
**Steps**:
1. Update status progression:
   - `preparing` → `out_for_delivery`
   - `out_for_delivery` → `delivered`
2. Watch status update each time

**Expected Results**:
- ✅ Each update succeeds
- ✅ Valid status progression works
- ✅ Final status: `delivered`

---

#### Scenario 6.4: Invalid Status Progression (Optional)
**Steps**:
1. Try to jump from `delivered` back to `preparing`
2. Or try invalid status

**Expected Results**:
- ✅ Either blocked with error or
- ✅ Only allows valid transitions
- ✅ Error shown if invalid

---

## 🧪 AUTOMATED TESTING (Optional but Recommended)

### Run Backend Tests
```bash
cd backend
pip install -r requirements-dev.txt
pytest tests/ -v -s
```

Expected: 25+ tests pass ✅

Output example:
```
tests/test_api.py::TestUserRegistration::test_register_new_user_success PASSED
tests/test_api.py::TestUserLogin::test_login_success PASSED
...
========================= 25 passed in 2.34s =========================
```

---

## 📊 TESTING CHECKLIST

Mark off as you complete each test:

### Authentication (Scenarios 1.1-1.5)
- [ ] 1.1: New user registration succeeds
- [ ] 1.2: Duplicate email blocked
- [ ] 1.3: Login with correct credentials
- [ ] 1.4: Login with wrong password fails
- [ ] 1.5: Session persists after app restart

### Shopping (Scenarios 2.1-2.8)
- [ ] 2.1: Browse snacks shows 10+
- [ ] 2.2: Add single snack to cart
- [ ] 2.3: Add same snack multiple times
- [ ] 2.4: View cart shows all items
- [ ] 2.5: Adjust quantities (increase/decrease)
- [ ] 2.6: Remove item by quantity = 0
- [ ] 2.7: Add multiple different snacks
- [ ] 2.8: Clear cart removes all items

### Guest Checkout (Scenarios 3.1-3.4)
- [ ] 3.1: Checkout form appears for guest
- [ ] 3.2: Guest order submission succeeds
- [ ] 3.3: Form validation works
- [ ] 3.4: Delivery fee ($29) calculated correctly

### Logged-In Checkout (Scenarios 4.1-4.2)
- [ ] 4.1: Name & email auto-filled for logged-in user
- [ ] 4.2: Logged-in order placement succeeds

### Order History (Scenarios 5.1-5.3)
- [ ] 5.1: View order history shows past orders
- [ ] 5.2: Expand order shows full details
- [ ] 5.3: Guest orders don't appear in logged-in user's history

### Admin (Scenarios 6.1-6.4)
- [ ] 6.1: Admin screen shows all orders
- [ ] 6.2: Update order status works
- [ ] 6.3: Status progression (received→preparing→out_for_delivery→delivered)
- [ ] 6.4: Order list updates in real-time

---

## 🐛 TROUBLESHOOTING DURING TESTING

### "Network Error" or Timeout
**Problem**: App can't reach backend  
**Solution**:
1. Check API URL in `.env.staging` matches your machine IP
2. Verify backend is running: `python -m uvicorn app.main:app...`
3. Ensure device is on same WiFi as backend machine

### "No Snacks Showing"
**Problem**: Snacks list empty  
**Solution**:
```bash
# In backend directory
sqlite3 backend/app.db
SELECT COUNT(*) FROM snacks;
# If 0, they weren't seeded. Restart backend and check startup logs
```

### "Order Won't Submit"
**Problem**: Checkout fails  
**Solution**:
1. Check all required fields are filled
2. Check backend console for error
3. Verify phone number is valid (7+ digits)

### "Logged-In Data Showing in Guest Account"
**Problem**: Cross-contamination  
**Solution**: 
1. Clear app cache: `adb shell pm clear com.cloudsnacks.mobile`
2. Reinstall APK if testing multiple accounts

---

## ⏱️ TIME ESTIMATES

| Test Set | Scenarios | Time |
|----------|-----------|------|
| Authentication | 1.1-1.5 | 10 min |
| Shopping | 2.1-2.8 | 15 min |
| Guest Checkout | 3.1-3.4 | 10 min |
| Logged-In Checkout | 4.1-4.2 | 5 min |
| Order History | 5.1-5.3 | 5 min |
| Admin | 6.1-6.4 | 5 min |
| **Total** | 16 scenarios | **50 min** |

---

## ✅ TESTING SUCCESS CRITERIA

You've tested thoroughly when:
- [x] All 6 test sets completed
- [x] All scenarios marked off
- [x] No errors or crashes
- [x] All expected results match actual results
- [x] Database data verified for key actions
- [x] Both guest and logged-in flows tested
- [x] Admin features working

---

## 📞 WHILE TESTING - MONITOR BACKEND

Keep backend console visible to see:
```
✅ GET /snacks - Returns 10 snacks
✅ POST /auth/register - User created
✅ POST /auth/login - Token issued
✅ POST /orders - Order created
✅ PATCH /admin/orders/{id}/status - Status updated
```

---

**You're ready to test! Start with TEST SET 1 (Authentication) and work your way through.** 🚀

