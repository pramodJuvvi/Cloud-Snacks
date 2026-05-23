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
  { name: "Family trial pack", terms: ["family trial", "kids teen box", "family box"], items: ["Kids Telangana Starter Box", "Teen Energy Builder Box"] },
  { name: "Office wellness pack", terms: ["office wellness", "adult office box", "adult box"], items: ["Adult Workday Balance Box", "Adult Millet Lunch Box"] },
  { name: "Senior care pack", terms: ["senior care", "senior box", "elder box"], items: ["Senior Light Comfort Box", "Senior Millet Digest Box"] },
];

function normalize(value: string) {
  const normalizedValue = value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const replacements: [RegExp, string][] = [
    [/\b(begara|baghara|bagada|bagarae|bagar|bhagara|bhagara rice)\b/g, "bagara"],
    [/\b(chikan|chiken|chickan|chickin)\b/g, "chicken"],
    [/\b(kari|carry|cari)\b/g, "curry"],
    [/\b(dosae|dose|dhosai|dosai)\b/g, "dosa"],
    [/\b(idly|idlee|idle)\b/g, "idli"],
    [/\b(wada|vadaa)\b/g, "vada"],
    [/\b(upi|you pee eye|youpi|upi payment)\b/g, "upi"],
    [/\b(card|kart|court|cot)\b/g, "cart"],
    [/\b(truck|trac|trak|trackking)\b/g, "track"],
    [/\b(older|odar|ordar)\b/g, "order"],
    [/\b(licence|licensee|fssai license)\b/g, "license"],
    [/\b(adress|addresss)\b/g, "address"],
    [/\b(setting|settings|configuration|configurations)\b/g, "preference"],
    [/\b(pehle|first fifty|first 50|first fifty coupon)\b/g, "first50"],
    [/\b(free ship|free shipping|free delivery coupon)\b/g, "freeship"],
    [/\b(khaana|khana|food items|items)\b/g, "snack"],
    [/\b(khana chahiye|chahiye|chahie|chaahiye)\b/g, "want"],
    [/\b(dena|de do|dedo|dijiye|please give)\b/g, "add"],
    [/\b(khol|kholo|open karo)\b/g, "open"],
    [/\b(paise|payment mode)\b/g, "payment"],
    [/\b(order laga do|order kardo|order kar do)\b/g, "place order"],
  ];

  return replacements
    .reduce((command, [pattern, replacement]) => command.replace(pattern, replacement), normalizedValue)
    .replace(/\s+/g, " ")
    .trim();
}

const numberWords: Record<string, number> = {
  one: 1,
  ek: 1,
  two: 2,
  do: 2,
  three: 3,
  teen: 3,
  four: 4,
  chaar: 4,
  char: 4,
  five: 5,
  panch: 5,
  six: 6,
  che: 6,
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

function levenshtein(left: string, right: string) {
  const matrix = Array.from({ length: left.length + 1 }, (_, row) =>
    Array.from({ length: right.length + 1 }, (_, column) => (row === 0 ? column : column === 0 ? row : 0)),
  );

  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      );
    }
  }

  return matrix[left.length][right.length];
}

function wordMatches(commandWords: string[], expectedWord: string) {
  if (expectedWord.length <= 2) {
    return commandWords.includes(expectedWord);
  }
  return commandWords.some((word) => {
    if (word === expectedWord || word.includes(expectedWord) || expectedWord.includes(word)) {
      return true;
    }
    const allowedDistance = expectedWord.length > 6 ? 2 : 1;
    return levenshtein(word, expectedWord) <= allowedDistance;
  });
}

function phraseMatches(command: string, phrase: string) {
  const normalizedPhrase = normalize(phrase);
  if (command.includes(normalizedPhrase)) {
    return true;
  }
  const commandWords = command.split(" ");
  const phraseWords = normalizedPhrase.split(" ").filter((word) => word.length > 2);
  return phraseWords.length > 0 && phraseWords.every((word) => wordMatches(commandWords, word));
}

function includesAny(command: string, phrases: string[]) {
  return phrases.some((phrase) => phraseMatches(command, phrase));
}

