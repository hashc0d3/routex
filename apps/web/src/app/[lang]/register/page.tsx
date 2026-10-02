"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { CheckIcon } from "@/components/icons";
import { NICKNAME_MAX, nicknameError } from "@/lib/achievements";
import { clientApi } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { ApiError } from "@/lib/types";

type NickState = "idle" | "checking" | "free" | "taken" | "invalid";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const plan = params.get("plan");
  const { d, href, errorText } = useLocale();
  const t = d.register;
  const { applyAuth } = useSession();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consentOffer, setConsentOffer] = useState(false);
  const [consentPersonalData, setConsentPersonalData] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [nickState, setNickState] = useState<NickState>("idle");

  useEffect(() => {
    const value = nickname.trim();
    if (value.length < 3) {
      setNickState("idle");
      return;
    }
    if (nicknameError(value)) {
      setNickState("invalid");
      return;
    }
    setNickState("checking");
    let alive = true;
    const timer = setTimeout(() => {
      clientApi
        .checkNickname(value)
        .then((r) => alive && setNickState(r.available ? "free" : "taken"))
        .catch(() => alive && setNickState("idle"));
    }, 400);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [nickname]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (nickState === "taken") return;
    setPending(true);
    setError(null);
    try {
      const nickError = nicknameError(nickname);
      if (nickError) throw new ApiError(nickError);
      const res = await clientApi.register({
        nickname,
        email,
        password,
        consentOffer,
        consentPersonalData,
        consentMarketing,
      });
      if (plan === "pro" || plan === "year") {
        await clientApi.mockPay(res.accessToken, plan === "year" ? "pro_year" : "pro_month");
      }
      await applyAuth(res.accessToken);
      router.push(href("/account"));
    } catch (err) {
      if (err instanceof ApiError && err.code === "nickname_taken") setNickState("taken");
      setError(errorText(err));
    } finally {
      setPending(false);
    }
  }

  const input = "mt-1 w-full border border-white/15 bg-rx-panel px-3 py-2 outline-none focus:border-rx-red";

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="font-display text-4xl uppercase">{t.title}</h1>
      <p className="mt-2 text-white/55">{plan === "pro" ? t.leadPro : plan === "year" ? t.leadYear : t.leadTrial}</p>
      <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
        <label className="block text-sm">
          {t.nickname}
          <input
            required
            minLength={3}
            maxLength={NICKNAME_MAX}
            autoComplete="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            aria-invalid={nickState === "taken" || nickState === "invalid"}
            aria-describedby="nick-status"
            className={`mt-1 w-full border bg-rx-panel px-3 py-2 outline-none transition-colors ${
              nickState === "taken" || nickState === "invalid"
                ? "border-rx-red/70 focus:border-rx-red"
                : nickState === "free"
                  ? "border-emerald-400/50 focus:border-emerald-400"
                  : "border-white/15 focus:border-rx-red"
            }`}
          />
          <span id="nick-status" aria-live="polite" className="mt-1 flex items-center gap-1.5 text-xs">
            {nickState === "checking" ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border border-white/20 border-t-white/70" />
                <span className="text-white/45">{t.nickChecking}</span>
              </>
            ) : nickState === "free" ? (
              <>
                <CheckIcon size={12} className="text-emerald-300" />
                <span className="text-emerald-300">{t.nickFree}</span>
              </>
            ) : nickState === "taken" ? (
              <span className="text-rx-red2">{d.errors.nickname_taken}</span>
            ) : nickState === "invalid" ? (
              <span className="text-rx-red2">{d.errors.nickname_invalid}</span>
            ) : (
              <span className="text-white/40">{t.nicknameHint}</span>
            )}
          </span>
        </label>
        <label className="block text-sm">
          {t.email}
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        </label>
        <label className="block text-sm">
          {t.password}
          <input
            required
            minLength={8}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
        </label>
        <label className="flex gap-2 text-sm text-white/70">
          <input type="checkbox" checked={consentOffer} onChange={(e) => setConsentOffer(e.target.checked)} />
          <span>
            {t.offerBefore}{" "}
            <Link href={href("/legal/terms")} className="text-white">
              {t.offerLink}
            </Link>
          </span>
        </label>
        <label className="flex gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={consentPersonalData}
            onChange={(e) => setConsentPersonalData(e.target.checked)}
          />
          <span>
            {t.pdBefore}{" "}
            <Link href={href("/legal/privacy")} className="text-white">
              {t.pdLink}
            </Link>
          </span>
        </label>
        <label className="flex gap-2 text-sm text-white/70">
          <input type="checkbox" checked={consentMarketing} onChange={(e) => setConsentMarketing(e.target.checked)} />
          <span>{t.marketing}</span>
        </label>
        {error ? <p className="text-sm text-rx-red2">{error}</p> : null}
        <button type="submit" disabled={pending || nickState === "taken"} className="w-full bg-rx-red py-2.5 font-semibold disabled:opacity-50">
          {pending ? t.pending : t.submit}
        </button>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-white/40">…</p>}>
      <RegisterForm />
    </Suspense>
  );
}
