"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { changeStatus } from "../../../actions";
import { STATUSES, type TicketStatus } from "@/lib/support";

function SaveButton({ dirty }: { dirty: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={!dirty || pending}
      className="btn btn-primary mt-3 w-full"
    >
      {pending ? "Сохраняем…" : "Сохранить"}
    </button>
  );
}

/** Статус меняется только по «Сохранить», случайный клик ничего не ломает. */
export function StatusForm({ id, current }: { id: string; current: TicketStatus }) {
  const [selected, setSelected] = useState<TicketStatus>(current);
  const [saved, setSaved] = useState(current);
  if (saved !== current) {
    setSaved(current);
    setSelected(current);
  }

  return (
    <form action={changeStatus} className="border border-white/10 bg-rx-panel p-4">
      <p className="mb-3 text-xs uppercase tracking-[0.18em] text-white/45">Статус</p>
      <input type="hidden" name="id" value={id} />
      <div role="radiogroup" className="grid grid-cols-2 gap-2">
        {STATUSES.map((s) => (
          <label
            key={s.id}
            className={`cursor-pointer border px-2 py-1.5 text-center text-xs transition ${
              selected === s.id ? s.tone : "border-white/10 text-white/60 hover:border-white/30 hover:text-white"
            }`}
          >
            <input
              type="radio"
              name="status"
              value={s.id}
              checked={selected === s.id}
              onChange={() => setSelected(s.id)}
              className="sr-only"
            />
            {s.label}
            {s.id === current ? <span className="ml-1 text-white/35">· сейчас</span> : null}
          </label>
        ))}
      </div>
      <SaveButton dirty={selected !== current} />
    </form>
  );
}
