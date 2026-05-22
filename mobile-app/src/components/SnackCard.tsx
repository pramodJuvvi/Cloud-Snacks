import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { getSnackImage } from "../data/snackImages";
import { theme } from "../theme";
import type { Snack } from "../types";

type SnackCardProps = {
  snack: Snack;
  onAdd: (snack: Snack) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (snack: Snack) => void;
  onPress?: (snack: Snack) => void;
};

export function SnackCard({ isFavorite, onToggleFavorite, snack, onAdd, onPress }: SnackCardProps) {
  const isAvailable = snack.isAvailable ?? true;
  const snackImage = getSnackImage(snack.name);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${snack.name} details`}
      onPress={() => onPress?.(snack)}
      style={({ pressed }) => [styles.card, pressed && onPress && styles.pressed]}
    >
      <View style={styles.imageFrame}>
        {snackImage ? (
          <Image accessibilityIgnoresInvertColors source={snackImage} style={styles.foodImage} />
        ) : (
          <View style={[styles.imageFallback, { backgroundColor: snack.accent }]}>
            <Ionicons name="nutrition-outline" size={28} color={theme.colors.white} />
          </View>
        )}
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.name}>{snack.name}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${isFavorite ? "Remove" : "Add"} ${snack.name} favorite`}
            onPress={() => onToggleFavorite?.(snack)}
            style={({ pressed }) => [styles.favoriteButton, pressed && styles.pressed]}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={20}
              color={isFavorite ? theme.colors.tomato : theme.colors.muted}
            />
          </Pressable>
          <Text style={styles.price}>Rs {snack.price}</Text>
        </View>
        {!isAvailable ? <Text style={styles.soldOutText}>Sold out</Text> : null}
        <Text style={styles.description}>{snack.description}</Text>
        <View style={styles.metaRow}>
          <View style={styles.pill}>
            <Ionicons name="time-outline" size={14} color={theme.colors.muted} />
            <Text style={styles.pillText}>{snack.prepMinutes} min</Text>
          </View>
          <View style={styles.pill}>
            <Ionicons name="flame-outline" size={14} color={theme.colors.muted} />
            <Text style={styles.pillText}>{snack.calories} cal</Text>
          </View>
          <View style={[styles.pill, styles.categoryPill]}>
            <Text style={styles.pillText}>{snack.category}</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add ${snack.name} to cart`}
          disabled={!isAvailable}
          onPress={() => onAdd(snack)}
          style={({ pressed }) => [
            styles.addButton,
            !isAvailable && styles.disabledButton,
            pressed && isAvailable && styles.pressed,
          ]}
        >
          <Ionicons name="add-circle-outline" size={20} color={theme.colors.white} />
          <Text style={styles.addButtonText}>{isAvailable ? "Add" : "Unavailable"}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  addButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: theme.colors.charcoal,
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  soldOutText: {
    color: theme.colors.tomato,
    fontSize: 13,
    fontWeight: "900",
    marginTop: theme.spacing.xs,
  },
  addButtonText: {
    color: theme.colors.white,
    fontFamily: theme.fonts.extraBold,
    fontSize: 15,
    fontWeight: "700",
  },
  body: {
    flex: 1,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    elevation: 2,
    flexDirection: "row",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    shadowColor: "#7c2d12",
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  categoryPill: {
    backgroundColor: theme.colors.cream,
  },
  description: {
    color: theme.colors.muted,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: theme.spacing.xs,
  },
  disabledButton: {
    backgroundColor: "#9ca3af",
  },
  favoriteButton: {
    alignItems: "center",
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  foodImage: {
    height: "100%",
    width: "100%",
  },
  imageFallback: {
    alignItems: "center",
    height: "100%",
    justifyContent: "center",
    width: "100%",
  },
  imageFrame: {
    backgroundColor: theme.colors.cream,
    borderRadius: theme.radius.md,
    height: 94,
    overflow: "hidden",
    width: 94,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  name: {
    color: theme.colors.charcoal,
    flex: 1,
    fontFamily: theme.fonts.extraBold,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 22,
  },
  pill: {
    alignItems: "center",
    backgroundColor: "#eef6ff",
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  pillText: {
    color: theme.colors.muted,
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.78,
  },
  price: {
    color: theme.colors.charcoal,
    fontFamily: theme.fonts.extraBold,
    fontSize: 16,
    fontWeight: "800",
  },
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
});
