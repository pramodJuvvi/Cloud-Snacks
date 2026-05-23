import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "../theme";

const PROMO_MESSAGE =
  "New box alert: Dietician-curated kids, teen, adult, and senior plans are live. Use FIRST50 on your first subscription.";

export function NotificationFallbackBanner() {
  const opacity = useRef(new Animated.Value(1)).current;
  const [shouldShow, setShouldShow] = useState(true);
  const [message, setMessage] = useState(PROMO_MESSAGE);

  useEffect(() => {
    if (!shouldShow) {
      opacity.stopAnimation();
      opacity.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          duration: 650,
          toValue: 0.42,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          duration: 650,
          toValue: 1,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [opacity, shouldShow]);

  const dismissFallback = () => {
    setShouldShow(false);
    setMessage(PROMO_MESSAGE);
  };

  if (!shouldShow) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <Animated.View style={[styles.banner, { opacity }]}>
        <View style={styles.iconWrap}>
          <Ionicons name="flame-outline" size={19} color={theme.colors.white} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Deal alert inside app</Text>
          <Text numberOfLines={2} style={styles.message}>
            {message}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss Cloud Snack Box in-app deal alert"
          onPress={dismissFallback}
          style={({ pressed }) => [styles.enableButton, pressed && styles.pressed]}
        >
          <Text style={styles.enableText}>Got it</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: "center",
    backgroundColor: "#991b1b",
    borderColor: "#fecaca",
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    elevation: 8,
    flexDirection: "row",
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    shadowColor: "#172033",
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  copy: {
    flex: 1,
  },
  enableButton: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
  },
  enableText: {
    color: "#991b1b",
    fontFamily: theme.fonts.extraBold,
    fontSize: 12,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: "#ef4444",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  message: {
    color: "#fee2e2",
    fontFamily: theme.fonts.medium,
    fontSize: theme.type.caption,
    lineHeight: 16,
    marginTop: 2,
  },
  overlay: {
    left: theme.spacing.md,
    position: "absolute",
    right: theme.spacing.md,
    top: 54,
    zIndex: 20,
  },
  pressed: {
    opacity: 0.78,
  },
  title: {
    color: theme.colors.white,
    fontFamily: theme.fonts.extraBold,
    fontSize: theme.type.small,
  },
});
