import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { ComponentProps, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "../theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

type AppHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  icon: IconName;
  colors?: readonly [string, string, string];
  right?: ReactNode;
  children?: ReactNode;
};

export function AppHeader({
  children,
  colors = ["#fff1da", "#ffe4e6", "#dbeafe"],
  eyebrow,
  icon,
  right,
  subtitle,
  title,
}: AppHeaderProps) {
  return (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
      <View style={styles.topRow}>
        <View style={styles.kickerRow}>
          <View style={styles.iconBadge}>
            <Ionicons name={icon} size={18} color={theme.colors.charcoal} />
          </View>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        </View>
        {right}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {children ? <View style={styles.body}>{children}</View> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  body: {
    marginTop: theme.spacing.lg,
  },
  eyebrow: {
    color: theme.colors.charcoal,
    fontFamily: theme.fonts.extraBold,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  header: {
    borderRadius: theme.radius.lg,
    minHeight: 156,
    overflow: "hidden",
    padding: theme.spacing.lg,
  },
  iconBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  kickerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  subtitle: {
    color: theme.colors.charcoal,
    fontFamily: theme.fonts.medium,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
    marginTop: theme.spacing.sm,
  },
  title: {
    color: theme.colors.charcoal,
    fontFamily: theme.fonts.displayBlack,
    fontSize: theme.type.title,
    fontWeight: "900",
    lineHeight: 36,
    marginTop: theme.spacing.md,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
