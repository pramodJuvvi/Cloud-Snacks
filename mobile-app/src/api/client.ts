export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
export const KITCHEN_CAMERA_URL =
  process.env.EXPO_PUBLIC_KITCHEN_CAMERA_URL ?? `${API_URL}/kitchen-camera`;
export const KITCHEN_ADDRESS =
  process.env.EXPO_PUBLIC_KITCHEN_ADDRESS ??
  "Vandanapuri Colony, Beeramguda, Hyderabad";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
  }
}

const REQUEST_TIMEOUT_MS = 8000;

async function request(url: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError("The service is taking longer than expected. Please try again.");
    }

    throw new ApiError("We could not connect to Cloud Snacks. Please check your internet and try again.");
  } finally {
    clearTimeout(timeout);
  }
}

function friendlyStatusMessage(status: number) {
  if (status === 400) {
    return "Please check the details and try again.";
  }
  if (status === 401 || status === 403) {
    return "Please sign in again to continue.";
  }
  if (status === 404) {
    return "We could not find that item. Please refresh and try again.";
  }
  if (status === 409) {
    return "This request conflicts with existing information. Please review and try again.";
  }
  if (status >= 500) {
    return "Cloud Snacks is temporarily unavailable. Please try again shortly.";
  }
  return "Something went wrong. Please try again.";
}

async function parseError(response: Response): Promise<ApiError> {
  try {
    const data = (await response.json()) as { detail?: string };
    return new ApiError(data.detail ?? friendlyStatusMessage(response.status), response.status);
  } catch {
    return new ApiError(friendlyStatusMessage(response.status), response.status);
  }
}

export type User = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
};

export type AuthSession = {
  accessToken: string;
  user: User;
};

type ApiSnack = {
  id: number;
  name: string;
  description: string;
  price: number;
  prep_minutes: number;
  calories: number;
  category: string;
  accent: string;
  ingredients?: string[];
  allergens?: string[];
  is_available?: boolean;
};

type ApiOrder = {
  id: number;
  user_id: number | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  delivery_address: string | null;
  delivery_note: string | null;
  scheduled_for: string | null;
  spice_level: string | null;
  payment_method: string | null;
  coupon_code: string | null;
  discount: number;
  delivery_partner: string | null;
  feedback_rating: number | null;
  feedback_note: string | null;
  issue_report: string | null;
  status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  created_at: string;
  items: {
    id: number;
    snack_id: number;
    quantity: number;
    unit_price: number;
    snack: ApiSnack;
  }[];
};

export type OrderHistoryItem = {
  id: number;
  status: string;
  total: number;
  createdAt: string;
  customerPhone: string | null;
  deliveryAddress: string | null;
  deliveryNote: string | null;
  scheduledFor: string | null;
  spiceLevel: string | null;
  paymentMethod: string | null;
  couponCode: string | null;
  discount: number;
  deliveryPartner: string | null;
  feedbackRating: number | null;
  feedbackNote: string | null;
  issueReport: string | null;
  items: {
    id: number;
    snackId: number;
    name: string;
    quantity: number;
    unitPrice: number;
  }[];
};

export type OrderStatus =
  | "received"
  | "preparing"
  | "out_for_delivery"
  | "delivery_in_progress"
  | "delivered"
  | "cancelled";

export type CheckoutDetails = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryNote: string;
  scheduledFor: string;
  spiceLevel: "Mild" | "Medium" | "Spicy";
  paymentMethod: "Cash on delivery" | "UPI on delivery";
  couponCode: string;
};

type ApiAuditEvent = {
  id: number;
  event_type: string;
  actor_type: string;
  actor_id: number | null;
  actor_label: string | null;
  order_id: number | null;
  snack_id: number | null;
  customer_phone: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
  metadata_json?: string;
  created_at: string;
};

