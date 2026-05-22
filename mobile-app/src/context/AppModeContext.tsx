import { createContext, PropsWithChildren, useContext, useMemo, useState } from "react";

type AppMode = "chooser" | "customer" | "admin";

type AppModeContextValue = {
  mode: AppMode;
  isAdminUnlocked: boolean;
  enterCustomerMode: () => void;
  enterAdminMode: (pin: string) => boolean;
  exitAdminMode: () => void;
  chooseMode: () => void;
};

const ADMIN_PIN = process.env.EXPO_PUBLIC_ADMIN_PIN ?? "2468";

const AppModeContext = createContext<AppModeContextValue | undefined>(undefined);

export function AppModeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<AppMode>("chooser");
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  const value = useMemo<AppModeContextValue>(
    () => ({
      mode,
      isAdminUnlocked,
      enterCustomerMode: () => setMode("customer"),
      enterAdminMode: (pin: string) => {
        const isValid = pin.trim() === ADMIN_PIN;
        if (isValid) {
          setIsAdminUnlocked(true);
          setMode("admin");
        }
        return isValid;
      },
      exitAdminMode: () => setMode("customer"),
      chooseMode: () => setMode("chooser"),
    }),
    [isAdminUnlocked, mode],
  );

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppMode() {
  const context = useContext(AppModeContext);

  if (!context) {
    throw new Error("useAppMode must be used inside AppModeProvider");
  }

  return context;
}
