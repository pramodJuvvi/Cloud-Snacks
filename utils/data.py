# utils/data.py
# Mock data store — replace with Firebase calls when going live

from datetime import datetime, timedelta

MENU_ITEMS = [
    {"id": "veg-puff",      "name": "Veg Puff",           "price": 49,  "calories": 210, "category": "savoury", "emoji": "🥐", "fresh": 8,  "tag": "Bestseller"},
    {"id": "samosa",        "name": "Samosa (2 pcs)",      "price": 35,  "calories": 180, "category": "savoury", "emoji": "🧆", "fresh": 3,  "tag": ""},
    {"id": "paneer-wrap",   "name": "Paneer Tikka Wrap",   "price": 99,  "calories": 320, "category": "savoury", "emoji": "🌯", "fresh": 12, "tag": "High Protein"},
    {"id": "sprout-bowl",   "name": "Sprout Chaat Bowl",   "price": 79,  "calories": 140, "category": "healthy", "emoji": "🥗", "fresh": 5,  "tag": "Healthy"},
    {"id": "masala-chai",   "name": "Masala Chai",         "price": 40,  "calories": 90,  "category": "drinks",  "emoji": "☕", "fresh": 2,  "tag": ""},
    {"id": "cold-coffee",   "name": "Cold Coffee",         "price": 65,  "calories": 150, "category": "drinks",  "emoji": "🧋", "fresh": 6,  "tag": ""},
    {"id": "gulab-jamun",   "name": "Gulab Jamun (2 pcs)", "price": 45,  "calories": 220, "category": "sweet",   "emoji": "🍮", "fresh": 15, "tag": "Popular"},
    {"id": "dry-fruit-mix", "name": "Dry Fruit Mix",       "price": 89,  "calories": 280, "category": "healthy", "emoji": "🥜", "fresh": 0,  "tag": "Healthy"},
    {"id": "combo-1",       "name": "Puff + Chai Combo",   "price": 79,  "calories": 300, "category": "combos",  "emoji": "🎁", "fresh": 5,  "tag": "Value"},
    {"id": "bhel-puri",     "name": "Bhel Puri",           "price": 55,  "calories": 195, "category": "savoury", "emoji": "🫙", "fresh": 7,  "tag": ""},
]

CATEGORIES = ["All", "Savoury", "Drinks", "Healthy", "Sweet", "Combos"]

class AppState:
    """Global app state — single source of truth"""

    user = {
        "name": "Ravi Kumar",
        "email": "ravi@example.com",
        "streak": 5,
        "points": 320,
        "usual": ["veg-puff", "masala-chai"],
        "diet": "Vegetarian",
        "spice": "Medium",
        "address": "Flat 4B, Gachibowli, Hyderabad",
        "referral": "RAVI50",
        "role": "customer",  # change to "admin" to test admin screen
    }

    cart = {}  # item_id → {"item": {...}, "qty": int}

    orders = [
        {
            "id": "CS-1042",
            "items": [{"name": "Veg Puff", "qty": 2, "price": 49},
                      {"name": "Masala Chai", "qty": 1, "price": 40}],
            "total": 138,
            "status": "delivered",
            "date": (datetime.now() - timedelta(days=1)).strftime("%d %b %Y"),
        },
        {
            "id": "CS-1038",
            "items": [{"name": "Samosa", "qty": 2, "price": 35},
                      {"name": "Cold Coffee", "qty": 1, "price": 65}],
            "total": 135,
            "status": "delivered",
            "date": (datetime.now() - timedelta(days=2)).strftime("%d %b %Y"),
        },
    ]

    order_counter = 1045

    inventory_alerts = [
        {"item": "Veg Puff pastry", "stock": 12, "threshold": 15},
        {"item": "Masala Chai premix", "stock": 8,  "threshold": 15},
    ]

    demand_forecast = {
        "Veg Puff": 85,
        "Samosa": 60,
        "Masala Chai": 110,
        "Paneer Wrap": 45,
        "Sprout Bowl": 30,
    }

    @classmethod
    def add_to_cart(cls, item):
        iid = item["id"]
        if iid in cls.cart:
            cls.cart[iid]["qty"] += 1
        else:
            cls.cart[iid] = {"item": item, "qty": 1}

    @classmethod
    def remove_from_cart(cls, item_id):
        if item_id in cls.cart:
            cls.cart[item_id]["qty"] -= 1
            if cls.cart[item_id]["qty"] <= 0:
                del cls.cart[item_id]

    @classmethod
    def cart_total(cls):
        return sum(v["item"]["price"] * v["qty"] for v in cls.cart.values())

    @classmethod
    def cart_count(cls):
        return sum(v["qty"] for v in cls.cart.values())

    @classmethod
    def place_order(cls, slot):
        cls.order_counter += 1
        order_id = f"CS-{cls.order_counter}"
        items = [{"name": v["item"]["name"], "qty": v["qty"], "price": v["item"]["price"]}
                 for v in cls.cart.values()]
        total = cls.cart_total()
        order = {
            "id": order_id,
            "items": items,
            "total": total,
            "status": "placed",
            "slot": slot,
            "date": datetime.now().strftime("%d %b %Y"),
        }
        cls.orders.insert(0, order)
        cls.user["streak"] += 1
        cls.user["points"] += total // 10
        cls.user["usual"] = list(cls.cart.keys())
        cls.cart = {}
        return order_id

    @classmethod
    def advance_order_status(cls, order_id):
        flow = ["placed", "confirmed", "preparing", "ready", "delivered"]
        for o in cls.orders:
            if o["id"] == order_id:
                idx = flow.index(o["status"])
                if idx < len(flow) - 1:
                    o["status"] = flow[idx + 1]
                break

    @classmethod
    def get_menu(cls, category="All"):
        if category == "All":
            return MENU_ITEMS
        return [i for i in MENU_ITEMS if i["category"] == category.lower()]