export type AuditEvent = {
  id: number;
  eventType: string;
  actorType: string;
  actorId: number | null;
  actorLabel: string | null;
  orderId: number | null;
  snackId: number | null;
  customerPhone: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type ApiDeliveryRouteStop = {
  sequence: number;
  order_id: number;
  customer_name: string;
  customer_phone: string | null;
  delivery_address: string | null;
  status: string;
  scheduled_for: string | null;
  total: number;
  item_count: number;
  distance_from_previous_km: number;
  eta_minutes_from_previous: number;
  map_query: string;
};

type ApiDeliveryRoute = {
  partner: string;
  origin: string;
  stop_count: number;
  total_distance_km: number;
  estimated_minutes: number;
  strategy: string;
  stops: ApiDeliveryRouteStop[];
};

type ApiFinanceEntry = {
  id: number;
  entry_type: "expense" | "salary" | "income_adjustment";
  category: string;
  description: string;
  amount: number;
  paid_to: string | null;
  payment_method: string | null;
  service_month: string | null;
  entry_date: string;
  created_at: string;
};

type ApiFinanceReport = {
  period_days: number;
  order_count: number;
  revenue: number;
  average_order_value: number;
  expenses: number;
  salaries: number;
  income_adjustments: number;
  net_profit: number;
  cash_collected: number;
  upi_collected: number;
  category_totals: { category: string; total: number }[];
  recent_entries: ApiFinanceEntry[];
};

type ApiInventoryItem = {
  id: number;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  reorder_level: number;
  unit_cost: number;
  supplier: string | null;
  updated_at: string;
  created_at: string;
};

type ApiRecipeCost = {
  id: number;
  snack_id: number | null;
  snack_name: string;
  ingredient_cost: number;
  packaging_cost: number;
  labor_cost: number;
  updated_at: string;
  created_at: string;
};

type ApiStaffShift = {
  id: number;
  staff_name: string;
  role: string;
  attendance_status: "present" | "absent" | "half_day" | "paid_leave";
  hours: number;
  hourly_rate: number;
  notes: string | null;
  shift_date: string;
  created_at: string;
};

type ApiCoupon = {
  id: number;
  code: string;
  description: string;
  discount_type: "flat" | "percent" | "free_delivery";
  discount_value: number;
  min_order_value: number;
  max_discount: number;
  is_active: boolean;
  created_at: string;
};

type ApiAdminOpsReport = {
  period_days: number;
  low_stock_items: ApiInventoryItem[];
  menu_performance: {
    snack_name: string;
    quantity_sold: number;
    revenue: number;
    estimated_cost: number;
    estimated_margin: number;
  }[];
  customer_insights: {
    customer_name: string;
    customer_phone: string | null;
    order_count: number;
    revenue: number;
    last_order_at: string | null;
  }[];
  staff_costs: {
    staff_name: string;
    role: string;
    hours: number;
    estimated_pay: number;
  }[];
  active_coupons: ApiCoupon[];
};

export type DeliveryRouteStop = {
  sequence: number;
  orderId: number;
  customerName: string;
  customerPhone: string | null;
  deliveryAddress: string | null;
  status: string;
  scheduledFor: string | null;
  total: number;
  itemCount: number;
  distanceFromPreviousKm: number;
  etaMinutesFromPrevious: number;
  mapQuery: string;
};

export type DeliveryRoute = {
  partner: string;
  origin: string;
  stopCount: number;
  totalDistanceKm: number;
  estimatedMinutes: number;
  strategy: string;
  stops: DeliveryRouteStop[];
};

export type FinanceEntry = {
  id: number;
  entryType: "expense" | "salary" | "income_adjustment";
  category: string;
  description: string;
  amount: number;
  paidTo: string | null;
  paymentMethod: string | null;
  serviceMonth: string | null;
  entryDate: string;
  createdAt: string;
};

export type FinanceReport = {
  periodDays: number;
  orderCount: number;
  revenue: number;
  averageOrderValue: number;
  expenses: number;
  salaries: number;
  incomeAdjustments: number;
  netProfit: number;
  cashCollected: number;
  upiCollected: number;
  categoryTotals: { category: string; total: number }[];
  recentEntries: FinanceEntry[];
};

export type InventoryItem = {
  id: number;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  reorderLevel: number;
  unitCost: number;
  supplier: string | null;
  updatedAt: string;
  createdAt: string;
};

export type RecipeCost = {
  id: number;
  snackId: number | null;
  snackName: string;
  ingredientCost: number;
  packagingCost: number;
  laborCost: number;
  updatedAt: string;
  createdAt: string;
};

export type StaffShift = {
  id: number;
  staffName: string;
  role: string;
  attendanceStatus: "present" | "absent" | "half_day" | "paid_leave";
  hours: number;
  hourlyRate: number;
  notes: string | null;
  shiftDate: string;
  createdAt: string;
};

export type Coupon = {
  id: number;
  code: string;
  description: string;
  discountType: "flat" | "percent" | "free_delivery";
  discountValue: number;
  minOrderValue: number;
  maxDiscount: number;
  isActive: boolean;
  createdAt: string;
};

export type AdminOpsReport = {
  periodDays: number;
  lowStockItems: InventoryItem[];
  menuPerformance: {
    snackName: string;
    quantitySold: number;
    revenue: number;
    estimatedCost: number;
    estimatedMargin: number;
  }[];
  customerInsights: {
    customerName: string;
    customerPhone: string | null;
    orderCount: number;
    revenue: number;
    lastOrderAt: string | null;
  }[];
  staffCosts: {
    staffName: string;
    role: string;
    hours: number;
    estimatedPay: number;
  }[];
  activeCoupons: Coupon[];
};

function mapDeliveryRoute(route: ApiDeliveryRoute): DeliveryRoute {
  return {
    partner: route.partner,
    origin: route.origin,
    stopCount: route.stop_count,
    totalDistanceKm: route.total_distance_km,
    estimatedMinutes: route.estimated_minutes,
    strategy: route.strategy,
    stops: route.stops.map((stop) => ({
      sequence: stop.sequence,
      orderId: stop.order_id,
      customerName: stop.customer_name,
      customerPhone: stop.customer_phone,
      deliveryAddress: stop.delivery_address,
      status: stop.status,
      scheduledFor: stop.scheduled_for,
      total: stop.total,
      itemCount: stop.item_count,
      distanceFromPreviousKm: stop.distance_from_previous_km,
      etaMinutesFromPrevious: stop.eta_minutes_from_previous,
      mapQuery: stop.map_query,
    })),
  };
}

function mapFinanceEntry(entry: ApiFinanceEntry): FinanceEntry {
  return {
    id: entry.id,
    entryType: entry.entry_type,
    category: entry.category,
    description: entry.description,
    amount: entry.amount,
    paidTo: entry.paid_to,
    paymentMethod: entry.payment_method,
    serviceMonth: entry.service_month,
    entryDate: entry.entry_date,
    createdAt: entry.created_at,
  };
}

function mapFinanceReport(report: ApiFinanceReport): FinanceReport {
  return {
    periodDays: report.period_days,
    orderCount: report.order_count,
    revenue: report.revenue,
    averageOrderValue: report.average_order_value,
    expenses: report.expenses,
    salaries: report.salaries,
    incomeAdjustments: report.income_adjustments,
    netProfit: report.net_profit,
    cashCollected: report.cash_collected,
    upiCollected: report.upi_collected,
    categoryTotals: report.category_totals,
    recentEntries: report.recent_entries.map(mapFinanceEntry),
  };
}

function mapInventoryItem(item: ApiInventoryItem): InventoryItem {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    unit: item.unit,
    quantity: item.quantity,
    reorderLevel: item.reorder_level,
    unitCost: item.unit_cost,
    supplier: item.supplier,
    updatedAt: item.updated_at,
    createdAt: item.created_at,
  };
}

