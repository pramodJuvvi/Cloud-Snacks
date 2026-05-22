from datetime import datetime, timedelta, timezone
import hashlib
import math
import os
import random

from fastapi import Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from sqlalchemy import case
from sqlalchemy.orm import Session, selectinload

from app.audit import record_audit_event, request_metadata
from app.auth import (
    create_access_token,
    get_current_user,
    get_optional_current_user,
    get_password_hash,
    verify_password,
)
from app.database import Base, SessionLocal, engine
from app.migrations import ensure_order_user_id_column, ensure_snack_detail_columns, ensure_user_phone_column
from app.models.admin_ops import Coupon, InventoryItem, RecipeCost, StaffShift
from app.models.audit import AuditEvent
from app.models.finance import FinanceEntry
from app.models.order import Order, OrderItem
from app.models.snack import Snack
from app.models.user import User
from app.schemas import (
    AuditEventRead,
    AdminOpsReportRead,
    CouponCreate,
    CouponRead,
    DeliveryRouteRead,
    DeliveryPartnerUpdate,
    KitchenCameraRead,
    FinanceCategoryTotalRead,
    FinanceEntryCreate,
    FinanceEntryRead,
    FinanceReportRead,
    InventoryItemCreate,
    InventoryItemRead,
    OrderCreate,
    OrderFeedbackUpdate,
    OrderIssueReport,
    OrderRead,
    OrderStatusUpdate,
    OtpRead,
    OtpRequest,
    PhoneRegister,
    PinLogin,
    PinReset,
    RecipeCostCreate,
    RecipeCostRead,
    SnackAvailabilityUpdate,
    SnackRead,
    StaffShiftCreate,
    StaffShiftRead,
    TokenRead,
    UserCreate,
    UserLogin,
    UserRead,
)
from app.seed import seed_snacks
from app.sms import SmsDeliveryError, send_otp_code

Base.metadata.create_all(bind=engine)

app = FastAPI()

OTP_TTL_SECONDS = 300
otp_store: dict[str, dict[str, str | datetime]] = {}
KITCHEN_ORIGIN_LABEL = os.getenv("KITCHEN_ORIGIN_LABEL", "Cloud Snacks Kitchen")
KITCHEN_LAT = float(os.getenv("KITCHEN_LAT", "17.3850"))
KITCHEN_LNG = float(os.getenv("KITCHEN_LNG", "78.4867"))


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def normalize_phone(phone: str) -> str:
    return "".join(character for character in phone.strip() if character.isdigit() or character == "+")


def create_otp(phone: str, purpose: str) -> OtpRead:
    normalized_phone = normalize_phone(phone)
    otp = f"{random.randint(100000, 999999)}"
    otp_store[f"{purpose}:{normalized_phone}"] = {
        "otp": otp,
        "expires_at": datetime.now(timezone.utc) + timedelta(seconds=OTP_TTL_SECONDS),
    }
    try:
        delivery_channel = send_otp_code(normalized_phone, otp)
    except SmsDeliveryError as error:
        otp_store.pop(f"{purpose}:{normalized_phone}", None)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Could not send OTP. {error}",
        ) from error

    return OtpRead(
        phone=normalized_phone,
        expires_in_seconds=OTP_TTL_SECONDS,
        delivery_channel=delivery_channel,
        message=(
            "OTP sent on WhatsApp"
            if delivery_channel == "whatsapp"
            else "OTP sent to your mobile number"
            if delivery_channel == "sms"
            else "Development OTP generated. Configure WhatsApp or SMS provider to send a real OTP."
        ),
        dev_otp=otp if delivery_channel == "dev" else None,
    )


