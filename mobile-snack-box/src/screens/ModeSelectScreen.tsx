import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppMode } from "../context/AppModeContext";
import { theme } from "../theme";

export function ModeSelectScreen() {
  const { enterAdminMode, enterCustomerMode } = useAppMode();
  const [adminPin, setAdminPin] = useState("");
  const [message, setMessage] = useState("");

  const submitAdmin = () => {
    const isValid = enterAdminMode(adminPin);
    setMessage(isValid ? "" : "Invalid admin PIN.");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <LinearGradient
          colors={["#fff1da", "#ffe4e6", "#dbeafe"] as const}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.brandPanel}
        >
          <Image
            accessibilityIgnoresInvertColors
            source={require("../../assets/branding/cloudsnacks-logo-inline.png")}
            style={styles.logo}
          />
          <Text style={styles.title}>Cloud Snacks</Text>
          <Text style={styles.subtitle}>Colorful meals, live tracking, and clean admin control.</Text>
          <View style={styles.brandBadges}>
            <View style={styles.brandBadge}>
              <Ionicons name="flash-outline" size={14} color={theme.colors.charcoal} />
              <Text style={styles.brandBadgeText}>Fast</Text>
            </View>
            <View style={styles.brandBadge}>
              <Ionicons name="shield-checkmark-outline" size={14} color={theme.colors.charcoal} />
              <Text style={styles.brandBadgeText}>Audited</Text>
            </View>
          </View>
        </LinearGradient>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue as customer"
          onPress={enterCustomerMode}
          style={({ pressed }) => [styles.customerButton, pressed && styles.pressed]}
        >
          <Ionicons name="person-outline" size={22} color={theme.colors.white} />
          <Text style={styles.primaryButtonText}>Customer View</Text>
        </Pressable>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Admin View</Text>
          <TextInput
            keyboardType="number-pad"
            maxLength={8}
            onChangeText={setAdminPin}
            placeholder="Admin PIN"
            placeholderTextColor={theme.colors.muted}
            secureTextEntry
            style={styles.input}
            value={adminPin}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open admin view"
            onPress={submitAdmin}
            style={({ pressed }) => [styles.adminButton, pressed && styles.pressed]}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.white} />
            <Text style={styles.primaryButtonText}>Open Admin</Text>
          </Pressable>
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  adminButton: {
    alignItems: "center",
    backgroundColor: theme.colors.charcoal,
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    gap: theme.spacing.xs,
    justifyContent: "center",
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  brandBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  brandBadgeText: {
    color: theme.colors.charcoal,
    fontSize: 12,
    fontWeight: "900",
  },
  brandBadges: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  brandPanel: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  content: {
    flex: 1,
    gap: theme.spacing.lg,
    justifyContent: "center",
    padding: theme.spacing.md,
  },
  customerButton: {
    alignItems: "center",
    backgroundColor: theme.colors.grape,
    borderRadius: theme.radius.md,
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "center",
    paddingVertical: theme.spacing.lg,
  },
  input: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.charcoal,
    fontSize: 15,
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  logo: {
    alignSelf: "center",
    borderRadius: theme.radius.lg,
    height: 150,
    marginBottom: theme.spacing.md,
    width: 150,
  },
  message: {
    color: theme.colors.tomato,
    fontSize: 13,
    lineHeight: 19,
    marginTop: theme.spacing.sm,
  },
  panel: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    elevation: 2,
    padding: theme.spacing.md,
    shadowColor: "#172033",
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  panelTitle: {
    color: theme.colors.charcoal,
    fontSize: 17,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.78,
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: "900",
  },
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 15,
    lineHeight: 21,
    marginTop: theme.spacing.xs,
  },
  title: {
    color: theme.colors.charcoal,
    fontSize: 36,
    fontWeight: "900",
  },
});
