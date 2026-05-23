import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AuditEvent,
  DeliveryRoute,
  FinanceEntry,
  FinanceReport,
  AdminOpsReport,
  createAdminCoupon,
  createAdminFinanceEntry,
  createAdminInventoryItem,
  createAdminRecipeCost,
  createAdminStaffShift,
  getAdminAuditEvents,
  getAdminFinanceEntries,
  getAdminFinanceReport,
  getAdminOpsReport,
  getAdminOrders,
  getOptimizedDeliveryRoute,
  getSnacks,
  OrderHistoryItem,
  OrderStatus,
  updateSnackAvailability,
  updateOrderStatus,
} from "../api/client";
import { AppHeader } from "../components/AppHeader";
import { MetricTile } from "../components/MetricTile";
import { OrderTimeline } from "../components/OrderTimeline";
import { SectionPanel } from "../components/SectionPanel";
import { useAuth } from "../context/AuthContext";
import { theme } from "../theme";
import type { Snack } from "../types";

const nextStatus: Record<string, OrderStatus | null> = {
  received: "preparing",
  preparing: "out_for_delivery",
  out_for_delivery: "delivered",
  delivery_in_progress: "delivered",
  delivered: null,
  cancelled: null,
};

export function AdminScreen() {
  const { signOut, user } = useAuth();
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [snacks, setSnacks] = useState<Snack[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [financeEntries, setFinanceEntries] = useState<FinanceEntry[]>([]);
  const [financeReport, setFinanceReport] = useState<FinanceReport | null>(null);
  const [opsReport, setOpsReport] = useState<AdminOpsReport | null>(null);
  const [deliveryRoute, setDeliveryRoute] = useState<DeliveryRoute | null>(null);
  const [viewMode, setViewMode] = useState<"orders" | "routes" | "finance" | "audit">("orders");
  const [auditFilter, setAuditFilter] = useState("");
  const [financeForm, setFinanceForm] = useState({
    amount: "",
    category: "Ingredients",
    description: "",
    entryType: "expense" as "expense" | "salary" | "income_adjustment",
    paidTo: "",
    paymentMethod: "Cash",
    serviceMonth: "",
  });
  const [inventoryForm, setInventoryForm] = useState({
    category: "Ingredients",
    name: "",
    quantity: "",
    reorderLevel: "",
    supplier: "",
    unit: "kg",
    unitCost: "",
  });
  const [recipeCostForm, setRecipeCostForm] = useState({
    ingredientCost: "",
    laborCost: "",
    packagingCost: "",
    snackName: "",
  });
  const [staffForm, setStaffForm] = useState({
    hourlyRate: "",
    hours: "",
    role: "Kitchen",
    staffName: "",
  });
  const [couponForm, setCouponForm] = useState({
    code: "",
    description: "",
    discountType: "flat" as "flat" | "percent" | "free_delivery",
    discountValue: "",
    maxDiscount: "",
    minOrderValue: "",
  });
  const [routePartner, setRoutePartner] = useState("Cloud Runner");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loadOrders = async () => {
    setIsLoading(true);
    setMessage("Loading orders...");

    try {
      const nextOrders = await getAdminOrders();
      const nextSnacks = await getSnacks();
      const nextAuditEvents = await getAdminAuditEvents();
      const nextDeliveryRoute = await getOptimizedDeliveryRoute({ partner: routePartner });
      const nextFinanceEntries = await getAdminFinanceEntries();
      const nextFinanceReport = await getAdminFinanceReport();
      const nextOpsReport = await getAdminOpsReport();
      setOrders(nextOrders);
      setSnacks(nextSnacks);
      setAuditEvents(nextAuditEvents);
      setDeliveryRoute(nextDeliveryRoute);
      setFinanceEntries(nextFinanceEntries);
      setFinanceReport(nextFinanceReport);
      setOpsReport(nextOpsReport);
      setMessage(nextOrders.length === 0 ? "No orders yet." : "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load orders.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSnackAvailability = async (snack: Snack) => {
    if (typeof snack.id !== "number") {
      return;
    }

    setMessage(`Updating ${snack.name}...`);
    try {
      const updatedSnack = await updateSnackAvailability(snack.id, !(snack.isAvailable ?? true));
      setSnacks((currentSnacks) =>
        currentSnacks.map((currentSnack) =>
          currentSnack.id === updatedSnack.id ? updatedSnack : currentSnack,
        ),
      );
      setMessage(`${updatedSnack.name} is ${updatedSnack.isAvailable ? "available" : "sold out"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update item.");
    }
  };

  const changeStatus = async (orderId: number, status: OrderStatus) => {
    setMessage(`Updating order #${orderId}...`);

    try {
      const updatedOrder = await updateOrderStatus(orderId, status);
      setOrders((currentOrders) =>
        currentOrders.map((order) => (order.id === orderId ? updatedOrder : order)),
      );
      setMessage(`Order #${orderId} is now ${status}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update order.");
    }
  };

  const loadAuditEvents = async () => {
    setIsLoading(true);
    setMessage("Loading audit events...");

    try {
      const isOrderFilter = /^\d+$/.test(auditFilter.trim());
      const nextAuditEvents = await getAdminAuditEvents({
        orderId: isOrderFilter ? auditFilter.trim() : undefined,
        phone: !isOrderFilter && auditFilter.trim() ? auditFilter.trim() : undefined,
      });
      setAuditEvents(nextAuditEvents);
      setMessage(nextAuditEvents.length === 0 ? "No audit events found." : "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load audit events.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadDeliveryRoute = async () => {
    setIsLoading(true);
    setMessage("Optimizing delivery route...");

    try {
      const nextDeliveryRoute = await getOptimizedDeliveryRoute({
        partner: routePartner.trim() || "Cloud Runner",
      });
      setDeliveryRoute(nextDeliveryRoute);
      setMessage(
        nextDeliveryRoute.stopCount === 0
          ? "No preparing or out-for-delivery stops for this partner."
          : `Route optimized for ${nextDeliveryRoute.stopCount} stops.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not optimize route.");
    } finally {
      setIsLoading(false);
    }
  };

  const openRouteInMaps = async () => {
    if (!deliveryRoute || deliveryRoute.stops.length === 0) {
      setMessage("Optimize a route before opening maps.");
      return;
    }

    const destination = deliveryRoute.stops[deliveryRoute.stops.length - 1]?.mapQuery ?? "";
    const waypoints = deliveryRoute.stops.slice(0, -1).map((stop) => stop.mapQuery).filter(Boolean);
    const url =
      `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(deliveryRoute.origin)}` +
      `&destination=${encodeURIComponent(destination)}` +
      (waypoints.length > 0 ? `&waypoints=${encodeURIComponent(waypoints.join("|"))}` : "") +
      "&travelmode=driving";

    try {
      await Linking.openURL(url);
    } catch {
      setMessage("Could not open maps for this route.");
    }
  };

  const saveFinanceEntry = async () => {
    const amount = Number(financeForm.amount);
    if (!amount || amount <= 0) {
      setMessage("Enter a valid finance amount.");
      return;
    }
    if (!financeForm.category.trim() || !financeForm.description.trim()) {
      setMessage("Enter category and description for the finance entry.");
      return;
    }

    setIsLoading(true);
    setMessage("Saving finance entry...");
    try {
      await createAdminFinanceEntry({
        entryType: financeForm.entryType,
        category: financeForm.category,
        description: financeForm.description,
        amount,
        paidTo: financeForm.paidTo,
        paymentMethod: financeForm.paymentMethod,
        serviceMonth: financeForm.serviceMonth,
      });
      await refreshOps();
      setFinanceForm((currentForm) => ({ ...currentForm, amount: "", description: "", paidTo: "" }));
      setMessage("Finance entry saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save finance entry.");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshOps = async () => {
    const [nextFinanceEntries, nextFinanceReport, nextOpsReport] = await Promise.all([
      getAdminFinanceEntries(),
      getAdminFinanceReport(),
      getAdminOpsReport(),
    ]);
    setFinanceEntries(nextFinanceEntries);
    setFinanceReport(nextFinanceReport);
    setOpsReport(nextOpsReport);
  };

  const saveInventoryItem = async () => {
    const quantity = Number(inventoryForm.quantity);
    if (!inventoryForm.name.trim() || Number.isNaN(quantity)) {
      setMessage("Enter inventory name and quantity.");
      return;
    }
    setIsLoading(true);
    setMessage("Saving inventory item...");
    try {
      await createAdminInventoryItem({
        name: inventoryForm.name,
        category: inventoryForm.category,
        unit: inventoryForm.unit,
        quantity,
        reorderLevel: Number(inventoryForm.reorderLevel) || 0,
        unitCost: Number(inventoryForm.unitCost) || 0,
        supplier: inventoryForm.supplier,
      });
      await refreshOps();
      setInventoryForm((currentForm) => ({ ...currentForm, name: "", quantity: "", supplier: "" }));
      setMessage("Inventory item saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save inventory item.");
    } finally {
      setIsLoading(false);
    }
  };

  const saveRecipeCost = async () => {
    if (!recipeCostForm.snackName.trim()) {
      setMessage("Enter menu item name for recipe costing.");
      return;
    }
    setIsLoading(true);
    setMessage("Saving recipe cost...");
    try {
      await createAdminRecipeCost({
        snackName: recipeCostForm.snackName,
        ingredientCost: Number(recipeCostForm.ingredientCost) || 0,
        packagingCost: Number(recipeCostForm.packagingCost) || 0,
        laborCost: Number(recipeCostForm.laborCost) || 0,
      });
      await refreshOps();
      setRecipeCostForm({ ingredientCost: "", laborCost: "", packagingCost: "", snackName: "" });
      setMessage("Recipe cost saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save recipe cost.");
    } finally {
      setIsLoading(false);
    }
  };

  const saveStaffShift = async () => {
    if (!staffForm.staffName.trim()) {
      setMessage("Enter staff name.");
      return;
    }
    setIsLoading(true);
    setMessage("Saving staff attendance...");
    try {
      await createAdminStaffShift({
        staffName: staffForm.staffName,
        role: staffForm.role,
        attendanceStatus: "present",
        hours: Number(staffForm.hours) || 0,
        hourlyRate: Number(staffForm.hourlyRate) || 0,
      });
      await refreshOps();
      setStaffForm((currentForm) => ({ ...currentForm, hours: "", staffName: "" }));
      setMessage("Staff shift saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save staff shift.");
    } finally {
      setIsLoading(false);
    }
  };

  const saveCoupon = async () => {
    if (!couponForm.code.trim()) {
      setMessage("Enter coupon code.");
      return;
    }
    setIsLoading(true);
    setMessage("Creating coupon...");
    try {
      await createAdminCoupon({
        code: couponForm.code,
        description: couponForm.description,
        discountType: couponForm.discountType,
        discountValue: Number(couponForm.discountValue) || 0,
        minOrderValue: Number(couponForm.minOrderValue) || 0,
        maxDiscount: Number(couponForm.maxDiscount) || 0,
        isActive: true,
      });
      await refreshOps();
      setCouponForm((currentForm) => ({ ...currentForm, code: "", description: "", discountValue: "" }));
      setMessage("Coupon created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create coupon.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, []);

  const activeOrders = orders.filter(
    (order) => order.status !== "delivered" && order.status !== "cancelled",
  );
  const todayRevenue = orders
    .filter((order) => order.status !== "cancelled")
    .reduce((total, order) => total + order.total, 0);
  const issueCount = orders.filter((order) => Boolean(order.issueReport)).length;
  const feedbackAlerts = orders
    .filter((order) => Boolean(order.issueReport) || (order.feedbackRating ?? 5) <= 3)
    .slice(0, 6);
  const lowRatingCount = orders.filter((order) => (order.feedbackRating ?? 5) <= 3).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          colors={["#fee2e2", "#fef3c7", "#dcfce7"]}
          eyebrow="Operations"
          icon="storefront-outline"
          title="Admin control room"
          subtitle={`Orders, menu availability, route optimization, and audit history${user ? ` for ${user.name}` : ""}.`}
          right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh admin orders"
            onPress={loadOrders}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Ionicons name="refresh" size={18} color={theme.colors.charcoal} />
          </Pressable>
          }
        >
          <View style={styles.headerStats}>
            <View style={styles.headerStatTile}>
              <Text style={styles.headerStatValue}>{activeOrders.length}</Text>
              <Text style={styles.headerStatLabel}>active</Text>
            </View>
            <View style={styles.headerStatTile}>
              <Text style={styles.headerStatValue}>Rs {todayRevenue}</Text>
              <Text style={styles.headerStatLabel}>revenue</Text>
            </View>
          </View>
        </AppHeader>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out admin"
          onPress={signOut}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <Ionicons name="log-out-outline" size={18} color={theme.colors.charcoal} />
          <Text style={styles.secondaryButtonText}>Sign Out</Text>
        </Pressable>

        <View style={styles.segmentedControl}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setViewMode("orders")}
            style={({ pressed }) => [
              styles.segmentButton,
              viewMode === "orders" && styles.segmentButtonActive,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="receipt-outline"
              size={16}
              color={viewMode === "orders" ? theme.colors.white : theme.colors.charcoal}
            />
            <Text
              style={[
                styles.segmentButtonText,
                viewMode === "orders" && styles.segmentButtonTextActive,
              ]}
            >
              Orders
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setViewMode("routes")}
            style={({ pressed }) => [
              styles.segmentButton,
              viewMode === "routes" && styles.segmentButtonActive,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="map-outline"
              size={16}
              color={viewMode === "routes" ? theme.colors.white : theme.colors.charcoal}
            />
            <Text
              style={[
                styles.segmentButtonText,
                viewMode === "routes" && styles.segmentButtonTextActive,
              ]}
            >
              Routes
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setViewMode("audit")}
            style={({ pressed }) => [
              styles.segmentButton,
              viewMode === "audit" && styles.segmentButtonActive,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={viewMode === "audit" ? theme.colors.white : theme.colors.charcoal}
            />
            <Text
              style={[
                styles.segmentButtonText,
                viewMode === "audit" && styles.segmentButtonTextActive,
              ]}
            >
              Audit
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setViewMode("finance")}
            style={({ pressed }) => [
              styles.segmentButton,
              viewMode === "finance" && styles.segmentButtonActive,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="wallet-outline"
              size={16}
              color={viewMode === "finance" ? theme.colors.white : theme.colors.charcoal}
            />
            <Text
              style={[
                styles.segmentButtonText,
                viewMode === "finance" && styles.segmentButtonTextActive,
              ]}
            >
              Finance
            </Text>
          </Pressable>
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        {viewMode === "orders" ? (
          <>
            <View style={styles.summaryGrid}>
              <MetricTile accent={theme.colors.sky} label="Orders" value={orders.length} />
              <MetricTile accent={theme.colors.leaf} label="Active" value={activeOrders.length} />
              <MetricTile accent={theme.colors.saffron} label="Revenue" value={`Rs ${todayRevenue}`} />
              <MetricTile accent={theme.colors.tomato} label="Feedback" value={issueCount + lowRatingCount} />
            </View>

            <SectionPanel
              accent={theme.colors.tomato}
              icon="chatbubbles-outline"
              title="Customer Feedback Alerts"
              subtitle="Low ratings and reported issues that need admin attention."
            >
              {feedbackAlerts.length > 0 ? (
                feedbackAlerts.map((order) => (
                  <View key={order.id} style={styles.feedbackAlertCard}>
                    <View style={styles.orderTopRow}>
                      <Text style={styles.orderTitle}>Order #{order.id}</Text>
                      <Text style={styles.feedbackAlertBadge}>
                        {order.issueReport ? "Issue" : "Low rating"}
                      </Text>
                    </View>
                    <Text style={styles.orderItems}>
                      {order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")}
                    </Text>
                    {order.customerPhone ? (
                      <Text style={styles.orderItems}>Phone: {order.customerPhone}</Text>
                    ) : null}
                    {order.feedbackRating ? (
                      <Text style={styles.feedbackRatingText}>
                        Rating: {order.feedbackRating}/5
                        {order.feedbackNote ? ` - ${order.feedbackNote}` : ""}
                      </Text>
                    ) : null}
                    {order.issueReport ? (
                      <Text style={styles.issueText}>Issue: {order.issueReport}</Text>
                    ) : null}
                  </View>
                ))
              ) : (
                <Text style={styles.orderItems}>No low ratings or issue reports right now.</Text>
              )}
            </SectionPanel>

            <SectionPanel
              accent={theme.colors.saffron}
              icon="fast-food-outline"
              title="Menu Availability"
              subtitle="Mark popular items sold out or available during service."
            >
              {snacks.slice(0, 8).map((snack) => (
                <View key={snack.id} style={styles.availabilityRow}>
                  <View style={styles.availabilityCopy}>
                    <Text style={styles.availabilityName}>{snack.name}</Text>
                    <Text style={styles.availabilityMeta}>
                      {(snack.isAvailable ?? true) ? "Available" : "Sold out"}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => toggleSnackAvailability(snack)}
                    style={({ pressed }) => [
                      (snack.isAvailable ?? true)
                        ? styles.warningButton
                        : styles.primarySmallButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.primaryButtonText}>
                      {(snack.isAvailable ?? true) ? "Sold Out" : "Available"}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </SectionPanel>

            <SectionPanel
              accent={theme.colors.leaf}
              icon="receipt-outline"
              title="Order Queue"
              subtitle="Advance kitchen and delivery statuses with clean operator actions."
            >
            {orders.map((order) => {
              const upcomingStatus = nextStatus[order.status];

              return (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.orderTopRow}>
                    <Text style={styles.orderTitle}>Order #{order.id}</Text>
                    <Text style={styles.orderTotal}>Rs {order.total}</Text>
                  </View>
                  <Text style={styles.orderMeta}>
                    {order.status} - {new Date(order.createdAt).toLocaleDateString()}
                  </Text>
                  <OrderTimeline status={order.status} />
                  <Text style={styles.orderItems}>
                    {order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")}
                  </Text>
                  {order.deliveryAddress ? (
                    <Text style={styles.orderItems}>Deliver to: {order.deliveryAddress}</Text>
                  ) : null}
                  {order.customerPhone ? (
                    <Text style={styles.orderItems}>Phone: {order.customerPhone}</Text>
                  ) : null}
                  <Text style={styles.orderItems}>
                    Schedule: {order.scheduledFor ?? "Now"} - Spice:{" "}
                    {order.spiceLevel ?? "Medium"}
                  </Text>
                  <Text style={styles.orderItems}>
                    Payment: {order.paymentMethod ?? "Cash on delivery"}
                    {order.couponCode ? ` - Coupon: ${order.couponCode}` : ""}
                    {order.discount > 0 ? ` - Discount: Rs ${order.discount}` : ""}
                  </Text>
                  {order.deliveryNote ? (
                    <Text style={styles.orderItems}>Notes: {order.deliveryNote}</Text>
                  ) : null}
                  {order.deliveryPartner ? (
                    <Text style={styles.orderItems}>Partner: {order.deliveryPartner}</Text>
                  ) : null}
                  {order.feedbackRating ? (
                    <Text style={styles.orderItems}>
                      Rating: {order.feedbackRating}/5{" "}
                      {order.feedbackNote ? `- ${order.feedbackNote}` : ""}
                    </Text>
                  ) : null}
                  {order.issueReport ? (
                    <Text style={styles.issueText}>Issue: {order.issueReport}</Text>
                  ) : null}

                  <View style={styles.actions}>
                    {upcomingStatus ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => changeStatus(order.id, upcomingStatus)}
                        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                      >
                        <Text style={styles.primaryButtonText}>Advance</Text>
                      </Pressable>
                    ) : null}
                    {order.status !== "cancelled" && order.status !== "delivered" ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => changeStatus(order.id, "cancelled")}
                        style={({ pressed }) => [styles.dangerButton, pressed && styles.pressed]}
                      >
                        <Text style={styles.primaryButtonText}>Cancel</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })}
            </SectionPanel>
          </>
        ) : viewMode === "routes" ? (
          <SectionPanel
            accent={theme.colors.sky}
            icon="map-outline"
            title="Delivery Route Optimizer"
            subtitle="Batch preparing and out-for-delivery orders into the shortest practical stop order."
          >
              <Text style={styles.routeText}>
                Batch preparing and out-for-delivery orders into the shortest practical stop order.
              </Text>
              <TextInput
                onChangeText={setRoutePartner}
                placeholder="Delivery partner"
                placeholderTextColor={theme.colors.muted}
                style={styles.auditInput}
                value={routePartner}
              />
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isLoading}
                  onPress={loadDeliveryRoute}
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                >
                  <Text style={styles.primaryButtonText}>Optimize</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={openRouteInMaps}
                  style={({ pressed }) => [styles.mapButton, pressed && styles.pressed]}
                >
                  <Ionicons name="navigate-outline" size={18} color={theme.colors.white} />
                  <Text style={styles.primaryButtonText}>Maps</Text>
                </Pressable>
              </View>

            {deliveryRoute ? (
              <>
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryTile}>
                    <Text style={styles.summaryValue}>{deliveryRoute.stopCount}</Text>
                    <Text style={styles.summaryLabel}>Stops</Text>
                  </View>
                  <View style={styles.summaryTile}>
                    <Text style={styles.summaryValue}>{deliveryRoute.totalDistanceKm} km</Text>
                    <Text style={styles.summaryLabel}>Distance</Text>
                  </View>
                  <View style={styles.summaryTile}>
                    <Text style={styles.summaryValue}>{deliveryRoute.estimatedMinutes} min</Text>
                    <Text style={styles.summaryLabel}>ETA</Text>
                  </View>
                  <View style={styles.summaryTile}>
                    <Text style={styles.summaryValue}>{deliveryRoute.partner}</Text>
                    <Text style={styles.summaryLabel}>Partner</Text>
                  </View>
                </View>
                <Text style={styles.routeText}>{deliveryRoute.strategy}</Text>
                {deliveryRoute.stops.map((stop) => (
                  <View key={stop.orderId} style={styles.routeStopCard}>
                    <View style={styles.orderTopRow}>
                      <Text style={styles.routeSequence}>Stop {stop.sequence}</Text>
                      <Text style={styles.orderTotal}>Rs {stop.total}</Text>
                    </View>
                    <Text style={styles.orderTitle}>Order #{stop.orderId} - {stop.customerName}</Text>
                    <Text style={styles.orderItems}>{stop.deliveryAddress}</Text>
                    <Text style={styles.orderItems}>
                      {stop.status.replaceAll("_", " ")} - {stop.itemCount} item
                      {stop.itemCount === 1 ? "" : "s"} - {stop.scheduledFor ?? "Now"}
                    </Text>
                    <Text style={styles.routeMetric}>
                      Leg: {stop.distanceFromPreviousKm} km - ETA {stop.etaMinutesFromPrevious} min
                    </Text>
                    {stop.customerPhone ? (
                      <Text style={styles.orderItems}>Phone: {stop.customerPhone}</Text>
                    ) : null}
                  </View>
                ))}
              </>
            ) : null}
          </SectionPanel>
        ) : viewMode === "finance" ? (
          <>
            <View style={styles.summaryGrid}>
              <MetricTile accent={theme.colors.leaf} label="Revenue" value={`Rs ${financeReport?.revenue ?? 0}`} />
              <MetricTile accent={theme.colors.tomato} label="Expenses" value={`Rs ${(financeReport?.expenses ?? 0) + (financeReport?.salaries ?? 0)}`} />
              <MetricTile accent={theme.colors.grape} label="Profit" value={`Rs ${financeReport?.netProfit ?? 0}`} />
              <MetricTile accent={theme.colors.sky} label="Avg Order" value={`Rs ${financeReport?.averageOrderValue ?? 0}`} />
            </View>

            <SectionPanel
              accent={theme.colors.leaf}
              icon="wallet-outline"
              title="Income, Expenses & Salaries"
              subtitle="Track kitchen purchases, staff salaries, rent, utilities, and manual income corrections."
            >
              <View style={styles.optionRow}>
                {(["expense", "salary", "income_adjustment"] as const).map((entryType) => (
                  <Pressable
                    accessibilityRole="button"
                    key={entryType}
                    onPress={() => setFinanceForm((currentForm) => ({ ...currentForm, entryType }))}
                    style={[
                      styles.financeChip,
                      financeForm.entryType === entryType && styles.financeChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.financeChipText,
                        financeForm.entryType === entryType && styles.financeChipTextActive,
                      ]}
                    >
                      {entryType.replace("_", " ")}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                keyboardType="numeric"
                onChangeText={(amount) => setFinanceForm((currentForm) => ({ ...currentForm, amount }))}
                placeholder="Amount"
                placeholderTextColor={theme.colors.muted}
                style={styles.auditInput}
                value={financeForm.amount}
              />
              <TextInput
                onChangeText={(category) => setFinanceForm((currentForm) => ({ ...currentForm, category }))}
                placeholder="Category e.g. Ingredients, Rent, Staff Salary"
                placeholderTextColor={theme.colors.muted}
                style={styles.auditInput}
                value={financeForm.category}
              />
              <TextInput
                onChangeText={(description) => setFinanceForm((currentForm) => ({ ...currentForm, description }))}
                placeholder="Description"
                placeholderTextColor={theme.colors.muted}
                style={styles.auditInput}
                value={financeForm.description}
              />
              <TextInput
                onChangeText={(paidTo) => setFinanceForm((currentForm) => ({ ...currentForm, paidTo }))}
                placeholder="Paid to / received from"
                placeholderTextColor={theme.colors.muted}
                style={styles.auditInput}
                value={financeForm.paidTo}
              />
              <View style={styles.actions}>
                <TextInput
                  onChangeText={(paymentMethod) => setFinanceForm((currentForm) => ({ ...currentForm, paymentMethod }))}
                  placeholder="Payment method"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.auditInput}
                  value={financeForm.paymentMethod}
                />
                <TextInput
                  onChangeText={(serviceMonth) => setFinanceForm((currentForm) => ({ ...currentForm, serviceMonth }))}
                  placeholder="Month"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.auditInput}
                  value={financeForm.serviceMonth}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={isLoading}
                onPress={saveFinanceEntry}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.primaryButtonText}>{isLoading ? "Saving" : "Save Entry"}</Text>
              </Pressable>
            </SectionPanel>

            <SectionPanel
              accent={theme.colors.tomato}
              icon="cube-outline"
              title="Inventory & Low Stock"
              subtitle="Maintain kitchen stock levels and see what needs refilling before service starts."
            >
              <TextInput
                onChangeText={(name) => setInventoryForm((currentForm) => ({ ...currentForm, name }))}
                placeholder="Item name e.g. Basmati rice"
                placeholderTextColor={theme.colors.muted}
                style={styles.auditInput}
                value={inventoryForm.name}
              />
              <View style={styles.actions}>
                <TextInput
                  onChangeText={(category) => setInventoryForm((currentForm) => ({ ...currentForm, category }))}
                  placeholder="Category"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.auditInput}
                  value={inventoryForm.category}
                />
                <TextInput
                  onChangeText={(unit) => setInventoryForm((currentForm) => ({ ...currentForm, unit }))}
                  placeholder="Unit"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.auditInput}
                  value={inventoryForm.unit}
                />
              </View>
              <View style={styles.actions}>
                <TextInput
                  keyboardType="numeric"
                  onChangeText={(quantity) => setInventoryForm((currentForm) => ({ ...currentForm, quantity }))}
                  placeholder="Quantity"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.auditInput}
                  value={inventoryForm.quantity}
                />
                <TextInput
                  keyboardType="numeric"
                  onChangeText={(reorderLevel) => setInventoryForm((currentForm) => ({ ...currentForm, reorderLevel }))}
                  placeholder="Reorder level"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.auditInput}
                  value={inventoryForm.reorderLevel}
                />
              </View>
              <View style={styles.actions}>
                <TextInput
                  keyboardType="numeric"
                  onChangeText={(unitCost) => setInventoryForm((currentForm) => ({ ...currentForm, unitCost }))}
                  placeholder="Unit cost"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.auditInput}
                  value={inventoryForm.unitCost}
                />
                <TextInput
                  onChangeText={(supplier) => setInventoryForm((currentForm) => ({ ...currentForm, supplier }))}
                  placeholder="Supplier"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.auditInput}
                  value={inventoryForm.supplier}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={isLoading}
                onPress={saveInventoryItem}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.primaryButtonText}>Save Stock Item</Text>
              </Pressable>
              {(opsReport?.lowStockItems ?? []).length === 0 ? (
                <Text style={styles.orderItems}>No low-stock alerts right now.</Text>
              ) : (
                (opsReport?.lowStockItems ?? []).map((item) => (
                  <View key={item.id} style={styles.financeRow}>
                    <Text style={styles.financeRowTitle}>
                      {item.name} - {item.category}
                    </Text>
                    <Text style={styles.financeRowAmount}>
                      {item.quantity} {item.unit}
                    </Text>
                  </View>
                ))
              )}
            </SectionPanel>

            <SectionPanel
              accent={theme.colors.grape}
              icon="restaurant-outline"
              title="Recipe Costing & Margins"
              subtitle="Add item-level ingredient, packaging, and labor costs to understand margin quality."
            >
              <TextInput
                onChangeText={(snackName) => setRecipeCostForm((currentForm) => ({ ...currentForm, snackName }))}
                placeholder="Menu item name e.g. Bagara Rice"
                placeholderTextColor={theme.colors.muted}
                style={styles.auditInput}
                value={recipeCostForm.snackName}
              />
              <View style={styles.optionRow}>
                {snacks.slice(0, 6).map((snack) => (
                  <Pressable
                    accessibilityRole="button"
                    key={snack.id}
                    onPress={() => setRecipeCostForm((currentForm) => ({ ...currentForm, snackName: snack.name }))}
                    style={styles.financeChip}
                  >
                    <Text style={styles.financeChipText}>{snack.name}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.actions}>
                <TextInput
                  keyboardType="numeric"
                  onChangeText={(ingredientCost) => setRecipeCostForm((currentForm) => ({ ...currentForm, ingredientCost }))}
                  placeholder="Ingredient"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.auditInput}
                  value={recipeCostForm.ingredientCost}
                />
                <TextInput
                  keyboardType="numeric"
                  onChangeText={(packagingCost) => setRecipeCostForm((currentForm) => ({ ...currentForm, packagingCost }))}
                  placeholder="Packaging"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.auditInput}
                  value={recipeCostForm.packagingCost}
                />
                <TextInput
                  keyboardType="numeric"
                  onChangeText={(laborCost) => setRecipeCostForm((currentForm) => ({ ...currentForm, laborCost }))}
                  placeholder="Labor"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.auditInput}
                  value={recipeCostForm.laborCost}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={isLoading}
                onPress={saveRecipeCost}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.primaryButtonText}>Save Recipe Cost</Text>
              </Pressable>
              {(opsReport?.menuPerformance ?? []).slice(0, 8).map((item) => (
                <View key={item.snackName} style={styles.financeEntryCard}>
                  <View style={styles.orderTopRow}>
                    <Text style={styles.orderTitle}>{item.snackName}</Text>
                    <Text style={styles.orderTotal}>Rs {item.estimatedMargin}</Text>
                  </View>
                  <Text style={styles.orderItems}>
                    Sold {item.quantitySold} - Revenue Rs {item.revenue} - Cost Rs {item.estimatedCost}
                  </Text>
                </View>
              ))}
            </SectionPanel>

            <SectionPanel
              accent={theme.colors.sky}
              icon="people-outline"
              title="Staff Attendance & Pay"
              subtitle="Log staff hours and estimate salary cost from actual shifts."
            >
              <TextInput
                onChangeText={(staffName) => setStaffForm((currentForm) => ({ ...currentForm, staffName }))}
                placeholder="Staff name"
                placeholderTextColor={theme.colors.muted}
                style={styles.auditInput}
                value={staffForm.staffName}
              />
              <View style={styles.actions}>
                <TextInput
                  onChangeText={(role) => setStaffForm((currentForm) => ({ ...currentForm, role }))}
                  placeholder="Role"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.auditInput}
                  value={staffForm.role}
                />
                <TextInput
                  keyboardType="numeric"
                  onChangeText={(hours) => setStaffForm((currentForm) => ({ ...currentForm, hours }))}
                  placeholder="Hours"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.auditInput}
                  value={staffForm.hours}
                />
                <TextInput
                  keyboardType="numeric"
                  onChangeText={(hourlyRate) => setStaffForm((currentForm) => ({ ...currentForm, hourlyRate }))}
                  placeholder="Rate"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.auditInput}
                  value={staffForm.hourlyRate}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={isLoading}
                onPress={saveStaffShift}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.primaryButtonText}>Log Staff Shift</Text>
              </Pressable>
              {(opsReport?.staffCosts ?? []).length === 0 ? (
                <Text style={styles.orderItems}>No staff shifts logged for this period.</Text>
              ) : (
                (opsReport?.staffCosts ?? []).map((staff) => (
                  <View key={staff.staffName} style={styles.financeRow}>
                    <Text style={styles.financeRowTitle}>
                      {staff.staffName} - {staff.hours} hrs
                    </Text>
                    <Text style={styles.financeRowAmount}>Rs {staff.estimatedPay}</Text>
                  </View>
                ))
              )}
            </SectionPanel>

            <SectionPanel
              accent={theme.colors.leaf}
              icon="ticket-outline"
              title="Coupon Manager"
              subtitle="Create customer offers that apply automatically during checkout."
            >
              <TextInput
                autoCapitalize="characters"
                onChangeText={(code) => setCouponForm((currentForm) => ({ ...currentForm, code }))}
                placeholder="Coupon code"
                placeholderTextColor={theme.colors.muted}
                style={styles.auditInput}
                value={couponForm.code}
              />
              <TextInput
                onChangeText={(description) => setCouponForm((currentForm) => ({ ...currentForm, description }))}
                placeholder="Offer description"
                placeholderTextColor={theme.colors.muted}
                style={styles.auditInput}
                value={couponForm.description}
              />
              <View style={styles.optionRow}>
                {(["flat", "percent", "free_delivery"] as const).map((discountType) => (
                  <Pressable
                    accessibilityRole="button"
                    key={discountType}
                    onPress={() => setCouponForm((currentForm) => ({ ...currentForm, discountType }))}
                    style={[
                      styles.financeChip,
                      couponForm.discountType === discountType && styles.financeChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.financeChipText,
                        couponForm.discountType === discountType && styles.financeChipTextActive,
                      ]}
                    >
                      {discountType.replace("_", " ")}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.actions}>
                <TextInput
                  keyboardType="numeric"
                  onChangeText={(discountValue) => setCouponForm((currentForm) => ({ ...currentForm, discountValue }))}
                  placeholder="Discount"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.auditInput}
                  value={couponForm.discountValue}
                />
                <TextInput
                  keyboardType="numeric"
                  onChangeText={(minOrderValue) => setCouponForm((currentForm) => ({ ...currentForm, minOrderValue }))}
                  placeholder="Min order"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.auditInput}
                  value={couponForm.minOrderValue}
                />
                <TextInput
                  keyboardType="numeric"
                  onChangeText={(maxDiscount) => setCouponForm((currentForm) => ({ ...currentForm, maxDiscount }))}
                  placeholder="Max"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.auditInput}
                  value={couponForm.maxDiscount}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={isLoading}
                onPress={saveCoupon}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.primaryButtonText}>Create Coupon</Text>
              </Pressable>
              {(opsReport?.activeCoupons ?? []).map((coupon) => (
                <View key={coupon.id} style={styles.financeRow}>
                  <Text style={styles.financeRowTitle}>
                    {coupon.code} - {coupon.description || coupon.discountType.replace("_", " ")}
                  </Text>
                  <Text style={styles.financeRowAmount}>
                    {coupon.discountType === "percent" ? `${coupon.discountValue}%` : `Rs ${coupon.discountValue}`}
                  </Text>
                </View>
              ))}
            </SectionPanel>

            <SectionPanel
              accent={theme.colors.saffron}
              icon="trending-up-outline"
              title="Customer & Menu Insights"
              subtitle="Spot repeat customers, high-value customers, and strongest selling items."
            >
              {(opsReport?.customerInsights ?? []).slice(0, 6).map((customer) => (
                <View key={customer.customerPhone ?? customer.customerName} style={styles.financeEntryCard}>
                  <View style={styles.orderTopRow}>
                    <Text style={styles.orderTitle}>{customer.customerName}</Text>
                    <Text style={styles.orderTotal}>Rs {customer.revenue}</Text>
                  </View>
                  <Text style={styles.orderItems}>
                    {customer.orderCount} order{customer.orderCount === 1 ? "" : "s"} - {customer.customerPhone ?? "No phone"}
                  </Text>
                </View>
              ))}
              {(opsReport?.customerInsights ?? []).length === 0 ? (
                <Text style={styles.orderItems}>Customer insights will appear after orders are placed.</Text>
              ) : null}
            </SectionPanel>

            <SectionPanel
              accent={theme.colors.saffron}
              icon="bar-chart-outline"
              title="Admin Finance Report"
              subtitle="30-day revenue, expenses, salaries, collection split, and category spend."
            >
              <View style={styles.summaryGrid}>
                <View style={styles.summaryTile}>
                  <Text style={styles.summaryValue}>Rs {financeReport?.cashCollected ?? 0}</Text>
                  <Text style={styles.summaryLabel}>Cash collected</Text>
                </View>
                <View style={styles.summaryTile}>
                  <Text style={styles.summaryValue}>Rs {financeReport?.upiCollected ?? 0}</Text>
                  <Text style={styles.summaryLabel}>UPI collected</Text>
                </View>
                <View style={styles.summaryTile}>
                  <Text style={styles.summaryValue}>Rs {financeReport?.salaries ?? 0}</Text>
                  <Text style={styles.summaryLabel}>Salaries</Text>
                </View>
                <View style={styles.summaryTile}>
                  <Text style={styles.summaryValue}>{financeReport?.orderCount ?? 0}</Text>
                  <Text style={styles.summaryLabel}>Paid orders</Text>
                </View>
              </View>
              {(financeReport?.categoryTotals ?? []).map((categoryTotal) => (
                <View key={categoryTotal.category} style={styles.financeRow}>
                  <Text style={styles.financeRowTitle}>{categoryTotal.category}</Text>
                  <Text style={styles.financeRowAmount}>Rs {categoryTotal.total}</Text>
                </View>
              ))}
            </SectionPanel>

            <SectionPanel
              accent={theme.colors.sky}
              icon="list-outline"
              title="Recent Ledger"
              subtitle="Latest finance entries for audit and reconciliation."
            >
              {financeEntries.slice(0, 10).map((entry) => (
                <View key={entry.id} style={styles.financeEntryCard}>
                  <View style={styles.orderTopRow}>
                    <Text style={styles.orderTitle}>{entry.category}</Text>
                    <Text style={styles.orderTotal}>Rs {entry.amount}</Text>
                  </View>
                  <Text style={styles.orderItems}>
                    {entry.entryType.replace("_", " ")} - {entry.description}
                  </Text>
                  <Text style={styles.orderItems}>
                    {entry.paidTo ? `Party: ${entry.paidTo} - ` : ""}
                    {entry.paymentMethod ?? "Payment"}
                    {entry.serviceMonth ? ` - ${entry.serviceMonth}` : ""}
                  </Text>
                </View>
              ))}
            </SectionPanel>
          </>
        ) : (
          <SectionPanel
            accent={theme.colors.grape}
            icon="shield-checkmark-outline"
            title="Audit Trail"
            subtitle="Search order and phone activity for customer support and accountability."
          >
            <View style={styles.auditSearchRow}>
              <TextInput
                onChangeText={setAuditFilter}
                placeholder="Order # or phone"
                placeholderTextColor={theme.colors.muted}
                style={styles.auditInput}
                value={auditFilter}
              />
              <Pressable
                accessibilityRole="button"
                disabled={isLoading}
                onPress={loadAuditEvents}
                style={({ pressed }) => [styles.auditSearchButton, pressed && styles.pressed]}
              >
                <Ionicons name="search-outline" size={18} color={theme.colors.white} />
              </Pressable>
            </View>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryTile}>
                <Text style={styles.summaryValue}>{auditEvents.length}</Text>
                <Text style={styles.summaryLabel}>Events</Text>
              </View>
              <View style={styles.summaryTile}>
                <Text style={styles.summaryValue}>
                  {auditEvents.filter((event) => event.actorType === "admin").length}
                </Text>
                <Text style={styles.summaryLabel}>Admin</Text>
              </View>
            </View>

            {auditEvents.map((event) => (
              <View key={event.id} style={styles.auditCard}>
                <View style={styles.orderTopRow}>
                  <Text style={styles.auditType}>{event.eventType.replaceAll("_", " ")}</Text>
                  <Text style={styles.auditActor}>{event.actorType}</Text>
                </View>
                <Text style={styles.auditSummary}>{event.summary}</Text>
                <Text style={styles.auditMeta}>
                  {new Date(event.createdAt).toLocaleString()}
                  {event.orderId ? ` - Order #${event.orderId}` : ""}
                  {event.customerPhone ? ` - ${event.customerPhone}` : ""}
                </Text>
                {event.actorLabel ? (
                  <Text style={styles.auditMeta}>Actor: {event.actorLabel}</Text>
                ) : null}
              </View>
            ))}
          </SectionPanel>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  availabilityCopy: {
    flex: 1,
  },
  availabilityMeta: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  availabilityName: {
    color: theme.colors.charcoal,
    fontSize: 14,
    fontWeight: "900",
  },
  availabilityRow: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  auditActor: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  auditCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  auditInput: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.charcoal,
    flex: 1,
    fontSize: 14,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  auditMeta: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: theme.spacing.xs,
  },
  auditSearchButton: {
    alignItems: "center",
    backgroundColor: theme.colors.charcoal,
    borderRadius: theme.radius.sm,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  auditSearchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  auditSummary: {
    color: theme.colors.charcoal,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    marginTop: theme.spacing.xs,
  },
  auditType: {
    color: theme.colors.charcoal,
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  content: {
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  dangerButton: {
    alignItems: "center",
    backgroundColor: theme.colors.tomato,
    borderRadius: theme.radius.sm,
    flex: 1,
    paddingVertical: theme.spacing.sm,
  },
  financeChip: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  financeChipActive: {
    backgroundColor: theme.colors.leaf,
    borderColor: theme.colors.leaf,
  },
  financeChipText: {
    color: theme.colors.charcoal,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  financeChipTextActive: {
    color: theme.colors.white,
  },
  financeEntryCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  financeRow: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: theme.spacing.md,
  },
  financeRowAmount: {
    color: theme.colors.charcoal,
    fontSize: 14,
    fontWeight: "900",
  },
  financeRowTitle: {
    color: theme.colors.muted,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerStatLabel: {
    color: theme.colors.charcoal,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  headerStats: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  headerStatTile: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flex: 1,
    padding: theme.spacing.sm,
  },
  headerStatValue: {
    color: theme.colors.charcoal,
    fontSize: 18,
    fontWeight: "900",
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: theme.colors.cloud,
    borderRadius: theme.radius.sm,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  message: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  mapButton: {
    alignItems: "center",
    backgroundColor: theme.colors.sky,
    borderRadius: theme.radius.sm,
    flex: 1,
    flexDirection: "row",
    gap: theme.spacing.xs,
    justifyContent: "center",
    paddingVertical: theme.spacing.sm,
  },
  issueText: {
    color: theme.colors.tomato,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
    marginTop: theme.spacing.xs,
  },
  feedbackAlertBadge: {
    backgroundColor: "#fee2e2",
    borderRadius: theme.radius.sm,
    color: theme.colors.tomato,
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  feedbackAlertCard: {
    backgroundColor: "#fff7ed",
    borderColor: "#fed7aa",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  feedbackRatingText: {
    color: theme.colors.charcoal,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 19,
    marginTop: theme.spacing.xs,
  },
  orderCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  orderItems: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: theme.spacing.xs,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  orderMeta: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
    textTransform: "capitalize",
  },
  orderTitle: {
    color: theme.colors.charcoal,
    fontSize: 15,
    fontWeight: "900",
  },
  orderTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  orderTotal: {
    color: theme.colors.charcoal,
    fontSize: 15,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.78,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.leaf,
    borderRadius: theme.radius.sm,
    flex: 1,
    paddingVertical: theme.spacing.sm,
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  primarySmallButton: {
    alignItems: "center",
    backgroundColor: theme.colors.leaf,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  routeMetric: {
    color: theme.colors.leaf,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 19,
    marginTop: theme.spacing.xs,
  },
  routePanel: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  routeSequence: {
    color: theme.colors.grape,
    fontSize: 15,
    fontWeight: "900",
  },
  routeStopCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderLeftColor: theme.colors.sky,
    borderLeftWidth: 5,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  routeText: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  secondaryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: theme.colors.cloud,
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  secondaryButtonText: {
    color: theme.colors.charcoal,
    fontSize: 14,
    fontWeight: "800",
  },
  segmentButton: {
    alignItems: "center",
    borderRadius: theme.radius.sm,
    flex: 1,
    flexDirection: "row",
    gap: theme.spacing.xs,
    justifyContent: "center",
    paddingVertical: theme.spacing.sm,
  },
  segmentButtonActive: {
    backgroundColor: theme.colors.leaf,
  },
  segmentButtonText: {
    color: theme.colors.charcoal,
    fontSize: 14,
    fontWeight: "900",
  },
  segmentButtonTextActive: {
    color: theme.colors.white,
  },
  segmentedControl: {
    backgroundColor: theme.colors.cloud,
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    gap: theme.spacing.xs,
    padding: theme.spacing.xs,
  },
  section: {
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    color: theme.colors.charcoal,
    fontSize: 18,
    fontWeight: "900",
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 14,
    marginTop: theme.spacing.xs,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  summaryLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  summaryTile: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexBasis: "48%",
    padding: theme.spacing.md,
  },
  summaryValue: {
    color: theme.colors.charcoal,
    fontSize: 18,
    fontWeight: "900",
  },
  title: {
    color: theme.colors.charcoal,
    fontSize: 30,
    fontWeight: "900",
  },
  warningButton: {
    alignItems: "center",
    backgroundColor: theme.colors.tomato,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
});
