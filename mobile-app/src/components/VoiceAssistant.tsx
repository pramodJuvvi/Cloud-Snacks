import { Ionicons } from "@expo/vector-icons";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import * as Speech from "expo-speech";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { getSnacks } from "../api/client";
import { useCart } from "../context/CartContext";
import { useVoiceCommand, type AccountMenuSection } from "../context/VoiceCommandContext";
import { snacks as fallbackSnacks } from "../data/snacks";
import { theme } from "../theme";
import type { Snack } from "../types";

type VoiceAssistantProps = {
  navigateTo: (screen: "Snacks" | "Cart" | "Track" | "Account") => void;
};

const comboCommands = [
  { name: "Hyderabadi meal", terms: ["hyderabadi meal", "bagara combo"], items: ["Bagara Rice", "Chicken Curry"] },
  { name: "South breakfast", terms: ["south breakfast", "idli coffee"], items: ["Mini Idli Podi Box", "Filter Coffee Shot"] },
  { name: "Chai snack", terms: ["chai snack", "tea snack"], items: ["Aloo Paratha Dippers", "Masala Chai Flask"] },
];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

const numberWords: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toQuantity(value?: string) {
  if (!value) {
    return 1;
  }

  return Number(value) || numberWords[value] || 1;
}

function findSnack(command: string, snackCatalog: Snack[]): Snack | undefined {
  const normalizedCommand = normalize(command);
  return snackCatalog.find((snack) => {
    const snackName = normalize(snack.name);
    const importantWords = snackName.split(" ").filter((word) => word.length > 2);
    return (
      normalizedCommand.includes(snackName) ||
      importantWords.every((word) => normalizedCommand.includes(word))
    );
  });
}

function findMentionedSnacks(command: string, snackCatalog: Snack[]) {
  const normalizedCommand = normalize(command);
  return snackCatalog.filter((snack) => {
    const snackName = normalize(snack.name);
    const importantWords = snackName.split(" ").filter((word) => word.length > 2);
    return (
      normalizedCommand.includes(snackName) ||
      (importantWords.length > 1 && importantWords.every((word) => normalizedCommand.includes(word)))
    );
  });
}

function quantityForSnack(command: string, snack: Snack) {
  const normalizedCommand = normalize(command);
  const snackName = escapeRegExp(normalize(snack.name));
  const amountPattern = "(\\d+|one|two|three|four|five|six)";
  const beforeMatch = normalizedCommand.match(new RegExp(`${amountPattern}\\s+${snackName}`));
  const afterMatch = normalizedCommand.match(new RegExp(`${snackName}\\s+${amountPattern}`));
  return Math.min(Math.max(toQuantity(beforeMatch?.[1] ?? afterMatch?.[1]), 1), 6);
}

