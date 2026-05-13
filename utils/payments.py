# utils/payments.py
# Razorpay integration for Cloud Snacks
# Docs: https://razorpay.com/docs/payments/payment-gateway/
#
# SETUP:
# 1. Create free account at https://razorpay.com
# 2. Dashboard → Settings → API Keys → Generate Key
# 3. Replace KEY_ID and KEY_SECRET below
# 4. Start with TEST mode — no real money moves
# Cost: 2% per transaction, no monthly fee, no setup fee

import json
import urllib.request
import urllib.parse
import base64
import hashlib
import hmac
from datetime import datetime

# ─── Replace with your actual Razorpay keys ───────────────────────────────────
RAZORPAY_KEY_ID     = "rzp_test_YOUR_KEY_ID"      # test key starts with rzp_test_
RAZORPAY_KEY_SECRET = "YOUR_KEY_SECRET"
RAZORPAY_BASE_URL   = "https://api.razorpay.com/v1"

MOCK_MODE = True  # Set False when you have real Razorpay keys


def _auth_header():
    credentials = f"{RAZORPAY_KEY_ID}:{RAZORPAY_KEY_SECRET}"
    encoded = base64.b64encode(credentials.encode()).decode()
    return {"Authorization": f"Basic {encoded}", "Content-Type": "application/json"}


def _post(endpoint, data):
    """POST to Razorpay API"""
    try:
        body = json.dumps(data).encode()
        req = urllib.request.Request(
            f"{RAZORPAY_BASE_URL}{endpoint}",
            data=body,
            headers=_auth_header(),
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read().decode())
    except Exception as e:
        print(f"Razorpay API error: {e}")
        return None


def create_order(amount_rupees, order_id, customer_name, customer_email, customer_phone=""):
    """
    Creates a Razorpay order before showing the payment screen.
    Must be called server-side (Cloud Function) in production.

    Returns: {"razorpay_order_id": str, "amount": int, "currency": str, "key_id": str}
    """
    if MOCK_MODE:
        return _mock_order(amount_rupees, order_id)

    amount_paise = int(amount_rupees * 100)  # Razorpay uses paise (1 INR = 100 paise)

    data = {
        "amount":          amount_paise,
        "currency":        "INR",
        "receipt":         order_id,
        "notes": {
            "order_id":    order_id,
            "customer":    customer_name,
        },
    }

    result = _post("/orders", data)
    if not result:
        return None

    return {
        "razorpay_order_id": result["id"],
        "amount":            amount_paise,
        "currency":          "INR",
        "key_id":            RAZORPAY_KEY_ID,
        "customer_name":     customer_name,
        "customer_email":    customer_email,
        "customer_phone":    customer_phone,
    }


def verify_payment(razorpay_order_id, razorpay_payment_id, razorpay_signature):
    """
    Verifies the payment signature after user completes payment.
    MUST be done server-side in production — never on the client.

    Returns: True if payment is authentic, False otherwise
    """
    if MOCK_MODE:
        return True

    message = f"{razorpay_order_id}|{razorpay_payment_id}"
    expected = hmac.new(
        RAZORPAY_KEY_SECRET.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected, razorpay_signature)


def initiate_refund(payment_id, amount_rupees=None, reason="customer_request"):
    """
    Issues a full or partial refund.
    Full refund if amount_rupees is None.

    Returns: {"refund_id": str, "status": str} or None
    """
    if MOCK_MODE:
        return {"refund_id": f"rfnd_mock_{payment_id[:8]}", "status": "processed"}

    data = {"speed": "normal", "notes": {"reason": reason}}
    if amount_rupees:
        data["amount"] = int(amount_rupees * 100)

    result = _post(f"/payments/{payment_id}/refund", data)
    if not result:
        return None

    return {"refund_id": result["id"], "status": result["status"]}


def get_payment_methods():
    """Returns supported payment methods to show in the UI"""
    return [
        {"id": "upi",    "label": "UPI",           "icon": "💳", "popular": True,  "desc": "PhonePe, GPay, Paytm"},
        {"id": "card",   "label": "Debit / Credit", "icon": "🏦", "popular": False, "desc": "Visa, Mastercard, RuPay"},
        {"id": "wallet", "label": "Wallets",        "icon": "👛", "popular": False, "desc": "Paytm, Amazon Pay"},
        {"id": "cod",    "label": "Cash on delivery","icon": "💵", "popular": False, "desc": "Pay when delivered"},
    ]


def format_payment_for_display(amount_rupees):
    """Returns formatted amount string"""
    return f"₹{amount_rupees}"


# ─── Mock helpers ──────────────────────────────────────────────────────────────

import random
import string

def _mock_order(amount_rupees, order_id):
    mock_rzp_id = "order_" + "".join(random.choices(string.ascii_letters + string.digits, k=14))
    return {
        "razorpay_order_id": mock_rzp_id,
        "amount":            int(amount_rupees * 100),
        "currency":          "INR",
        "key_id":            RAZORPAY_KEY_ID,
        "customer_name":     "Ravi Kumar",
        "customer_email":    "ravi@example.com",
        "customer_phone":    "+919876543210",
        "_mock":             True,
    }


def mock_payment_complete(razorpay_order_id):
    """Simulate a successful payment (mock mode only)"""
    pay_id = "pay_" + "".join(random.choices(string.ascii_letters + string.digits, k=14))
    sig    = "mock_sig_" + pay_id
    return {
        "razorpay_payment_id": pay_id,
        "razorpay_order_id":   razorpay_order_id,
        "razorpay_signature":  sig,
        "method":              "upi",
        "status":              "captured",
        "paid_at":             datetime.now().isoformat(),
    }
