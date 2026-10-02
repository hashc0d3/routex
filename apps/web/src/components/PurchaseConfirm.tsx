"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usesLiveApi } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { lockScroll } from "@/lib/scroll-lock";
import { useSession } from "@/lib/session";
import { CheckIcon, CloseIcon } from "./icons";

export type PaidPlan = "pro_month" | "pro_year";

/** Та же логика, что в billing: активная подписка продлевается от своей даты окончания. */
function periodEnd(code: PaidPlan, status?: string, currentEnd?: string) {
  const now = new Date();
  const renewing = status === "active" && currentEnd && new Date(currentEnd) > now;
  const end = renewing ? new Date(currentEnd) : now;
  if (code === "pro_year") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return { end, renewing: Boolean(renewing) };
}

export function PurchaseConfirm({
  plan,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  plan: PaidPlan | null;
  pending: boolean;
  error?: string | null;
  onConfirm: (plan: PaidPlan) => void;
  onClose: () => void;
}) {
  const { d } = useLocale();
  const t = d.purchase;
  const { subscription } = useSession();
  const [mounted, setMounted] = useState(false);
  // держим последний тариф, чтобы окно не пустело во время анимации закрытия
  const [shown, setShown] = useState<PaidPlan>("pro_month");
  const open = plan !== null;

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (plan) setShown(plan);
  }, [plan]);

  useEffect(() => {
    if (!open) return;
    const unlock = lockScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      unlock();
      document.removeEventListener("keydown", onKey);
    };
  }, [open, pending, onClose]);

  if (!mounted) return null;

  const text = shown === "pro_year" ? d.plans.year : d.plans.pro;
  const { end, renewing } = periodEnd(shown, subscription?.status, subscription?.currentPeriodEnd);
  const rows: [string, React.ReactNode][] = [
    [t.plan, <span key="p" className="font-display text-lg uppercase">{text.name}</span>],
    [t.price, <span key="c" className="font-display text-lg">{text.price}</span>],
    [t.until, end.toLocaleDateString(d.dateLocale, { day: "numeric", month: "long", year: "numeric" })],
  ];

  return createPortal(
    <div className={`fixed inset-0 z-[70] flex items-center justify-center p-4 ${open ? "" : "pointer-events-none"}`}>
      <div
        aria-hidden
        onClick={() => !pending && onClose()}
        className={`absolute inset-0 bg-black/75 backdrop-blur-[2px] transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-title"
        className={`relative w-full max-w-md transition duration-200 ease-out ${
          open ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-95 opacity-0"
        }`}
      >
        <div className="rx-cut bg-gradient-to-br from-rx-red/70 via-white/10 to-rx-red/25 p-px shadow-[0_40px_100px_-20px_rgba(0,0,0,0.95)]">
          <div className="rx-cut relative bg-[linear-gradient(160deg,#150708_0%,#0b0b0e_50%,#09090b_100%)] p-6">
            <button
              type="button"
              aria-label={t.cancel}
              disabled={pending}
              onClick={onClose}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center border border-white/10 text-white/55 transition hover:border-white/30 hover:text-white disabled:opacity-40"
            >
              <CloseIcon size={16} />
            </button>

            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-rx-red2">
              <span className="h-1.5 w-1.5 rotate-45 bg-rx-red shadow-[0_0_8px_#ff2b2b]" />
              {t.eyebrow}
            </p>
            <h2 id="purchase-title" className="mt-2 pr-10 font-display text-3xl uppercase leading-tight">
              {t.title}
            </h2>

            <dl className="mt-5 divide-y divide-white/5 border border-white/10 bg-black/30">
              {rows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <dt className="text-white/50">{k}</dt>
                  <dd className="text-right text-white">{v}</dd>
                </div>
              ))}
            </dl>

            <ul className="mt-4 space-y-1.5 text-xs text-white/55">
              {renewing ? (
                <li className="flex gap-2">
                  <CheckIcon size={12} className="mt-0.5 shrink-0 text-rx-red2" />
                  {t.renewNote}
                </li>
              ) : null}
              <li className="flex gap-2">
                <CheckIcon size={12} className="mt-0.5 shrink-0 text-rx-red2" />
                {t.cancelAnytime}
              </li>
            </ul>

            {!usesLiveApi ? (
              <p className="mt-4 border-l-2 border-amber-400/60 bg-amber-400/[0.07] px-3 py-2 text-xs text-amber-200/90">
                {t.demo}
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="mt-4 border-l-2 border-rx-red bg-rx-red/10 px-3 py-2 text-sm">
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
              <button
                type="button"
                disabled={pending}
                onClick={onClose}
                className="flex-1 border border-white/15 py-3 text-sm font-semibold text-white/75 transition hover:border-white/40 hover:text-white disabled:opacity-40"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                autoFocus
                disabled={pending}
                onClick={() => onConfirm(shown)}
                className="rx-cut-sm flex-[1.4] bg-gradient-to-r from-rx-red to-rx-red2 py-3 text-sm font-semibold uppercase tracking-wider text-white shadow-[0_10px_30px_-10px_rgba(225,6,0,0.8)] transition hover:brightness-110 disabled:opacity-60"
              >
                {pending ? d.plans.pending : t.confirm(text.price)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