function mapRecipeCost(cost: ApiRecipeCost): RecipeCost {
  return {
    id: cost.id,
    snackId: cost.snack_id,
    snackName: cost.snack_name,
    ingredientCost: cost.ingredient_cost,
    packagingCost: cost.packaging_cost,
    laborCost: cost.labor_cost,
    updatedAt: cost.updated_at,
    createdAt: cost.created_at,
  };
}

function mapStaffShift(shift: ApiStaffShift): StaffShift {
  return {
    id: shift.id,
    staffName: shift.staff_name,
    role: shift.role,
    attendanceStatus: shift.attendance_status,
    hours: shift.hours,
    hourlyRate: shift.hourly_rate,
    notes: shift.notes,
    shiftDate: shift.shift_date,
    createdAt: shift.created_at,
  };
}

function mapCoupon(coupon: ApiCoupon): Coupon {
  return {
    id: coupon.id,
    code: coupon.code,
    description: coupon.description,
    discountType: coupon.discount_type,
    discountValue: coupon.discount_value,
    minOrderValue: coupon.min_order_value,
    maxDiscount: coupon.max_discount,
    isActive: coupon.is_active,
    createdAt: coupon.created_at,
  };
}

function mapAdminOpsReport(report: ApiAdminOpsReport): AdminOpsReport {
  return {
    periodDays: report.period_days,
    lowStockItems: report.low_stock_items.map(mapInventoryItem),
    menuPerformance: report.menu_performance.map((item) => ({
      snackName: item.snack_name,
      quantitySold: item.quantity_sold,
      revenue: item.revenue,
      estimatedCost: item.estimated_cost,
      estimatedMargin: item.estimated_margin,
    })),
    customerInsights: report.customer_insights.map((customer) => ({
      customerName: customer.customer_name,
      customerPhone: customer.customer_phone,
      orderCount: customer.order_count,
      revenue: customer.revenue,
      lastOrderAt: customer.last_order_at,
    })),
    staffCosts: report.staff_costs.map((staff) => ({
      staffName: staff.staff_name,
      role: staff.role,
      hours: staff.hours,
      estimatedPay: staff.estimated_pay,
    })),
    activeCoupons: report.active_coupons.map(mapCoupon),
  };
}

