"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { CheckIcon } from "@/components/icons";
import { type PaidPlan, PurchaseConfirm } from "@/components/PurchaseConfirm";
import { Reveal } from "@/components/Reveal";
import { clientApi, getAccessToken } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { PLANS } from "@/lib/plans";
import { useSession } from "@/lib/session";

export function Pricing() {
  const router = useRouter();
  const { d, href, errorText } = useLocale();
  const { user, refresh } = useSession();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<PaidPlan | null>(null);
  const [confirmErr, setConfirmErr] = useState<string | null>(null);
  const closeConfirm = useCallback(() => setConfirm(null), []);

  async function buy(code: string, id: string) {
    setError(null);
    if (id === "trial") {
      router.push(href(user ? "/download" : "/register"));
      return;
    }
    if (!user) {
      router.push(href(`/register?plan=${id}`));
      return;
    }
    if (!getAccessToken()) {
      router.push(href("/login"));
      return;
    }
    setConfirmErr(null);
    setConfirm(code as PaidPlan);
  }

  async function pay(code: PaidPlan) {
    const token = getAccessToken();
    if (!token) return;
    setPending(code);
    setConfirmErr(null);
    try {
      await clientApi.mockPay(token, code);
      await refresh();
      setConfirm(null);
      router.push(href("/account"));
    } catch (err) {
      setConfirmErr(errorText(err));
    } finally {
      setPending(null);
    }
  }

  return (
    <div>
      <div className="grid items-stretch gap-5 md:grid-cols-3">
        {PLANS.map((plan, i) => {
          const text = d.plans[plan.id];
          const popular = plan.popular;
          return (
            <Reveal key={plan.id} delay={i * 110} className="h-full">
              <article
                className={`relative flex h-full flex-col border p-7 transition duration-300 hover:-translate-y-1 ${
                  popular
                    ? "border-rx-red bg-rx-panel md:-translate-y-2 md:hover:-translate-y-3"
                    : "border-white/15 bg-black hover:border-white/35"
                }`}
              >
                {popular ? (
                  <p className="absolute -top-3 left-7 bg-rx-red px-2 py-0.5 text-xs font-semibold uppercase tracking-wider">
                    {d.plans.popular}
                  </p>
                ) : null}
                <h3 className="font-display text-2xl uppercase">{text.name}</h3>
                <p className="mt-4 font-display text-5xl text-white">{text.price}</p>
                <p className="mt-1 text-sm text-white/50">{text.hint}</p>
                <ul className="mt-7 flex-1 space-y-3 text-sm text-white/75">
                  {text.features.map((f) => (
                    <li key={f} className="flex gap-3">
                      <span
                        className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full ${
                          popular ? "bg-rx-red text-white" : "bg-rx-red/15 text-rx-red2"
                        }`}
                      >
                        <CheckIcon size={12} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={pending !== null}
                  onClick={() => void buy(plan.code, plan.id)}
                  className={`mt-8 py-3 text-sm font-semibold transition disabled:opacity-50 ${
                    popular
                      ? "bg-rx-red text-white hover:bg-rx-red2"
                      : "border border-white/20 hover:border-white hover:bg-white/5"
                  }`}
                >
                  {pending === plan.code ? d.plans.pending : text.cta}
                </button>
              </article>
            </Reveal>
          );
        })}
      </div>
      {error ? <p className="mt-4 text-sm text-rx-red2">{error}</p> : null}
      <p className="mt-6 text-xs text-white/40">{d.plans.footnote}</p>
      <PurchaseConfirm
        plan={confirm}
        pending={pending !== null}
        error={confirmErr}
        onConfirm={(code) => void pay(code)}
        onClose={closeConfirm}
      />
    </div>
  );
}
