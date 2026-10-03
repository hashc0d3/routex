"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clientApi, getAccessToken, setAccessToken } from "./api";
import { ApiError, type Loyalty, type Referral, type Subscription, type User } from "./types";

type Session = {
  ready: boolean;
  user: User | null;
  subscription: Subscription | null;
  loyalty: Loyalty | null;
  referral: Referral | null;
  refresh: () => Promise<void>;
  applyAuth: (token: string) => Promise<void>;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loyalty, setLoyalty] = useState<Loyalty | null>(null);
  const [referral, setReferral] = useState<Referral | null>(null);

  const clear = useCallback(() => {
    setUser(null);
    setSubscription(null);
    setLoyalty(null);
    setReferral(null);
  }, []);

  const refresh = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      clear();
      setReady(true);
      return;
    }
    try {
      const data = await clientApi.me(token);
      setUser(data.user);
      setSubscription(data.subscription);
      setLoyalty(data.loyalty);
      setReferral(data.referral);
    } catch (err) {
      // выкидываем из аккаунта только при протухшем токене, а не при сбое сети
      if (err instanceof ApiError && err.code === "session_invalid") {
        setAccessToken(null);
        clear();
      }
    } finally {
      setReady(true);
    }
  }, [clear]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // отзыв сессии из админки должен выкидывать быстро: лёгкая проверка раз в 5 секунд и при возврате на вкладку
  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const token = getAccessToken();
      if (!token || document.visibilityState === "hidden") return;
      try {
        await clientApi.sessionAlive(token);
      } catch (err) {
        if (err instanceof ApiError && err.code === "session_invalid") {
          setAccessToken(null);
          clear();
        }
      }
    };
    const id = window.setInterval(() => void check(), 5_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user, clear]);

  const value = useMemo<Session>(
    () => ({
      ready,
      user,
      subscription,
      loyalty,
      referral,
      refresh,
      async applyAuth(token) {
        setAccessToken(token);
        await refresh();
      },
      setUser,
      async logout() {
        await clientApi.logout();
        setAccessToken(null);
        clear();
      },
    }),
    [ready, user, subscription, loyalty, referral, refresh, clear],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession outside provider");
  return ctx;
}