function parseAuditMetadata(event: ApiAuditEvent): Record<string, unknown> {
  if (event.metadata) {
    return event.metadata;
  }

  if (!event.metadata_json) {
    return {};
  }

  try {
    const parsed = JSON.parse(event.metadata_json) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function mapAuditEvent(event: ApiAuditEvent): AuditEvent {
  return {
    id: event.id,
    eventType: event.event_type,
    actorType: event.actor_type,
    actorId: event.actor_id,
    actorLabel: event.actor_label,
    orderId: event.order_id,
    snackId: event.snack_id,
    customerPhone: event.customer_phone,
    summary: event.summary,
    metadata: parseAuditMetadata(event),
    createdAt: event.created_at,
  };
}

export async function getBackendStatus(): Promise<string> {
  const response = await request(`${API_URL}/`);

  if (!response.ok) {
    throw await parseError(response);
  }

  const data = (await response.json()) as { message?: string };
  return data.message ?? "Cloud Snacks backend reachable";
}

export async function getSnacks() {
  const response = await request(`${API_URL}/snacks`);

  if (!response.ok) {
    throw await parseError(response);
  }

  const data = (await response.json()) as ApiSnack[];

  return data.map((snack) => ({
    id: snack.id,
    name: snack.name,
    description: snack.description,
    price: snack.price,
    prepMinutes: snack.prep_minutes,
    calories: snack.calories,
    category: snack.category,
    accent: snack.accent,
    ingredients: snack.ingredients ?? [],
    allergens: snack.allergens ?? [],
    isAvailable: snack.is_available ?? true,
  }));
}

function mapOrder(order: ApiOrder): OrderHistoryItem {
  return {
    id: order.id,
    status: order.status,
    total: order.total,
    createdAt: order.created_at,
    customerPhone: order.customer_phone,
    deliveryAddress: order.delivery_address,
    deliveryNote: order.delivery_note,
    scheduledFor: order.scheduled_for,
    spiceLevel: order.spice_level,
    paymentMethod: order.payment_method,
    couponCode: order.coupon_code,
    discount: order.discount,
    deliveryPartner: order.delivery_partner,
    feedbackRating: order.feedback_rating,
    feedbackNote: order.feedback_note,
    issueReport: order.issue_report,
    items: order.items.map((item) => ({
      id: item.id,
      snackId: item.snack_id,
      name: item.snack.name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
    })),
  };
}

export async function createOrder(
  items: { snackId: number; quantity: number }[],
  details: CheckoutDetails,
  accessToken?: string | null,
) {
  const response = await request(`${API_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      customer_name: details.customerName,
      customer_email: details.customerEmail,
      customer_phone: details.customerPhone,
      delivery_address: details.deliveryAddress,
      delivery_note: details.deliveryNote,
      scheduled_for: details.scheduledFor,
      spice_level: details.spiceLevel,
      payment_method: details.paymentMethod,
      coupon_code: details.couponCode,
      items: items.map((item) => ({
        snack_id: item.snackId,
        quantity: item.quantity,
      })),
    }),
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return mapOrder((await response.json()) as ApiOrder);
}

export async function registerUser(payload: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthSession> {
  const response = await request(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  const data = (await response.json()) as { access_token: string; user: User };
  return { accessToken: data.access_token, user: data.user };
}

export async function requestOtp(payload: {
  phone: string;
  purpose: "register" | "reset_pin";
}): Promise<{
  phone: string;
  devOtp: string | null;
  expiresInSeconds: number;
  deliveryChannel: string;
  message: string;
}> {
  const response = await request(`${API_URL}/auth/request-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  const data = (await response.json()) as {
    phone: string;
    dev_otp?: string | null;
    expires_in_seconds: number;
    delivery_channel: string;
    message: string;
  };
  return {
    phone: data.phone,
    devOtp: data.dev_otp ?? null,
    expiresInSeconds: data.expires_in_seconds,
    deliveryChannel: data.delivery_channel,
    message: data.message,
  };
}

export async function registerPhoneUser(payload: {
  name: string;
  phone: string;
  otp: string;
  pin: string;
}): Promise<AuthSession> {
  const response = await request(`${API_URL}/auth/register-phone`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  const data = (await response.json()) as { access_token: string; user: User };
  return { accessToken: data.access_token, user: data.user };
}

export async function loginWithPin(payload: {
  phone: string;
  pin: string;
}): Promise<AuthSession> {
  const response = await request(`${API_URL}/auth/login-pin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  const data = (await response.json()) as { access_token: string; user: User };
  return { accessToken: data.access_token, user: data.user };
}

export async function resetPin(payload: {
  phone: string;
  otp: string;
  pin: string;
}): Promise<AuthSession> {
  const response = await request(`${API_URL}/auth/reset-pin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  const data = (await response.json()) as { access_token: string; user: User };
  return { accessToken: data.access_token, user: data.user };
}

export async function loginUser(payload: {
  email: string;
  password: string;
}): Promise<AuthSession> {
  const response = await request(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  const data = (await response.json()) as { access_token: string; user: User };
  return { accessToken: data.access_token, user: data.user };
}

export async function getCurrentUser(accessToken: string): Promise<User> {
  const response = await request(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return (await response.json()) as User;
}

export async function getMyOrders(accessToken: string): Promise<OrderHistoryItem[]> {
  const response = await request(`${API_URL}/orders/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  const data = (await response.json()) as ApiOrder[];
  return data.map(mapOrder);
}

export async function getAdminOrders(): Promise<OrderHistoryItem[]> {
  const response = await request(`${API_URL}/admin/orders`);

  if (!response.ok) {
    throw await parseError(response);
  }

  const data = (await response.json()) as ApiOrder[];
  return data.map(mapOrder);
}

export async function getAdminAuditEvents(filters: {
  eventType?: string;
  orderId?: string;
  phone?: string;
  limit?: number;
} = {}): Promise<AuditEvent[]> {
  const params = new URLSearchParams();
  if (filters.eventType) {
    params.set("event_type", filters.eventType);
  }
  if (filters.orderId) {
    params.set("order_id", filters.orderId);
  }
  if (filters.phone) {
    params.set("phone", filters.phone);
  }
  params.set("limit", String(filters.limit ?? 100));

  const response = await request(`${API_URL}/admin/audit-events?${params.toString()}`);

  if (!response.ok) {
    throw await parseError(response);
  }

  const data = (await response.json()) as ApiAuditEvent[];
  return data.map(mapAuditEvent);
}

export async function getOptimizedDeliveryRoute(filters: {
  partner?: string;
  includePreparing?: boolean;
} = {}): Promise<DeliveryRoute> {
  const params = new URLSearchParams();
  params.set("partner", filters.partner ?? "Cloud Runner");
  params.set("include_preparing", String(filters.includePreparing ?? true));

  const response = await request(`${API_URL}/admin/delivery-route?${params.toString()}`);

  if (!response.ok) {
    throw await parseError(response);
  }

  return mapDeliveryRoute((await response.json()) as ApiDeliveryRoute);
}

export async function getAdminFinanceEntries(limit = 50): Promise<FinanceEntry[]> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  const response = await request(`${API_URL}/admin/finance/entries?${params.toString()}`);

  if (!response.ok) {
    throw await parseError(response);
  }

  const data = (await response.json()) as ApiFinanceEntry[];
  return data.map(mapFinanceEntry);
}

export async function getAdminFinanceReport(periodDays = 30): Promise<FinanceReport> {
  const params = new URLSearchParams();
  params.set("period_days", String(periodDays));
  const response = await request(`${API_URL}/admin/finance/report?${params.toString()}`);

  if (!response.ok) {
    throw await parseError(response);
  }

  return mapFinanceReport((await response.json()) as ApiFinanceReport);
}

export async function createAdminFinanceEntry(payload: {
  entryType: "expense" | "salary" | "income_adjustment";
  category: string;
  description: string;
  amount: number;
  paidTo?: string;
  paymentMethod?: string;
  serviceMonth?: string;
}): Promise<FinanceEntry> {
  const response = await request(`${API_URL}/admin/finance/entries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      entry_type: payload.entryType,
      category: payload.category,
      description: payload.description,
      amount: payload.amount,
      paid_to: payload.paidTo ?? "",
      payment_method: payload.paymentMethod ?? "Cash",
      service_month: payload.serviceMonth ?? "",
    }),
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return mapFinanceEntry((await response.json()) as ApiFinanceEntry);
}

export async function getAdminOpsReport(periodDays = 30): Promise<AdminOpsReport> {
  const params = new URLSearchParams();
  params.set("period_days", String(periodDays));
  const response = await request(`${API_URL}/admin/ops-report?${params.toString()}`);

  if (!response.ok) {
    throw await parseError(response);
  }

  return mapAdminOpsReport((await response.json()) as ApiAdminOpsReport);
}

export async function getAdminInventory(): Promise<InventoryItem[]> {
  const response = await request(`${API_URL}/admin/inventory`);

  if (!response.ok) {
    throw await parseError(response);
  }

  const data = (await response.json()) as ApiInventoryItem[];
  return data.map(mapInventoryItem);
}

export async function createAdminInventoryItem(payload: {
  name: string;
  category: string;
  unit: string;
  quantity: number;
  reorderLevel: number;
  unitCost: number;
  supplier?: string;
}): Promise<InventoryItem> {
  const response = await request(`${API_URL}/admin/inventory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: payload.name,
      category: payload.category,
      unit: payload.unit,
      quantity: payload.quantity,
      reorder_level: payload.reorderLevel,
      unit_cost: payload.unitCost,
      supplier: payload.supplier ?? "",
    }),
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return mapInventoryItem((await response.json()) as ApiInventoryItem);
}

export async function createAdminRecipeCost(payload: {
  snackId?: number | null;
  snackName: string;
  ingredientCost: number;
  packagingCost: number;
  laborCost: number;
}): Promise<RecipeCost> {
  const response = await request(`${API_URL}/admin/recipe-costs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      snack_id: payload.snackId ?? null,
      snack_name: payload.snackName,
      ingredient_cost: payload.ingredientCost,
      packaging_cost: payload.packagingCost,
      labor_cost: payload.laborCost,
    }),
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return mapRecipeCost((await response.json()) as ApiRecipeCost);
}

export async function createAdminStaffShift(payload: {
  staffName: string;
  role: string;
  attendanceStatus: "present" | "absent" | "half_day" | "paid_leave";
  hours: number;
  hourlyRate: number;
  notes?: string;
}): Promise<StaffShift> {
  const response = await request(`${API_URL}/admin/staff-shifts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      staff_name: payload.staffName,
      role: payload.role,
      attendance_status: payload.attendanceStatus,
      hours: payload.hours,
      hourly_rate: payload.hourlyRate,
      notes: payload.notes ?? "",
    }),
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return mapStaffShift((await response.json()) as ApiStaffShift);
}

export async function createAdminCoupon(payload: {
  code: string;
  description: string;
  discountType: "flat" | "percent" | "free_delivery";
  discountValue: number;
  minOrderValue: number;
  maxDiscount: number;
  isActive: boolean;
}): Promise<Coupon> {
  const response = await request(`${API_URL}/admin/coupons`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: payload.code,
      description: payload.description,
      discount_type: payload.discountType,
      discount_value: payload.discountValue,
      min_order_value: payload.minOrderValue,
      max_discount: payload.maxDiscount,
      is_active: payload.isActive,
    }),
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return mapCoupon((await response.json()) as ApiCoupon);
}

export async function updateOrderStatus(
  orderId: number,
  status: OrderStatus,
): Promise<OrderHistoryItem> {
  const response = await request(`${API_URL}/admin/orders/${orderId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return mapOrder((await response.json()) as ApiOrder);
}

export async function cancelMyOrder(
  orderId: number,
  accessToken: string,
): Promise<OrderHistoryItem> {
  const response = await request(`${API_URL}/orders/${orderId}/cancel`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return mapOrder((await response.json()) as ApiOrder);
}

export async function submitOrderFeedback(
  orderId: number,
  payload: { rating: number; note: string },
  accessToken: string,
): Promise<OrderHistoryItem> {
  const response = await request(`${API_URL}/orders/${orderId}/feedback`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return mapOrder((await response.json()) as ApiOrder);
}

export async function reportOrderIssue(
  orderId: number,
  payload: { issueType: "late" | "missing_item" | "quality" | "other"; note: string },
  accessToken: string,
): Promise<OrderHistoryItem> {
  const response = await request(`${API_URL}/orders/${orderId}/issue`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      issue_type: payload.issueType,
      note: payload.note,
    }),
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return mapOrder((await response.json()) as ApiOrder);
}

export async function updateDeliveryPartner(
  orderId: number,
  deliveryPartner: string,
): Promise<OrderHistoryItem> {
  const response = await request(`${API_URL}/admin/orders/${orderId}/partner`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ delivery_partner: deliveryPartner }),
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return mapOrder((await response.json()) as ApiOrder);
}

export async function updateSnackAvailability(
  snackId: number,
  isAvailable: boolean,
) {
  const response = await request(`${API_URL}/admin/snacks/${snackId}/availability`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ is_available: isAvailable }),
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  const snack = (await response.json()) as ApiSnack;
  return {
    id: snack.id,
    name: snack.name,
    description: snack.description,
    price: snack.price,
    prepMinutes: snack.prep_minutes,
    calories: snack.calories,
    category: snack.category,
    accent: snack.accent,
    ingredients: snack.ingredients ?? [],
    allergens: snack.allergens ?? [],
    isAvailable: snack.is_available ?? true,
  };
}

export async function getKitchenCameraUrl(orderId: number, accessToken: string): Promise<string> {
  const response = await request(`${API_URL}/orders/${orderId}/kitchen-camera-view`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  const data = (await response.json()) as { camera_url: string };
  if (data.camera_url.startsWith("http")) {
    return data.camera_url;
  }

  return `${API_URL}${data.camera_url.startsWith("/") ? "" : "/"}${data.camera_url}`;
}