const snackAliases: Record<string, string[]> = {
  "Kids Telangana Starter Box": ["kids box", "children box", "school box", "kids telangana"],
  "Teen Energy Builder Box": ["teen box", "teenager box", "energy box", "student box"],
  "Adult Workday Balance Box": ["adult box", "office box", "workday box"],
  "Senior Light Comfort Box": ["senior box", "elder box", "senior comfort"],
  "Bagara Rice": ["bagara rice", "bagara", "begara rice", "baghara rice", "rice"],
  "Chicken Curry": ["chicken curry", "chicken carry", "chicken gravy", "chicken", "curry"],
  "Masala Dosa Roll": ["masala dosa", "dosa roll", "dosa"],
  "Mini Idli Podi Box": ["idli", "mini idli", "idly", "podi idli"],
  "Medu Vada Minis": ["medu vada", "vada", "wada"],
  "Filter Coffee Shot": ["filter coffee", "coffee"],
  "Masala Chai Flask": ["masala chai", "chai", "tea"],
  "Aloo Paratha Dippers": ["aloo paratha", "paratha"],
  "Paneer Tikka Skewers": ["paneer tikka", "paneer"],
  "Chole Kulcha Pocket": ["chole kulcha", "chole", "kulcha"],
  "Rajma Rice Bowl": ["rajma rice", "rajma"],
  "Curd Rice Comfort Cup": ["curd rice", "curd rice cup"],
};

function aliasesForSnack(snack: Snack) {
  return [snack.name, ...(snackAliases[snack.name] ?? [])];
}

function findSnack(command: string, snackCatalog: Snack[]): Snack | undefined {
  const normalizedCommand = normalize(command);
  return snackCatalog.find((snack) =>
    aliasesForSnack(snack).some((alias) => phraseMatches(normalizedCommand, alias)),
  );
}

function findMentionedSnacks(command: string, snackCatalog: Snack[]) {
  const normalizedCommand = normalize(command);
  return snackCatalog.filter((snack) =>
    aliasesForSnack(snack).some((alias) => phraseMatches(normalizedCommand, alias)),
  );
}

