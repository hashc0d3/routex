"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clientApi, getAccessToken, usesLiveApi } from "./api";
import { useSession } from "./session";
import type { AppNotification } from "./types";

const POLL_MS = 15_000;

type Ctx = {
  items: AppNotification[];
  unread: number;
  refresh: () => Promise<void>;
  markAllRead: () => Promise<void>;
  /** Удаляет все уведомления пользователя (и на сайте, и в support). */
  clearAll: () => Promise<void>;
};

const NotificationsContext = createContext<Ctx | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user, subscription, loyalty } = useSession();
  const [items, setItems] = useState<AppNotification[]>([]);

  const refresh = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setItems([]);
      return;
    }
    try {
      setItems(await clientApi.listNotifications(token));
    } catch {
      // сеть моргнула — оставляем то, что уже показано
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    void refresh();
  }, [user, subscription, loyalty, refresh]);

  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) void refresh();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onStorage = (e: StorageEvent) => {
      if (!usesLiveApi && e.key === "routex.mock.db") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", onStorage);
    };
  }, [user, refresh]);

  const markAllRead = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    await clientApi.markNotificationsRead(token).catch(() => undefined);
  }, []);

  const clearAll = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    setItems([]);
    try {
      await clientApi.clearNotifications(token);
    } finally {
      await refresh();
    }
  }, [refresh]);

  const value = useMemo(
    () => ({ items, unread: items.filter((n) => !n.readAt).length, refresh, markAllRead, clearAll }),
    [items, refresh, markAllRead, clearAll],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationsProvider");
  return ctx;
}
