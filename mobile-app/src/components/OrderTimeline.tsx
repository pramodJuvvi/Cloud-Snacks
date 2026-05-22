import { StyleSheet, Text, View } from "react-native";

import { theme } from "../theme";

const steps = [
  { key: "received", label: "Received" },
  { key: "preparing", label: "Preparing" },
  { key: "out_for_delivery", label: "On the way" },
  { key: "delivered", label: "Delivered" },
];

type OrderTimelineProps = {
  status: string;
};

export function OrderTimeline({ status }: OrderTimelineProps) {
  const timelineStatus = status === "delivery_in_progress" ? "out_for_delivery" : status;
  const activeIndex =
    timelineStatus === "cancelled" ? -1 : Math.max(0, steps.findIndex((step) => step.key === timelineStatus));

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isDone = index <= activeIndex;

        return (
          <View key={step.key} style={styles.step}>
            <View style={[styles.dot, isDone && styles.activeDot]} />
            <Text style={[styles.label, isDone && styles.activeLabel]}>{step.label}</Text>
          </View>
        );
      })}
      {status === "cancelled" ? <Text style={styles.cancelled}>Cancelled</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  activeDot: {
    backgroundColor: theme.colors.leaf,
  },
  activeLabel: {
    color: theme.colors.charcoal,
  },
  cancelled: {
    color: theme.colors.tomato,
    fontSize: 13,
    fontWeight: "900",
    marginTop: theme.spacing.xs,
  },
  container: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  dot: {
    backgroundColor: theme.colors.border,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  label: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  step: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.xs,
  },
});
