import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Asset } from "expo-asset";
import { useEffect, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ApiError,
  KITCHEN_ADDRESS,
  createOrder,
  getKitchenCameraUrl,
  getMyOrders,
  OrderHistoryItem,
  requestOtp,
} from "../api/client";
import { AppHeader } from "../components/AppHeader";
import { OrderTimeline } from "../components/OrderTimeline";
import { SectionPanel } from "../components/SectionPanel";
import { useAuth } from "../context/AuthContext";
import { useVoiceCommand, type AccountMenuSection } from "../context/VoiceCommandContext";
import { theme } from "../theme";

type AuthMode = "login" | "register" | "forgot";

const SAVED_ADDRESSES_KEY = "cloudsnacks.savedAddresses";
const DEFAULT_PAYMENT_KEY = "cloudsnacks.defaultPayment";
const DEFAULT_SPICE_KEY = "cloudsnacks.defaultSpice";
const CONTACTLESS_DELIVERY_KEY = "cloudsnacks.contactlessDelivery";
const ORDER_UPDATES_KEY = "cloudsnacks.orderUpdates";
const SHOW_DEV_OTP = process.env.EXPO_PUBLIC_SHOW_DEV_OTP === "true";

export function AccountScreen() {
  const {
    accessToken,
    isLoading,
    resetPinWithOtp,
    signInWithPin,
    signOut,
    signUpWithOtp,
    user,
  } = useAuth();
  const { accountSection, setAccountSection } = useVoiceCommand();
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [pin, setPin] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [ordersMessage, setOrdersMessage] = useState("");
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [repeatingOrderId, setRepeatingOrderId] = useState<number | null>(null);
  const [activeCustomerMenu, setActiveCustomerMenu] = useState<AccountMenuSection>("preferences");
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);
  const [newAddress, setNewAddress] = useState("");
  const [defaultSpice, setDefaultSpice] = useState<"Mild" | "Medium" | "Spicy">("Medium");
  const [defaultPayment, setDefaultPayment] = useState<"Cash on delivery" | "UPI on delivery">("Cash on delivery");
  const [contactlessDelivery, setContactlessDelivery] = useState(false);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [customerMenuMessage, setCustomerMenuMessage] = useState("");

  const requestAuthOtp = async () => {
    if (phone.trim().length < 7) {
      setAuthMessage("Enter your mobile number first.");
      return;
    }

    setIsRequestingOtp(true);
    setGeneratedOtp("");
    setAuthMessage("Generating OTP...");

    try {
      const response = await requestOtp({
        phone,
        purpose: mode === "forgot" ? "reset_pin" : "register",
      });
      setPhone(response.phone);
      if (response.devOtp && SHOW_DEV_OTP) {
        setOtp(response.devOtp);
        setGeneratedOtp(response.devOtp);
      } else {
        setOtp("");
        setGeneratedOtp("");
      }
      setAuthMessage(
        response.deliveryChannel === "dev"
          ? SHOW_DEV_OTP
            ? "Testing OTP ready. Enter the code shown below."
            : "OTP is enabled in testing mode. Please use the test code shared by Cloud Snacks."
          : response.message,
      );
    } catch (error) {
      setAuthMessage(
        error instanceof ApiError
          ? `Could not send OTP. ${error.message}`
          : "Could not send OTP. Please try again.",
      );
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const submitAuth = async () => {
    if (phone.trim().length < 7) {
      setAuthMessage("Enter a valid mobile number.");
      return;
    }

    if (pin.trim().length < 4) {
      setAuthMessage("PIN must be 4 to 6 digits.");
      return;
    }

    if (mode !== "login" && otp.trim().length < 4) {
      setAuthMessage("Generate OTP first, then create/reset your PIN.");
      return;
    }

    setIsSubmitting(true);
    setAuthMessage(
      mode === "register" ? "Creating account..." : mode === "forgot" ? "Resetting PIN..." : "Signing in...",
    );

    try {
      if (mode === "register") {
        await signUpWithOtp(name, phone, otp, pin);
      } else if (mode === "forgot") {
        await resetPinWithOtp(phone, otp, pin);
      } else {
        await signInWithPin(phone, pin);
      }

      setName("");
      setOtp("");
      setGeneratedOtp("");
      setPin("");
      setAuthMessage("");
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : "Please try again.";
      setAuthMessage(
        mode === "register"
          ? `Could not create account. ${errorMessage}`
          : mode === "forgot"
            ? `Could not reset PIN. ${errorMessage}`
            : `Could not sign in. ${errorMessage}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadOrders = async () => {
    if (!accessToken) {
      setOrders([]);
      setOrdersMessage("");
      return;
    }

    setIsLoadingOrders(true);
    setOrdersMessage("Loading orders...");

    try {
      const nextOrders = await getMyOrders(accessToken);
      setOrders(nextOrders);
      setOrdersMessage(nextOrders.length === 0 ? "No orders yet." : "");
    } catch (error) {
      setOrdersMessage(
        error instanceof ApiError
          ? `Could not load orders. ${error.message}`
          : "Could not load orders. Please try again.",
      );
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const repeatOrder = async (order: OrderHistoryItem) => {
    if (!accessToken) {
      setOrdersMessage("Sign in before repeating an order.");
      return;
    }

    const deliveryAddress = order.deliveryAddress?.trim() ?? "";
    const customerPhone = order.customerPhone?.trim() || user?.phone || phone;

    if (deliveryAddress.length < 8 || customerPhone.trim().length < 7) {
      setOrdersMessage("This past order is missing phone or delivery address.");
      return;
    }

    setRepeatingOrderId(order.id);
    setOrdersMessage(`Repeating order #${order.id}...`);

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
      setOrdersMessage(`Order #${repeatedOrder.id} placed again.`);
      await loadOrders();
    } catch (error) {
      setOrdersMessage(
        error instanceof ApiError
          ? `Could not repeat order. ${error.message}`
          : "Could not repeat order. Please try again.",
      );
    } finally {
      setRepeatingOrderId(null);
    }
  };

  const openOrderDeliveryRoute = async (order: OrderHistoryItem) => {
    if (!order.deliveryAddress) {
      setOrdersMessage("This order does not have a delivery address to track.");
      return;
    }

    const url =
      `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(KITCHEN_ADDRESS)}` +
      `&destination=${encodeURIComponent(order.deliveryAddress)}` +
      "&travelmode=driving";
    try {
      await Linking.openURL(url);
    } catch {
      setOrdersMessage("Could not open delivery route map.");
    }
  };

  const openOrderKitchenCamera = async (order: OrderHistoryItem) => {
    if (!accessToken) {
      setOrdersMessage("Sign in before opening the kitchen camera.");
      return;
    }

    try {
      const cameraUrl = await getKitchenCameraUrl(order.id, accessToken);
      await Linking.openURL(cameraUrl);
    } catch (error) {
      setOrdersMessage(
        error instanceof ApiError
          ? `Could not open kitchen camera. ${error.message}`
          : "Could not open kitchen camera. Please try again.",
      );
    }
  };

  const loadCustomerSettings = async () => {
    try {
      const [addresses, spice, payment, contactless, updates] = await Promise.all([
        AsyncStorage.getItem(SAVED_ADDRESSES_KEY),
        AsyncStorage.getItem(DEFAULT_SPICE_KEY),
        AsyncStorage.getItem(DEFAULT_PAYMENT_KEY),
        AsyncStorage.getItem(CONTACTLESS_DELIVERY_KEY),
        AsyncStorage.getItem(ORDER_UPDATES_KEY),
      ]);
      setSavedAddresses(addresses ? (JSON.parse(addresses) as string[]) : []);
      if (spice === "Mild" || spice === "Medium" || spice === "Spicy") {
        setDefaultSpice(spice);
      }
      if (payment === "Cash on delivery" || payment === "UPI on delivery") {
        setDefaultPayment(payment);
      }
      setContactlessDelivery(contactless === "true");
      setOrderUpdates(updates !== "false");
    } catch {
      setCustomerMenuMessage("Could not load saved customer settings.");
    }
  };

  const saveDefaultSpice = async (spice: "Mild" | "Medium" | "Spicy") => {
    setDefaultSpice(spice);
    await AsyncStorage.setItem(DEFAULT_SPICE_KEY, spice);
    setCustomerMenuMessage(`Default spice set to ${spice}.`);
  };

  const saveDefaultPayment = async (payment: "Cash on delivery" | "UPI on delivery") => {
    setDefaultPayment(payment);
    await AsyncStorage.setItem(DEFAULT_PAYMENT_KEY, payment);
    setCustomerMenuMessage(`Default payment set to ${payment}.`);
  };

  const toggleContactlessDelivery = async (value: boolean) => {
    setContactlessDelivery(value);
    await AsyncStorage.setItem(CONTACTLESS_DELIVERY_KEY, String(value));
    setCustomerMenuMessage(value ? "Contactless delivery preference enabled." : "Contactless delivery preference disabled.");
  };

  const toggleOrderUpdates = async (value: boolean) => {
    setOrderUpdates(value);
    await AsyncStorage.setItem(ORDER_UPDATES_KEY, String(value));
    setCustomerMenuMessage(value ? "Order updates enabled." : "Order updates disabled.");
  };

  const addSavedAddress = async () => {
    const address = newAddress.trim();
    if (address.length < 8) {
      setCustomerMenuMessage("Enter a complete address before saving.");
      return;
    }

    const nextAddresses = [address, ...savedAddresses.filter((savedAddress) => savedAddress !== address)].slice(0, 6);
    setSavedAddresses(nextAddresses);
    setNewAddress("");
    await AsyncStorage.setItem(SAVED_ADDRESSES_KEY, JSON.stringify(nextAddresses));
    setCustomerMenuMessage("Address saved and set as default for checkout.");
  };

  const makeDefaultAddress = async (address: string) => {
    const nextAddresses = [address, ...savedAddresses.filter((savedAddress) => savedAddress !== address)];
    setSavedAddresses(nextAddresses);
    await AsyncStorage.setItem(SAVED_ADDRESSES_KEY, JSON.stringify(nextAddresses));
    setCustomerMenuMessage("Default delivery address updated.");
  };

  const removeSavedAddress = async (address: string) => {
    const nextAddresses = savedAddresses.filter((savedAddress) => savedAddress !== address);
    setSavedAddresses(nextAddresses);
    await AsyncStorage.setItem(SAVED_ADDRESSES_KEY, JSON.stringify(nextAddresses));
    setCustomerMenuMessage("Address removed.");
  };

  const openFssaiCertificate = async () => {
    setCustomerMenuMessage("Opening FSSAI license certificate...");
    try {
      const certificate = Asset.fromModule(require("../../assets/docs/fssai_license.pdf"));
      await certificate.downloadAsync();
      const certificateUri = certificate.localUri ?? certificate.uri;
      await Linking.openURL(certificateUri);
      setCustomerMenuMessage("FSSAI license certificate opened.");
    } catch {
      setCustomerMenuMessage("FSSAI license certificate is attached in the app, but no PDF viewer could open it on this device.");
    }
  };

  const contactAdmin = async (method: "call" | "email") => {
    const url =
      method === "call"
        ? "tel:+919247840892"
        : "mailto:admin@cloudsnacks.local?subject=Cloud%20Snacks%20Customer%20Support";
    try {
      await Linking.openURL(url);
    } catch {
      setCustomerMenuMessage(method === "call" ? "Could not open phone dialer." : "Could not open email app.");
    }
  };

  useEffect(() => {
    void loadCustomerSettings();
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [accessToken]);

  useEffect(() => {
    if (accountSection) {
      setActiveCustomerMenu(accountSection);
      setCustomerMenuMessage("Opened from voice command.");
      setAccountSection(null);
    }
  }, [accountSection, setAccountSection]);

  const profileDetail = isLoading
    ? "Restoring session"
    : user?.phone || user?.email || "Register or log in below.";
  const customerMenuItems: {
    id: AccountMenuSection;
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    accent: string;
  }[] = [
    {
      id: "preferences",
      title: "Preferences",
      subtitle: "Spice, payment, alerts",
      icon: "options-outline",
      accent: theme.colors.leaf,
    },
    {
      id: "addresses",
      title: "Addresses",
      subtitle: `${savedAddresses.length} saved`,
      icon: "location-outline",
      accent: theme.colors.sky,
    },
    {
      id: "services",
      title: "Services",
      subtitle: "Tracking, repeat, voice",
      icon: "sparkles-outline",
      accent: theme.colors.grape,
    },
    {
      id: "contact",
      title: "Contact Admin",
      subtitle: "Help and support",
      icon: "headset-outline",
      accent: theme.colors.tomato,
    },
    {
      id: "compliance",
      title: "License",
      subtitle: "FSSAI certificate",
      icon: "shield-checkmark-outline",
      accent: theme.colors.saffron,
    },
  ];

  const renderCustomerMenuDetails = () => {
    if (activeCustomerMenu === "preferences") {
      return (
        <SectionPanel
          accent={theme.colors.leaf}
          icon="options-outline"
          title="Customer Preferences"
          subtitle="These defaults are reused during checkout."
        >
          <Text style={styles.preferenceLabel}>Default spice level</Text>
          <View style={styles.optionRow}>
            {(["Mild", "Medium", "Spicy"] as const).map((spice) => (
              <Pressable
                accessibilityRole="button"
                key={spice}
                onPress={() => saveDefaultSpice(spice)}
                style={[styles.optionChip, defaultSpice === spice && styles.activeOptionChip]}
              >
                <Text style={[styles.optionText, defaultSpice === spice && styles.activeOptionText]}>{spice}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.preferenceLabel}>Default payment</Text>
          <View style={styles.optionRow}>
            {(["Cash on delivery", "UPI on delivery"] as const).map((payment) => (
              <Pressable
                accessibilityRole="button"
                key={payment}
                onPress={() => saveDefaultPayment(payment)}
                style={[styles.optionChip, defaultPayment === payment && styles.activeOptionChip]}
              >
                <Text style={[styles.optionText, defaultPayment === payment && styles.activeOptionText]}>{payment}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingCopy}>
              <Text style={styles.settingTitle}>Contactless delivery</Text>
              <Text style={styles.settingText}>Ask the delivery partner to leave food at the door.</Text>
            </View>
            <Switch value={contactlessDelivery} onValueChange={toggleContactlessDelivery} />
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingCopy}>
              <Text style={styles.settingTitle}>Order updates</Text>
              <Text style={styles.settingText}>Keep app reminders and tracking prompts visible.</Text>
            </View>
            <Switch value={orderUpdates} onValueChange={toggleOrderUpdates} />
          </View>
        </SectionPanel>
      );
    }

    if (activeCustomerMenu === "addresses") {
      return (
        <SectionPanel
          accent={theme.colors.sky}
          icon="location-outline"
          title="Delivery Addresses"
          subtitle="The first saved address becomes your checkout default."
        >
          <TextInput
            multiline
            onChangeText={setNewAddress}
            placeholder="Add new delivery address"
            placeholderTextColor={theme.colors.muted}
            style={[styles.input, styles.addressInput]}
            value={newAddress}
          />
          <Pressable
            accessibilityRole="button"
            onPress={addSavedAddress}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Ionicons name="bookmark-outline" size={18} color={theme.colors.white} />
            <Text style={styles.primaryButtonText}>Save Address</Text>
          </Pressable>
          {savedAddresses.length === 0 ? (
            <Text style={styles.panelText}>No saved addresses yet. Add one here or save it from checkout.</Text>
          ) : null}
          {savedAddresses.map((address, index) => (
            <View key={`${address}-${index}`} style={styles.addressCard}>
              <View style={styles.addressCopy}>
                <Text style={styles.addressTitle}>{index === 0 ? "Default address" : `Address ${index + 1}`}</Text>
                <Text style={styles.addressBody}>{address}</Text>
              </View>
              <View style={styles.addressActions}>
                {index !== 0 ? (
                  <Pressable accessibilityRole="button" onPress={() => makeDefaultAddress(address)} style={styles.smallIconButton}>
                    <Ionicons name="star-outline" size={18} color={theme.colors.charcoal} />
                  </Pressable>
                ) : null}
                <Pressable accessibilityRole="button" onPress={() => removeSavedAddress(address)} style={styles.smallIconButton}>
                  <Ionicons name="trash-outline" size={18} color={theme.colors.tomato} />
                </Pressable>
              </View>
            </View>
          ))}
        </SectionPanel>
      );
    }

    if (activeCustomerMenu === "services") {
      return (
        <SectionPanel
          accent={theme.colors.grape}
          icon="sparkles-outline"
          title="Customer Services"
          subtitle="Useful service shortcuts available in this app."
        >
          {[
            ["repeat-outline", "Repeat order", "Place previous orders again from My Orders or Track."],
            ["navigate-outline", "Live delivery tracking", "Follow received, preparing, out-for-delivery, and delivered status."],
            ["videocam-outline", "Kitchen camera", "Open the live kitchen camera while your order is preparing."],
            ["mic-outline", "Voice assistant", "Say add chicken curry, search dosa, go to cart, or track order."],
            ["pricetag-outline", "Offers", "Use FIRST50, COMBO20, and FREESHIP while testing checkout."],
          ].map(([icon, title, copy]) => (
            <View key={title} style={styles.serviceRow}>
              <View style={styles.serviceIcon}>
                <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={theme.colors.white} />
              </View>
              <View style={styles.serviceCopy}>
                <Text style={styles.settingTitle}>{title}</Text>
                <Text style={styles.settingText}>{copy}</Text>
              </View>
            </View>
          ))}
        </SectionPanel>
      );
    }

    if (activeCustomerMenu === "contact") {
      return (
        <SectionPanel
          accent={theme.colors.tomato}
          icon="headset-outline"
          title="Contact Admin"
          subtitle="Reach the Cloud Snacks admin for order help, service issues, or certificate questions."
        >
          <View style={styles.contactCard}>
            <Text style={styles.settingTitle}>Cloud Snacks Admin</Text>
            <Text style={styles.settingText}>Phone: +91 92478 40892</Text>
            <Text style={styles.settingText}>Email: admin@cloudsnacks.local</Text>
          </View>
          <View style={styles.contactActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => contactAdmin("call")}
              style={({ pressed }) => [styles.contactButton, pressed && styles.pressed]}
            >
              <Ionicons name="call-outline" size={18} color={theme.colors.white} />
              <Text style={styles.primaryButtonText}>Call</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => contactAdmin("email")}
              style={({ pressed }) => [styles.contactButton, styles.emailButton, pressed && styles.pressed]}
            >
              <Ionicons name="mail-outline" size={18} color={theme.colors.white} />
              <Text style={styles.primaryButtonText}>Email</Text>
            </Pressable>
          </View>
        </SectionPanel>
      );
    }

    return (
      <SectionPanel
        accent={theme.colors.saffron}
        icon="shield-checkmark-outline"
        title="Food License & Compliance"
        subtitle="FSSAI certificate is attached for customer trust and transparency."
      >
        <View style={styles.licenseCard}>
          <View style={styles.licenseSeal}>
            <Ionicons name="ribbon-outline" size={30} color={theme.colors.white} />
          </View>
          <View style={styles.licenseCopy}>
            <Text style={styles.settingTitle}>FSSAI License Certificate</Text>
            <Text style={styles.settingText}>Attached file: fssai_license.pdf</Text>
            <Text style={styles.settingText}>Use this section to show food-safety compliance to customers.</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View FSSAI license certificate"
          onPress={openFssaiCertificate}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Ionicons name="document-text-outline" size={18} color={theme.colors.white} />
          <Text style={styles.primaryButtonText}>View Certificate</Text>
        </Pressable>
      </SectionPanel>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          colors={["#e0f2fe", "#fef3c7", "#ffe4e6"]}
          eyebrow="Secure access"
          icon="person-circle-outline"
          title={user ? "Account & orders" : "Login or create account"}
          subtitle={
            user
              ? "Repeat orders, preferences, support, and saved delivery details."
              : "Register with your mobile number and OTP, then use your PIN for future logins."
          }
        />

        <View style={styles.profilePanel}>
          <View style={styles.avatar}>
            <Ionicons name="person-outline" size={32} color={theme.colors.white} />
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.profileName}>{user?.name ?? "Guest Customer"}</Text>
            <Text style={styles.profileDetail}>{profileDetail}</Text>
          </View>
        </View>

        {user ? (
          <>
            <SectionPanel
              accent={theme.colors.grape}
              icon="grid-outline"
              title="Customer Menu"
              subtitle="Manage your preferences, services, support, delivery addresses, and compliance documents."
            >
              <View style={styles.menuGrid}>
                {customerMenuItems.map((item) => (
                  <Pressable
                    accessibilityRole="button"
                    key={item.id}
                    onPress={() => {
                      setActiveCustomerMenu(item.id);
                      setCustomerMenuMessage("");
                    }}
                    style={[
                      styles.menuTile,
                      activeCustomerMenu === item.id && { borderColor: item.accent, backgroundColor: `${item.accent}14` },
                    ]}
                  >
                    <View style={[styles.menuIcon, { backgroundColor: item.accent }]}>
                      <Ionicons name={item.icon} size={19} color={theme.colors.white} />
                    </View>
                    <Text style={styles.menuTitle}>{item.title}</Text>
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  </Pressable>
                ))}
              </View>
              {customerMenuMessage ? <Text style={styles.customerMenuMessage}>{customerMenuMessage}</Text> : null}
            </SectionPanel>

            {renderCustomerMenuDetails()}
          </>
        ) : null}

        {user ? (
          <SectionPanel accent={theme.colors.leaf} icon="shield-checkmark-outline" title="Signed In">
            <Text style={styles.panelText}>Your session is saved locally for future app launches.</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              onPress={signOut}
              style={({ pressed }) => [styles.dangerButton, pressed && styles.pressed]}
            >
              <Ionicons name="log-out-outline" size={18} color={theme.colors.white} />
              <Text style={styles.primaryButtonText}>Sign Out</Text>
            </Pressable>
          </SectionPanel>
        ) : (
          <SectionPanel
            accent={mode === "register" ? theme.colors.leaf : mode === "forgot" ? theme.colors.saffron : theme.colors.sky}
            icon={mode === "register" ? "person-add-outline" : mode === "forgot" ? "key-outline" : "log-in-outline"}
            title={mode === "register" ? "Create Account" : mode === "forgot" ? "Forgot PIN" : "Login"}
            subtitle="Use mobile number first; OTP is required only for registration and PIN reset."
          >
            <View style={styles.segmentedControl}>
              {(["login", "register", "forgot"] as AuthMode[]).map((nextMode) => (
                <Pressable
                  accessibilityRole="button"
                  key={nextMode}
                  onPress={() => {
                    setMode(nextMode);
                    setAuthMessage("");
                    setOtp("");
                    setGeneratedOtp("");
                    setPin("");
                  }}
                  style={[styles.segment, mode === nextMode && styles.activeSegment]}
                >
                  <Text style={[styles.segmentText, mode === nextMode && styles.activeSegmentText]}>
                    {nextMode === "forgot" ? "Forgot" : nextMode[0].toUpperCase() + nextMode.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {mode === "register" ? (
              <TextInput
                autoCapitalize="words"
                onChangeText={setName}
                placeholder="Name"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
                value={name}
              />
            ) : null}

            <TextInput
              keyboardType="phone-pad"
              onChangeText={setPhone}
              placeholder="Mobile number"
              placeholderTextColor={theme.colors.muted}
              style={styles.input}
              value={phone}
            />

            {mode !== "login" ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Request OTP"
                  disabled={isRequestingOtp}
                  onPress={requestAuthOtp}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    isRequestingOtp && styles.disabledButton,
                    pressed && !isRequestingOtp && styles.pressed,
                  ]}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color={theme.colors.charcoal} />
                  <Text style={styles.secondaryButtonText}>
                    {isRequestingOtp ? "Sending" : "Send OTP"}
                  </Text>
                </Pressable>
                {generatedOtp ? (
                  <View style={styles.otpPanel}>
                    <Text style={styles.otpLabel}>Testing OTP</Text>
                    <Text style={styles.otpValue}>{generatedOtp}</Text>
                  </View>
                ) : null}
                <TextInput
                  keyboardType="number-pad"
                  onChangeText={setOtp}
                  placeholder="OTP"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.input}
                  value={otp}
                />
              </>
            ) : null}

            <TextInput
              keyboardType="number-pad"
              maxLength={6}
              onChangeText={setPin}
              placeholder={mode === "forgot" ? "New PIN" : "PIN"}
              placeholderTextColor={theme.colors.muted}
              secureTextEntry
              style={styles.input}
              value={pin}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                mode === "register" ? "Create account" : mode === "forgot" ? "Reset PIN" : "Sign in"
              }
              disabled={isSubmitting}
              onPress={submitAuth}
              style={({ pressed }) => [
                styles.primaryButton,
                isSubmitting && styles.disabledButton,
                pressed && !isSubmitting && styles.pressed,
              ]}
            >
              <Ionicons
                name={
                  mode === "register"
                    ? "person-add-outline"
                    : mode === "forgot"
                      ? "key-outline"
                      : "log-in-outline"
                }
                size={18}
                color={theme.colors.white}
              />
              <Text style={styles.primaryButtonText}>
                {isSubmitting
                  ? "Working"
                  : mode === "register"
                    ? "Create Account"
                    : mode === "forgot"
                      ? "Reset PIN"
                      : "Sign In"}
              </Text>
            </Pressable>
            {authMessage ? <Text style={styles.formMessage}>{authMessage}</Text> : null}
          </SectionPanel>
        )}

        {user ? (
          <SectionPanel accent={theme.colors.grape} icon="repeat-outline" title="My Orders">
            <View style={styles.ordersHeader}>
              <View>
                <Text style={styles.panelText}>
                  {isLoadingOrders ? "Loading orders" : `${orders.length} order${orders.length === 1 ? "" : "s"}`}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Refresh orders"
                onPress={loadOrders}
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
              >
                <Ionicons name="refresh" size={18} color={theme.colors.charcoal} />
              </Pressable>
            </View>

            {orders.map((order) => (
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
                {order.deliveryNote ? (
                  <Text style={styles.orderItems}>Note: {order.deliveryNote}</Text>
                ) : null}
                <Text style={styles.orderItems}>
                  Schedule: {order.scheduledFor ?? "Now"} - Spice: {order.spiceLevel ?? "Medium"}
                </Text>
                <Text style={styles.orderItems}>
                  Payment: {order.paymentMethod ?? "Cash on delivery"}
                  {order.couponCode ? ` - Coupon: ${order.couponCode}` : ""}
                </Text>
                {order.status !== "delivered" && order.status !== "cancelled" ? (
                  <View style={styles.orderActionRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Track delivery for order ${order.id}`}
                      onPress={() => openOrderDeliveryRoute(order)}
                      style={({ pressed }) => [styles.trackOrderButton, pressed && styles.pressed]}
                    >
                      <Ionicons name="navigate-outline" size={18} color={theme.colors.white} />
                      <Text style={styles.primaryButtonText}>Track Delivery</Text>
                    </Pressable>
                    {order.status === "preparing" ? (
                      <Pressable
                        accessibilityRole="link"
                        accessibilityLabel={`View kitchen camera for order ${order.id}`}
                        onPress={() => openOrderKitchenCamera(order)}
                        style={({ pressed }) => [styles.cameraOrderButton, pressed && styles.pressed]}
                      >
                        <Ionicons name="videocam-outline" size={18} color={theme.colors.white} />
                        <Text style={styles.primaryButtonText}>Kitchen Cam</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
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
                  <Text style={styles.primaryButtonText}>
                    {repeatingOrderId === order.id ? "Repeating" : "Repeat Order"}
                  </Text>
                </Pressable>
              </View>
            ))}

            {ordersMessage ? <Text style={styles.panelText}>{ordersMessage}</Text> : null}
          </SectionPanel>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  activeSegment: {
    backgroundColor: theme.colors.leaf,
  },
  activeSegmentText: {
    color: theme.colors.white,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: theme.colors.sky,
    borderRadius: theme.radius.md,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  apiUrl: {
    color: theme.colors.charcoal,
    fontSize: 12,
    fontWeight: "800",
  },
  apiBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  activeOptionChip: {
    backgroundColor: theme.colors.leaf,
    borderColor: theme.colors.leaf,
  },
  activeOptionText: {
    color: theme.colors.white,
  },
  addressActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.xs,
  },
  addressBody: {
    color: theme.colors.muted,
    fontFamily: theme.fonts.body,
    fontSize: theme.type.small,
    lineHeight: 19,
    marginTop: 2,
  },
  addressCard: {
    alignItems: "center",
    backgroundColor: theme.colors.cloud,
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  addressCopy: {
    flex: 1,
  },
  addressInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  addressTitle: {
    color: theme.colors.charcoal,
    fontFamily: theme.fonts.extraBold,
    fontSize: theme.type.small,
  },
  contactActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  contactButton: {
    alignItems: "center",
    backgroundColor: theme.colors.tomato,
    borderRadius: theme.radius.sm,
    flex: 1,
    flexDirection: "row",
    gap: theme.spacing.xs,
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
  },
  cameraOrderButton: {
    alignItems: "center",
    backgroundColor: theme.colors.sky,
    borderRadius: theme.radius.sm,
    flex: 1,
    flexDirection: "row",
    gap: theme.spacing.xs,
    justifyContent: "center",
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  contactCard: {
    backgroundColor: "#fff1f2",
    borderColor: "#fecdd3",
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: 4,
    padding: theme.spacing.md,
  },
  content: {
    gap: theme.spacing.lg,
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  dangerButton: {
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
  disabledButton: {
    backgroundColor: "#9ca3af",
  },
  customerMenuMessage: {
    color: theme.colors.charcoal,
    fontFamily: theme.fonts.medium,
    fontSize: theme.type.small,
    lineHeight: 19,
  },
  emailButton: {
    backgroundColor: theme.colors.sky,
  },
  formMessage: {
    color: theme.colors.tomato,
    fontSize: 13,
    lineHeight: 19,
    marginTop: theme.spacing.sm,
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
    fontSize: 15,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  orderCard: {
    backgroundColor: theme.colors.cloud,
    borderRadius: theme.radius.sm,
    gap: 4,
    padding: theme.spacing.md,
  },
  orderItems: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: theme.spacing.xs,
  },
  orderActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  orderMeta: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  ordersHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
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
  licenseCard: {
    alignItems: "center",
    backgroundColor: "#fef3c7",
    borderColor: "#fde68a",
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  licenseCopy: {
    flex: 1,
  },
  licenseSeal: {
    alignItems: "center",
    backgroundColor: theme.colors.saffron,
    borderRadius: theme.radius.sm,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  menuIcon: {
    alignItems: "center",
    borderRadius: theme.radius.sm,
    height: 38,
    justifyContent: "center",
    marginBottom: theme.spacing.sm,
    width: 38,
  },
  menuSubtitle: {
    color: theme.colors.muted,
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  menuTile: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexBasis: "48%",
    minHeight: 118,
    padding: theme.spacing.md,
  },
  menuTitle: {
    color: theme.colors.charcoal,
    fontFamily: theme.fonts.extraBold,
    fontSize: theme.type.small,
  },
  optionChip: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  optionText: {
    color: theme.colors.muted,
    fontFamily: theme.fonts.extraBold,
    fontSize: theme.type.small,
  },
  otpLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  otpPanel: {
    backgroundColor: "#ecfdf5",
    borderColor: "#bbf7d0",
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  otpValue: {
    color: theme.colors.charcoal,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 2,
  },
  panel: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  panelText: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  panelTitle: {
    color: theme.colors.charcoal,
    fontSize: 17,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.78,
  },
  preferenceLabel: {
    color: theme.colors.charcoal,
    fontFamily: theme.fonts.extraBold,
    fontSize: theme.type.body,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.leaf,
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    gap: theme.spacing.xs,
    justifyContent: "center",
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: "800",
  },
  profileCopy: {
    flex: 1,
  },
  profileDetail: {
    color: theme.colors.muted,
    fontSize: 14,
    marginTop: 3,
  },
  profileName: {
    color: theme.colors.charcoal,
    fontSize: 18,
    fontWeight: "900",
  },
  profilePanel: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
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
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  serviceCopy: {
    flex: 1,
  },
  serviceIcon: {
    alignItems: "center",
    backgroundColor: theme.colors.grape,
    borderRadius: theme.radius.sm,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  serviceRow: {
    alignItems: "center",
    backgroundColor: theme.colors.cloud,
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  secondaryButton: {
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
  secondaryButtonText: {
    color: theme.colors.charcoal,
    fontSize: 14,
    fontWeight: "800",
  },
  segment: {
    alignItems: "center",
    borderRadius: theme.radius.sm,
    flex: 1,
    paddingVertical: theme.spacing.sm,
  },
  segmentedControl: {
    backgroundColor: theme.colors.cloud,
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.xs,
  },
  segmentText: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: "900",
  },
  settingCopy: {
    flex: 1,
  },
  settingRow: {
    alignItems: "center",
    backgroundColor: theme.colors.cloud,
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  settingText: {
    color: theme.colors.muted,
    fontFamily: theme.fonts.body,
    fontSize: theme.type.small,
    lineHeight: 19,
    marginTop: 2,
  },
  settingTitle: {
    color: theme.colors.charcoal,
    fontFamily: theme.fonts.extraBold,
    fontSize: theme.type.body,
  },
  smallIconButton: {
    alignItems: "center",
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  statusDot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  statusHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  statusMessage: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: theme.spacing.sm,
  },
  statusPanel: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  statusTitle: {
    color: theme.colors.charcoal,
    fontSize: 17,
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
  trackOrderButton: {
    alignItems: "center",
    backgroundColor: theme.colors.leaf,
    borderRadius: theme.radius.sm,
    flex: 1,
    flexDirection: "row",
    gap: theme.spacing.xs,
    justifyContent: "center",
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
});
