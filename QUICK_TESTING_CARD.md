# CloudSnacks - Quick Mobile Testing Card

**Print this and follow along while testing on your mobile device!**

---

## ⚡ PRE-TESTING SETUP (5 minutes)

```bash
# 1. Find your machine's IP
ipconfig
# Look for: IPv4 Address (e.g., 192.168.1.100)

# 2. Edit mobile-app/.env.staging
# Change: EXPO_PUBLIC_API_URL=http://192.168.1.100:8000

# 3. Terminal 1 - Start Backend
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 4. Terminal 2 - Start Mobile App
cd mobile-app
npx expo start
# Press 'a' for Android or scan QR with Expo Go
```

---

## 📋 TEST SCENARIOS (50 minutes total)

### 🔐 AUTHENTICATION (10 min)
| # | Action | Expected Result | ✓ |
|---|--------|-----------------|---|
| 1.1 | Register: `testuser@example.com` / `Pass123` | Auto-login, see snacks | ☐ |
| 1.2 | Try register same email | Error: "account already exists" | ☐ |
| 1.3 | Login: correct email/password | Login succeeds, see home | ☐ |
| 1.4 | Login: wrong password | Error: "Invalid email or password" | ☐ |
| 1.5 | Close app, reopen | Still logged in (session persisted) | ☐ |

### 🛒 SHOPPING & CART (15 min)
| # | Action | Expected Result | ✓ |
|---|--------|-----------------|---|
| 2.1 | Browse Home tab | See 10+ snacks with prices & categories | ☐ |
| 2.2 | Add 1 snack to cart | Cart count increases by 1 | ☐ |
| 2.3 | Add same snack 3 more times | Cart count = 4 | ☐ |
| 2.4 | Go to Cart tab | See all items with quantities | ☐ |
| 2.5 | Increase qty (+), then decrease (-) | Subtotal updates correctly | ☐ |
| 2.6 | Remove item (qty = 0) | Item disappears | ☐ |
| 2.7 | Add 3 different snacks to cart | Cart shows all different items | ☐ |
| 2.8 | Clear cart | All items gone, subtotal = $0 | ☐ |

### 👤 GUEST CHECKOUT (10 min)
| # | Action | Expected Result | ✓ |
|---|--------|-----------------|---|
| 3.1 | Logout, add snacks, tap Checkout | Checkout form appears (no redirect) | ☐ |
| 3.2 | Fill form & submit | Order confirmation with Order ID | ☐ |
| 3.3 | Try submit empty fields | Validation errors show | ☐ |
| 3.4 | Check total calculation | Total = Subtotal + $29 delivery fee | ☐ |

### 👥 LOGGED-IN CHECKOUT (5 min)
| # | Action | Expected Result | ✓ |
|---|--------|-----------------|---|
| 4.1 | Login, add snacks, checkout | Name & Email auto-filled | ☐ |
| 4.2 | Fill phone/address, submit | Order succeeds | ☐ |

### 📜 ORDER HISTORY (5 min)
| # | Action | Expected Result | ✓ |
|---|--------|-----------------|---|
| 5.1 | Go to Account tab | See past orders listed | ☐ |
| 5.2 | Tap order to expand | See full details (items, total, address) | ☐ |
| 5.3 | Logout, login | Only see logged-in user's orders | ☐ |

### ⚙️ ADMIN (5 min)
| # | Action | Expected Result | ✓ |
|---|--------|-----------------|---|
| 6.1 | Open Admin screen | See ALL orders (guest + authenticated) | ☐ |
| 6.2 | Update order status | Status changes: received → preparing | ☐ |
| 6.3 | Progress status | preparing → out_for_delivery → delivered | ☐ |

---

## 🐛 IF SOMETHING BREAKS

| Problem | Quick Fix |
|---------|-----------|
| "Network Error" | Check IP in `.env.staging` matches `ipconfig` |
| No snacks showing | Restart backend, wait for "seeding snacks" log |
| Order won't submit | Fill ALL required fields, check phone length |
| Session not saving | Logout, clear app cache, login again |
| API seems slow | Normal on first load. Check backend is running |

---

## 🧪 BACKEND VERIFICATION (While Testing)

Keep backend console visible. You should see:

```
✅ GET /snacks - Returns snacks list
✅ POST /auth/register - User created
✅ POST /auth/login - Token issued
✅ POST /orders - Order created with id, subtotal, delivery_fee, total
✅ GET /orders/me - Returns user's orders
✅ GET /admin/orders - Returns all orders
✅ PATCH /admin/orders/{id}/status - Status updated
```

---

## 📊 DATABASE CHECK (After Testing)

```bash
# Open another terminal
cd backend
sqlite3 app.db

-- Check users created
SELECT * FROM users;

-- Check orders placed
SELECT id, customer_name, status, total FROM orders ORDER BY id DESC;

-- Check order items
SELECT * FROM order_items;

-- Check snacks seeded
SELECT COUNT(*) FROM snacks;

-- Exit
.exit
```

---

## ✅ SUCCESS CHECKLIST

Testing complete when:
- [ ] All 16 scenarios marked ✓
- [ ] No crashes or errors
- [ ] Both guest & logged-in flows work
- [ ] Admin can view & update orders
- [ ] Database shows correct data
- [ ] Cart calculations correct
- [ ] Session persists after restart

---

## 📝 NOTES WHILE TESTING

```
Test Date: ______________
Device: ______________
Backend IP: ______________
Issues Found:
  1. _________________________________
  2. _________________________________
  3. _________________________________

Overall Experience (1-5 stars): ______
Improvements Needed:
  _________________________________
  _________________________________
```

---

## ⏱️ TIME TRACKING

| Section | Start Time | End Time | Notes |
|---------|-----------|----------|-------|
| Setup | __:__ | __:__ | |
| Auth | __:__ | __:__ | |
| Shopping | __:__ | __:__ | |
| Guest Checkout | __:__ | __:__ | |
| Logged-In Checkout | __:__ | __:__ | |
| Order History | __:__ | __:__ | |
| Admin | __:__ | __:__ | |
| **TOTAL** | | | |

---

**When done with all tests → Read full guides for detailed analysis!** 📚

