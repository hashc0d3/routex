"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/lib/i18n";
import { lockScroll } from "@/lib/scroll-lock";
import { CloseIcon, TrashIcon } from "./icons";

export function DeleteAccountDialog({
  open,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  pending: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { d } = useLocale();
  const t = d.deleteAccount;
  const ackId = useId();
  const [mounted, setMounted] = useState(false);
  const [ack, setAck] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setAck(false);
      return;
    }
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

  return createPortal(
    <div className={`fixed inset-0 z-[70] flex items-center justify-center p-4 ${open ? "" : "pointer-events-none"}`}>
      <div
        aria-hidden
        onClick={() => !pending && onClose()}
        className={`absolute inset-0 bg-black/80 backdrop-blur-[2px] transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        aria-describedby="delete-desc"
        className={`relative w-full max-w-md transition duration-200 ease-out ${
          open ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-95 opacity-0"
        }`}
      >
        <div className="rx-cut bg-gradient-to-br from-rx-red via-rx-red/30 to-rx-red/60 p-px shadow-[0_40px_100px_-20px_rgba(0,0,0,0.95)]">
          <div className="rx-cut relative bg-[linear-gradient(160deg,#1c0708_0%,#0d0a0b_55%,#09090b_100%)] p-6">
            <button
              type="button"
              aria-label={d.common.cancel}
              disabled={pending}
              onClick={onClose}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center border border-white/10 text-white/55 transition hover:border-white/30 hover:text-white disabled:opacity-40"
            >
              <CloseIcon size={16} />
            </button>

            <span className="flex h-12 w-12 items-center justify-center border border-rx-red/60 bg-rx-red/15 text-rx-red2 shadow-[0_0_24px_-6px_rgba(255,43,43,0.8)]">
              <TrashIcon size={22} />
            </span>
            <h2 id="delete-title" className="mt-4 pr-10 font-display text-3xl uppercase leading-tight">
              {t.title}
            </h2>
            <p id="delete-desc" className="mt-2 text-sm text-white/65">
              {t.lead}
            </p>

            <ul className="mt-4 space-y-2 border border-rx-red/25 bg-rx-red/[0.06] p-4 text-sm text-white/80">
              {t.points.map((p) => (
                <li key={p} className="flex gap-2.5">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rotate-45 bg-rx-red" />
                  {p}
                </li>
              ))}
            </ul>

            <label htmlFor={ackId} className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm text-white/70">
              <input
                id={ackId}
                type="checkbox"
                checked={ack}
                disabled={pending}
                onChange={(e) => setAck(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#e10600]"
              />
              {t.ack}
            </label>

            {error ? (
              <p role="alert" className="mt-4 border-l-2 border-rx-red bg-rx-red/10 px-3 py-2 text-sm">
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
              <button
                type="button"
                autoFocus
                disabled={pending}
                onClick={onClose}
                className="flex-1 border border-white/15 py-3 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white disabled:opacity-40"
              >
                {t.keep}
              </button>
              <button
                type="button"
                disabled={!ack || pending}
                onClick={onConfirm}
                className="rx-cut-sm flex flex-1 items-center justify-center gap-2 bg-rx-red py-3 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-rx-red2 disabled:cursor-not-allowed disabled:bg-rx-red/30 disabled:text-white/50"
              >
                <TrashIcon size={15} />
                {pending ? t.pending : t.confirm}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
