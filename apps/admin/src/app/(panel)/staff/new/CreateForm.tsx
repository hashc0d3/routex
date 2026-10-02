"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { PASSWORD_HINT } from "../hints";
import { createStaff, type FormState } from "../actions";
import { field, label, Notice, PasswordReveal, RolePicker, Submit } from "../../forms";

export function CreateForm() {
  const [state, action] = useActionState<FormState, FormData>(createStaff, { error: null });
  const [generate, setGenerate] = useState(true);

  if (state.ok) {
    return (
      <div className="space-y-4 border border-white/10 bg-rx-panel p-6">
        <Notice state={state} />
        {state.password ? <PasswordReveal password={state.password} /> : null}
        <div className="flex gap-3">
          <Link href="/staff" className="btn btn-primary">
            К списку
          </Link>
          {/* полная перезагрузка сбрасывает состояние формы и показанный пароль */}
          <button type="button" onClick={() => window.location.assign("/staff/new")} className="btn btn-ghost">
            Создать ещё
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5 border border-white/10 bg-rx-panel p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          Имя
          <input name="name" required minLength={2} maxLength={64} placeholder="Иван Петров" className={field} />
        </label>
        <label className={label}>
          Email
          <input name="email" type="email" required autoComplete="off" placeholder="ivan@routex.ru" className={field} />
        </label>
      </div>

      <RolePicker />

      <div className="space-y-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-white/75">
          <input
            type="checkbox"
            name="generate"
            checked={generate}
            onChange={(e) => setGenerate(e.target.checked)}
            className="accent-[#e10600]"
          />
          Сгенерировать пароль
        </label>
        {!generate ? (
          <label className={label}>
            Пароль
            <input name="password" type="password" required autoComplete="new-password" minLength={10} className={field} />
            <span className="mt-1 block text-[11px] normal-case tracking-normal text-white/40">{PASSWORD_HINT}</span>
          </label>
        ) : null}
      </div>

      <Notice state={state} />
      <Submit pendingText="Создаём…">Создать сотрудника</Submit>
    </form>
  );
}