def verify_otp(phone: str, purpose: str, otp: str) -> None:
    normalized_phone = normalize_phone(phone)
    stored_otp = otp_store.get(f"{purpose}:{normalized_phone}")

    if not stored_otp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request a new OTP first")

    if datetime.now(timezone.utc) > stored_otp["expires_at"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP expired")

    if stored_otp["otp"] != otp.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP")


def calculate_coupon_discount(coupon_code: str, subtotal: float, item_count: int) -> float:
    coupon = coupon_code.strip().upper()

    if coupon == "FIRST50":
        return min(50, subtotal)
    if coupon == "COMBO20" and item_count >= 2:
        return min(20, subtotal)
    return 0


def calculate_admin_coupon(coupon: Coupon | None, subtotal: float, item_count: int) -> tuple[float, bool]:
    if not coupon or not coupon.is_active or subtotal < coupon.min_order_value:
        return 0, False

    if coupon.discount_type == "free_delivery":
        return 0, True
    if coupon.discount_type == "percent":
        discount = subtotal * (coupon.discount_value / 100)
        if coupon.max_discount > 0:
            discount = min(discount, coupon.max_discount)
        return round(min(discount, subtotal), 2), False
    return round(min(coupon.discount_value, subtotal), 2), False


def seed_default_coupons(db: Session) -> None:
    if db.query(Coupon).count() > 0:
        return

    defaults = [
        Coupon(code="FIRST50", description="Rs 50 off first-style test order", discount_type="flat", discount_value=50),
        Coupon(code="COMBO20", description="Rs 20 off combo orders", discount_type="flat", discount_value=20, min_order_value=100),
        Coupon(code="FREESHIP", description="Free delivery", discount_type="free_delivery", discount_value=0),
    ]
    db.add_all(defaults)
    db.commit()


def address_to_point(address: str | None) -> tuple[float, float]:
    if not address:
        return KITCHEN_LAT, KITCHEN_LNG

    digest = hashlib.sha256(address.strip().lower().encode("utf-8")).digest()
    lat_offset = ((int.from_bytes(digest[:2], "big") / 65535) - 0.5) * 0.18
    lng_offset = ((int.from_bytes(digest[2:4], "big") / 65535) - 0.5) * 0.18
    return KITCHEN_LAT + lat_offset, KITCHEN_LNG + lng_offset


def distance_km(first: tuple[float, float], second: tuple[float, float]) -> float:
    lat1, lon1 = first
    lat2, lon2 = second
    earth_radius_km = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    return earth_radius_km * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def build_optimized_route(orders: list[Order], partner: str) -> dict:
    remaining = [
        {
            "order": order,
            "point": address_to_point(order.delivery_address),
            "item_count": sum(item.quantity for item in order.items),
        }
        for order in orders
    ]
    current_point = (KITCHEN_LAT, KITCHEN_LNG)
    stops = []
    total_distance = 0.0

    while remaining:
        next_stop = min(remaining, key=lambda candidate: distance_km(current_point, candidate["point"]))
        remaining.remove(next_stop)
        leg_distance = distance_km(current_point, next_stop["point"])
        total_distance += leg_distance
        order = next_stop["order"]
        stops.append(
            {
                "sequence": len(stops) + 1,
                "order_id": order.id,
                "customer_name": order.customer_name,
                "customer_phone": order.customer_phone,
                "delivery_address": order.delivery_address,
                "status": order.status,
                "scheduled_for": order.scheduled_for,
                "total": order.total,
                "item_count": next_stop["item_count"],
                "distance_from_previous_km": round(leg_distance, 2),
                "eta_minutes_from_previous": max(3, round((leg_distance / 18) * 60) + 2),
                "map_query": order.delivery_address or "",
            }
        )
        current_point = next_stop["point"]

    return {
        "partner": partner,
        "origin": KITCHEN_ORIGIN_LABEL,
        "stop_count": len(stops),
        "total_distance_km": round(total_distance, 2),
        "estimated_minutes": sum(stop["eta_minutes_from_previous"] for stop in stops),
        "strategy": "Nearest active stop from kitchen, then nearest next stop",
        "stops": stops,
    }


@app.on_event("startup")
def startup():
    ensure_order_user_id_column()
    ensure_snack_detail_columns()
    ensure_user_phone_column()
    db = SessionLocal()
    try:
        seed_snacks(db)
        seed_default_coupons(db)
    finally:
        db.close()


@app.get("/")
def home():
    return {"message": "Cloud Snacks Backend Running"}


@app.get("/kitchen-camera", response_class=HTMLResponse)
def kitchen_camera():
    return """
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Cloud Snacks Kitchen Cam</title>
        <style>
          body {
            align-items: center;
            background: #111827;
            color: #ffffff;
            display: flex;
            font-family: Arial, sans-serif;
            justify-content: center;
            margin: 0;
            min-height: 100vh;
            padding: 24px;
          }
          main {
            max-width: 520px;
            text-align: center;
          }
          .frame {
            align-items: center;
            background: #1f2937;
            border: 1px solid #374151;
            border-radius: 12px;
            display: flex;
            min-height: 220px;
            justify-content: center;
            margin: 20px 0;
          }
          p {
            color: #d1d5db;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <main>
          <h1>Kitchen Cam</h1>
          <div class="frame">Live stream not connected yet</div>
          <p>
            Connect EXPO_PUBLIC_KITCHEN_CAMERA_URL to your kitchen camera stream URL
            when you have the camera feed ready.
          </p>
        </main>
      </body>
    </html>
    """


@app.post("/auth/request-otp", response_model=OtpRead)
def request_otp(payload: OtpRequest, request: Request, db: Session = Depends(get_db)):
    otp_response = create_otp(payload.phone, payload.purpose)
    record_audit_event(
        db,
        event_type="OTP_REQUESTED",
        actor_type="customer",
        actor_label=otp_response.phone,
        customer_phone=otp_response.phone,
        summary=f"OTP requested for {payload.purpose}",
        metadata={
            "purpose": payload.purpose,
            "delivery_channel": otp_response.delivery_channel,
            **request_metadata(request),
        },
    )
    db.commit()
    return otp_response


@app.post("/auth/register-phone", response_model=TokenRead, status_code=status.HTTP_201_CREATED)
def register_phone(payload: PhoneRegister, request: Request, db: Session = Depends(get_db)):
    phone = normalize_phone(payload.phone)
    try:
        verify_otp(phone, "register", payload.otp)
    except HTTPException:
        record_audit_event(
            db,
            event_type="OTP_VERIFY_FAILED",
            actor_type="customer",
            actor_label=phone,
            customer_phone=phone,
            summary="Registration OTP verification failed",
            metadata=request_metadata(request),
        )
        db.commit()
        raise

    existing_user = db.query(User).filter(User.phone == phone).first()
    if existing_user:
        record_audit_event(
            db,
            event_type="PHONE_REGISTER_FAILED",
            actor_type="customer",
            actor_label=phone,
            customer_phone=phone,
            summary="Phone registration failed because number already exists",
            metadata=request_metadata(request),
        )
        db.commit()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This phone is already registered")

    user = User(
        name=payload.name.strip(),
        email=f"{phone}@cloudsnacks.local",
        phone=phone,
        password=get_password_hash(payload.pin),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    record_audit_event(
        db,
        event_type="PHONE_REGISTERED",
        actor_type="customer",
        actor_id=user.id,
        actor_label=user.name,
        customer_phone=phone,
        summary="Customer registered with phone and PIN",
        metadata=request_metadata(request),
    )
    db.commit()

    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
        "user": user,
    }


@app.post("/auth/login-pin", response_model=TokenRead)
def login_pin(payload: PinLogin, request: Request, db: Session = Depends(get_db)):
    phone = normalize_phone(payload.phone)
    user = db.query(User).filter(User.phone == phone).first()

    if not user or not verify_password(payload.pin, user.password):
        record_audit_event(
            db,
            event_type="PIN_LOGIN_FAILED",
            actor_type="customer",
            actor_label=phone,
            customer_phone=phone,
            summary="PIN login failed",
            metadata=request_metadata(request),
        )
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid phone or PIN")

    record_audit_event(
        db,
        event_type="PIN_LOGIN_SUCCESS",
        actor_type="customer",
        actor_id=user.id,
        actor_label=user.name,
        customer_phone=phone,
        summary="Customer logged in with PIN",
        metadata=request_metadata(request),
    )
    db.commit()

    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
        "user": user,
    }


