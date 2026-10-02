"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useId, useState } from "react";
import { NICKNAME_MAX, NICKNAME_RE } from "@/lib/achievements";
import { clientApi, getAccessToken } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { ApiError, type TicketContact } from "@/lib/types";
import { Avatar } from "./Avatar";
import { CheckIcon } from "./icons";
import { Skeleton } from "./Skeleton";

const PHONE_RE = /^\+?[\d\s()-]{10,20}$/;

function contactError(contact: TicketContact): ApiError | null {
  const v = contact.value.trim();
  if (!v) return new ApiError("ticket_contact_required");
  if (contact.type === "phone" && !PHONE_RE.test(v)) return new ApiError("ticket_phone_invalid");
  if (contact.type === "nickname" && !NICKNAME_RE.test(v)) return new ApiError("nickname_invalid");
  return null;
}

export function TicketForm({ compact = false, onDone }: { compact?: boolean; onDone?: () => void }) {
  const { user, ready } = useSession();
  const { d, locale, href, errorText } = useLocale();
  const t = d.ticket;
  const pathname = usePathname();
  const uid = useId();

  const [description, setDescription] = useState("");
  const [contact, setContact] = useState<TicketContact>({ type: "phone", value: "" });
  const [pdConsent, setPdConsent] = useState(false);
  const [attachOk, setAttachOk] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (description.trim().length < 10) return setError(errorText(new ApiError("ticket_description_short")));
    if (!user) {
      const err = contactError(contact);
      if (err) return setError(errorText(err));
      if (!pdConsent) return setError(errorText(new ApiError("consents_required")));
    }
    setPending(true);
    try {
      const res = await clientApi.createTicket(user ? getAccessToken() : null, {
        description: description.trim(),
        contact: user ? undefined : { type: contact.type, value: contact.value.trim() },
        pdConsent: user ? undefined : pdConsent,
        attachOk,
        source: "web",
        locale,
        page: pathname,
      });
      setDone(res.number);
      setDescription("");
      setContact((c) => ({ ...c, value: "" }));
      setPdConsent(false);
      setAttachOk(false);
      onDone?.();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setPending(false);
    }
  }

  if (done !== null) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <span className="rx-cut-sm flex h-14 w-14 items-center justify-center bg-rx-red/15 text-rx-red2">
          <CheckIcon size={26} />
        </span>
        <p className="mt-4 font-display text-2xl uppercase">{t.doneTitle}</p>
        <p className="mt-2 max-w-xs text-sm text-white/65">{t.done(done)}</p>
        <button
          type="button"
          onClick={() => setDone(null)}
          className="mt-6 border border-white/15 px-4 py-2 text-sm text-white/75 transition hover:border-rx-red hover:text-white"
        >
          {t.another}
        </button>
      </div>
    );
  }

  const field =
    "w-full border border-white/12 bg-black/50 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-rx-red focus:bg-black/70";

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate className="space-y-4">
      {!ready ? (
        <Skeleton className="h-[58px] w-full" />
      ) : user ? (
        <div className="flex items-center gap-3 border border-white/10 bg-white/[0.03] px-3 py-2.5">
          <Avatar nickname={user.nickname} src={user.avatarUrl} size={34} />
          <div className="min-w-0">
            <p className="truncate text-sm text-white">{t.as(user.nickname)}</p>
            <p className="text-xs text-white/45">{t.asNote}</p>
          </div>
        </div>
      ) : (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-xs uppercase tracking-[0.18em] text-white/50">{t.contactLabel}</legend>
          <div role="radiogroup" className="grid grid-cols-2 border border-white/12 p-0.5">
            {(["phone", "nickname"] as const).map((type) => (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={contact.type === type}
                onClick={() => setContact({ type, value: "" })}
                className={`py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                  contact.type === type ? "bg-rx-red text-white" : "text-white/55 hover:text-white"
                }`}
              >
                {type === "phone" ? t.phone : t.nickname}
              </button>
            ))}
          </div>
          <input
            aria-label={contact.type === "phone" ? t.phone : t.nickname}
            type={contact.type === "phone" ? "tel" : "text"}
            inputMode={contact.type === "phone" ? "tel" : "text"}
            autoComplete={contact.type === "phone" ? "tel" : "nickname"}
            maxLength={contact.type === "phone" ? 20 : NICKNAME_MAX}
            value={contact.value}
            onChange={(e) => setContact({ ...contact, value: e.target.value })}
            placeholder={contact.type === "phone" ? t.phonePlaceholder : t.nicknamePlaceholder}
            className={field}
          />
          <p className="text-xs text-white/45">
            <Link href={href("/login")} className="text-rx-red2 underline">
              {t.login}
            </Link>
            {t.loginRest}
          </p>
        </fieldset>
      )}

      <label className="block">
        <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-white/50">{t.description}</span>
        <textarea
          required
          rows={compact ? 4 : 6}
          maxLength={4000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t.descriptionPlaceholder}
          className={`${field} resize-none`}
        />
      </label>

      <label htmlFor={`${uid}-attach`} className="flex cursor-pointer items-start gap-2.5 text-xs text-white/60">
        <input
          id={`${uid}-attach`}
          type="checkbox"
          checked={attachOk}
          onChange={(e) => setAttachOk(e.target.checked)}
          className="mt-0.5 accent-[#e10600]"
        />
        {t.attach}
      </label>

      {!user && ready ? (
        <label htmlFor={`${uid}-pd`} className="flex cursor-pointer items-start gap-2.5 text-xs text-white/60">
          <input
            id={`${uid}-pd`}
            type="checkbox"
            checked={pdConsent}
            onChange={(e) => setPdConsent(e.target.checked)}
            className="mt-0.5 accent-[#e10600]"
          />
          <span>
            {t.consentBefore}
            <Link href={href("/legal/personal-data")} target="_blank" className="text-white/80 underline">
              {t.consentLink}
            </Link>
            {t.consentAfter}
          </span>
        </label>
      ) : null}

      {error ? (
        <p role="alert" className="border-l-2 border-rx-red bg-rx-red/10 px-3 py-2 text-sm text-white/85">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || !ready}
        className="rx-cut-sm w-full bg-gradient-to-r from-rx-red to-rx-red2 py-3 text-sm font-semibold uppercase tracking-wider text-white shadow-[0_10px_30px_-10px_rgba(225,6,0,0.8)] transition hover:brightness-110 disabled:opacity-50"
      >
        {pending ? t.pending : t.submit}
      </button>
    </form>
  );
}