function quantityForSnack(command: string, snack: Snack) {
  const normalizedCommand = normalize(command);
  const snackNames = aliasesForSnack(snack).map((alias) => escapeRegExp(normalize(alias)));
  const amountPattern = `(\\d+|${Object.keys(numberWords).join("|")})`;
  const beforeMatch = snackNames
    .map((snackName) => normalizedCommand.match(new RegExp(`${amountPattern}\\s+${snackName}`)))
    .find(Boolean);
  const afterMatch = snackNames
    .map((snackName) => normalizedCommand.match(new RegExp(`${snackName}\\s+${amountPattern}`)))
    .find(Boolean);
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
      "add kids box",
      "subscribe teen box",
      "add adult office box",
      "subscribe senior box",
      "add do chicken curry",
      "two chicken curry",
      "do chicken curry",
      "add bagara rice",
      "ek bagara rice",
      "do bagara rice",
      "begara rice",
      "baghara rice",
      "add Hyderabadi meal",
      "bagara rice and chicken curry",
      "search dosa",
      "go to cart",
      "open cart",
      "track order",
      "delivery tracking",
      "where is my order",
      "open account",
      "open addresses",
      "open preferences",
      "open license",
      "contact admin",
      "apply FIRST50",
      "first fifty coupon",
      "free shipping coupon",
      "set spicy",
      "cash on delivery",
      "upi payment",
      "schedule dinner",
      "place order",
      "clear cart",
      "repeat order",
      "live kitchen camera",
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

    const combo = comboCommands.find((nextCombo) => includesAny(command, nextCombo.terms));
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

    if (includesAny(command, ["clear cart", "empty cart", "remove all", "cart clear", "delete cart"])) {
      clearCart();
      navigateTo("Cart");
      speak("Your cart is cleared.");
      return;
    }

    if (includesAny(command, ["license", "certificate", "fssai", "compliance"])) {
      openAccountSection("compliance", "the FSSAI license");
      return;
    }

    if (includesAny(command, ["contact admin", "support", "help desk", "customer care", "call admin"])) {
      openAccountSection("contact", "customer support");
      return;
    }

    if (includesAny(command, ["address", "delivery location", "home location", "my location"])) {
      openAccountSection("addresses", "delivery addresses");
      return;
    }

    if (includesAny(command, ["preference", "setting", "option", "configuration", "my choices"])) {
      openAccountSection("preferences", "preferences");
      return;
    }

    if (includesAny(command, ["service", "services", "customer service"])) {
      openAccountSection("services", "customer services");
      return;
    }

    if (includesAny(command, ["search", "find", "show", "display"])) {
      const nextQuery = command.replace(/^(search|find|show|display|open)\s+/, "").trim();
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
    if (coupon || includesAny(command, ["free delivery", "free shipping", "delivery coupon"])) {
      const couponCode = coupon ?? "FREESHIP";
      sendCartIntent("coupon", couponCode);
      navigateTo("Cart");
      speak(`${couponCode} applied in your cart.`);
      return;
    }

    if (includesAny(command, ["mild spice", "set mild", "less spicy", "low spice"]) || command === "mild") {
      sendCartIntent("spice", "Mild");
      navigateTo("Cart");
      speak("Mild spice selected.");
      return;
    }

    if (includesAny(command, ["medium spice", "set medium", "normal spice"])) {
      sendCartIntent("spice", "Medium");
      navigateTo("Cart");
      speak("Medium spice selected.");
      return;
    }

    if (includesAny(command, ["spicy", "extra spice", "set spicy", "more spicy", "high spice"])) {
      sendCartIntent("spice", "Spicy");
      navigateTo("Cart");
      speak("Spicy preference selected.");
      return;
    }

    if (includesAny(command, ["upi", "upi payment", "online payment", "phonepe", "google pay", "gpay"])) {
      sendCartIntent("payment", "UPI on delivery");
      navigateTo("Cart");
      speak("UPI on delivery selected.");
      return;
    }

    if (includesAny(command, ["cash", "cash on delivery", "cod"])) {
      sendCartIntent("payment", "Cash on delivery");
      navigateTo("Cart");
      speak("Cash on delivery selected.");
      return;
    }

    if (includesAny(command, ["lunch", "afternoon"])) {
      sendCartIntent("schedule", "Lunch");
      navigateTo("Cart");
      speak("Lunch schedule selected.");
      return;
    }

    if (includesAny(command, ["evening", "snack time", "evening snack", "tea time"])) {
      sendCartIntent("schedule", "Evening snack");
      navigateTo("Cart");
      speak("Evening snack schedule selected.");
      return;
    }

    if (includesAny(command, ["dinner", "night", "tonight"])) {
      sendCartIntent("schedule", "Dinner");
      navigateTo("Cart");
      speak("Dinner schedule selected.");
      return;
    }

    if (includesAny(command, ["place order", "confirm order", "checkout now", "order now", "order laga do"])) {
      sendCartIntent("placeOrder");
      navigateTo("Cart");
      speak("Trying to place your order. Please check any missing address or phone details.");
      return;
    }

    const addIntent =
      includesAny(command, ["add", "order", "want", "buy", "get", "cart", "give", "take", "need", "pack", "parcel"]);
    const mentionedSnacks = findMentionedSnacks(command, snackCatalog).filter(
      (snack) => snack.isAvailable ?? true,
    );

    const looksLikeFoodOnlyOrder =
      mentionedSnacks.length > 0 &&
      !includesAny(command, ["search", "find", "show", "details", "open", "track", "status"]);

    if ((addIntent || looksLikeFoodOnlyOrder) && mentionedSnacks.length > 0) {
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
    if (snack && includesAny(command, ["details", "show", "search", "find"])) {
      setMenuSearch(snack.name);
      navigateTo("Snacks");
      speak(`Showing ${snack.name} on the menu.`);
      return;
    }

    if (includesAny(command, ["cart", "checkout", "place order", "basket"])) {
      navigateTo("Cart");
      speak(totalItems > 0 ? `Opening cart with ${totalItems} items.` : "Opening cart. It is empty right now.");
      return;
    }

    if (includesAny(command, ["repeat order", "reorder", "same order", "previous order"])) {
      navigateTo("Track");
      speak("Opening tracking and past orders. Use Repeat on the order you want again.");
      return;
    }

    if (includesAny(command, ["kitchen camera", "live kitchen", "camera", "live cooking"])) {
      navigateTo("Track");
      speak("Opening tracking. Kitchen camera appears while an order is preparing.");
      return;
    }

    if (includesAny(command, ["track", "status", "delivery", "where is my order", "order location"])) {
      navigateTo("Track");
      speak("Opening delivery tracking.");
      return;
    }

    if (includesAny(command, ["account", "login", "sign in", "profile"])) {
      navigateTo("Account");
      speak("Opening your account screen.");
      return;
    }

    if (includesAny(command, ["menu", "snack", "home", "food"])) {
      navigateTo("Snacks");
      speak("Opening the snacks menu.");
      return;
    }

    if (includesAny(command, ["help", "what can you do", "voice help"])) {
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
        EXTRA_ENABLE_BIASING_DEVICE_CONTEXT: true,
        EXTRA_LANGUAGE_DETECTION_ALLOWED_LANGUAGES: ["en-IN", "hi-IN"],
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