@app.post("/auth/reset-pin", response_model=TokenRead)
def reset_pin(payload: PinReset, request: Request, db: Session = Depends(get_db)):
    phone = normalize_phone(payload.phone)
    try:
        verify_otp(phone, "reset_pin", payload.otp)
    except HTTPException:
        record_audit_event(
            db,
            event_type="PIN_RESET_OTP_FAILED",
            actor_type="customer",
            actor_label=phone,
            customer_phone=phone,
            summary="Forgot PIN OTP verification failed",
            metadata=request_metadata(request),
        )
        db.commit()
        raise

    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        record_audit_event(
            db,
            event_type="PIN_RESET_FAILED",
            actor_type="customer",
            actor_label=phone,
            customer_phone=phone,
            summary="Forgot PIN failed because phone was not registered",
            metadata=request_metadata(request),
        )
        db.commit()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No account found for this phone")

    user.password = get_password_hash(payload.pin)
    record_audit_event(
        db,
        event_type="PIN_RESET_SUCCESS",
        actor_type="customer",
        actor_id=user.id,
        actor_label=user.name,
        customer_phone=phone,
        summary="Customer reset PIN after OTP verification",
        metadata=request_metadata(request),
    )
    db.commit()
    db.refresh(user)

    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
        "user": user,
    }


