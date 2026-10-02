"use client";

import { useActionState, useEffect, useRef } from "react";
import { PASSWORD_HINT } from "../staff/hints";
import { changeOwnPassword, type FormState } from "../staff/actions";
import { field, label, Notice, Submit } from "../forms";

export function PasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(changeOwnPassword, { error: null });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4 border border-white/10 bg-rx-panel p-6">
      <h2 className="text-xs uppercase tracking-[0.2em] text-white/40">Смена пароля</h2>
      <label className={label}>
        Текущий пароль
        <input name="current" type="password" required autoComplete="current-password" className={field} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          Новый пароль
          <input name="next" type="password" required minLength={10} autoComplete="new-password" className={field} />
        </label>
        <label className={label}>
          Повторите
          <input name="repeat" type="password" required minLength={10} autoComplete="new-password" className={field} />
        </label>
      </div>
      <p className="text-xs text-white/40">{PASSWORD_HINT} После смены на других устройствах нужно будет войти заново.</p>
      <Notice state={state} />
      <Submit pendingText="Сохраняем…">Сменить пароль</Submit>
    </form>
  );
}
