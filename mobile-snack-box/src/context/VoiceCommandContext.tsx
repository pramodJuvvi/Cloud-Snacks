import { createContext, PropsWithChildren, useContext, useMemo, useState } from "react";

export type AccountMenuSection = "preferences" | "addresses" | "services" | "contact" | "compliance";
export type CartIntentType = "coupon" | "spice" | "payment" | "schedule" | "placeOrder" | "clearCart";
export type CartIntent = {
  id: number;
  type: CartIntentType;
  value?: string;
};

type VoiceCommandContextValue = {
  menuSearch: string;
  accountSection: AccountMenuSection | null;
  cartIntent: CartIntent | null;
  setMenuSearch: (query: string) => void;
  setAccountSection: (section: AccountMenuSection | null) => void;
  sendCartIntent: (type: CartIntentType, value?: string) => void;
};

const VoiceCommandContext = createContext<VoiceCommandContextValue | undefined>(undefined);

export function VoiceCommandProvider({ children }: PropsWithChildren) {
  const [menuSearch, setMenuSearch] = useState("");
  const [accountSection, setAccountSection] = useState<AccountMenuSection | null>(null);
  const [cartIntent, setCartIntent] = useState<CartIntent | null>(null);

  const sendCartIntent = (type: CartIntentType, value?: string) => {
    setCartIntent({ id: Date.now(), type, value });
  };

  const value = useMemo(
    () => ({
      menuSearch,
      accountSection,
      cartIntent,
      setMenuSearch,
      setAccountSection,
      sendCartIntent,
    }),
    [accountSection, cartIntent, menuSearch],
  );

  return <VoiceCommandContext.Provider value={value}>{children}</VoiceCommandContext.Provider>;
}

export function useVoiceCommand() {
  const context = useContext(VoiceCommandContext);

  if (!context) {
    throw new Error("useVoiceCommand must be used inside VoiceCommandProvider");
  }

  return context;
}
