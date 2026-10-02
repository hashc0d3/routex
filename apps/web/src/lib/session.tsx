"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clientApi, getAccessToken, setAccessToken } from "./api";
import { ApiError, type Loyalty, type Subscription, type User } from "./types";

type Session = {
  ready: boolean;
  user: User | null;
  subscription: Subscription | null;
  loyalty: Loyalty | null;
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

  const clear = useCallback(() => {
    setUser(null);
    setSubscription(null);
    setLoyalty(null);
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

  const value = useMemo<Session>(
    () => ({
      ready,
      user,
      subscription,
      loyalty,
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
    [ready, user, subscription, loyalty, refresh, clear],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession outside provider");
  return ctx;
}