function titleList(items: string[]) {
  if (items.length <= 2) {
    return items.join(" and ");
  }
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function VoiceAssistant({ navigateTo }: VoiceAssistantProps) {
  const { addSnack, clearCart, totalItems } = useCart();
  const { sendCartIntent, setAccountSection, setMenuSearch } = useVoiceCommand();
  const [snackCatalog, setSnackCatalog] = useState<Snack[]>(fallbackSnacks);
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("Tap and say: add chicken curry, search dosa, go to cart, track order.");
  const lastTranscriptRef = useRef("");
  const handledCommandRef = useRef("");
  const actionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isMounted = true;

    getSnacks()
      .then((apiSnacks) => {
        if (isMounted && apiSnacks.length > 0) {
          setSnackCatalog(apiSnacks);
        }
      })
      .catch(() => setSnackCatalog(fallbackSnacks));

    return () => {
      isMounted = false;
      if (actionTimerRef.current) {
        clearTimeout(actionTimerRef.current);
      }
    };
  }, []);

  const contextualStrings = useMemo(
    () => [
      "add chicken curry",
      "add bagara rice",
      "add Hyderabadi meal",
      "search dosa",
      "go to cart",
      "track order",
      "open account",
      "open addresses",
      "open preferences",
      "open license",
      "contact admin",
      "apply FIRST50",
      "set spicy",
      "schedule dinner",
      "place order",
      "clear cart",
      ...snackCatalog.map((snack) => snack.name),
    ],
    [snackCatalog],
  );

  const speak = (message: string) => {
    setReply(message);
    Speech.stop();
    Speech.speak(message, {
      language: "en-IN",
      pitch: 1.02,
      rate: 0.94,
    });
  };

  const handleCommand = (rawCommand: string) => {
    const command = normalize(rawCommand);
    if (!command) {
      speak("I did not catch that. Please try again.");
      return;
    }

    const openAccountSection = (section: AccountMenuSection, label: string) => {
      setAccountSection(section);
      navigateTo("Account");
      speak(`Opening ${label}.`);
    };

    const combo = comboCommands.find((nextCombo) =>
      nextCombo.terms.some((term) => command.includes(term)),
    );
    if (combo) {
      combo.items.forEach((itemName) => {
        const snack = snackCatalog.find((nextSnack) => nextSnack.name === itemName);
        if (snack) {
          addSnack(snack);
        }
      });
      navigateTo("Cart");
      speak(`${combo.name} added. I opened your cart.`);
      return;
    }

    if (command.includes("clear cart") || command.includes("empty cart")) {
      clearCart();
      navigateTo("Cart");
      speak("Your cart is cleared.");
      return;
    }

    if (command.includes("license") || command.includes("certificate") || command.includes("fssai")) {
      openAccountSection("compliance", "the FSSAI license");
      return;
    }

    if (command.includes("contact admin") || command.includes("support") || command.includes("help desk")) {
      openAccountSection("contact", "customer support");
      return;
    }

    if (command.includes("address") || command.includes("delivery location")) {
      openAccountSection("addresses", "delivery addresses");
      return;
    }

    if (command.includes("preference") || command.includes("setting") || command.includes("option") || command.includes("configuration")) {
      openAccountSection("preferences", "preferences");
      return;
    }

    if (command.includes("service")) {
      openAccountSection("services", "customer services");
      return;
    }

    if (command.startsWith("search ") || command.startsWith("find ") || command.startsWith("show ")) {
      const nextQuery = command.replace(/^(search|find|show)\s+/, "").trim();
      if (nextQuery) {
        setMenuSearch(nextQuery);
        navigateTo("Snacks");
        speak(`Showing menu results for ${nextQuery}.`);
        return;
      }
    }

    const coupon = ["FIRST50", "COMBO20", "FREESHIP"].find((nextCoupon) =>
      command.includes(nextCoupon.toLowerCase()),
    );
    if (coupon || command.includes("free delivery")) {
      const couponCode = coupon ?? "FREESHIP";
      sendCartIntent("coupon", couponCode);
      navigateTo("Cart");
      speak(`${couponCode} applied in your cart.`);
      return;
    }

    if (command.includes("mild spice") || command.includes("set mild") || command === "mild") {
      sendCartIntent("spice", "Mild");
      navigateTo("Cart");
      speak("Mild spice selected.");
      return;
    }

    if (command.includes("medium spice") || command.includes("set medium")) {
      sendCartIntent("spice", "Medium");
      navigateTo("Cart");
      speak("Medium spice selected.");
      return;
    }

    if (command.includes("spicy") || command.includes("extra spice") || command.includes("set spicy")) {
      sendCartIntent("spice", "Spicy");
      navigateTo("Cart");
      speak("Spicy preference selected.");
      return;
    }

    if (command.includes("upi")) {
      sendCartIntent("payment", "UPI on delivery");
      navigateTo("Cart");
      speak("UPI on delivery selected.");
      return;
    }

    if (command.includes("cash")) {
      sendCartIntent("payment", "Cash on delivery");
      navigateTo("Cart");
      speak("Cash on delivery selected.");
      return;
    }

    if (command.includes("lunch")) {
      sendCartIntent("schedule", "Lunch");
      navigateTo("Cart");
      speak("Lunch schedule selected.");
      return;
    }

    if (command.includes("evening") || command.includes("snack time")) {
      sendCartIntent("schedule", "Evening snack");
      navigateTo("Cart");
      speak("Evening snack schedule selected.");
      return;
    }

    if (command.includes("dinner")) {
      sendCartIntent("schedule", "Dinner");
      navigateTo("Cart");
      speak("Dinner schedule selected.");
      return;
    }

    if (command.includes("place order") || command.includes("confirm order") || command.includes("checkout now")) {
      sendCartIntent("placeOrder");
      navigateTo("Cart");
      speak("Trying to place your order. Please check any missing address or phone details.");
      return;
    }

    const addIntent =
      command.includes("add") ||
      command.includes("order") ||
      command.includes("want") ||
      command.includes("buy") ||
      command.includes("get") ||
      command.includes("cart");
    const mentionedSnacks = findMentionedSnacks(command, snackCatalog).filter(
      (snack) => snack.isAvailable ?? true,
    );

    if (addIntent && mentionedSnacks.length > 0) {
      const addedItems: string[] = [];
      mentionedSnacks.forEach((snack) => {
        const quantity = quantityForSnack(command, snack);
        for (let count = 0; count < quantity; count += 1) {
          addSnack(snack);
        }
        addedItems.push(`${quantity} ${snack.name}`);
      });
      navigateTo("Cart");
      speak(`${titleList(addedItems)} added to your cart.`);
      return;
    }

    const snack = findSnack(command, snackCatalog);
    if (snack && command.includes("details")) {
      setMenuSearch(snack.name);
      navigateTo("Snacks");
      speak(`Showing ${snack.name} on the menu.`);
      return;
    }

    if (command.includes("cart") || command.includes("checkout") || command.includes("place order")) {
      navigateTo("Cart");
      speak(totalItems > 0 ? `Opening cart with ${totalItems} items.` : "Opening cart. It is empty right now.");
      return;
    }

    if (command.includes("repeat order") || command.includes("reorder")) {
      navigateTo("Track");
      speak("Opening tracking and past orders. Use Repeat on the order you want again.");
      return;
    }

    if (command.includes("kitchen camera") || command.includes("live kitchen")) {
      navigateTo("Track");
      speak("Opening tracking. Kitchen camera appears while an order is preparing.");
      return;
    }

    if (command.includes("track") || command.includes("status") || command.includes("delivery")) {
      navigateTo("Track");
      speak("Opening delivery tracking.");
      return;
    }

    if (command.includes("account") || command.includes("login") || command.includes("sign in")) {
      navigateTo("Account");
      speak("Opening your account screen.");
      return;
    }

    if (command.includes("menu") || command.includes("snack") || command.includes("home")) {
      navigateTo("Snacks");
      speak("Opening the snacks menu.");
      return;
    }

    if (command.includes("help") || command.includes("what can you do")) {
      speak("Try add two chicken curry and one bagara rice, apply FIRST50, set spicy, schedule dinner, open addresses, open license, track order, or place order.");
      return;
    }

    speak("I can act on menu, cart, offers, spice, payment, schedule, tracking, account sections, repeat orders, and kitchen camera commands. Please try one action.");
  };

  const runCommandOnce = (rawCommand: string) => {
    const normalizedCommand = normalize(rawCommand);
    if (!normalizedCommand || normalizedCommand === handledCommandRef.current) {
      return;
    }

    handledCommandRef.current = normalizedCommand;
    handleCommand(rawCommand);
  };

  useSpeechRecognitionEvent("start", () => setIsListening(true));
  useSpeechRecognitionEvent("end", () => {
    setIsListening(false);
    runCommandOnce(lastTranscriptRef.current);
  });
  useSpeechRecognitionEvent("error", (event) => {
    setIsListening(false);
    speak(event.error === "not-allowed" ? "Microphone permission is needed for voice commands." : "Voice command failed. Please try again.");
  });
  useSpeechRecognitionEvent("result", (event) => {
    const nextTranscript = event.results[0]?.transcript ?? "";
    lastTranscriptRef.current = nextTranscript;
    setTranscript(nextTranscript);
    if (actionTimerRef.current) {
      clearTimeout(actionTimerRef.current);
    }
    actionTimerRef.current = setTimeout(() => runCommandOnce(nextTranscript), 900);
    if (event.isFinal) {
      runCommandOnce(nextTranscript);
    }
  });

  const startListening = async () => {
    setIsOpen(true);
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      speak("Please allow microphone permission to use voice commands.");
      return;
    }

    setTranscript("");
    lastTranscriptRef.current = "";
    handledCommandRef.current = "";
    setReply("Listening...");
    ExpoSpeechRecognitionModule.start({
      lang: "en-IN",
      interimResults: true,
      continuous: false,
      contextualStrings,
      androidIntentOptions: {
        EXTRA_LANGUAGE_MODEL: "web_search",
      },
    });
  };

  const stopListening = () => {
    ExpoSpeechRecognitionModule.stop();
  };

  const closeAssistant = () => {
    if (actionTimerRef.current) {
      clearTimeout(actionTimerRef.current);
      actionTimerRef.current = null;
    }
    ExpoSpeechRecognitionModule.stop();
    Speech.stop();
    setIsListening(false);
    setTranscript("");
    setReply("Tap and say: add chicken curry, search dosa, go to cart, track order.");
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <View pointerEvents="box-none" style={styles.iconOverlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open voice assistant"
          onPress={startListening}
          style={({ pressed }) => [styles.floatingMicButton, pressed && styles.pressed]}
        >
          <Ionicons name="mic-outline" size={26} color={theme.colors.white} />
        </Pressable>
      </View>
    );
  }

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <View style={styles.panel}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isListening ? "Stop voice assistant" : "Start voice assistant"}
          onPress={isListening ? stopListening : startListening}
          style={({ pressed }) => [
            styles.micButton,
            isListening && styles.micButtonActive,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name={isListening ? "mic" : "mic-outline"} size={24} color={theme.colors.white} />
        </Pressable>
        <View style={styles.copy}>
          <Text style={styles.title}>Voice Assistant</Text>
          <Text numberOfLines={2} style={styles.reply}>{transcript || reply}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close voice assistant"
          onPress={closeAssistant}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
        >
          <Ionicons name="close" size={20} color={theme.colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  copy: {
    flex: 1,
  },
  floatingMicButton: {
    alignItems: "center",
    backgroundColor: theme.colors.grape,
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 31,
    borderWidth: 2,
    elevation: 5,
    height: 62,
    justifyContent: "center",
    shadowColor: "#172033",
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    width: 62,
  },
  iconOverlay: {
    bottom: 82,
    position: "absolute",
    right: theme.spacing.md,
  },
  micButton: {
    alignItems: "center",
    backgroundColor: theme.colors.grape,
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  micButtonActive: {
    backgroundColor: theme.colors.tomato,
  },
  overlay: {
    bottom: 78,
    left: theme.spacing.md,
    position: "absolute",
    right: theme.spacing.md,
  },
  panel: {
    alignItems: "center",
    backgroundColor: "rgba(23, 32, 51, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.md,
    padding: theme.spacing.sm,
  },
  pressed: {
    opacity: 0.78,
  },
  reply: {
    color: "#dbeafe",
    fontFamily: theme.fonts.medium,
    fontSize: theme.type.small,
    lineHeight: 19,
    marginTop: 2,
  },
  title: {
    color: theme.colors.white,
    fontFamily: theme.fonts.extraBold,
    fontSize: theme.type.button,
  },
});
