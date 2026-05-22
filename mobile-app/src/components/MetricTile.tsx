import { StyleSheet, Text, View } from "react-native";

import { theme } from "../theme";

type MetricTileProps = {
  label: string;
  value: string | number;
  accent?: string;
};

export function MetricTile({ accent = theme.colors.leaf, label, value }: MetricTileProps) {
  return (
    <View style={[styles.tile, { borderLeftColor: accent }]}>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: theme.colors.muted,
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  tile: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderLeftWidth: 5,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexBasis: "48%",
    padding: theme.spacing.md,
  },
  value: {
    color: theme.colors.charcoal,
    fontFamily: theme.fonts.extraBold,
    fontSize: 18,
    fontWeight: "900",
  },
});