@app.post("/auth/register", response_model=TokenRead, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, request: Request, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    existing_user = db.query(User).filter(User.email == email).first()

    if existing_user:
        record_audit_event(
            db,
            event_type="EMAIL_REGISTER_FAILED",
            actor_type="customer",
            actor_label=email,
            summary="Email registration failed because account already exists",
            metadata=request_metadata(request),
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account already exists for this email",
        )

    user = User(
        name=payload.name.strip(),
        email=email,
        password=get_password_hash(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    record_audit_event(
        db,
        event_type="EMAIL_REGISTERED",
        actor_type="customer",
        actor_id=user.id,
        actor_label=user.name,
        summary="Customer registered with email",
        metadata={"email": email, **request_metadata(request)},
    )
    db.commit()

    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
        "user": user,
    }


@app.post("/auth/login", response_model=TokenRead)
def login(payload: UserLogin, request: Request, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(payload.password, user.password):
        record_audit_event(
            db,
            event_type="EMAIL_LOGIN_FAILED",
            actor_type="customer",
            actor_label=email,
            summary="Email login failed",
            metadata=request_metadata(request),
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    record_audit_event(
        db,
        event_type="EMAIL_LOGIN_SUCCESS",
        actor_type="customer",
        actor_id=user.id,
        actor_label=user.name,
        customer_phone=user.phone,
        summary="Customer logged in with email",
        metadata={"email": email, **request_metadata(request)},
    )
    db.commit()

    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
        "user": user,
    }


@app.get("/auth/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@app.get("/snacks", response_model=list[SnackRead])
def list_snacks(db: Session = Depends(get_db)):
    featured_order = case(
        (Snack.name == "Bagara Rice", 0),
        (Snack.name == "Chicken Curry", 1),
        else_=2,
    )
    return db.query(Snack).order_by(featured_order, Snack.id).all()


@app.post("/orders", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    snack_ids = [item.snack_id for item in payload.items]
    snacks = db.query(Snack).filter(Snack.id.in_(snack_ids)).all()
    snacks_by_id = {snack.id: snack for snack in snacks}

    missing_snacks = sorted(set(snack_ids) - set(snacks_by_id))
    if missing_snacks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown snack ids: {missing_snacks}",
        )

    unavailable_snacks = sorted(snack.name for snack in snacks if not snack.is_available)
    if unavailable_snacks:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Sold out: {', '.join(unavailable_snacks)}",
        )

    subtotal = sum(snacks_by_id[item.snack_id].price * item.quantity for item in payload.items)
    coupon_code = payload.coupon_code.strip().upper()
    coupon = db.query(Coupon).filter(Coupon.code == coupon_code).first() if coupon_code else None
    discount, free_delivery = calculate_admin_coupon(coupon, subtotal, len(payload.items))
    if coupon_code and not coupon:
        discount = calculate_coupon_discount(coupon_code, subtotal, len(payload.items))
        free_delivery = coupon_code == "FREESHIP"
    delivery_fee = 0 if free_delivery else 29 if subtotal > 0 else 0

    order = Order(
        user_id=current_user.id if current_user else None,
        customer_name=current_user.name if current_user else payload.customer_name,
        customer_email=current_user.email if current_user else payload.customer_email,
        customer_phone=payload.customer_phone.strip(),
        delivery_address=payload.delivery_address.strip(),
        delivery_note=payload.delivery_note.strip(),
        scheduled_for=payload.scheduled_for.strip(),
        spice_level=payload.spice_level,
        payment_method=payload.payment_method,
        coupon_code=coupon_code,
        discount=discount,
        delivery_partner="Cloud Runner",
        subtotal=subtotal,
        delivery_fee=delivery_fee,
        total=max(subtotal + delivery_fee - discount, 0),
    )
    db.add(order)
    db.flush()

    for item in payload.items:
        snack = snacks_by_id[item.snack_id]
        db.add(
            OrderItem(
                order_id=order.id,
                snack_id=snack.id,
                quantity=item.quantity,
                unit_price=snack.price,
            )
        )

    record_audit_event(
        db,
        event_type="ORDER_PLACED",
        actor_type="customer" if current_user else "guest",
        actor_id=current_user.id if current_user else None,
        actor_label=current_user.name if current_user else payload.customer_name,
        order_id=order.id,
        customer_phone=payload.customer_phone.strip(),
        summary=f"Order #{order.id} placed",
        metadata={
            "subtotal": subtotal,
            "delivery_fee": delivery_fee,
            "discount": discount,
            "total": order.total,
            "coupon_code": coupon_code,
            "payment_method": payload.payment_method,
            "item_count": len(payload.items),
            "scheduled_for": payload.scheduled_for,
            "spice_level": payload.spice_level,
            **request_metadata(request),
        },
    )
    if coupon_code:
        record_audit_event(
            db,
            event_type="COUPON_APPLIED" if discount > 0 or coupon_code == "FREESHIP" else "COUPON_REJECTED",
            actor_type="customer" if current_user else "guest",
            actor_id=current_user.id if current_user else None,
            actor_label=current_user.name if current_user else payload.customer_name,
            order_id=order.id,
            customer_phone=payload.customer_phone.strip(),
            summary=(
                f"Coupon {coupon_code} applied to order #{order.id}"
                if discount > 0 or coupon_code == "FREESHIP"
                else f"Coupon {coupon_code} did not qualify for order #{order.id}"
            ),
            metadata={
                "coupon_code": coupon_code,
                "discount": discount,
                "delivery_fee": delivery_fee,
                **request_metadata(request),
            },
        )

    db.commit()

    return (
        db.query(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.snack))
        .filter(Order.id == order.id)
        .one()
    )


@app.get("/orders/me", response_model=list[OrderRead])
def list_my_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.snack))
        .filter(Order.user_id == current_user.id)
        .order_by(Order.created_at.desc(), Order.id.desc())
        .all()
    )


@app.patch("/orders/{order_id}/cancel", response_model=OrderRead)
def cancel_my_order(
    order_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = (
        db.query(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.snack))
        .filter(Order.id == order_id, Order.user_id == current_user.id)
        .first()
    )

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if order.status != "received":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order can be cancelled only before preparing")

    order.status = "cancelled"
    record_audit_event(
        db,
        event_type="ORDER_CANCELLED",
        actor_type="customer",
        actor_id=current_user.id,
        actor_label=current_user.name,
        order_id=order.id,
        customer_phone=order.customer_phone,
        summary=f"Customer cancelled order #{order.id}",
        metadata={"previous_status": "received", **request_metadata(request)},
    )
    db.commit()
    db.refresh(order)

    return (
        db.query(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.snack))
        .filter(Order.id == order.id)
        .one()
    )


@app.patch("/orders/{order_id}/feedback", response_model=OrderRead)
def submit_order_feedback(
    order_id: int,
    payload: OrderFeedbackUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = (
        db.query(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.snack))
        .filter(Order.id == order_id, Order.user_id == current_user.id)
        .first()
    )

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if order.status != "delivered":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rate after delivery")

    order.feedback_rating = payload.rating
    order.feedback_note = payload.note.strip()
    record_audit_event(
        db,
        event_type="ORDER_FEEDBACK_SUBMITTED",
        actor_type="customer",
        actor_id=current_user.id,
        actor_label=current_user.name,
        order_id=order.id,
        customer_phone=order.customer_phone,
        summary=f"Customer rated order #{order.id} {payload.rating}/5",
        metadata={"rating": payload.rating, "note": payload.note.strip(), **request_metadata(request)},
    )
    db.commit()
    db.refresh(order)

    return (
        db.query(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.snack))
        .filter(Order.id == order.id)
        .one()
    )


