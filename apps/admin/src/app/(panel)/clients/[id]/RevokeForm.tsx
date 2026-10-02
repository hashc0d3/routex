"use client";

import { useActionState } from "react";
import { Notice, Submit } from "../../forms";
import { revokeSessions, type RevokeState } from "../actions";

export function RevokeForm({ id, active }: { id: string; active: number }) {
  const [state, action] = useActionState<RevokeState, FormData>(revokeSessions, { error: null });
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <Notice state={state} />
      <Submit tone="danger" pendingText="Завершаем…" disabled={active === 0}>
        Завершить все сессии
      </Submit>
    </form>
  );
}
