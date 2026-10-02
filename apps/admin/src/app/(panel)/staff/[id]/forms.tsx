"use client";

import { useActionState, useState } from "react";
import type { Role } from "@/lib/rbac";
import { deleteStaff, resetStaffPassword, updateStaff, type FormState } from "../actions";
import { field, label, Notice, PasswordReveal, RolePicker, Submit } from "../../forms";

const card = "border border-white/10 bg-rx-panel p-6";

export function EditForm({ user }: { user: { id: string; email: string; name: string; role: Role; active: boolean } }) {
  const [state, action] = useActionState<FormState, FormData>(updateStaff, { error: null });
  return (
    <form action={action} className={`${card} space-y-5`}>
      <h2 className="text-xs uppercase tracking-[0.2em] text-white/40">Данные и доступ</h2>
      <input type="hidden" name="id" value={user.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          Имя
          <input name="name" defaultValue={user.name} required minLength={2} maxLength={64} className={field} />
        </label>
        <label className={label}>
          Email
          <input name="email" type="email" defaultValue={user.email} required className={field} />
        </label>
      </div>
      <RolePicker value={user.role} />
      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-white/75">
        <input type="checkbox" name="active" defaultChecked={user.active} className="mt-0.5 accent-[#e10600]" />
        <span>
          Доступ разрешён
          <span className="block text-xs text-white/40">Снимите галочку, чтобы заблокировать вход — сотрудник сразу будет разлогинен.</span>
        </span>
      </label>
      <Notice state={state} />
      <Submit pendingText="Сохраняем…">Сохранить</Submit>
    </form>
  );
}

export function ResetPasswordForm({ id }: { id: string }) {
  const [state, action] = useActionState<FormState, FormData>(resetStaffPassword, { error: null });
  return (
    <form action={action} className={`${card} space-y-4`}>
      <div>
        <h2 className="text-xs uppercase tracking-[0.2em] text-white/40">Пароль</h2>
        <p className="mt-2 text-sm text-white/55">Сгенерируем новый пароль. Текущий перестанет работать, все сессии сотрудника завершатся.</p>
      </div>
      <input type="hidden" name="id" value={id} />
      <Notice state={state} />
      {state.password ? <PasswordReveal password={state.password} /> : null}
      <Submit tone="ghost" pendingText="Сбрасываем…">
        Сбросить пароль
      </Submit>
    </form>
  );
}

export function DeleteForm({ id, email }: { id: string; email: string }) {
  const [typed, setTyped] = useState("");
  const match = typed.trim().toLowerCase() === email;
  return (
    <form action={deleteStaff} className="space-y-4 border border-rx-red/30 bg-rx-red/[0.04] p-6">
      <div>
        <h2 className="text-xs uppercase tracking-[0.2em] text-rx-red2">Удаление</h2>
        <p className="mt-2 text-sm text-white/60">
          Сотрудник потеряет доступ, учётная запись удалится без возможности восстановления. Его ответы в заявках останутся.
        </p>
      </div>
      <input type="hidden" name="id" value={id} />
      <label className={label}>
        Для подтверждения введите <span className="normal-case tracking-normal text-white/80">{email}</span>
        <input
          name="confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          className={field}
        />
      </label>
      <Submit tone="danger" pendingText="Удаляем…" disabled={!match}>
        Удалить сотрудника
      </Submit>
    </form>
  );
}
