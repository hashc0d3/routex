"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const PENDING_KEY = "routex.scrollTo";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function scrollToId(id: string, behavior: ScrollBehavior) {
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: prefersReducedMotion() ? "instant" : behavior, block: "start" });
  return true;
}

function dropHash() {
  if (window.location.hash) {
    // state = null: так Next перехватывает вызов и обновляет свой URL, иначе вернёт якорь при ререндере
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}

/** Секция может появиться не сразу после перехода — ждём её до ~2 секунд. */
function scrollWhenReady(id: string) {
  let tries = 0;
  const tick = () => {
    if (scrollToId(id, "instant") || ++tries > 120) return;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/**
 * Ссылки вида `/#features` прокручивают к секции, но якорь в адресной строке не остаётся.
 * В href якорь сохраняем — без JS и для поисковиков ссылки работают как обычно.
 */
export function AnchorNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement) || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href);
      if (url.origin !== window.location.origin || !url.hash) return;

      const id = decodeURIComponent(url.hash.slice(1));
      e.preventDefault();
      if (url.pathname === window.location.pathname) {
        scrollToId(id, "smooth");
        dropHash();
        return;
      }
      try {
        sessionStorage.setItem(PENDING_KEY, id);
      } catch {
        // без sessionStorage просто откроем страницу сверху
      }
      router.push(url.pathname + url.search, { scroll: false });
    }

    function onHashChange() {
      if (!window.location.hash) return;
      scrollToId(decodeURIComponent(window.location.hash.slice(1)), "smooth");
      dropHash();
    }

    window.addEventListener("click", onClick, true);
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [router]);

  useEffect(() => {
    let pending: string | null = null;
    try {
      pending = sessionStorage.getItem(PENDING_KEY);
      sessionStorage.removeItem(PENDING_KEY);
    } catch {
      pending = null;
    }
    if (pending) {
      scrollWhenReady(pending);
      return;
    }
    if (window.location.hash) {
      scrollWhenReady(decodeURIComponent(window.location.hash.slice(1)));
      dropHash();
    }
  }, [pathname]);

  return null;
}
