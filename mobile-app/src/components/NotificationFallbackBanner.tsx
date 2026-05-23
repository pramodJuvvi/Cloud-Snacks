import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "../theme";

const PROMO_MESSAGE =
  "Hot now: Bagara Rice + Chicken Curry combo is fresh from the kitchen. Use FIRST50 before it sells out.";

function hasNotificationPermission(permission: unknown) {
  const status = permission as { granted?: boolean; status?: string };
  return status.granted === true || status.status === "granted";
}

export function NotificationFallbackBanner() {
  const opacity = useRef(new Animated.Value(1)).current;
  const [shouldShow, setShouldShow] = useState(false);
  const [message, setMessage] = useState(PROMO_MESSAGE);

  const refreshPermission = async () => {
    try {
      const permission = await Notifications.getPermissionsAsync();
      setShouldShow(!hasNotificationPermission(permission));
    } catch {
      setShouldShow(true);
    }
  };

  useEffect(() => {
    void refreshPermission();
  }, []);

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

  const requestPermission = async () => {
    try {
      const permission = await Notifications.requestPermissionsAsync();
      if (hasNotificationPermission(permission)) {
        setShouldShow(false);
        setMessage(PROMO_MESSAGE);
      } else {
        setShouldShow(true);
        setMessage("Notifications are off. We will keep showing hot recipes and deals here in the app.");
      }
    } catch {
      setShouldShow(true);
      setMessage("Notifications are off. We will keep showing hot recipes and deals here in the app.");
    }
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
          accessibilityLabel="Enable Cloud Snacks notifications"
          onPress={requestPermission}
          style={({ pressed }) => [styles.enableButton, pressed && styles.pressed]}
        >
          <Text style={styles.enableText}>Enable</Text>
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
