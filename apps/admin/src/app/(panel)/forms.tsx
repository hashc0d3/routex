"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { copyText } from "@/lib/clipboard";
import { ASSIGNABLE_ROLES, ROLE_INFO, type Role } from "@/lib/rbac";

export const field =
  "mt-1 w-full border border-white/12 bg-black/60 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none transition focus:border-rx-red";
export const label = "block text-xs uppercase tracking-[0.18em] text-white/50";

export function Submit({
  children,
  pendingText,
  tone = "primary",
  disabled,
}: {
  children: React.ReactNode;
  pendingText: string;
  tone?: "primary" | "ghost" | "danger";
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending || disabled} className={`btn btn-${tone}`}>
      {pending ? (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      ) : null}
      {pending ? pendingText : children}
    </button>
  );
}

export function Notice({ state }: { state: { error: string | null; ok?: string } }) {
  if (state.error) return <p className="border-l-2 border-rx-red bg-rx-red/10 px-3 py-2 text-sm">{state.error}</p>;
  if (state.ok) {
    return <p className="border-l-2 border-emerald-400/70 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">{state.ok}</p>;
  }
  return null;
}

/** Сгенерированный пароль показываем один раз — в БД только хеш. */
export function PasswordReveal({ password }: { password: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="border border-amber-400/40 bg-amber-400/[0.07] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-amber-200/80">Пароль — показывается один раз</p>
      <div className="mt-2 flex items-center gap-3">
        <code className="select-all bg-black/50 px-3 py-2 font-mono text-lg tracking-wider text-white">{password}</code>
        <button
          type="button"
          onClick={() => {
            void copyText(password).then(setCopied);
          }}
          className={`btn btn-sm ${copied ? "btn-ghost text-emerald-300" : "btn-ghost"}`}
        >
          {copied ? "Скопирован" : "Копировать"}
        </button>
      </div>
      <p className="mt-2 text-xs text-white/50">Передайте его сотруднику лично — после входа он сможет сменить пароль в профиле.</p>
    </div>
  );
}

/** Выбор роли обязателен: ни одна не отмечена по умолчанию при создании. */
export function RolePicker({ value }: { value?: Role }) {
  return (
    <fieldset>
      <legend className={label}>
        Роль <span className="text-rx-red2">*</span>
      </legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {ASSIGNABLE_ROLES.map((r) => {
          const info = ROLE_INFO[r];
          return (
            <label
              key={r}
              className="flex cursor-pointer gap-3 border border-white/10 bg-black/40 p-3 transition hover:border-white/25 has-[:checked]:border-rx-red has-[:checked]:bg-rx-red/[0.08]"
            >
              <input type="radio" name="role" value={r} defaultChecked={value === r} required className="mt-1 accent-[#e10600]" />
              <span>
                <span className={`inline-block border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${info.tone}`}>
                  {info.label}
                </span>
                <span className="mt-1 block text-xs text-white/55">{info.hint}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