@app.patch("/orders/{order_id}/issue", response_model=OrderRead)
def report_order_issue(
    order_id: int,
    payload: OrderIssueReport,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = (
        db.query(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.snack))
        .filter(Order.id == order_id, Order.user_id == current_user.id)
        .first()
    )

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    issue_note = payload.note.strip()
    order.issue_report = f"{payload.issue_type}: {issue_note}" if issue_note else payload.issue_type
    record_audit_event(
        db,
        event_type="CUSTOMER_ISSUE_REPORTED",
        actor_type="customer",
        actor_id=current_user.id,
        actor_label=current_user.name,
        order_id=order.id,
        customer_phone=order.customer_phone,
        summary=f"Customer reported {payload.issue_type} for order #{order.id}",
        metadata={"issue_type": payload.issue_type, "note": issue_note, **request_metadata(request)},
    )
    db.commit()
    db.refresh(order)

    return (
        db.query(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.snack))
        .filter(Order.id == order.id)
        .one()
    )


@app.get("/admin/orders", response_model=list[OrderRead])
def list_orders(db: Session = Depends(get_db)):
    return (
        db.query(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.snack))
        .order_by(Order.created_at.desc(), Order.id.desc())
        .all()
    )


@app.get("/admin/audit-events", response_model=list[AuditEventRead])
def list_audit_events(
    event_type: str | None = Query(default=None, max_length=80),
    order_id: int | None = Query(default=None),
    phone: str | None = Query(default=None, max_length=24),
    limit: int = Query(default=100, ge=1, le=250),
    db: Session = Depends(get_db),
):
    query = db.query(AuditEvent)

    if event_type:
        query = query.filter(AuditEvent.event_type == event_type.strip().upper())
    if order_id is not None:
        query = query.filter(AuditEvent.order_id == order_id)
    if phone:
        query = query.filter(AuditEvent.customer_phone.contains(normalize_phone(phone)))

    return query.order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc()).limit(limit).all()


@app.get("/admin/delivery-route", response_model=DeliveryRouteRead)
def get_optimized_delivery_route(
    request: Request,
    partner: str = Query(default="Cloud Runner", min_length=1, max_length=120),
    include_preparing: bool = Query(default=True),
    db: Session = Depends(get_db),
):
    route_statuses = ["out_for_delivery"]
    if include_preparing:
        route_statuses.append("preparing")

    orders = (
        db.query(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.snack))
        .filter(Order.status.in_(route_statuses))
        .filter(Order.delivery_address.isnot(None))
        .order_by(Order.created_at.asc(), Order.id.asc())
        .all()
    )

    partner_orders = [
        order
        for order in orders
        if not order.delivery_partner or order.delivery_partner.strip().lower() == partner.strip().lower()
    ]
    route = build_optimized_route(partner_orders, partner.strip())
    record_audit_event(
        db,
        event_type="DELIVERY_ROUTE_OPTIMIZED",
        actor_type="admin",
        actor_label="Admin",
        summary=f"Optimized delivery route for {route['stop_count']} stops",
        metadata={
            "partner": partner.strip(),
            "stop_count": route["stop_count"],
            "total_distance_km": route["total_distance_km"],
            "estimated_minutes": route["estimated_minutes"],
            "order_ids": [stop["order_id"] for stop in route["stops"]],
            **request_metadata(request),
        },
    )
    db.commit()
    return route


