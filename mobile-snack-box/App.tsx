import { Ionicons } from "@expo/vector-icons";
import { createNavigationContainerRef, NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black,
} from "@expo-google-fonts/poppins";
import { PlayfairDisplay_700Bold, PlayfairDisplay_900Black } from "@expo-google-fonts/playfair-display";
import { StatusBar } from "expo-status-bar";
import { Text, TextInput, type TextInputProps, type TextProps } from "react-native";

import { CartProvider, useCart } from "./src/context/CartContext";
import { VoiceCommandProvider } from "./src/context/VoiceCommandContext";
import { AccountScreen } from "./src/screens/AccountScreen";
import { AdminScreen } from "./src/screens/AdminScreen";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { CartScreen } from "./src/screens/CartScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { TrackScreen } from "./src/screens/TrackScreen";
import { theme } from "./src/theme";
import { VoiceAssistant } from "./src/components/VoiceAssistant";
import { NotificationFallbackBanner } from "./src/components/NotificationFallbackBanner";

type RootTabParamList = {
  Snacks: undefined;
  Cart: undefined;
  Track: undefined;
  Account: undefined;
  Admin: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const navigationRef = createNavigationContainerRef<RootTabParamList>();

(Text as unknown as { defaultProps?: TextProps }).defaultProps = {
  ...((Text as unknown as { defaultProps?: TextProps }).defaultProps ?? {}),
  style: [{ fontFamily: theme.fonts.body }],
};

(TextInput as unknown as { defaultProps?: TextInputProps }).defaultProps = {
  ...((TextInput as unknown as { defaultProps?: TextInputProps }).defaultProps ?? {}),
  style: [{ fontFamily: theme.fonts.body }],
};

function Tabs() {
  const { totalItems } = useCart();
  const { isAdmin, isLoading, user } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <AccountScreen />;
  }

  const navigateToCustomerTab = (screen: "Snacks" | "Cart" | "Track" | "Account") => {
    if (navigationRef.isReady()) {
      navigationRef.navigate(screen);
    }
  };

  return (
    <>
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.leaf,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: {
          borderTopColor: theme.colors.border,
          height: 66,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: theme.fonts.medium,
          fontSize: 12,
        },
        tabBarIcon: ({ color, size }) => {
          const iconName =
            route.name === "Snacks"
              ? "fast-food-outline"
              : route.name === "Cart"
                ? "bag-handle-outline"
                : route.name === "Track"
                  ? "navigate-outline"
                  : route.name === "Account"
                    ? "person-circle-outline"
                    : "clipboard-outline";

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      {isAdmin ? (
        <Tab.Screen name="Admin" component={AdminScreen} />
      ) : (
        <>
          <Tab.Screen name="Snacks" component={HomeScreen} options={{ tabBarLabel: "Boxes" }} />
          <Tab.Screen
            name="Cart"
            component={CartScreen}
            options={{
              tabBarBadge: totalItems > 0 ? totalItems : undefined,
              tabBarBadgeStyle: {
                backgroundColor: theme.colors.tomato,
                color: theme.colors.white,
              },
            }}
          />
          <Tab.Screen name="Track" component={TrackScreen} />
          <Tab.Screen name="Account" component={AccountScreen} />
        </>
      )}
    </Tab.Navigator>
    {user && !isAdmin ? <NotificationFallbackBanner /> : null}
    {user && !isAdmin ? <VoiceAssistant navigateTo={navigateToCustomerTab} /> : null}
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    Poppins_900Black,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_900Black,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <CartProvider>
        <VoiceCommandProvider>
          <NavigationContainer ref={navigationRef}>
            <StatusBar style="dark" />
            <Tabs />
          </NavigationContainer>
        </VoiceCommandProvider>
      </CartProvider>
    </AuthProvider>
  );
}
