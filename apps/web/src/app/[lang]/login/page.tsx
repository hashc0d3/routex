"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { clientApi } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { useSession } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const { d, href, errorText } = useLocale();
  const t = d.login;
  const { applyAuth } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await clientApi.login(email, password);
      await applyAuth(res.accessToken);
      router.push(href("/account"));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="font-display text-4xl uppercase">{t.title}</h1>
      <p className="mt-2 text-white/55">{t.lead}</p>
      <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
        <label className="block text-sm">
          {t.email}
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-white/15 bg-rx-panel px-3 py-2 outline-none focus:border-rx-red"
          />
        </label>
        <label className="block text-sm">
          {t.password}
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border border-white/15 bg-rx-panel px-3 py-2 outline-none focus:border-rx-red"
          />
        </label>
        {error ? <p className="text-sm text-rx-red2">{error}</p> : null}
        <button type="submit" disabled={pending} className="w-full bg-rx-red py-2.5 font-semibold disabled:opacity-50">
          {pending ? t.pending : t.submit}
        </button>
      </form>
      <p className="mt-6 text-sm text-white/50">
        {t.noAccount}{" "}
        <Link href={href("/register")} className="text-white">
          {t.register}
        </Link>
      </p>
    </div>
  );
}
