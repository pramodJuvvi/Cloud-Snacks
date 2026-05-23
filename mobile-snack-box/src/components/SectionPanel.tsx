import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "../theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

type SectionPanelProps = {
  children: ReactNode;
  title: string;
  subtitle?: string;
  icon?: IconName;
  accent?: string;
  action?: ReactNode;
};

export function SectionPanel({
  accent = theme.colors.leaf,
  action,
  children,
  icon,
  subtitle,
  title,
}: SectionPanelProps) {
  return (
    <View style={[styles.panel, { borderTopColor: accent }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {icon ? (
            <View style={[styles.iconBadge, { backgroundColor: `${accent}1A` }]}>
              <Ionicons name={icon} size={18} color={accent} />
            </View>
          ) : null}
          <View style={styles.copy}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
        {action}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  copy: {
    flex: 1,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "space-between",
  },
  iconBadge: {
    alignItems: "center",
    borderRadius: theme.radius.sm,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  panel: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderTopWidth: 5,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  subtitle: {
    color: theme.colors.muted,
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  title: {
    color: theme.colors.charcoal,
    fontFamily: theme.fonts.extraBold,
    fontSize: 17,
    fontWeight: "900",
  },
  titleRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
});