@app.get("/admin/finance/entries", response_model=list[FinanceEntryRead])
def list_finance_entries(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    return db.query(FinanceEntry).order_by(FinanceEntry.entry_date.desc(), FinanceEntry.id.desc()).limit(limit).all()


@app.post("/admin/finance/entries", response_model=FinanceEntryRead, status_code=status.HTTP_201_CREATED)
def create_finance_entry(
    payload: FinanceEntryCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    entry = FinanceEntry(
        entry_type=payload.entry_type,
        category=payload.category.strip(),
        description=payload.description.strip(),
        amount=payload.amount,
        paid_to=payload.paid_to.strip() or None,
        payment_method=payload.payment_method.strip() or None,
        service_month=payload.service_month.strip() or None,
    )
    db.add(entry)
    db.flush()
    record_audit_event(
        db,
        event_type="FINANCE_ENTRY_CREATED",
        actor_type="admin",
        actor_label="Admin",
        summary=f"{payload.entry_type.replace('_', ' ').title()} recorded: Rs {payload.amount}",
        metadata={
            "entry_id": entry.id,
            "entry_type": entry.entry_type,
            "category": entry.category,
            "amount": entry.amount,
            "paid_to": entry.paid_to,
            "payment_method": entry.payment_method,
            "service_month": entry.service_month,
            **request_metadata(request),
        },
    )
    db.commit()
    db.refresh(entry)
    return entry


@app.get("/admin/finance/report", response_model=FinanceReportRead)
def get_finance_report(
    period_days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(days=period_days)
    period_orders = (
        db.query(Order)
        .filter(Order.status != "cancelled")
        .filter(Order.created_at >= since)
        .all()
    )
    period_entries = (
        db.query(FinanceEntry)
        .filter(FinanceEntry.entry_date >= since)
        .order_by(FinanceEntry.entry_date.desc(), FinanceEntry.id.desc())
        .all()
    )

    revenue = round(sum(order.total for order in period_orders), 2)
    order_count = len(period_orders)
    expenses = round(sum(entry.amount for entry in period_entries if entry.entry_type == "expense"), 2)
    salaries = round(sum(entry.amount for entry in period_entries if entry.entry_type == "salary"), 2)
    income_adjustments = round(
        sum(entry.amount for entry in period_entries if entry.entry_type == "income_adjustment"),
        2,
    )
    cash_collected = round(
        sum(order.total for order in period_orders if (order.payment_method or "").lower().startswith("cash")),
        2,
    )
    upi_collected = round(
        sum(order.total for order in period_orders if "upi" in (order.payment_method or "").lower()),
        2,
    )
    category_totals: dict[str, float] = {}
    for entry in period_entries:
        key = f"{entry.entry_type}: {entry.category}"
        category_totals[key] = round(category_totals.get(key, 0) + entry.amount, 2)

    return {
        "period_days": period_days,
        "order_count": order_count,
        "revenue": revenue,
        "average_order_value": round(revenue / order_count, 2) if order_count else 0,
        "expenses": expenses,
        "salaries": salaries,
        "income_adjustments": income_adjustments,
        "net_profit": round(revenue + income_adjustments - expenses - salaries, 2),
        "cash_collected": cash_collected,
        "upi_collected": upi_collected,
        "category_totals": [
            {"category": category, "total": total}
            for category, total in sorted(category_totals.items(), key=lambda item: item[1], reverse=True)
        ],
        "recent_entries": period_entries[:8],
    }


@app.get("/admin/inventory", response_model=list[InventoryItemRead])
def list_inventory_items(db: Session = Depends(get_db)):
    return db.query(InventoryItem).order_by(InventoryItem.category, InventoryItem.name).all()


@app.post("/admin/inventory", response_model=InventoryItemRead, status_code=status.HTTP_201_CREATED)
def create_inventory_item(payload: InventoryItemCreate, request: Request, db: Session = Depends(get_db)):
    item = InventoryItem(
        name=payload.name.strip(),
        category=payload.category.strip() or "Ingredients",
        unit=payload.unit.strip() or "kg",
        quantity=payload.quantity,
        reorder_level=payload.reorder_level,
        unit_cost=payload.unit_cost,
        supplier=payload.supplier.strip() or None,
    )
    db.add(item)
    db.flush()
    record_audit_event(
        db,
        event_type="INVENTORY_ITEM_CREATED",
        actor_type="admin",
        actor_label="Admin",
        summary=f"Inventory item added: {item.name}",
        metadata={"item_id": item.id, "quantity": item.quantity, "unit": item.unit, **request_metadata(request)},
    )
    db.commit()
    db.refresh(item)
    return item


@app.patch("/admin/inventory/{item_id}", response_model=InventoryItemRead)
def update_inventory_item(
    item_id: int,
    payload: InventoryItemCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")

    item.name = payload.name.strip()
    item.category = payload.category.strip() or "Ingredients"
    item.unit = payload.unit.strip() or "kg"
    item.quantity = payload.quantity
    item.reorder_level = payload.reorder_level
    item.unit_cost = payload.unit_cost
    item.supplier = payload.supplier.strip() or None
    record_audit_event(
        db,
        event_type="INVENTORY_ITEM_UPDATED",
        actor_type="admin",
        actor_label="Admin",
        summary=f"Inventory item updated: {item.name}",
        metadata={"item_id": item.id, "quantity": item.quantity, "unit": item.unit, **request_metadata(request)},
    )
    db.commit()
    db.refresh(item)
    return item


@app.get("/admin/recipe-costs", response_model=list[RecipeCostRead])
def list_recipe_costs(db: Session = Depends(get_db)):
    return db.query(RecipeCost).order_by(RecipeCost.snack_name).all()


@app.post("/admin/recipe-costs", response_model=RecipeCostRead, status_code=status.HTTP_201_CREATED)
def create_recipe_cost(payload: RecipeCostCreate, request: Request, db: Session = Depends(get_db)):
    cost = RecipeCost(
        snack_id=payload.snack_id,
        snack_name=payload.snack_name.strip(),
        ingredient_cost=payload.ingredient_cost,
        packaging_cost=payload.packaging_cost,
        labor_cost=payload.labor_cost,
    )
    db.add(cost)
    db.flush()
    record_audit_event(
        db,
        event_type="RECIPE_COST_CREATED",
        actor_type="admin",
        actor_label="Admin",
        summary=f"Recipe cost added: {cost.snack_name}",
        metadata={"recipe_cost_id": cost.id, **request_metadata(request)},
    )
    db.commit()
    db.refresh(cost)
    return cost


@app.get("/admin/staff-shifts", response_model=list[StaffShiftRead])
def list_staff_shifts(limit: int = Query(default=50, ge=1, le=200), db: Session = Depends(get_db)):
    return db.query(StaffShift).order_by(StaffShift.shift_date.desc(), StaffShift.id.desc()).limit(limit).all()


@app.post("/admin/staff-shifts", response_model=StaffShiftRead, status_code=status.HTTP_201_CREATED)
def create_staff_shift(payload: StaffShiftCreate, request: Request, db: Session = Depends(get_db)):
    shift = StaffShift(
        staff_name=payload.staff_name.strip(),
        role=payload.role.strip() or "Kitchen",
        attendance_status=payload.attendance_status,
        hours=payload.hours,
        hourly_rate=payload.hourly_rate,
        notes=payload.notes.strip() or None,
    )
    db.add(shift)
    db.flush()
    record_audit_event(
        db,
        event_type="STAFF_SHIFT_CREATED",
        actor_type="admin",
        actor_label="Admin",
        summary=f"Staff attendance recorded: {shift.staff_name}",
        metadata={"shift_id": shift.id, "hours": shift.hours, "estimated_pay": shift.hours * shift.hourly_rate, **request_metadata(request)},
    )
    db.commit()
    db.refresh(shift)
    return shift


@app.get("/admin/coupons", response_model=list[CouponRead])
def list_coupons(db: Session = Depends(get_db)):
    return db.query(Coupon).order_by(Coupon.is_active.desc(), Coupon.code).all()


@app.post("/admin/coupons", response_model=CouponRead, status_code=status.HTTP_201_CREATED)
def create_coupon(payload: CouponCreate, request: Request, db: Session = Depends(get_db)):
    code = payload.code.strip().upper()
    existing_coupon = db.query(Coupon).filter(Coupon.code == code).first()
    if existing_coupon:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Coupon code already exists")

    coupon = Coupon(
        code=code,
        description=payload.description.strip(),
        discount_type=payload.discount_type,
        discount_value=payload.discount_value,
        min_order_value=payload.min_order_value,
        max_discount=payload.max_discount,
        is_active=payload.is_active,
    )
    db.add(coupon)
    db.flush()
    record_audit_event(
        db,
        event_type="COUPON_CREATED",
        actor_type="admin",
        actor_label="Admin",
        summary=f"Coupon created: {coupon.code}",
        metadata={"coupon_id": coupon.id, "code": coupon.code, **request_metadata(request)},
    )
    db.commit()
    db.refresh(coupon)
    return coupon


@app.patch("/admin/coupons/{coupon_id}", response_model=CouponRead)
def update_coupon(coupon_id: int, payload: CouponCreate, request: Request, db: Session = Depends(get_db)):
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found")

    coupon.code = payload.code.strip().upper()
    coupon.description = payload.description.strip()
    coupon.discount_type = payload.discount_type
    coupon.discount_value = payload.discount_value
    coupon.min_order_value = payload.min_order_value
    coupon.max_discount = payload.max_discount
    coupon.is_active = payload.is_active
    record_audit_event(
        db,
        event_type="COUPON_UPDATED",
        actor_type="admin",
        actor_label="Admin",
        summary=f"Coupon updated: {coupon.code}",
        metadata={"coupon_id": coupon.id, "is_active": coupon.is_active, **request_metadata(request)},
    )
    db.commit()
    db.refresh(coupon)
    return coupon


@app.get("/admin/ops-report", response_model=AdminOpsReportRead)
def get_admin_ops_report(
    period_days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(days=period_days)
    orders = (
        db.query(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.snack))
        .filter(Order.status != "cancelled")
        .filter(Order.created_at >= since)
        .all()
    )
    recipe_costs = db.query(RecipeCost).all()
    cost_by_snack_id = {cost.snack_id: cost for cost in recipe_costs if cost.snack_id}
    cost_by_name = {cost.snack_name.lower(): cost for cost in recipe_costs}

    menu_map: dict[str, dict[str, float | int]] = {}
    customer_map: dict[str, dict[str, object]] = {}
    for order in orders:
        customer_key = order.customer_phone or order.customer_email
        customer = customer_map.setdefault(
            customer_key,
            {"customer_name": order.customer_name, "customer_phone": order.customer_phone, "order_count": 0, "revenue": 0.0, "last_order_at": order.created_at},
        )
        customer["order_count"] = int(customer["order_count"]) + 1
        customer["revenue"] = round(float(customer["revenue"]) + order.total, 2)
        if order.created_at and (customer["last_order_at"] is None or order.created_at > customer["last_order_at"]):
            customer["last_order_at"] = order.created_at

        for item in order.items:
            snack_name = item.snack.name
            performance = menu_map.setdefault(snack_name, {"quantity_sold": 0, "revenue": 0.0, "estimated_cost": 0.0})
            performance["quantity_sold"] = int(performance["quantity_sold"]) + item.quantity
            performance["revenue"] = round(float(performance["revenue"]) + (item.unit_price * item.quantity), 2)
            cost = cost_by_snack_id.get(item.snack_id) or cost_by_name.get(snack_name.lower())
            serving_cost = (cost.ingredient_cost + cost.packaging_cost + cost.labor_cost) if cost else 0
            performance["estimated_cost"] = round(float(performance["estimated_cost"]) + (serving_cost * item.quantity), 2)

    shifts = db.query(StaffShift).filter(StaffShift.shift_date >= since).all()
    staff_map: dict[str, dict[str, float | str]] = {}
    for shift in shifts:
        staff = staff_map.setdefault(shift.staff_name, {"staff_name": shift.staff_name, "role": shift.role, "hours": 0.0, "estimated_pay": 0.0})
        staff["hours"] = round(float(staff["hours"]) + shift.hours, 2)
        staff["estimated_pay"] = round(float(staff["estimated_pay"]) + (shift.hours * shift.hourly_rate), 2)

    low_stock_items = (
        db.query(InventoryItem)
        .filter(InventoryItem.quantity <= InventoryItem.reorder_level)
        .order_by(InventoryItem.category, InventoryItem.name)
        .all()
    )
    active_coupons = db.query(Coupon).filter(Coupon.is_active.is_(True)).order_by(Coupon.code).all()

    return {
        "period_days": period_days,
        "low_stock_items": low_stock_items,
        "menu_performance": [
            {
                "snack_name": name,
                "quantity_sold": int(values["quantity_sold"]),
                "revenue": float(values["revenue"]),
                "estimated_cost": float(values["estimated_cost"]),
                "estimated_margin": round(float(values["revenue"]) - float(values["estimated_cost"]), 2),
            }
            for name, values in sorted(menu_map.items(), key=lambda item: item[1]["revenue"], reverse=True)[:10]
        ],
        "customer_insights": sorted(customer_map.values(), key=lambda customer: float(customer["revenue"]), reverse=True)[:10],
        "staff_costs": sorted(staff_map.values(), key=lambda staff: float(staff["estimated_pay"]), reverse=True),
        "active_coupons": active_coupons,
    }


@app.patch("/admin/snacks/{snack_id}/availability", response_model=SnackRead)
def update_snack_availability(
    snack_id: int,
    payload: SnackAvailabilityUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    snack = db.query(Snack).filter(Snack.id == snack_id).first()

    if not snack:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Snack not found")

    previous_availability = snack.is_available
    snack.is_available = payload.is_available
    record_audit_event(
        db,
        event_type="MENU_ITEM_AVAILABLE" if payload.is_available else "MENU_ITEM_SOLD_OUT",
        actor_type="admin",
        actor_label="Admin",
        snack_id=snack.id,
        summary=f"{snack.name} marked {'available' if payload.is_available else 'sold out'}",
        metadata={
            "previous_availability": previous_availability,
            "new_availability": payload.is_available,
            **request_metadata(request),
        },
    )
    db.commit()
    db.refresh(snack)

    return snack


@app.patch("/admin/orders/{order_id}/status", response_model=OrderRead)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    order = (
        db.query(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.snack))
        .filter(Order.id == order_id)
        .first()
    )

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    previous_status = order.status
    order.status = payload.status
    if payload.status == "out_for_delivery" and not order.delivery_partner:
        order.delivery_partner = "Cloud Runner"
    record_audit_event(
        db,
        event_type="ORDER_STATUS_CHANGED",
        actor_type="admin",
        actor_label="Admin",
        order_id=order.id,
        customer_phone=order.customer_phone,
        summary=f"Order #{order.id} moved from {previous_status} to {payload.status}",
        metadata={
            "previous_status": previous_status,
            "new_status": payload.status,
            "delivery_partner": order.delivery_partner,
            **request_metadata(request),
        },
    )
    db.commit()
    db.refresh(order)

    return (
        db.query(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.snack))
        .filter(Order.id == order.id)
        .one()
    )


@app.patch("/admin/orders/{order_id}/partner", response_model=OrderRead)
def update_delivery_partner(
    order_id: int,
    payload: DeliveryPartnerUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    order = (
        db.query(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.snack))
        .filter(Order.id == order_id)
        .first()
    )

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    previous_partner = order.delivery_partner
    order.delivery_partner = payload.delivery_partner.strip()
    record_audit_event(
        db,
        event_type="DELIVERY_PARTNER_ASSIGNED",
        actor_type="admin",
        actor_label="Admin",
        order_id=order.id,
        customer_phone=order.customer_phone,
        summary=f"Delivery partner updated for order #{order.id}",
        metadata={
            "previous_partner": previous_partner,
            "new_partner": order.delivery_partner,
            **request_metadata(request),
        },
    )
    db.commit()
    db.refresh(order)

    return (
        db.query(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.snack))
        .filter(Order.id == order.id)
        .one()
    )


@app.post("/orders/{order_id}/kitchen-camera-view", response_model=KitchenCameraRead)
def record_kitchen_camera_view(
    order_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == current_user.id).first()

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if order.status != "preparing":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kitchen camera is available while preparing")

    camera_url = os.getenv("KITCHEN_CAMERA_URL", "/kitchen-camera")
    record_audit_event(
        db,
        event_type="KITCHEN_CAMERA_VIEWED",
        actor_type="customer",
        actor_id=current_user.id,
        actor_label=current_user.name,
        order_id=order.id,
        customer_phone=order.customer_phone,
        summary=f"Customer opened kitchen camera for order #{order.id}",
        metadata={"camera_url": camera_url, **request_metadata(request)},
    )
    db.commit()
    return {"camera_url": camera_url}


@app.get("/orders/{order_id}", response_model=OrderRead)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = (
        db.query(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.snack))
        .filter(Order.id == order_id)
        .first()
    )

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    return order
