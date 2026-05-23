import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";

import {
  AuthSession,
  getCurrentUser,
  loginUser,
  loginWithPin,
  registerUser,
  registerPhoneUser,
  resetPin,
  User,
} from "../api/client";

const AUTH_TOKEN_KEY = "cloudsnacks.authToken";
const REMEMBERED_PHONE_KEY = "cloudsnacks.rememberedPhone";

type AuthContextValue = {
  user: User | null;
  accessToken: string | null;
  rememberedPhone: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithPin: (phone: string, pin: string) => Promise<void>;
  signUpWithOtp: (name: string, phone: string, otp: string, pin: string) => Promise<void>;
  resetPinWithOtp: (phone: string, otp: string, pin: string) => Promise<void>;
  useAnotherPhone: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const ADMIN_PHONE = process.env.EXPO_PUBLIC_ADMIN_PHONE ?? "9247840892";
const ADMIN_EMAIL = process.env.EXPO_PUBLIC_ADMIN_EMAIL ?? "admin@cloudsnacks.local";

function normalizePhone(value?: string | null) {
  return (value ?? "").replace(/\D/g, "").slice(-10);
}

function isAdminAccount(user: User | null) {
  if (!user) {
    return false;
  }

  const adminPhone = normalizePhone(ADMIN_PHONE);
  const userPhone = normalizePhone(user.phone);
  const userEmail = user.email.trim().toLowerCase();

  return Boolean(adminPhone && userPhone === adminPhone) || userEmail === ADMIN_EMAIL.toLowerCase();
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [rememberedPhone, setRememberedPhone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const rememberPhone = async (phone?: string | null) => {
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return;
    }

    setRememberedPhone(normalizedPhone);
    await AsyncStorage.setItem(REMEMBERED_PHONE_KEY, normalizedPhone);
  };

  const applySession = async (session: AuthSession, fallbackPhone?: string) => {
    setAccessToken(session.accessToken);
    setUser(session.user);
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, session.accessToken);
    await rememberPhone(session.user.phone ?? fallbackPhone);
  };

  const signIn = async (email: string, password: string) => {
    const session = await loginUser({ email, password });
    await applySession(session);
  };

  const signUp = async (name: string, email: string, password: string) => {
    const session = await registerUser({ name, email, password });
    await applySession(session);
  };

  const signInWithPin = async (phone: string, pin: string) => {
    const session = await loginWithPin({ phone, pin });
    await applySession(session, phone);
  };

  const signUpWithOtp = async (name: string, phone: string, otp: string, pin: string) => {
    const session = await registerPhoneUser({ name, phone, otp, pin });
    await applySession(session, phone);
  };

  const resetPinWithOtp = async (phone: string, otp: string, pin: string) => {
    const session = await resetPin({ phone, otp, pin });
    await applySession(session, phone);
  };

  const useAnotherPhone = async () => {
    setRememberedPhone(null);
    await AsyncStorage.removeItem(REMEMBERED_PHONE_KEY);
  };

  const signOut = async () => {
    await rememberPhone(user?.phone);
    setAccessToken(null);
    setUser(null);
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  };

  useEffect(() => {
    async function restoreSession() {
      try {
        const [savedToken, savedPhone] = await Promise.all([
          AsyncStorage.getItem(AUTH_TOKEN_KEY),
          AsyncStorage.getItem(REMEMBERED_PHONE_KEY),
        ]);

        if (savedPhone) {
          setRememberedPhone(savedPhone);
        }

        if (savedToken) {
          const savedUser = await getCurrentUser(savedToken);
          setAccessToken(savedToken);
          setUser(savedUser);
          await rememberPhone(savedUser.phone ?? savedPhone);
        }
      } catch {
        await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      } finally {
        setIsLoading(false);
      }
    }

    void restoreSession();
  }, []);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      rememberedPhone,
      isLoading,
      isAdmin: isAdminAccount(user),
      signIn,
      signUp,
      signInWithPin,
      signUpWithOtp,
      resetPinWithOtp,
      useAnotherPhone,
      signOut,
    }),
    [accessToken, isLoading, rememberedPhone, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
