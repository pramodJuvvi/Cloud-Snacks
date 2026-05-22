import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getSnacks } from "../api/client";
import { SnackCard } from "../components/SnackCard";
import { useCart } from "../context/CartContext";
import { useVoiceCommand } from "../context/VoiceCommandContext";
import { getSnackImage } from "../data/snackImages";
import { snacks as fallbackSnacks } from "../data/snacks";
import { theme } from "../theme";
import type { Snack } from "../types";

const FAVORITES_KEY = "cloudsnacks.favoriteSnackIds";

export function HomeScreen() {
  const { addSnack } = useCart();
  const { menuSearch } = useVoiceCommand();
  const [snacks, setSnacks] = useState<Snack[]>(fallbackSnacks);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Snack["category"] | "All">("All");
  const [preference, setPreference] = useState("All");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [selectedSnack, setSelectedSnack] = useState<Snack | null>(null);
  const preferenceFilters = ["All", "Vegetarian", "Vegan", "High protein", "Low spice", "No onion garlic"];
  const combos = [
    { name: "Hyderabadi Meal", items: ["Bagara Rice", "Chicken Curry"], accent: "#b45309" },
    { name: "South Breakfast", items: ["Mini Idli Podi Box", "Filter Coffee Shot"], accent: "#0f766e" },
    { name: "Chai Snack", items: ["Aloo Paratha Dippers", "Masala Chai Flask"], accent: "#be123c" },
  ];

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(snacks.map((snack) => snack.category)))] as const,
    [snacks],
  );

  const visibleSnacks = useMemo(
    () =>
      snacks.filter((snack) => {
        const matchesCategory = category === "All" || snack.category === category;
        const ingredients = snack.ingredients ?? [];
        const allergens = snack.allergens ?? [];
        const matchesPreference =
          preference === "All" ||
          ingredients.some((ingredient) => ingredient.toLowerCase() === preference.toLowerCase());
        const searchText =
          `${snack.name} ${snack.description} ${snack.category} ${ingredients.join(" ")} ${allergens.join(" ")}`.toLowerCase();
        return matchesCategory && matchesPreference && searchText.includes(query.trim().toLowerCase());
      }).sort((firstSnack, secondSnack) => {
        const firstFavorite = favoriteIds.includes(String(firstSnack.id));
        const secondFavorite = favoriteIds.includes(String(secondSnack.id));
        if (firstFavorite === secondFavorite) {
          return 0;
        }
        return firstFavorite ? -1 : 1;
      }),
    [category, favoriteIds, preference, query, snacks],
  );

  useEffect(() => {
    let isMounted = true;

    getSnacks()
      .then((apiSnacks) => {
        if (isMounted) {
          setSnacks(apiSnacks);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSnacks(fallbackSnacks);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(FAVORITES_KEY)
      .then((savedFavorites) => {
        if (savedFavorites) {
          setFavoriteIds(JSON.parse(savedFavorites) as string[]);
        }
      })
      .catch(() => setFavoriteIds([]));
  }, []);

  useEffect(() => {
    if (menuSearch) {
      setQuery(menuSearch);
      setCategory("All");
      setPreference("All");
    }
  }, [menuSearch]);

  const toggleFavorite = (snack: Snack) => {
    const snackId = String(snack.id);
    setFavoriteIds((currentIds) => {
      const nextIds = currentIds.includes(snackId)
        ? currentIds.filter((id) => id !== snackId)
        : [...currentIds, snackId];
      void AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(nextIds));
      return nextIds;
    });
  };

  const addCombo = (comboItems: string[]) => {
    comboItems.forEach((comboItem) => {
      const snack = snacks.find((nextSnack) => nextSnack.name === comboItem);
      if (snack && (snack.isAvailable ?? true)) {
        addSnack(snack);
      }
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#fff1da", "#ffe4e6", "#dbeafe"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTopRow}>
            <Text style={styles.kicker}>Cloud Snacks</Text>
            <View style={styles.liveBadge}>
              <Ionicons name="sparkles-outline" size={14} color={theme.colors.charcoal} />
              <Text style={styles.liveBadgeText}>Fresh today</Text>
            </View>
          </View>
          <Text style={styles.title}>Cravings made fresh, colorful, and comforting.</Text>
          <Text style={styles.heroCopy}>
            Wake up your taste buds with hot Bagara Rice, rich curries, crisp snacks, and chai-time favorites delivered fresh.
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>15 min</Text>
              <Text style={styles.statLabel}>typical delivery</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>4.8</Text>
              <Text style={styles.statLabel}>team rating</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>18</Text>
              <Text style={styles.statLabel}>fresh picks</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today&apos;s Picks</Text>
          <Text style={styles.sectionSubtext}>
            {visibleSnacks.length} options across South Indian, North Indian, healthy, sweets, and beverages.
          </Text>
        </View>

        <TextInput
          autoCapitalize="none"
          onChangeText={setQuery}
          placeholder="Search snacks"
          placeholderTextColor={theme.colors.muted}
          style={styles.searchInput}
          value={query}
        />

        <View style={styles.comboSection}>
          <Text style={styles.comboTitle}>Quick combos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.comboRow}>
              {combos.map((combo) => (
                <Pressable
                  accessibilityRole="button"
                  key={combo.name}
                  onPress={() => addCombo(combo.items)}
                  style={({ pressed }) => [
                    styles.comboButton,
                    { borderLeftColor: combo.accent },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.comboIcon, { backgroundColor: combo.accent }]}>
                    <Ionicons name="restaurant-outline" size={18} color={theme.colors.white} />
                  </View>
                  <Text style={styles.comboName}>{combo.name}</Text>
                  <Text style={styles.comboItems}>{combo.items.join(" + ")}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.categoryRow}>
            {categories.map((nextCategory) => (
              <Pressable
                key={nextCategory}
                accessibilityRole="button"
                onPress={() => setCategory(nextCategory)}
                style={[
                  styles.categoryChip,
                  category === nextCategory && styles.activeCategoryChip,
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    category === nextCategory && styles.activeCategoryChipText,
                  ]}
                >
                  {nextCategory}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.categoryRow}>
            {preferenceFilters.map((nextPreference) => (
              <Pressable
                key={nextPreference}
                accessibilityRole="button"
                onPress={() => setPreference(nextPreference)}
                style={[
                  styles.preferenceChip,
                  preference === nextPreference && styles.activePreferenceChip,
                ]}
              >
                <Text
                  style={[
                    styles.preferenceChipText,
                    preference === nextPreference && styles.activePreferenceChipText,
                  ]}
                >
                  {nextPreference}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View style={styles.list}>
          {visibleSnacks.map((snack) => (
            <SnackCard
              isFavorite={favoriteIds.includes(String(snack.id))}
              key={snack.id}
              snack={snack}
              onAdd={addSnack}
              onPress={setSelectedSnack}
              onToggleFavorite={toggleFavorite}
            />
          ))}
          {visibleSnacks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No matching snacks</Text>
              <Text style={styles.emptyText}>Try a different category, preference, or search term.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Modal visible={Boolean(selectedSnack)} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalPanel}>
            {selectedSnack ? (
              <>
                {getSnackImage(selectedSnack.name) ? (
                  <Image
                    accessibilityIgnoresInvertColors
                    source={getSnackImage(selectedSnack.name)}
                    style={styles.detailImage}
                  />
                ) : null}
                <Text style={styles.detailTitle}>{selectedSnack.name}</Text>
                <Text style={styles.detailDescription}>{selectedSnack.description}</Text>
                <Text style={styles.detailMeta}>
                  Rs {selectedSnack.price} - {selectedSnack.prepMinutes} min -{" "}
                  {selectedSnack.calories} cal
                </Text>
                <Text style={styles.detailLabel}>Ingredients</Text>
                <Text style={styles.detailDescription}>
                  {(selectedSnack.ingredients ?? []).length > 0
                    ? selectedSnack.ingredients?.join(", ")
                    : "Details coming soon"}
                </Text>
                <Text style={styles.detailLabel}>Allergens</Text>
                <Text style={styles.detailDescription}>
                  {(selectedSnack.allergens ?? []).length > 0
                    ? selectedSnack.allergens?.join(", ")
                    : "No listed allergens"}
                </Text>
                <View style={styles.modalActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      addSnack(selectedSnack);
                      setSelectedSnack(null);
                    }}
                    style={styles.modalPrimaryButton}
                  >
                    <Text style={styles.modalPrimaryText}>Add to Cart</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setSelectedSnack(null)}
                    style={styles.modalSecondaryButton}
                  >
                    <Text style={styles.modalSecondaryText}>Close</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  activeCategoryChip: {
    backgroundColor: theme.colors.leaf,
    borderColor: theme.colors.leaf,
  },
  activeCategoryChipText: {
    color: theme.colors.white,
  },
  activePreferenceChip: {
    backgroundColor: "#e0f2fe",
    borderColor: theme.colors.sky,
  },
  activePreferenceChipText: {
    color: theme.colors.charcoal,
  },
  categoryChip: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  categoryChipText: {
    color: theme.colors.charcoal,
    fontSize: 14,
    fontWeight: "800",
  },
  categoryRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.md,
  },
  comboButton: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderLeftWidth: 5,
    borderWidth: 1,
    minHeight: 86,
    padding: theme.spacing.md,
    width: 210,
  },
  comboIcon: {
    alignItems: "center",
    borderRadius: theme.radius.sm,
    height: 34,
    justifyContent: "center",
    marginBottom: theme.spacing.sm,
    width: 34,
  },
  comboItems: {
    color: theme.colors.muted,
    fontFamily: theme.fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: theme.spacing.xs,
  },
  comboName: {
    color: theme.colors.charcoal,
    fontFamily: theme.fonts.extraBold,
    fontSize: 15,
    fontWeight: "900",
  },
  comboRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.md,
  },
  comboSection: {
    gap: theme.spacing.sm,
  },
  comboTitle: {
    color: theme.colors.charcoal,
    fontFamily: theme.fonts.extraBold,
    fontSize: 17,
    fontWeight: "900",
  },
  content: {
    gap: theme.spacing.lg,
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  hero: {
    borderRadius: theme.radius.lg,
    minHeight: 210,
    overflow: "hidden",
    padding: theme.spacing.lg,
  },
  heroCopy: {
    color: theme.colors.charcoal,
    fontFamily: theme.fonts.medium,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
    marginTop: theme.spacing.sm,
    maxWidth: 330,
  },
  heroTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailDescription: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: theme.spacing.sm,
  },
  detailLabel: {
    color: theme.colors.charcoal,
    fontSize: 14,
    fontWeight: "900",
    marginTop: theme.spacing.md,
  },
  detailImage: {
    borderRadius: theme.radius.sm,
    height: 220,
    marginBottom: theme.spacing.md,
    width: "100%",
  },
  detailMeta: {
    color: theme.colors.charcoal,
    fontSize: 14,
    fontWeight: "900",
    marginTop: theme.spacing.md,
  },
  detailTitle: {
    color: theme.colors.charcoal,
    fontSize: 24,
    fontWeight: "900",
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.xs,
    padding: theme.spacing.lg,
  },
  emptyText: {
    color: theme.colors.muted,
    fontSize: 14,
    textAlign: "center",
  },
  emptyTitle: {
    color: theme.colors.charcoal,
    fontSize: 16,
    fontWeight: "900",
  },
  heroStats: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xl,
  },
  kicker: {
    color: theme.colors.grape,
    fontFamily: theme.fonts.extraBold,
    fontSize: 14,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  list: {
    gap: theme.spacing.md,
  },
  liveBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderColor: "rgba(255, 255, 255, 0.88)",
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  liveBadgeText: {
    color: theme.colors.charcoal,
    fontFamily: theme.fonts.extraBold,
    fontSize: 12,
    fontWeight: "900",
  },
  modalActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  modalBackdrop: {
    backgroundColor: "rgba(31, 41, 51, 0.45)",
    flex: 1,
    justifyContent: "flex-end",
    padding: theme.spacing.md,
  },
  modalPanel: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  modalPrimaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.leaf,
    borderRadius: theme.radius.sm,
    flex: 1,
    paddingVertical: theme.spacing.md,
  },
  modalPrimaryText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: "900",
  },
  modalSecondaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.cloud,
    borderRadius: theme.radius.sm,
    flex: 1,
    paddingVertical: theme.spacing.md,
  },
  modalSecondaryText: {
    color: theme.colors.charcoal,
    fontSize: 15,
    fontWeight: "900",
  },
  preferenceChip: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  preferenceChipText: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.78,
  },
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  sectionHeader: {
    gap: theme.spacing.xs,
  },
  sectionSubtext: {
    color: theme.colors.muted,
    fontFamily: theme.fonts.body,
    fontSize: 14,
  },
  sectionTitle: {
    color: theme.colors.charcoal,
    fontFamily: theme.fonts.display,
    fontSize: 24,
    fontWeight: "900",
  },
  searchInput: {
    backgroundColor: theme.colors.white,
    borderColor: "#f0c36a",
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.charcoal,
    fontSize: 15,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  statLabel: {
    color: theme.colors.charcoal,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  statTile: {
    backgroundColor: "rgba(255, 255, 255, 0.66)",
    borderColor: "rgba(255, 255, 255, 0.86)",
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flex: 1,
    padding: theme.spacing.sm,
  },
  statValue: {
    color: theme.colors.charcoal,
    fontSize: 19,
    fontWeight: "900",
  },
  title: {
    color: theme.colors.charcoal,
    fontFamily: theme.fonts.displayBlack,
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 38,
    marginTop: theme.spacing.sm,
    maxWidth: 330,
  },
});
