# utils/engagement.py
# Customer engagement features for Cloud Snacks
# All built in Python — zero external cost

import random
from datetime import datetime, timedelta


# ─── Flash Deals ──────────────────────────────────────────────────────────────

FLASH_DEALS = [
    {
        "id":          "flash_1",
        "title":       "⚡ Lightning Deal",
        "item_name":   "Veg Puff + Chai",
        "item_ids":    ["veg-puff", "masala-chai"],
        "original":    89,
        "deal_price":  59,
        "savings":     34,
        "emoji":       "🥐☕",
        "expires_min": 23,  # minutes remaining
        "claimed":     38,
        "total":       50,
    },
    {
        "id":          "flash_2",
        "title":       "🔥 Hot Deal",
        "item_name":   "Samosa (4 pcs)",
        "item_ids":    ["samosa", "samosa"],
        "original":    70,
        "deal_price":  49,
        "savings":     30,
        "emoji":       "🧆",
        "expires_min": 47,
        "claimed":     12,
        "total":       30,
    },
    {
        "id":          "flash_3",
        "title":       "🎯 Today Only",
        "item_name":   "Paneer Wrap + Cold Coffee",
        "item_ids":    ["paneer-wrap", "cold-coffee"],
        "original":    164,
        "deal_price":  119,
        "savings":     27,
        "emoji":       "🌯🧋",
        "expires_min": 11,
        "claimed":     44,
        "total":       45,
    },
]


def get_flash_deals():
    """Returns active flash deals with live countdown"""
    deals = []
    for d in FLASH_DEALS:
        deal = d.copy()
        deal["urgency"] = "low"
        if deal["expires_min"] <= 15:
            deal["urgency"] = "high"
        elif deal["expires_min"] <= 30:
            deal["urgency"] = "medium"
        deal["percent_claimed"] = int(deal["claimed"] / deal["total"] * 100)
        deal["spots_left"] = deal["total"] - deal["claimed"]
        deals.append(deal)
    return deals


def format_countdown(minutes):
    """Format minutes as MM:SS countdown string"""
    m = minutes % 60
    s = random.randint(0, 59)  # in real app: use actual seconds
    return f"{m:02d}:{s:02d}"


# ─── Spin-the-Wheel Reward ────────────────────────────────────────────────────

SPIN_PRIZES = [
    {"label": "10% off",    "value": "SPIN10",   "type": "discount", "probability": 0.30, "color": "#1D9E75"},
    {"label": "Free Chai",  "value": "FREECHAI", "type": "free_item","probability": 0.15, "color": "#BA7517"},
    {"label": "5% off",     "value": "SPIN5",    "type": "discount", "probability": 0.25, "color": "#185FA5"},
    {"label": "₹20 off",    "value": "FLAT20",   "type": "flat",     "probability": 0.15, "color": "#993556"},
    {"label": "Try again",  "value": None,        "type": "none",     "probability": 0.10, "color": "#888780"},
    {"label": "Free Puff",  "value": "FREEPUFF", "type": "free_item","probability": 0.05, "color": "#3B6D11"},
]


def spin_wheel():
    """
    Runs the spin result logic.
    In the app, the wheel animation plays, then this result is revealed.

    Returns the winning prize dict.
    """
    rand = random.random()
    cumulative = 0
    for prize in SPIN_PRIZES:
        cumulative += prize["probability"]
        if rand <= cumulative:
            return prize
    return SPIN_PRIZES[0]


def can_spin_today(last_spin_date):
    """One free spin per day"""
    if not last_spin_date:
        return True
    last = datetime.fromisoformat(last_spin_date)
    return (datetime.now() - last).days >= 1


# ─── Social Proof Feed ────────────────────────────────────────────────────────

