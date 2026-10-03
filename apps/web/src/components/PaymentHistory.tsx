"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/lib/i18n";
import { lockScroll } from "@/lib/scroll-lock";
import type { Payment } from "@/lib/types";
import { CloseIcon } from "./icons";

const PAGE_SIZE = 10;

/** Подпись и сумма операции: тариф за деньги или бонусные дни. */
export function paymentText(
  p: Payment,
  t: { opProYear: string; opProMonth: string; opBonus: string; opBonusPrice: string },
  locale: string,
) {
  const title = p.planCode === "pro_year" ? t.opProYear : p.planCode === "bonus_10d" ? t.opBonus : t.opProMonth;
  const price = p.currency === "BONUS" ? t.opBonusPrice : `${(p.amountMinor / 100).toLocaleString(locale)} ₽`;
  return { title, price };
}

export function PaymentHistory({ payments }: { payments: Payment[] }) {
  const { d } = useLocale();
  const t = d.account;
  const date = (iso: string) => new Date(iso).toLocaleDateString(d.dateLocale, { day: "numeric", month: "long", year: "numeric" });
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [mounted, setMounted] = useState(false);

  const pages = Math.max(1, Math.ceil(payments.length / PAGE_SIZE));
  const shown = payments.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const unlock = lockScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      unlock();
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const row = (p: Payment) => {
    const { title, price } = paymentText(p, t, d.dateLocale);
    return (
      <li key={p.id} className="flex items-baseline justify-between gap-4 py-2 text-sm">
        <span>
          <span className="text-white">{title}</span>
          <span className="ml-2 text-xs text-white/40">{date(p.createdAt)}</span>
        </span>
        <span className="shrink-0 font-semibold text-white">{price}</span>
      </li>
    );
  };

  return (
    <div className="relative mt-6 border-t border-white/10 pt-4">
      <h3 className="text-xs uppercase tracking-wider text-white/40">{t.history}</h3>
      {payments.length === 0 ? (
        <p className="mt-2 text-sm text-white/45">{t.historyEmpty}</p>
      ) : (
        <>
          <ul className="mt-2 divide-y divide-white/5">{payments.slice(0, 3).map(row)}</ul>
          {payments.length > 3 ? (
            <button
              type="button"
              onClick={() => {
                setPage(0);
                setOpen(true);
              }}
              className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-white/60 transition hover:text-white"
            >
              {t.historyAll}
              <span className="ml-1.5 text-white/35">{payments.length}</span>
            </button>
          ) : null}
        </>
      )}

      {mounted
        ? createPortal(
            <div className={`fixed inset-0 z-[70] flex items-center justify-center p-4 ${open ? "" : "pointer-events-none"}`}>
              <div
                aria-hidden
                onClick={() => setOpen(false)}
                className={`absolute inset-0 bg-black/75 backdrop-blur-[2px] transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="history-title"
                className={`relative w-full max-w-lg transition duration-200 ease-out ${
                  open ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-95 opacity-0"
                }`}
              >
                <div className="rx-cut bg-gradient-to-br from-rx-red/70 via-white/10 to-rx-red/25 p-px shadow-[0_40px_100px_-20px_rgba(0,0,0,0.95)]">
                  <div className="rx-cut relative bg-[linear-gradient(160deg,#150708_0%,#0b0b0e_50%,#09090b_100%)] p-6">
                    <button
                      type="button"
                      aria-label={d.common.cancel}
                      onClick={() => setOpen(false)}
                      className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center border border-white/10 text-white/55 transition hover:border-white/30 hover:text-white"
                    >
                      <CloseIcon size={16} />
                    </button>
                    <h2 id="history-title" className="pr-10 font-display text-2xl uppercase">
                      {t.history}
                    </h2>
                    <ul className="mt-4 divide-y divide-white/5">{shown.map(row)}</ul>
                    {pages > 1 ? (
                      <div className="mt-4 flex items-center justify-between">
                        {(
                          [
                            ["prev", page === 0, () => setPage((p) => p - 1)],
                            ["next", page === pages - 1, () => setPage((p) => p + 1)],
                          ] as const
                        ).map(([dir, disabled, onClick]) => (
                          <button
                            key={dir}
                            type="button"
                            aria-label={dir === "prev" ? t.historyPrev : t.historyNext}
                            disabled={disabled}
                            onClick={onClick}
                            style={{ order: dir === "prev" ? 0 : 2 }}
                            className="rx-cut-sm group flex h-9 w-9 items-center justify-center border border-white/15 text-white/70 transition duration-200 hover:border-rx-red hover:bg-rx-red/15 hover:text-white hover:shadow-[0_0_16px_-4px_rgba(255,43,43,0.8)] disabled:pointer-events-none disabled:opacity-30"
                          >
                            <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 transition duration-200 group-hover:translate-x-0.5 ${dir === "prev" ? "-scale-x-100 group-hover:-translate-x-0.5" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M6 3.5 10.5 8 6 12.5" />
                            </svg>
                          </button>
                        ))}
                        <span style={{ order: 1 }} className="font-display text-sm tracking-[0.2em] text-white/55">
                          {t.historyPage(page + 1, pages)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
