# utils/maps.py
# Google Maps integration for Cloud Snacks
# Uses Google Maps REST APIs directly (no SDK needed — pure Python requests)
#
# SETUP: Get a free API key at https://console.cloud.google.com
# Enable: Maps JavaScript API, Places API, Directions API, Geocoding API
# Free tier: 28,000 map loads/month, $200 credit/month (more than enough at launch)

import json
import urllib.request
import urllib.parse
from utils.data import AppState

# ─── Replace with your actual Google Maps API key ─────────────────────────────
MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY"

# Cloud Snacks kitchen location — replace with your actual kitchen coordinates
KITCHEN_LAT = 17.4401
KITCHEN_LNG = 78.3489
KITCHEN_ADDRESS = "Gachibowli, Hyderabad, Telangana"

MOCK_MODE = True  # Set False when you have a real API key


def _get(url):
    """Simple HTTP GET — no external dependencies"""
    try:
        with urllib.request.urlopen(url, timeout=5) as r:
            return json.loads(r.read().decode())
    except Exception as e:
        print(f"Maps API error: {e}")
        return None


def autocomplete_address(text):
    """
    Returns address suggestions as user types.
    Call this on every keystroke in the address field (debounce 300ms).

    Returns: list of {"description": "...", "place_id": "..."}
    """
    if MOCK_MODE or not text or len(text) < 3:
        return _mock_suggestions(text)

    params = urllib.parse.urlencode({
        "input": text,
        "key": MAPS_API_KEY,
        "components": "country:in",
        "location": f"{KITCHEN_LAT},{KITCHEN_LNG}",
        "radius": 10000,  # 10km bias around kitchen
        "language": "en",
    })
    url = f"https://maps.googleapis.com/maps/api/place/autocomplete/json?{params}"
    data = _get(url)

    if not data or data.get("status") != "OK":
        return []

    return [
        {"description": p["description"], "place_id": p["place_id"]}
        for p in data.get("predictions", [])
    ]


def get_coordinates(place_id):
    """
    Converts a place_id (from autocomplete) into lat/lng coordinates.

    Returns: {"lat": float, "lng": float, "address": str} or None
    """
    if MOCK_MODE:
        return {"lat": 17.4350, "lng": 78.3800, "address": "Gachibowli, Hyderabad"}

    params = urllib.parse.urlencode({
        "place_id": place_id,
        "key": MAPS_API_KEY,
        "fields": "geometry,formatted_address",
    })
    url = f"https://maps.googleapis.com/maps/api/place/details/json?{params}"
    data = _get(url)

    if not data or data.get("status") != "OK":
        return None

    result = data["result"]
    loc = result["geometry"]["location"]
    return {
        "lat": loc["lat"],
        "lng": loc["lng"],
        "address": result.get("formatted_address", ""),
    }


def get_delivery_eta(dest_lat, dest_lng):
    """
    Calculates real delivery time and distance from kitchen to customer.
    Uses Google Directions API with traffic-aware duration.

    Returns: {"distance_km": float, "duration_min": int, "eta_text": str}
    """
    if MOCK_MODE:
        return _mock_eta(dest_lat, dest_lng)

    params = urllib.parse.urlencode({
        "origin":      f"{KITCHEN_LAT},{KITCHEN_LNG}",
        "destination": f"{dest_lat},{dest_lng}",
        "key":         MAPS_API_KEY,
        "mode":        "driving",
        "departure_time": "now",
        "traffic_model": "best_guess",
        "language":    "en",
    })
    url = f"https://maps.googleapis.com/maps/api/directions/json?{params}"
    data = _get(url)

    if not data or not data.get("routes"):
        return {"distance_km": 5.0, "duration_min": 25, "eta_text": "~25 min"}

    leg = data["routes"][0]["legs"][0]
    duration_sec = leg.get("duration_in_traffic", leg["duration"])["value"]
    duration_min = max(15, duration_sec // 60 + 5)  # +5 min for prep time
    distance_km  = round(leg["distance"]["value"] / 1000, 1)

    return {
        "distance_km": distance_km,
        "duration_min": duration_min,
        "eta_text": f"~{duration_min} min",
    }


def get_map_static_url(dest_lat, dest_lng, width=640, height=300):
    """
    Returns a URL for a static map image showing kitchen → customer route.
    Use this in the order tracking screen (no map SDK needed).

    Returns: str URL (load directly as image)
    """
    if MOCK_MODE:
        # Return a placeholder map URL
        return (
            f"https://maps.googleapis.com/maps/api/staticmap"
            f"?size={width}x{height}"
            f"&markers=color:green|label:K|{KITCHEN_LAT},{KITCHEN_LNG}"
            f"&markers=color:red|label:D|{dest_lat},{dest_lng}"
            f"&path=color:0x1D9E75FF|weight:4|{KITCHEN_LAT},{KITCHEN_LNG}|{dest_lat},{dest_lng}"
            f"&key={MAPS_API_KEY}"
        )

    return (
        f"https://maps.googleapis.com/maps/api/staticmap"
        f"?size={width}x{height}"
        f"&markers=color:green|label:K|{KITCHEN_LAT},{KITCHEN_LNG}"
        f"&markers=color:red|label:D|{dest_lat},{dest_lng}"
        f"&path=color:0x1D9E75FF|weight:4"
        f"|{KITCHEN_LAT},{KITCHEN_LNG}|{dest_lat},{dest_lng}"
        f"&key={MAPS_API_KEY}"
    )


def calculate_delivery_fee(distance_km):
    """
    Dynamic delivery fee based on distance.
    Free under 3km, ₹10/km beyond that.
    """
    if distance_km <= 3.0:
        return 0
    extra_km = distance_km - 3.0
    return int(extra_km * 10)


# ─── Mock helpers ──────────────────────────────────────────────────────────────

def _mock_suggestions(text):
    suggestions = [
        {"description": "Gachibowli, Hyderabad, Telangana",         "place_id": "mock_1"},
        {"description": "HITEC City, Hyderabad, Telangana",          "place_id": "mock_2"},
        {"description": "Kondapur, Hyderabad, Telangana",            "place_id": "mock_3"},
        {"description": "Madhapur, Hyderabad, Telangana",            "place_id": "mock_4"},
        {"description": "Banjara Hills, Hyderabad, Telangana",       "place_id": "mock_5"},
        {"description": "Jubilee Hills, Hyderabad, Telangana",       "place_id": "mock_6"},
        {"description": "Kukatpally, Hyderabad, Telangana",          "place_id": "mock_7"},
        {"description": "Manikonda, Hyderabad, Telangana",           "place_id": "mock_8"},
    ]
    if not text:
        return suggestions[:4]
    return [s for s in suggestions if text.lower() in s["description"].lower()][:5]


def _mock_eta(lat, lng):
    import random
    distance = round(random.uniform(1.5, 8.0), 1)
    duration = max(15, int(distance * 4) + random.randint(3, 8))
    return {
        "distance_km": distance,
        "duration_min": duration,
        "eta_text": f"~{duration} min",
        "delivery_fee": calculate_delivery_fee(distance),
    }
