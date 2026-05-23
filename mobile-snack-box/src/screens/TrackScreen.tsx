import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Linking } from "react-native";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ApiError,
  KITCHEN_ADDRESS,
  cancelMyOrder,
  createOrder,
  getKitchenCameraUrl,
  getMyOrders,
  OrderHistoryItem,
  reportOrderIssue,
  submitOrderFeedback,
} from "../api/client";
import { AppHeader } from "../components/AppHeader";
import { OrderTimeline } from "../components/OrderTimeline";
import { SectionPanel } from "../components/SectionPanel";
import { useAuth } from "../context/AuthContext";
import { theme } from "../theme";

function DeliveryRouteMap({ order }: { order: OrderHistoryItem }) {
  const bikeProgress = useRef(new Animated.Value(0)).current;
  const isMoving = order.status === "out_for_delivery" || order.status === "delivery_in_progress";
  const fixedProgress =
    order.status === "received" ? "8%" : order.status === "preparing" ? "28%" : isMoving ? "70%" : "100%";

  useEffect(() => {
    if (!isMoving) {
      bikeProgress.stopAnimation();
      bikeProgress.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(bikeProgress, {
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          toValue: 1,
          useNativeDriver: false,
        }),
        Animated.timing(bikeProgress, {
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          toValue: 0.72,
          useNativeDriver: false,
        }),
      ]),
    );
    animation.start();

    return () => animation.stop();
  }, [bikeProgress, isMoving]);

  const animatedLeft = bikeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["28%", "82%"],
  });

  return (
    <View style={styles.routeMap}>
      <View style={styles.mapGridLineTop} />
      <View style={styles.mapGridLineBottom} />
      <View style={styles.mapRouteLine} />
      <View style={[styles.mapDot, styles.kitchenDot]} />
      <View style={[styles.mapDot, styles.homeDot]} />
      {isMoving ? (
        <Animated.View style={[styles.bikeMarker, { left: animatedLeft }]}>
          <Ionicons name="bicycle" size={19} color={theme.colors.white} />
        </Animated.View>
      ) : (
        <View style={[styles.bikeMarker, { left: fixedProgress }]}>
          <Ionicons name="bicycle" size={19} color={theme.colors.white} />
        </View>
      )}
      <View style={styles.mapLabelTop}>
        <Text style={styles.mapLabelTitle}>Kitchen</Text>
        <Text style={styles.mapLabelText}>{KITCHEN_ADDRESS}</Text>
      </View>
      <View style={styles.mapLabelBottom}>
        <Text style={styles.mapLabelTitle}>Your address</Text>
        <Text numberOfLines={2} style={styles.mapLabelText}>
          {order.deliveryAddress ?? "Delivery address"}
        </Text>
      </View>
    </View>
  );
}