SOCIAL_FEED = [
    {"name": "Priya S.",  "area": "Gachibowli",  "item": "Paneer Wrap",   "time": "2m ago",  "emoji": "🌯"},
    {"name": "Arjun R.",  "area": "HITEC City",  "item": "Veg Puff × 3", "time": "4m ago",  "emoji": "🥐"},
    {"name": "Divya K.",  "area": "Kondapur",    "item": "Masala Chai",  "time": "6m ago",  "emoji": "☕"},
    {"name": "Rahul M.",  "area": "Madhapur",    "item": "Samosa",        "time": "9m ago",  "emoji": "🧆"},
    {"name": "Sneha T.",  "area": "Banjara Hills","item": "Combo Deal",   "time": "11m ago", "emoji": "🎁"},
    {"name": "Kiran B.",  "area": "Jubilee Hills","item": "Cold Coffee",  "time": "14m ago", "emoji": "🧋"},
    {"name": "Ananya P.", "area": "Kukatpally",  "item": "Sprout Bowl",  "time": "18m ago", "emoji": "🥗"},
    {"name": "Vikram C.", "area": "Manikonda",   "item": "Dry Fruit Mix","time": "22m ago", "emoji": "🥜"},
]

REVIEW_SNIPPETS = [
    {"name": "Rohit G.",   "rating": 5, "text": "Veg Puff was piping hot, loved it! 🔥",         "item": "Veg Puff"},
    {"name": "Meena S.",   "rating": 5, "text": "Delivered in 20 min, super fresh!",              "item": "Masala Chai"},
    {"name": "Aditya K.",  "rating": 4, "text": "Best samosa in Gachibowli, no doubt.",           "item": "Samosa"},
    {"name": "Lakshmi P.", "rating": 5, "text": "Ordered daily now, love the streak rewards 🔥",  "item": "Paneer Wrap"},
    {"name": "Suresh N.",  "rating": 5, "text": "Hygiene is top notch, packaging was sealed.",    "item": "Sprout Bowl"},
]


def get_social_feed(limit=5):
    """Live order activity to show on home screen"""
    return SOCIAL_FEED[:limit]


def get_reviews(limit=3):
    return REVIEW_SNIPPETS[:limit]


# ─── Referral System ──────────────────────────────────────────────────────────

def generate_referral_message(user_name, referral_code):
    return (
        f"Hey! I've been ordering fresh snacks from Cloud Snacks ☁️🍟\n"
        f"Hyderabad's best hygiene snacks delivered in 25 min!\n\n"
        f"Use my code {referral_code} to get ₹50 off your first order.\n"
        f"Download: https://cloudsnacks.app\n\n"
        f"- {user_name}"
    )


def apply_referral(code, user_id):
    """Validates and applies a referral code"""
    # In production: check Firestore for the code
    if code and len(code) >= 4:
        return {"valid": True, "discount": 50, "message": "₹50 off applied!"}
    return {"valid": False, "message": "Invalid referral code"}


# ─── Smart Suggestions ────────────────────────────────────────────────────────

def get_personalized_suggestions(user, menu_items):
    """
    Simple rule-based recommendation engine.
    Replace with Firebase ML or a simple collaborative filter later.
    """
    suggestions = []
    hour = datetime.now().hour

    # Time-based suggestions
    if 7 <= hour <= 10:
        suggestions.append({"reason": "Popular morning pick ☀️",
                             "items": [i for i in menu_items if i["id"] in ["veg-puff", "masala-chai"]]})
    elif 11 <= hour <= 14:
        suggestions.append({"reason": "Perfect lunch snack 🍽️",
                             "items": [i for i in menu_items if i["id"] in ["paneer-wrap", "sprout-bowl"]]})
    elif 15 <= hour <= 17:
        suggestions.append({"reason": "Evening snack time 🌆",
                             "items": [i for i in menu_items if i["id"] in ["samosa", "cold-coffee"]]})

    # Diet-based
    if user.get("diet") == "Vegetarian":
        healthy = [i for i in menu_items if "healthy" in i.get("tags", [])]
        if healthy:
            suggestions.append({"reason": "Matches your healthy preference 🥗", "items": healthy[:2]})

    # Streak reward nudge
    streak = user.get("streak", 0)
    if streak > 0 and streak % 5 == 4:
        suggestions.append({"reason": f"One more order for a free snack! 🎁 ({streak+1}-day streak)", "items": []})

    return suggestions
