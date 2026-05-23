import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError, CheckoutDetails, OrderHistoryItem, createOrder } from "../api/client";
import { AppHeader } from "../components/AppHeader";
import { SectionPanel } from "../components/SectionPanel";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useVoiceCommand } from "../context/VoiceCommandContext";
import { theme } from "../theme";

const SAVED_ADDRESSES_KEY = "cloudsnacks.savedAddresses";
const DEFAULT_PAYMENT_KEY = "cloudsnacks.defaultPayment";
const DEFAULT_SPICE_KEY = "cloudsnacks.defaultSpice";

export function CartScreen() {
  const { clearCart, decreaseSnack, items, subtotal, totalItems, addSnack } = useCart();
  const { accessToken, user } = useAuth();
  const { cartIntent } = useVoiceCommand();
  const [orderMessage, setOrderMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastOrder, setLastOrder] = useState<OrderHistoryItem | null>(null);
  const [checkoutDetails, setCheckoutDetails] = useState<CheckoutDetails>({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    deliveryAddress: "",
    deliveryNote: "",
    scheduledFor: "Now",
    spiceLevel: "Medium",
    paymentMethod: "Cash on delivery",
    couponCode: "",
  });
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);
  const scheduleOptions: CheckoutDetails["scheduledFor"][] = ["Now", "Lunch", "Evening snack", "Dinner"];
  const spiceOptions: CheckoutDetails["spiceLevel"][] = ["Mild", "Medium", "Spicy"];
  const paymentOptions: CheckoutDetails["paymentMethod"][] = ["Cash on delivery", "UPI on delivery"];
  const couponOptions = ["FIRST50", "COMBO20", "FREESHIP"];
  const discount =
    checkoutDetails.couponCode === "FIRST50"
      ? Math.min(50, subtotal)
      : checkoutDetails.couponCode === "COMBO20" && totalItems >= 2
        ? Math.min(20, subtotal)
        : 0;
  const deliveryFee = totalItems > 0 && checkoutDetails.couponCode !== "FREESHIP" ? 29 : 0;
  const total = Math.max(subtotal + deliveryFee - discount, 0);

  useEffect(() => {
    if (user) {
      setCheckoutDetails((currentDetails) => ({
        ...currentDetails,
          customerName: currentDetails.customerName || user.name,
          customerEmail: currentDetails.customerEmail || user.email,
          customerPhone: currentDetails.customerPhone || user.phone || "",
          scheduledFor: currentDetails.scheduledFor || "Now",
          spiceLevel: currentDetails.spiceLevel || "Medium",
      }));
    }
  }, [user]);

  useEffect(() => {
    async function loadCustomerDefaults() {
      try {
        const [addresses, paymentMethod, spiceLevel] = await Promise.all([
          AsyncStorage.getItem(SAVED_ADDRESSES_KEY),
          AsyncStorage.getItem(DEFAULT_PAYMENT_KEY),
          AsyncStorage.getItem(DEFAULT_SPICE_KEY),
        ]);
        const parsedAddresses = addresses ? (JSON.parse(addresses) as string[]) : [];
        setSavedAddresses(parsedAddresses);
        setCheckoutDetails((currentDetails) => ({
          ...currentDetails,
          deliveryAddress: currentDetails.deliveryAddress || parsedAddresses[0] || "",
          paymentMethod:
            paymentMethod === "UPI on delivery" || paymentMethod === "Cash on delivery"
              ? paymentMethod
              : currentDetails.paymentMethod,
          spiceLevel:
            spiceLevel === "Mild" || spiceLevel === "Medium" || spiceLevel === "Spicy"
              ? spiceLevel
              : currentDetails.spiceLevel,
        }));
      } catch {
        setSavedAddresses([]);
      }
    }

    void loadCustomerDefaults();
  }, []);

  const updateCheckoutDetails = (key: keyof CheckoutDetails, value: string) => {
    setCheckoutDetails((currentDetails) => ({ ...currentDetails, [key]: value }));
    if (key === "paymentMethod") {
      void AsyncStorage.setItem(DEFAULT_PAYMENT_KEY, value);
    }
    if (key === "spiceLevel") {
      void AsyncStorage.setItem(DEFAULT_SPICE_KEY, value);
    }
  };

  const saveCurrentAddress = async () => {
    const address = checkoutDetails.deliveryAddress.trim();
    if (address.length < 8) {
      setOrderMessage("Enter a full delivery address before saving it.");
      return;
    }

    const nextAddresses = [address, ...savedAddresses.filter((savedAddress) => savedAddress !== address)].slice(0, 4);
    setSavedAddresses(nextAddresses);
    await AsyncStorage.setItem(SAVED_ADDRESSES_KEY, JSON.stringify(nextAddresses));
    setOrderMessage("Address saved for faster checkout.");
  };

  const placeOrder = async () => {
    const apiItems = items
      .filter((item) => typeof item.snack.id === "number")
      .map((item) => ({ snackId: Number(item.snack.id), quantity: item.quantity }));

    if (apiItems.length !== items.length) {
      setOrderMessage("Refresh the menu before placing this order.");
      return;
    }

    const customerPhone = checkoutDetails.customerPhone.trim();
    const customerEmail =
      checkoutDetails.customerEmail.trim() || `${customerPhone || "customer"}@cloudsnackbox.local`;

    if (
      checkoutDetails.customerName.trim().length < 1 ||
      customerPhone.length < 7 ||
      checkoutDetails.deliveryAddress.trim().length < 8
    ) {
      setOrderMessage("Add name, phone, and full delivery address before placing order.");
      return;
    }

    setIsSubmitting(true);
    setOrderMessage("Placing order...");

    try {
      const order = await createOrder(
        apiItems,
        {
          customerName: checkoutDetails.customerName.trim(),
          customerEmail,
          customerPhone,
          deliveryAddress: checkoutDetails.deliveryAddress.trim(),
          deliveryNote: checkoutDetails.deliveryNote.trim(),
          scheduledFor: checkoutDetails.scheduledFor,
          spiceLevel: checkoutDetails.spiceLevel,
          paymentMethod: checkoutDetails.paymentMethod,
          couponCode: checkoutDetails.couponCode,
        },
        accessToken,
      );
      clearCart();
      setLastOrder(order);
      setOrderMessage(
        `Order #${order.id} received${user ? ` for ${user.name}` : ""}. Total: Rs ${order.total}`,
      );
    } catch (error) {
      setOrderMessage(
        error instanceof ApiError
          ? `Could not place order. ${error.message}`
          : "Could not place order. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!cartIntent) {
      return;
    }

    if (cartIntent.type === "coupon" && cartIntent.value) {
      updateCheckoutDetails("couponCode", cartIntent.value);
      setOrderMessage(`${cartIntent.value} applied from voice command.`);
    }
    if (cartIntent.type === "spice" && (cartIntent.value === "Mild" || cartIntent.value === "Medium" || cartIntent.value === "Spicy")) {
      updateCheckoutDetails("spiceLevel", cartIntent.value);
      setOrderMessage(`${cartIntent.value} spice selected from voice command.`);
    }
    if (
      cartIntent.type === "payment" &&
      (cartIntent.value === "Cash on delivery" || cartIntent.value === "UPI on delivery")
    ) {
      updateCheckoutDetails("paymentMethod", cartIntent.value);
      setOrderMessage(`${cartIntent.value} selected from voice command.`);
    }
    if (cartIntent.type === "schedule" && cartIntent.value) {
      updateCheckoutDetails("scheduledFor", cartIntent.value);
      setOrderMessage(`${cartIntent.value} schedule selected from voice command.`);
    }
    if (cartIntent.type === "clearCart") {
      clearCart();
      setOrderMessage("Cart cleared from voice command.");
    }
    if (cartIntent.type === "placeOrder") {
      void placeOrder();
    }
  }, [cartIntent?.id]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          colors={["#fef3c7", "#dcfce7", "#dbeafe"]}
          eyebrow="Checkout"
          icon="bag-handle-outline"
          title="Your subscription box"
          subtitle={
            totalItems > 0
              ? `${totalItems} box${totalItems === 1 ? "" : "es"} selected. Add address, offers, and payment in one clean flow.`
              : "Add age-wise subscription boxes and finish checkout here."
          }
        >
          <View style={styles.headerStats}>
            <View style={styles.headerStatTile}>
              <Text style={styles.headerStatValue}>Rs {subtotal}</Text>
              <Text style={styles.headerStatLabel}>subtotal</Text>
            </View>
            <View style={styles.headerStatTile}>
              <Text style={styles.headerStatValue}>Rs {deliveryFee}</Text>
              <Text style={styles.headerStatLabel}>delivery</Text>
            </View>
            <View style={styles.headerStatTile}>
              <Text style={styles.headerStatValue}>Rs {total}</Text>
              <Text style={styles.headerStatLabel}>total</Text>
            </View>
          </View>
        </AppHeader>

        {lastOrder ? (
          <View style={styles.confirmationPanel}>
            <View style={styles.confirmationIcon}>
              <Ionicons name="checkmark" size={24} color={theme.colors.white} />
            </View>
            <View style={styles.confirmationCopy}>
              <Text style={styles.confirmationTitle}>Order #{lastOrder.id} confirmed</Text>
              <Text style={styles.confirmationText}>
                Status: {lastOrder.status}. We will deliver to {lastOrder.deliveryAddress}.
              </Text>
            </View>
          </View>
        ) : null}

        <SectionPanel
          accent={theme.colors.saffron}
          icon="restaurant-outline"
          title="Selected Boxes"
          subtitle="Adjust subscription quantities before placing the order."
        >
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bag-handle-outline" size={42} color={theme.colors.muted} />
            <Text style={styles.emptyTitle}>No boxes yet</Text>
            <Text style={styles.emptyText}>Add a subscription box and it will appear here.</Text>
          </View>
        ) : (
          <View style={styles.cartList}>
            {items.map((item) => (
              <View key={item.snack.id} style={styles.cartItem}>
                <View style={[styles.itemMark, { backgroundColor: item.snack.accent }]} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.snack.name}</Text>
                  <Text style={styles.itemPrice}>Rs {item.snack.price} each</Text>
                </View>
                <View style={styles.quantityControls}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove one ${item.snack.name}`}
                    onPress={() => decreaseSnack(item.snack.id)}
                    style={styles.iconButton}
                  >
                    <Ionicons name="remove" size={18} color={theme.colors.charcoal} />
                  </Pressable>
                  <Text style={styles.quantity}>{item.quantity}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Add one ${item.snack.name}`}
                    onPress={() => addSnack(item.snack)}
                    style={styles.iconButton}
                  >
                    <Ionicons name="add" size={18} color={theme.colors.charcoal} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
        </SectionPanel>

        <SectionPanel
          accent={theme.colors.sky}
          icon="location-outline"
          title="Delivery Details"
          subtitle="Saved address, schedule, spice, and payment stay neatly together."
        >
          <TextInput
            autoCapitalize="words"
            onChangeText={(value) => updateCheckoutDetails("customerName", value)}
            placeholder="Name"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
            value={checkoutDetails.customerName}
          />
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={(value) => updateCheckoutDetails("customerEmail", value)}
            placeholder="Email (optional)"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
            value={checkoutDetails.customerEmail}
          />
          <TextInput
            keyboardType="phone-pad"
            onChangeText={(value) => updateCheckoutDetails("customerPhone", value)}
            placeholder="Phone"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
            value={checkoutDetails.customerPhone}
          />
          <TextInput
            multiline
            onChangeText={(value) => updateCheckoutDetails("deliveryAddress", value)}
            placeholder="Delivery address"
            placeholderTextColor={theme.colors.muted}
            style={[styles.input, styles.multilineInput]}
            value={checkoutDetails.deliveryAddress}
          />
          {savedAddresses.length > 0 ? (
            <>
              <Text style={styles.optionLabel}>Saved addresses</Text>
              <View style={styles.optionRow}>
                {savedAddresses.map((address, index) => (
                  <Pressable
                    accessibilityRole="button"
                    key={`${address}-${index}`}
                    onPress={() => updateCheckoutDetails("deliveryAddress", address)}
                    style={styles.addressChip}
                  >
                    <Ionicons name="location-outline" size={14} color={theme.colors.muted} />
                    <Text style={styles.addressText}>{address}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={saveCurrentAddress}
            style={({ pressed }) => [styles.saveAddressButton, pressed && styles.pressed]}
          >
            <Ionicons name="bookmark-outline" size={18} color={theme.colors.charcoal} />
            <Text style={styles.saveAddressText}>Save Address</Text>
          </Pressable>
          <Text style={styles.optionLabel}>Schedule</Text>
          <View style={styles.optionRow}>
            {scheduleOptions.map((option) => (
              <Pressable
                accessibilityRole="button"
                key={option}
                onPress={() => updateCheckoutDetails("scheduledFor", option)}
                style={[
                  styles.optionChip,
                  checkoutDetails.scheduledFor === option && styles.activeOptionChip,
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    checkoutDetails.scheduledFor === option && styles.activeOptionText,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.optionLabel}>Spice level</Text>
          <View style={styles.optionRow}>
            {spiceOptions.map((option) => (
              <Pressable
                accessibilityRole="button"
                key={option}
                onPress={() => updateCheckoutDetails("spiceLevel", option)}
                style={[
                  styles.optionChip,
                  checkoutDetails.spiceLevel === option && styles.activeOptionChip,
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    checkoutDetails.spiceLevel === option && styles.activeOptionText,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.optionLabel}>Payment</Text>
          <View style={styles.optionRow}>
            {paymentOptions.map((option) => (
              <Pressable
                accessibilityRole="button"
                key={option}
                onPress={() => updateCheckoutDetails("paymentMethod", option)}
                style={[
                  styles.optionChip,
                  checkoutDetails.paymentMethod === option && styles.activeOptionChip,
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    checkoutDetails.paymentMethod === option && styles.activeOptionText,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            multiline
            onChangeText={(value) => updateCheckoutDetails("deliveryNote", value)}
            placeholder="Delivery note, item note, gate code, landmark"
            placeholderTextColor={theme.colors.muted}
            style={[styles.input, styles.multilineInput]}
            value={checkoutDetails.deliveryNote}
          />
        </SectionPanel>

        <SectionPanel
          accent={theme.colors.grape}
          icon="pricetag-outline"
          title="Offers"
          subtitle="Apply one of the available test coupons."
        >
          <View style={styles.optionRow}>
            {couponOptions.map((coupon) => (
              <Pressable
                accessibilityRole="button"
                key={coupon}
                onPress={() =>
                  updateCheckoutDetails("couponCode", checkoutDetails.couponCode === coupon ? "" : coupon)
                }
                style={[
                  styles.optionChip,
                  checkoutDetails.couponCode === coupon && styles.activeOptionChip,
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    checkoutDetails.couponCode === coupon && styles.activeOptionText,
                  ]}
                >
                  {coupon}
                </Text>
              </Pressable>
            ))}
          </View>
          {checkoutDetails.couponCode ? (
            <Text style={styles.orderMessage}>
              {checkoutDetails.couponCode === "FREESHIP"
                ? "Free delivery applied."
                : discount > 0
                  ? `Discount applied: Rs ${discount}`
                  : "Add one more item for this coupon."}
            </Text>
          ) : null}
        </SectionPanel>

        <SectionPanel accent={theme.colors.leaf} icon="receipt-outline" title="Bill Summary">
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>Rs {subtotal}</Text>
          </View>
          {discount > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount</Text>
              <Text style={styles.summaryValue}>- Rs {discount}</Text>
            </View>
          ) : null}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery</Text>
            <Text style={styles.summaryValue}>Rs {deliveryFee}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>Rs {total}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Place order"
            disabled={items.length === 0 || isSubmitting}
            onPress={placeOrder}
            style={({ pressed }) => [
              styles.checkoutButton,
              (items.length === 0 || isSubmitting) && styles.disabledButton,
              pressed && items.length > 0 && styles.pressed,
            ]}
          >
            <Ionicons name="card-outline" size={20} color={theme.colors.white} />
            <Text style={styles.checkoutText}>{isSubmitting ? "Placing Order" : "Place Order"}</Text>
          </Pressable>
          {orderMessage ? <Text style={styles.orderMessage}>{orderMessage}</Text> : null}
          {items.length > 0 ? (
            <Pressable accessibilityRole="button" onPress={clearCart} style={styles.clearButton}>
              <Text style={styles.clearText}>Clear cart</Text>
            </Pressable>
          ) : null}
        </SectionPanel>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  activeOptionChip: {
    backgroundColor: theme.colors.leaf,
    borderColor: theme.colors.leaf,
  },
  activeOptionText: {
    color: theme.colors.white,
  },
  addressChip: {
    alignItems: "center",
    backgroundColor: theme.colors.cloud,
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    gap: 4,
    maxWidth: "100%",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  addressText: {
    color: theme.colors.muted,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  cartItem: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  cartList: {
    gap: theme.spacing.sm,
  },
  checkoutButton: {
    alignItems: "center",
    backgroundColor: theme.colors.leaf,
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    gap: theme.spacing.xs,
    justifyContent: "center",
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  checkoutText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: "800",
  },
  confirmationCopy: {
    flex: 1,
  },
  confirmationIcon: {
    alignItems: "center",
    backgroundColor: theme.colors.leaf,
    borderRadius: theme.radius.sm,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  confirmationPanel: {
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    borderColor: "#bbf7d0",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  confirmationText: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  confirmationTitle: {
    color: theme.colors.charcoal,
    fontSize: 17,
    fontWeight: "900",
  },
  clearButton: {
    alignItems: "center",
    paddingTop: theme.spacing.md,
  },
  clearText: {
    color: theme.colors.tomato,
    fontSize: 14,
    fontWeight: "800",
  },
  content: {
    gap: theme.spacing.lg,
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
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
    fontSize: 17,
    fontWeight: "900",
  },
  disabledButton: {
    backgroundColor: "#9ca3af",
  },
  divider: {
    backgroundColor: theme.colors.border,
    height: 1,
    marginVertical: theme.spacing.sm,
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.xl,
  },
  emptyText: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  emptyTitle: {
    color: theme.colors.charcoal,
    fontSize: 18,
    fontWeight: "900",
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: theme.colors.cloud,
    borderRadius: theme.radius.sm,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  itemInfo: {
    flex: 1,
  },
  itemMark: {
    borderRadius: theme.radius.sm,
    height: 42,
    width: 42,
  },
  itemName: {
    color: theme.colors.charcoal,
    fontSize: 15,
    fontWeight: "800",
  },
  input: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.charcoal,
    fontSize: 15,
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  itemPrice: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  orderMessage: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: theme.spacing.md,
    textAlign: "center",
  },
  multilineInput: {
    minHeight: 82,
    textAlignVertical: "top",
  },
  optionChip: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  optionLabel: {
    color: theme.colors.charcoal,
    fontSize: 14,
    fontWeight: "900",
    marginTop: theme.spacing.md,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  optionText: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: "800",
  },
  panelTitle: {
    color: theme.colors.charcoal,
    fontSize: 17,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.78,
  },
  quantity: {
    color: theme.colors.charcoal,
    fontSize: 16,
    fontWeight: "900",
    minWidth: 22,
    textAlign: "center",
  },
  quantityControls: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.xs,
  },
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  saveAddressButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: theme.colors.cloud,
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  saveAddressText: {
    color: theme.colors.charcoal,
    fontSize: 14,
    fontWeight: "800",
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 14,
    marginTop: theme.spacing.xs,
  },
  summary: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  summaryLabel: {
    color: theme.colors.muted,
    fontSize: 15,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.xs,
  },
  summaryValue: {
    color: theme.colors.charcoal,
    fontSize: 15,
    fontWeight: "700",
  },
  title: {
    color: theme.colors.charcoal,
    fontSize: 30,
    fontWeight: "900",
  },
  totalLabel: {
    color: theme.colors.charcoal,
    fontSize: 18,
    fontWeight: "900",
  },
  totalValue: {
    color: theme.colors.charcoal,
    fontSize: 18,
    fontWeight: "900",
  },
});