export function TrackScreen() {
  const { accessToken, user } = useAuth();
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [repeatingOrderId, setRepeatingOrderId] = useState<number | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState<Record<number, string>>({});
  const [issueNotes, setIssueNotes] = useState<Record<number, string>>({});

  const loadOrders = async () => {
    if (!accessToken) {
      setOrders([]);
      setMessage("Sign in to track your delivery.");
      return;
    }

    setIsLoading(true);
    setMessage("Refreshing tracking...");

    try {
      const nextOrders = await getMyOrders(accessToken);
      setOrders(nextOrders);
      setMessage(nextOrders.length === 0 ? "No orders to track yet." : "");
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? `Could not load tracking. ${error.message}`
          : "Could not load tracking. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, [accessToken]);

  const repeatOrder = async (order: OrderHistoryItem) => {
    if (!accessToken) {
      setMessage("Sign in before repeating an order.");
      return;
    }

    const customerPhone = order.customerPhone?.trim() || user?.phone || "";
    const deliveryAddress = order.deliveryAddress?.trim() ?? "";

    if (customerPhone.length < 7 || deliveryAddress.length < 8) {
      setMessage("This order is missing phone or delivery address.");
      return;
    }

    setRepeatingOrderId(order.id);
    setMessage(`Repeating order #${order.id}...`);

    try {
      const repeatedOrder = await createOrder(
        order.items.map((item) => ({ snackId: item.snackId, quantity: item.quantity })),
        {
          customerName: user?.name ?? "Customer",
          customerEmail: user?.email ?? `${customerPhone}@cloudsnacks.local`,
          customerPhone,
          deliveryAddress,
          deliveryNote: order.deliveryNote ?? "",
          scheduledFor: order.scheduledFor ?? "Now",
          spiceLevel: (order.spiceLevel as "Mild" | "Medium" | "Spicy" | null) ?? "Medium",
          paymentMethod:
            (order.paymentMethod as "Cash on delivery" | "UPI on delivery" | null) ??
            "Cash on delivery",
          couponCode: order.couponCode ?? "",
        },
        accessToken,
      );
      setMessage(`Order #${repeatedOrder.id} placed again.`);
      await loadOrders();
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? `Could not repeat order. ${error.message}`
          : "Could not repeat order. Please try again.",
      );
    } finally {
      setRepeatingOrderId(null);
    }
  };

  const openKitchenCamera = async (order: OrderHistoryItem) => {
    if (!accessToken) {
      setMessage("Sign in before opening the kitchen camera.");
      return;
    }

    try {
      const cameraUrl = await getKitchenCameraUrl(order.id, accessToken);
      await Linking.openURL(cameraUrl);
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? `Could not open kitchen camera. ${error.message}`
          : "Could not open kitchen camera. Please try again.",
      );
    }
  };

  const etaForStatus = (status: string) => {
    if (status === "received") {
      return "ETA 35-45 min";
    }
    if (status === "preparing") {
      return "ETA 20-30 min";
    }
    if (status === "out_for_delivery" || status === "delivery_in_progress") {
      return "ETA 8-15 min";
    }
    return "Completed";
  };

  const isDeliveryInProgress = (status: string) =>
    status === "out_for_delivery" || status === "delivery_in_progress";

  const statusLabel = (status: string) => {
    if (isDeliveryInProgress(status)) {
      return "Delivery in progress";
    }
    return status.replaceAll("_", " ");
  };

  const openDeliveryRoute = async (order: OrderHistoryItem) => {
    if (!order.deliveryAddress) {
      setMessage("Delivery address is not available for maps.");
      return;
    }

    const url =
      `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(KITCHEN_ADDRESS)}` +
      `&destination=${encodeURIComponent(order.deliveryAddress)}` +
      "&travelmode=driving";
    try {
      await Linking.openURL(url);
    } catch {
      setMessage("Could not open delivery route map.");
    }
  };

  const updateOrder = (updatedOrder: OrderHistoryItem) => {
    setOrders((currentOrders) =>
      currentOrders.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)),
    );
  };

  const cancelOrder = async (order: OrderHistoryItem) => {
    if (!accessToken) {
      return;
    }

    setMessage(`Cancelling order #${order.id}...`);
    try {
      const updatedOrder = await cancelMyOrder(order.id, accessToken);
      updateOrder(updatedOrder);
      setMessage(`Order #${order.id} cancelled.`);
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? `Could not cancel order. ${error.message}`
          : "Could not cancel order. Please try again.",
      );
    }
  };

  const rateOrder = async (order: OrderHistoryItem, rating: number) => {
    if (!accessToken) {
      return;
    }

    setMessage(`Saving rating for order #${order.id}...`);
    try {
      const updatedOrder = await submitOrderFeedback(
        order.id,
        { rating, note: feedbackNotes[order.id] ?? "" },
        accessToken,
      );
      updateOrder(updatedOrder);
      setMessage(`Thanks for rating order #${order.id}.`);
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? `Could not save rating. ${error.message}`
          : "Could not save rating. Please try again.",
      );
    }
  };

  const reportIssue = async (order: OrderHistoryItem) => {
    if (!accessToken) {
      return;
    }

    setMessage(`Reporting issue for order #${order.id}...`);
    try {
      const updatedOrder = await reportOrderIssue(
        order.id,
        { issueType: "other", note: issueNotes[order.id] ?? "" },
        accessToken,
      );
      updateOrder(updatedOrder);
      setMessage(`Issue reported for order #${order.id}.`);
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? `Could not report issue. ${error.message}`
          : "Could not report issue. Please try again.",
      );
    }
  };

  const activeOrders = orders.filter(
    (order) => order.status !== "delivered" && order.status !== "cancelled",
  );
  const deliveredOrders = orders.filter((order) => order.status === "delivered");

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader
          colors={["#dcfce7", "#e0f2fe", "#fef3c7"]}
          eyebrow="Live delivery"
          icon="navigate-outline"
          title="Track every step"
          subtitle={user ? `Live updates for ${user.name}, including kitchen cam while preparing.` : "Sign in to see delivery updates."}
          right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh tracking"
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
              <Text style={styles.headerStatValue}>{deliveredOrders.length}</Text>
              <Text style={styles.headerStatLabel}>delivered</Text>
            </View>
          </View>
        </AppHeader>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <SectionPanel
          accent={theme.colors.leaf}
          icon="bicycle-outline"
          title="Active Deliveries"
          subtitle="Status, ETA, partner, cancel, and kitchen camera controls."
        >
        {activeOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="navigate-circle-outline" size={40} color={theme.colors.muted} />
            <Text style={styles.emptyTitle}>No active delivery</Text>
            <Text style={styles.emptyText}>Your placed orders will appear here with live status updates.</Text>
          </View>
        ) : null}
        {activeOrders.map((order) => (
          <View key={order.id} style={styles.activeOrder}>
            <Text style={styles.orderTitle}>Order #{order.id}</Text>
            <Text style={styles.orderMeta}>Status: {statusLabel(order.status)}</Text>
            <Text style={styles.etaText}>{etaForStatus(order.status)}</Text>
            <DeliveryRouteMap order={order} />
            {isDeliveryInProgress(order.status) ? (
              <View style={styles.deliveryProgressPanel}>
                <View style={styles.deliveryProgressIcon}>
                  <Ionicons name="navigate" size={20} color={theme.colors.white} />
                </View>
                <View style={styles.deliveryProgressCopy}>
                  <Text style={styles.deliveryProgressTitle}>Delivery in progress</Text>
                  <Text style={styles.deliveryProgressText}>
                    Your order is on the route. Follow the address map and keep the phone reachable.
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Track delivery route for order ${order.id}`}
                  onPress={() => openDeliveryRoute(order)}
                  style={({ pressed }) => [styles.routeButton, pressed && styles.pressed]}
                >
                  <Ionicons name="map-outline" size={17} color={theme.colors.white} />
                </Pressable>
              </View>
            ) : null}
            <OrderTimeline status={order.status} />
            <Text style={styles.orderItems}>
              {order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")}
            </Text>
            {order.deliveryAddress ? (
              <Text style={styles.orderItems}>Delivering to: {order.deliveryAddress}</Text>
            ) : null}
            <Text style={styles.orderItems}>
              Schedule: {order.scheduledFor ?? "Now"} - Spice: {order.spiceLevel ?? "Medium"}
            </Text>
            <Text style={styles.orderItems}>
              Payment: {order.paymentMethod ?? "Cash on delivery"}
              {order.discount > 0 ? ` - Saved Rs ${order.discount}` : ""}
            </Text>
            {order.deliveryPartner ? (
              <Text style={styles.orderItems}>Delivery partner: {order.deliveryPartner}</Text>
            ) : null}

            <View style={styles.orderActionRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Track delivery for order ${order.id}`}
                onPress={() => openDeliveryRoute(order)}
                style={({ pressed }) => [styles.trackButton, pressed && styles.pressed]}
              >
                <Ionicons name="navigate-outline" size={18} color={theme.colors.white} />
                <Text style={styles.actionButtonText}>Track Delivery</Text>
              </Pressable>
              {order.status === "preparing" ? (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`View live kitchen camera for order ${order.id}`}
                  onPress={() => openKitchenCamera(order)}
                  style={({ pressed }) => [styles.cameraButton, pressed && styles.pressed]}
                >
                  <Ionicons name="videocam-outline" size={18} color={theme.colors.white} />
                  <Text style={styles.cameraButtonText}>Kitchen Cam</Text>
                </Pressable>
              ) : (
                <View style={styles.cameraPendingPill}>
                  <Ionicons name="videocam-outline" size={16} color={theme.colors.muted} />
                  <Text style={styles.cameraPendingText}>
                    {order.status === "received" ? "Camera starts in preparation" : "Camera viewed during preparation"}
                  </Text>
                </View>
              )}
            </View>
            {order.status === "received" ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Cancel order ${order.id}`}
                onPress={() => cancelOrder(order)}
                style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
              >
                <Ionicons name="close-circle-outline" size={18} color={theme.colors.white} />
                <Text style={styles.actionButtonText}>Cancel Order</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        </SectionPanel>

        {deliveredOrders.length > 0 ? (
          <SectionPanel
            accent={theme.colors.grape}
            icon="checkmark-done-outline"
            title="Delivered"
            subtitle="Repeat favorites, rate orders, and report issues from one place."
          >
            {deliveredOrders.slice(0, 3).map((order) => (
              <View key={order.id} style={styles.deliveredOrder}>
                <Text style={styles.orderTitle}>Order #{order.id}</Text>
                <Text style={styles.orderItems}>
                  {order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")}
                </Text>
                {order.feedbackRating ? (
                  <Text style={styles.orderItems}>Your rating: {order.feedbackRating}/5</Text>
                ) : (
                  <View style={styles.feedbackPanel}>
                    <TextInput
                      onChangeText={(value) =>
                        setFeedbackNotes((currentNotes) => ({ ...currentNotes, [order.id]: value }))
                      }
                      placeholder="Feedback note"
                      placeholderTextColor={theme.colors.muted}
                      style={styles.input}
                      value={feedbackNotes[order.id] ?? ""}
                    />
                    <View style={styles.ratingRow}>
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <Pressable
                          accessibilityRole="button"
                          key={rating}
                          onPress={() => rateOrder(order, rating)}
                          style={({ pressed }) => [styles.ratingButton, pressed && styles.pressed]}
                        >
                          <Text style={styles.ratingText}>{rating}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
                {order.issueReport ? (
                  <Text style={styles.orderItems}>Issue: {order.issueReport}</Text>
                ) : (
                  <View style={styles.feedbackPanel}>
                    <TextInput
                      onChangeText={(value) =>
                        setIssueNotes((currentNotes) => ({ ...currentNotes, [order.id]: value }))
                      }
                      placeholder="Report an issue"
                      placeholderTextColor={theme.colors.muted}
                      style={styles.input}
                      value={issueNotes[order.id] ?? ""}
                    />
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => reportIssue(order)}
                      style={({ pressed }) => [styles.issueButton, pressed && styles.pressed]}
                    >
                      <Ionicons name="alert-circle-outline" size={18} color={theme.colors.white} />
                      <Text style={styles.actionButtonText}>Report Issue</Text>
                    </Pressable>
                  </View>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Repeat order ${order.id}`}
                  disabled={repeatingOrderId === order.id}
                  onPress={() => repeatOrder(order)}
                  style={({ pressed }) => [
                    styles.repeatButton,
                    repeatingOrderId === order.id && styles.disabledButton,
                    pressed && repeatingOrderId !== order.id && styles.pressed,
                  ]}
                >
                  <Ionicons name="repeat-outline" size={18} color={theme.colors.white} />
                  <Text style={styles.repeatButtonText}>
                    {repeatingOrderId === order.id ? "Repeating" : "Repeat"}
                  </Text>
                </Pressable>
              </View>
            ))}
          </SectionPanel>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  activeOrder: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  content: {
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  cameraButton: {
    alignItems: "center",
    backgroundColor: theme.colors.sky,
    borderRadius: theme.radius.sm,
    flex: 1,
    flexDirection: "row",
    gap: theme.spacing.xs,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  cameraButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  actionButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  cancelButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: theme.colors.tomato,
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  bikeMarker: {
    alignItems: "center",
    backgroundColor: theme.colors.grape,
    borderColor: theme.colors.white,
    borderRadius: 18,
    borderWidth: 2,
    height: 36,
    justifyContent: "center",
    position: "absolute",
    top: 59,
    width: 36,
    zIndex: 5,
  },
  cameraPendingPill: {
    alignItems: "center",
    backgroundColor: theme.colors.cloud,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: theme.spacing.xs,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  cameraPendingText: {
    color: theme.colors.muted,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
  },
  deliveredOrder: {
    backgroundColor: theme.colors.cloud,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
  },
  deliveryProgressCopy: {
    flex: 1,
  },
  deliveryProgressIcon: {
    alignItems: "center",
    backgroundColor: theme.colors.leaf,
    borderRadius: theme.radius.sm,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  deliveryProgressPanel: {
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    borderColor: "#bbf7d0",
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
  },
  deliveryProgressText: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  deliveryProgressTitle: {
    color: theme.colors.charcoal,
    fontSize: 14,
    fontWeight: "900",
  },
  disabledButton: {
    backgroundColor: "#9ca3af",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  etaText: {
    color: theme.colors.leaf,
    fontSize: 13,
    fontWeight: "900",
    marginTop: theme.spacing.xs,
  },
  feedbackPanel: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: theme.colors.cloud,
    borderRadius: theme.radius.sm,
    gap: theme.spacing.xs,
    padding: theme.spacing.lg,
  },
  emptyText: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  emptyTitle: {
    color: theme.colors.charcoal,
    fontSize: 16,
    fontWeight: "900",
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
  input: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.charcoal,
    fontSize: 14,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  issueButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: theme.colors.tomato,
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  message: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  homeDot: {
    backgroundColor: theme.colors.tomato,
    right: "9%",
    top: 72,
  },
  kitchenDot: {
    backgroundColor: theme.colors.leaf,
    left: "10%",
    top: 72,
  },
  mapDot: {
    borderColor: theme.colors.white,
    borderRadius: 9,
    borderWidth: 3,
    height: 18,
    position: "absolute",
    width: 18,
    zIndex: 4,
  },
  mapGridLineBottom: {
    backgroundColor: "rgba(2, 132, 199, 0.13)",
    height: 2,
    left: "8%",
    position: "absolute",
    right: "8%",
    top: 122,
  },
  mapGridLineTop: {
    backgroundColor: "rgba(21, 153, 87, 0.13)",
    height: 2,
    left: "8%",
    position: "absolute",
    right: "8%",
    top: 34,
  },
  mapLabelBottom: {
    bottom: theme.spacing.sm,
    maxWidth: "47%",
    position: "absolute",
    right: theme.spacing.sm,
  },
  mapLabelText: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
  },
  mapLabelTitle: {
    color: theme.colors.charcoal,
    fontSize: 12,
    fontWeight: "900",
  },
  mapLabelTop: {
    left: theme.spacing.sm,
    maxWidth: "48%",
    position: "absolute",
    top: theme.spacing.sm,
  },
  mapRouteLine: {
    backgroundColor: theme.colors.saffron,
    borderRadius: 7,
    height: 7,
    left: "14%",
    position: "absolute",
    right: "14%",
    top: 77,
  },
  orderActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  orderItems: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: theme.spacing.sm,
  },
  orderMeta: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: "800",
    marginTop: theme.spacing.xs,
    textTransform: "capitalize",
  },
  orderTitle: {
    color: theme.colors.charcoal,
    fontSize: 17,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.78,
  },
  repeatButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: theme.colors.leaf,
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  ratingButton: {
    alignItems: "center",
    backgroundColor: theme.colors.cloud,
    borderRadius: theme.radius.sm,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  ratingRow: {
    flexDirection: "row",
    gap: theme.spacing.xs,
  },
  ratingText: {
    color: theme.colors.charcoal,
    fontSize: 14,
    fontWeight: "900",
  },
  repeatButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  routeButton: {
    alignItems: "center",
    backgroundColor: theme.colors.sky,
    borderRadius: theme.radius.sm,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  routeMap: {
    backgroundColor: "#f8fafc",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    height: 168,
    marginTop: theme.spacing.md,
    overflow: "hidden",
    position: "relative",
  },
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
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
  title: {
    color: theme.colors.charcoal,
    fontSize: 30,
    fontWeight: "900",
  },
  trackButton: {
    alignItems: "center",
    backgroundColor: theme.colors.leaf,
    borderRadius: theme.radius.sm,
    flex: 1,
    flexDirection: "row",
    gap: theme.spacing.xs,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
});
