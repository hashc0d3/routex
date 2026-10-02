"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { stripLocale } from "@/i18n/config";
import { useLocale } from "@/lib/i18n";
import { CloseIcon, SupportIcon } from "./icons";
import { TicketForm } from "./TicketForm";

export function SupportWidget() {
  const { d } = useLocale();
  const t = d.ticket;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMounted(true);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (stripLocale(pathname) === "/support") return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      <section
        role="dialog"
        aria-label={t.title}
        aria-hidden={!open}
        className={`w-[min(92vw,380px)] origin-bottom-right transition duration-200 ease-out ${
          open ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-3 scale-95 opacity-0"
        }`}
      >
        <div className="rx-cut relative bg-gradient-to-br from-rx-red/60 via-white/10 to-rx-red/20 p-px shadow-[0_30px_80px_-20px_rgba(0,0,0,0.95)]">
          <div className="rx-cut relative max-h-[min(78dvh,640px)] overflow-y-auto bg-[linear-gradient(160deg,#140708_0%,#0b0b0e_50%,#09090b_100%)] p-5">
            <header className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 font-display text-xl uppercase">
                  <span className="h-2 w-2 rotate-45 bg-rx-red shadow-[0_0_10px_#ff2b2b]" />
                  {t.title}
                </p>
                <p className="mt-1 text-xs text-white/55">{t.lead}</p>
              </div>
              <button
                type="button"
                aria-label={t.close}
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center border border-white/10 text-white/60 transition hover:border-white/30 hover:text-white"
              >
                <CloseIcon size={16} />
              </button>
            </header>
            {mounted ? <TicketForm compact /> : null}
          </div>
        </div>
      </section>

      <button
        type="button"
        aria-label={open ? t.close : t.open}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="group relative flex h-14 w-14 items-center justify-center"
      >
        <span className="absolute inset-0 animate-ping rounded-full bg-rx-red/25 [animation-duration:2.4s] group-aria-expanded:hidden" />
        <span className="rx-cut-sm absolute inset-0 bg-gradient-to-br from-rx-red2 to-rx-red shadow-[0_10px_30px_-6px_rgba(225,6,0,0.9)] transition group-hover:brightness-110" />
        <span className="relative text-white transition duration-200 group-hover:scale-110">
          {open ? <CloseIcon size={22} /> : <SupportIcon size={24} />}
        </span>
        <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap border border-white/10 bg-rx-panel px-3 py-1.5 text-xs text-white/80 opacity-0 transition group-hover:opacity-100 sm:block group-aria-expanded:!opacity-0">
          {t.open}
        </span>
      </button>
    </div>
  );
}
