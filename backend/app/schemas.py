from datetime import datetime
import json

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator


class SnackRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    price: float
    prep_minutes: int
    calories: int
    category: str
    accent: str
    ingredients: list[str] = []
    allergens: list[str] = []
    is_available: bool = True

    @field_validator("ingredients", "allergens", mode="before")
    @classmethod
    def split_csv(cls, value):
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    phone: str | None = None


class TokenRead(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class OtpRequest(BaseModel):
    phone: str = Field(min_length=7, max_length=24)
    purpose: str = Field(default="register", pattern="^(register|reset_pin)$")


class OtpRead(BaseModel):
    phone: str
    expires_in_seconds: int
    delivery_channel: str
    message: str
    dev_otp: str | None = None


class PhoneRegister(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(min_length=7, max_length=24)
    otp: str = Field(min_length=4, max_length=8)
    pin: str = Field(min_length=4, max_length=6)


class PinLogin(BaseModel):
    phone: str = Field(min_length=7, max_length=24)
    pin: str = Field(min_length=4, max_length=6)


class PinReset(BaseModel):
    phone: str = Field(min_length=7, max_length=24)
    otp: str = Field(min_length=4, max_length=8)
    pin: str = Field(min_length=4, max_length=6)


class OrderItemCreate(BaseModel):
    snack_id: int
    quantity: int = Field(ge=1, le=25)


class OrderCreate(BaseModel):
    customer_name: str = Field(min_length=1, max_length=120)
    customer_email: str = Field(min_length=3, max_length=255)
    customer_phone: str = Field(min_length=7, max_length=24)
    delivery_address: str = Field(min_length=8, max_length=300)
    delivery_note: str = Field(default="", max_length=300)
    scheduled_for: str = Field(default="Now", max_length=80)
    spice_level: str = Field(default="Medium", pattern="^(Mild|Medium|Spicy)$")
    payment_method: str = Field(default="Cash on delivery", pattern="^(Cash on delivery|UPI on delivery)$")
    coupon_code: str = Field(default="", max_length=30)
    items: list[OrderItemCreate] = Field(min_length=1)


class OrderStatusUpdate(BaseModel):
    status: str = Field(pattern="^(received|preparing|out_for_delivery|delivered|cancelled)$")


class OrderFeedbackUpdate(BaseModel):
    rating: int = Field(ge=1, le=5)
    note: str = Field(default="", max_length=300)


class OrderIssueReport(BaseModel):
    issue_type: str = Field(pattern="^(late|missing_item|quality|other)$")
    note: str = Field(default="", max_length=300)


class DeliveryPartnerUpdate(BaseModel):
    delivery_partner: str = Field(min_length=1, max_length=120)


class SnackAvailabilityUpdate(BaseModel):
    is_available: bool


class KitchenCameraRead(BaseModel):
    camera_url: str


class FinanceEntryCreate(BaseModel):
    entry_type: str = Field(pattern="^(expense|salary|income_adjustment)$")
    category: str = Field(min_length=1, max_length=80)
    description: str = Field(min_length=1, max_length=200)
    amount: float = Field(gt=0, le=10000000)
    paid_to: str = Field(default="", max_length=120)
    payment_method: str = Field(default="Cash", max_length=80)
    service_month: str = Field(default="", max_length=20)


class FinanceEntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    entry_type: str
    category: str
    description: str
    amount: float
    paid_to: str | None
    payment_method: str | None
    service_month: str | None
    entry_date: datetime
    created_at: datetime


class FinanceCategoryTotalRead(BaseModel):
    category: str
    total: float


class FinanceReportRead(BaseModel):
    period_days: int
    order_count: int
    revenue: float
    average_order_value: float
    expenses: float
    salaries: float
    income_adjustments: float
    net_profit: float
    cash_collected: float
    upi_collected: float
    category_totals: list[FinanceCategoryTotalRead]
    recent_entries: list[FinanceEntryRead]


class InventoryItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    category: str = Field(default="Ingredients", max_length=80)
    unit: str = Field(default="kg", max_length=30)
    quantity: float = Field(ge=0, le=1000000)
    reorder_level: float = Field(default=0, ge=0, le=1000000)
    unit_cost: float = Field(default=0, ge=0, le=1000000)
    supplier: str = Field(default="", max_length=120)


class InventoryItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: str
    unit: str
    quantity: float
    reorder_level: float
    unit_cost: float
    supplier: str | None
    updated_at: datetime
    created_at: datetime


class RecipeCostCreate(BaseModel):
    snack_id: int | None = None
    snack_name: str = Field(min_length=1, max_length=120)
    ingredient_cost: float = Field(default=0, ge=0, le=1000000)
    packaging_cost: float = Field(default=0, ge=0, le=1000000)
    labor_cost: float = Field(default=0, ge=0, le=1000000)


class RecipeCostRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    snack_id: int | None
    snack_name: str
    ingredient_cost: float
    packaging_cost: float
    labor_cost: float
    updated_at: datetime
    created_at: datetime


class StaffShiftCreate(BaseModel):
    staff_name: str = Field(min_length=1, max_length=120)
    role: str = Field(default="Kitchen", max_length=80)
    attendance_status: str = Field(default="present", pattern="^(present|absent|half_day|paid_leave)$")
    hours: float = Field(default=0, ge=0, le=24)
    hourly_rate: float = Field(default=0, ge=0, le=100000)
    notes: str = Field(default="", max_length=200)


class StaffShiftRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    staff_name: str
    role: str
    attendance_status: str
    hours: float
    hourly_rate: float
    notes: str | None
    shift_date: datetime
    created_at: datetime


class CouponCreate(BaseModel):
    code: str = Field(min_length=2, max_length=30)
    description: str = Field(default="", max_length=200)
    discount_type: str = Field(default="flat", pattern="^(flat|percent|free_delivery)$")
    discount_value: float = Field(default=0, ge=0, le=1000000)
    min_order_value: float = Field(default=0, ge=0, le=1000000)
    max_discount: float = Field(default=0, ge=0, le=1000000)
    is_active: bool = True


class CouponRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    description: str
    discount_type: str
    discount_value: float
    min_order_value: float
    max_discount: float
    is_active: bool
    created_at: datetime


class MenuPerformanceRead(BaseModel):
    snack_name: str
    quantity_sold: int
    revenue: float
    estimated_cost: float
    estimated_margin: float


class CustomerInsightRead(BaseModel):
    customer_name: str
    customer_phone: str | None
    order_count: int
    revenue: float
    last_order_at: datetime | None


class StaffCostRead(BaseModel):
    staff_name: str
    role: str
    hours: float
    estimated_pay: float


class AdminOpsReportRead(BaseModel):
    period_days: int
    low_stock_items: list[InventoryItemRead]
    menu_performance: list[MenuPerformanceRead]
    customer_insights: list[CustomerInsightRead]
    staff_costs: list[StaffCostRead]
    active_coupons: list[CouponRead]


class AuditEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_type: str
    actor_type: str
    actor_id: int | None
    actor_label: str | None
    order_id: int | None
    snack_id: int | None
    customer_phone: str | None
    summary: str
    metadata_json: str
    created_at: datetime

    @computed_field
    @property
    def metadata(self) -> dict:
        try:
            parsed = json.loads(self.metadata_json)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}


class DeliveryRouteStopRead(BaseModel):
    sequence: int
    order_id: int
    customer_name: str
    customer_phone: str | None
    delivery_address: str | None
    status: str
    scheduled_for: str | None
    total: float
    item_count: int
    distance_from_previous_km: float
    eta_minutes_from_previous: int
    map_query: str


class DeliveryRouteRead(BaseModel):
    partner: str
    origin: str
    stop_count: int
    total_distance_km: float
    estimated_minutes: int
    strategy: str
    stops: list[DeliveryRouteStopRead]


class OrderItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    snack_id: int
    quantity: int
    unit_price: float
    snack: SnackRead


class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int | None
    customer_name: str
    customer_email: str
    customer_phone: str | None
    delivery_address: str | None
    delivery_note: str | None
    scheduled_for: str | None
    spice_level: str | None
    payment_method: str | None
    coupon_code: str | None
    discount: float
    delivery_partner: str | None
    feedback_rating: int | None
    feedback_note: str | None
    issue_report: str | None
    status: str
    subtotal: float
    delivery_fee: float
    total: float
    created_at: datetime
    items: list[OrderItemRead]
