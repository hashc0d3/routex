"use client";

import { useActionState } from "react";
import { login, type LoginState } from "../actions";

const field =
  "mt-1 w-full border border-white/12 bg-black/60 px-3 py-2.5 text-sm outline-none transition focus:border-rx-red";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { error: null });
  return (
    <form action={action} className="mt-8 space-y-4 border border-white/10 bg-rx-panel p-6">
      <input type="hidden" name="next" value={next} />
      <label className="block text-xs uppercase tracking-[0.18em] text-white/50">
        Email
        <input name="email" type="email" autoComplete="username" required className={field} />
      </label>
      <label className="block text-xs uppercase tracking-[0.18em] text-white/50">
        Пароль
        <input name="password" type="password" autoComplete="current-password" required className={field} />
      </label>
      {state.error ? <p className="border-l-2 border-rx-red bg-rx-red/10 px-3 py-2 text-sm">{state.error}</p> : null}
      <button disabled={pending} className="btn btn-primary w-full py-3">
        {pending ? "Входим…" : "Войти"}
      </button>
    </form>
  );
}
