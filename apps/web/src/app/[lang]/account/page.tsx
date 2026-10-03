"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AchievementBadge } from "@/components/AchievementBadge";
import { Avatar } from "@/components/Avatar";
import {
  CardIcon,
  CheckIcon,
  FlagIcon,
  LogoutIcon,
  PencilIcon,
  PlayIcon,
  RenewIcon,
  TrashIcon,
  UndoIcon,
  UploadIcon,
} from "@/components/icons";
import { DeleteAccountDialog } from "@/components/DeleteAccountDialog";
import { MyTickets } from "@/components/MyTickets";
import { PaymentHistory } from "@/components/PaymentHistory";
import { type PaidPlan, PurchaseConfirm } from "@/components/PurchaseConfirm";
import { AccountSkeleton } from "@/components/Skeleton";
import { achievementState, NICKNAME_MAX, nicknameError } from "@/lib/achievements";
import { clientApi, getAccessToken, usesLiveApi } from "@/lib/api";
import { copyText } from "@/lib/clipboard";
import { useLocale } from "@/lib/i18n";
import { prepareAvatar } from "@/lib/image";
import { mockHasActiveSession } from "@/lib/mock-api";
import { useNotifications } from "@/lib/notifications";
import { useSession } from "@/lib/session";

const chip =
  "rx-cut-sm inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition duration-200 disabled:pointer-events-none disabled:opacity-50";
const chipPrimary =
  "border border-rx-red/50 bg-rx-red/10 text-white hover:border-rx-red hover:bg-rx-red/25 hover:shadow-[0_0_18px_-4px_rgba(255,43,43,0.7)]";
const chipSolid =
  "bg-gradient-to-r from-rx-red to-rx-red2 text-white shadow-[0_8px_24px_-10px_rgba(225,6,0,0.9)] hover:brightness-110";
const chipGhost = "border border-white/15 bg-white/[0.03] text-white/70 hover:border-white/40 hover:bg-white/[0.07] hover:text-white";
const chipDanger = "border border-white/10 text-white/50 hover:border-rx-red/60 hover:text-rx-red2";

export default function AccountPage() {
  const router = useRouter();
  const { d, href, errorText } = useLocale();
  const t = d.account;
  const { ready, user, subscription, loyalty, referral, payments, refresh, setUser, logout } = useSession();
  const notifications = useNotifications();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingNick, setEditingNick] = useState(false);
  const [nickDraft, setNickDraft] = useState("");
  const [nickErr, setNickErr] = useState<string | null>(null);
  const [avatarErr, setAvatarErr] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [sessionLive, setSessionLive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const knownCodes = useRef<Set<string> | null>(null);
  const achTitle = (code: string) => d.achievements[code]?.title ?? code;
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(d.dateLocale);
  const fmtLong = (iso: string) =>
    new Date(iso).toLocaleDateString(d.dateLocale, { day: "numeric", month: "long", year: "numeric" });
  const [confirm, setConfirm] = useState<PaidPlan | null>(null);
  const [confirmErr, setConfirmErr] = useState<string | null>(null);
  const [paidNote, setPaidNote] = useState<string | null>(null);
  const [bonusOpen, setBonusOpen] = useState(false);
  const [bonusChoice, setBonusChoice] = useState<"days" | "keep">("days");
  const [bonusErr, setBonusErr] = useState<string | null>(null);
  const [bonusNote, setBonusNote] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const closeDelete = useCallback(() => setDeleting(false), []);
  const leavingRef = useRef(false);
  const closeConfirm = useCallback(() => setConfirm(null), []);

  const refLink = useMemo(() => {
    if (!user || !referral || typeof window === "undefined") return "";
    return `${window.location.origin}${href("/register")}?ref=${referral.code}`;
  }, [user, referral, href]);

  useEffect(() => {
    if (ready && !user && !leavingRef.current) router.replace(href("/login"));
  }, [ready, user, router, href]);

  useEffect(() => {
    const token = getAccessToken();
    if (!usesLiveApi && token) setSessionLive(mockHasActiveSession(token));
  }, [user]);

  useEffect(() => {
    if (!loyalty) return;
    const codes = new Set(loyalty.unlocked.map((u) => u.code));
    if (knownCodes.current) {
      const added = [...codes].filter((c) => !knownCodes.current!.has(c));
      if (added.length) {
        setFresh(new Set(added));
        const titles = added.map((c) => d.achievements[c]?.title ?? c);
        setToast(titles.length > 1 ? t.newMany(titles.join(", ")) : t.newOne(titles[0]));
        window.setTimeout(() => setToast(null), 4500);
      }
    }
    knownCodes.current = codes;
  }, [loyalty, d, t]);

  if (!ready || !user || !subscription || !loyalty || !referral) {
    return <AccountSkeleton label={d.common.loading} />;
  }

  const paid = subscription.status === "active";
  const ach = achievementState(loyalty);
  const sub = (() => {
    const DAY = 86_400_000;
    const total = subscription.planCode === "pro_year" ? 365 : subscription.status === "trial" ? 3 : 30;
    const msLeft = new Date(subscription.currentPeriodEnd).getTime() - Date.now();
    const ended = msLeft <= 0 || subscription.status === "expired";
    const daysLeft = ended ? 0 : Math.floor(msLeft / DAY);
    const tone = ended
      ? "border-rx-red/50 bg-rx-red/10 text-rx-red2"
      : subscription.status === "active"
        ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
        : "border-amber-400/40 bg-amber-400/10 text-amber-200";
    const planName =
      subscription.status === "trial" ? t.planName.trial : (t.planName[subscription.planCode] ?? subscription.planCode);
    return { ended, daysLeft, tone, planName, leftShare: ended ? 0 : Math.min(1, msLeft / (total * DAY)) };
  })();

  function withToken<T>(fn: (token: string) => Promise<T>) {
    const token = getAccessToken();
    if (!token) {
      router.push(href("/login"));
      return null;
    }
    return fn(token);
  }

  async function run(action: () => Promise<void>, onError: (msg: string) => void) {
    setPending(true);
    try {
      await action();
    } catch (err) {
      onError(errorText(err));
    } finally {
      setPending(false);
    }
  }

  function pay(planCode: PaidPlan) {
    setPaidNote(null);
    setConfirmErr(null);
    setConfirm(planCode);
  }

  function applyBonus() {
    if (bonusChoice === "keep") {
      setBonusOpen(false);
      return;
    }
    void run(async () => {
      await withToken((tk) => clientApi.claimBonus(tk));
      await refresh();
      setBonusOpen(false);
      setBonusNote(t.bonusApplied);
    }, setBonusErr);
  }

  function confirmPay(planCode: PaidPlan) {
    void run(async () => {
      await withToken((tk) => clientApi.mockPay(tk, planCode));
      await refresh();
      setConfirm(null);
      setPaidNote(planCode === "pro_year" ? t.paidYear : t.paidMonth);
    }, setConfirmErr);
  }

  function onAvatarPick(file: File | undefined) {
    if (!file) return;
    setAvatarErr(null);
    void run(async () => {
      try {
        const blob = await prepareAvatar(file);
        const next = await withToken((tk) => clientApi.setAvatar(tk, blob));
        if (next) setUser(next);
      } finally {
        if (fileRef.current) fileRef.current.value = "";
      }
    }, setAvatarErr);
  }

  function resetAvatar() {
    setAvatarErr(null);
    void run(async () => {
      const next = await withToken((tk) => clientApi.setAvatar(tk, null));
      if (next) setUser(next);
    }, setAvatarErr);
  }

  function saveNick() {
    const code = nicknameError(nickDraft);
    if (code) {
      setNickErr(d.errors[code]);
      return;
    }
    setNickErr(null);
    void run(async () => {
      const next = await withToken((tk) => clientApi.updateProfile(tk, { nickname: nickDraft }));
      if (next) setUser(next);
      setEditingNick(false);
    }, setNickErr);
  }

  function deleteAccount() {
    void run(async () => {
      await withToken((tk) => clientApi.deleteAccount(tk));
      leavingRef.current = true;
      router.replace(href("/"));
      await logout().catch(() => undefined);
    }, setDeleteErr);
  }

  function demoSession(action: "start" | "end") {
    void run(async () => {
      await withToken((tk) => clientApi.mockClientSession!(tk, action));
      setSessionLive(action === "start");
      await notifications.refresh();
    }, setMessage);
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-14">
      <section className="flex flex-col gap-6 border border-white/10 bg-rx-panel p-6 sm:flex-row sm:items-center">
        <div className="group relative w-fit">
          <Avatar nickname={user.nickname} src={user.avatarUrl} size={104} />
          <button
            type="button"
            disabled={pending}
            onClick={() => fileRef.current?.click()}
            className="absolute inset-[7px] flex items-center justify-center rounded-full bg-black/65 text-xs font-semibold uppercase tracking-wider opacity-0 transition group-hover:opacity-100 focus:opacity-100"
          >
            {t.change}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => onAvatarPick(e.target.files?.[0])}
          />
        </div>

        <div className="min-w-0 flex-1">
          {editingNick ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                autoFocus
                value={nickDraft}
                maxLength={NICKNAME_MAX}
                onChange={(e) => setNickDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveNick();
                  if (e.key === "Escape") setEditingNick(false);
                }}
                className="w-64 max-w-full border border-white/20 bg-black px-3 py-2 font-display text-2xl uppercase outline-none transition focus:border-rx-red focus:shadow-[0_0_0_3px_rgba(225,6,0,0.15)]"
              />
              <button type="button" disabled={pending} onClick={saveNick} className={`${chip} ${chipPrimary}`}>
                <CheckIcon size={14} />
                {d.common.save}
              </button>
              <button type="button" onClick={() => setEditingNick(false)} className={`${chip} ${chipGhost}`}>
                {d.common.cancel}
              </button>
            </div>
          ) : (
            <>
              <div className="flex min-w-0 items-center gap-3">
                <h1 title={user.nickname} className="min-w-0 truncate font-display text-4xl uppercase">
                  {user.nickname}
                </h1>
                {ach.top ? (
                  <span className="flex shrink-0 items-center gap-1.5 border border-rx-red/40 px-2 py-1 text-xs text-white/80">
                    <AchievementBadge months={ach.top.months} unlocked size={18} />
                    {achTitle(ach.top.code)}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  setNickDraft(user.nickname);
                  setNickErr(null);
                  setEditingNick(true);
                }}
                className="group/edit mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/50 transition hover:text-white"
              >
                <PencilIcon size={13} className="text-rx-red2 transition group-hover/edit:-rotate-12" />
                <span className="border-b border-dashed border-white/25 pb-px group-hover/edit:border-rx-red2">
                  {t.editNick}
                </span>
              </button>
            </>
          )}
          {nickErr ? <p className="mt-2 text-sm text-rx-red2">{nickErr}</p> : null}
          <p className="mt-2 text-sm text-white/45">{user.email}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={pending} onClick={() => fileRef.current?.click()} className={`${chip} ${chipPrimary}`}>
              <UploadIcon size={14} />
              {t.uploadAvatar}
            </button>
            {user.avatarUrl ? (
              <button type="button" disabled={pending} onClick={resetAvatar} className={`${chip} ${chipGhost}`}>
                <UndoIcon size={14} />
                {t.resetAvatar}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void logout().then(() => router.push(href("/")))}
              className={`${chip} ${chipDanger}`}
            >
              <LogoutIcon size={14} />
              {d.common.logout}
            </button>
          </div>
          {avatarErr ? <p className="mt-2 text-sm text-rx-red2">{avatarErr}</p> : null}
          <p className="mt-2 text-xs text-white/30">{t.avatarHint}</p>
        </div>
      </section>

      <section className="mt-6 border border-white/10 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xs uppercase tracking-wider text-white/40">{t.achievements}</h2>
            <p className="mt-2 font-display text-3xl uppercase">{t.together(loyalty.monthsTogether)}</p>
          </div>
          {ach.next ? (
            <p className="text-sm text-white/55">
              {t.untilNext(achTitle(ach.next.code), Math.max(0, ach.next.months - loyalty.monthsTogether))}
            </p>
          ) : (
            <p className="text-sm text-rx-red">{t.allDone}</p>
          )}
        </div>
        <div className="mt-4 h-1.5 w-full overflow-hidden bg-white/10">
          <div
            className="h-full bg-rx-red transition-all duration-700 ease-out"
            style={{ width: `${Math.round(ach.progress * 100)}%` }}
          />
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ach.items.map((a) => (
            <li
              key={a.code}
              title={a.unlockedAt ? t.unlockedOn(fmtDate(a.unlockedAt)) : t.unlocksIn(a.months)}
              className={`flex flex-col items-center border p-4 text-center transition ${
                a.unlockedAt ? "border-rx-red/40 bg-rx-red/[0.04]" : "border-white/10"
              }`}
            >
              <AchievementBadge months={a.months} unlocked={Boolean(a.unlockedAt)} fresh={fresh.has(a.code)} />
              <p className={`mt-3 text-sm font-semibold ${a.unlockedAt ? "" : "text-white/45"}`}>{achTitle(a.code)}</p>
              <p className="mt-1 text-xs text-white/40">{d.achievements[a.code]?.description}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-white/35">{t.loyaltyNote}</p>
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="relative overflow-hidden border border-white/10 bg-rx-panel p-6">
          <span className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-rx-red/15 blur-3xl" />
          <div className="relative flex items-start justify-between gap-3">
            <h2 className="text-xs uppercase tracking-wider text-white/40">{t.subCurrent}</h2>
            <span className={`border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${sub.tone}`}>
              {t.subBadge[subscription.status] ?? subscription.status}
            </span>
          </div>
          <p className="relative mt-2 font-display text-4xl uppercase">{sub.planName}</p>
          <dl className="relative mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-white/40">{sub.ended ? t.subEnded : t.subValidUntil}</dt>
              <dd className="mt-0.5 font-semibold text-white">{fmtLong(subscription.currentPeriodEnd)}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/40">{t.subLeft}</dt>
              <dd className={`mt-0.5 font-semibold ${sub.ended || sub.daysLeft <= 3 ? "text-rx-red2" : "text-white"}`}>
                {sub.ended ? "—" : sub.daysLeft === 0 ? t.subToday : t.daysLeft(sub.daysLeft)}
              </dd>
            </div>
          </dl>
          <div className="relative mt-3 h-1.5 w-full overflow-hidden bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-rx-red to-rx-red2 shadow-[0_0_10px_rgba(255,43,43,0.7)] transition-all duration-700"
              style={{ width: `${Math.round(sub.leftShare * 100)}%` }}
            />
          </div>
          <div className="relative mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() => pay("pro_month")}
              className={`${chip} ${chipSolid}`}
            >
              <RenewIcon size={14} />
              {paid ? t.renewPro : t.buyPro}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => pay("pro_year")}
              className={`${chip} ${chipGhost}`}
            >
              <CardIcon size={14} />
              {t.buyYear}
            </button>
          </div>
          {paidNote ? (
            <p role="status" className="relative mt-3 text-sm text-emerald-300">
              {paidNote}
            </p>
          ) : null}

          <PaymentHistory payments={payments} />
        </section>

        <section className="border border-white/10 p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xs uppercase tracking-wider text-white/40">{t.referral}</h2>
            <span className="font-display text-sm tracking-wide text-white">{t.referralBalance(referral.balance)}</span>
          </div>
          <p className="mt-2 break-all text-sm text-white/80">{refLink}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={`${chip} ${copied ? "border border-emerald-400/50 bg-emerald-400/10 text-emerald-300" : chipGhost}`}
              onClick={() => {
                void copyText(refLink).then(setCopied);
              }}
            >
              {copied ? t.copied : t.copy}
            </button>
            <button
              type="button"
              disabled={!referral.claimable || pending}
              className={`${chip} ${chipPrimary}`}
              onClick={() => {
                setBonusErr(null);
                setBonusChoice("days");
                setBonusOpen(true);
              }}
            >
              {referral.claimable ? t.claimBonus : t.bonusEmpty}
            </button>
          </div>
          <p className="mt-3 text-xs text-white/40">
            {t.referralInvited(referral.invited)} · {t.referralPaid(referral.paid)}
          </p>
          <p className="mt-1.5 text-sm text-white/45">{t.referralNote}</p>

          {bonusOpen ? (
            <div className="mt-4 border border-white/10 bg-black/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rx-red2">{t.bonusTitle}</p>
              <div className="mt-3 space-y-2">
                <label className={`flex cursor-pointer gap-3 border p-3 text-sm ${bonusChoice === "days" ? "border-rx-red/60 bg-rx-red/10" : "border-white/10"}`}>
                  <input
                    type="radio"
                    name="bonus"
                    className="mt-1 accent-rx-red"
                    checked={bonusChoice === "days"}
                    onChange={() => setBonusChoice("days")}
                  />
                  <span>
                    <span className="block font-semibold text-white">{t.bonusDays}</span>
                    <span className="text-xs text-white/50">{t.bonusDaysHint}</span>
                  </span>
                </label>
                <label className={`flex cursor-pointer gap-3 border p-3 text-sm ${bonusChoice === "keep" ? "border-rx-red/60 bg-rx-red/10" : "border-white/10"}`}>
                  <input
                    type="radio"
                    name="bonus"
                    className="mt-1 accent-rx-red"
                    checked={bonusChoice === "keep"}
                    onChange={() => setBonusChoice("keep")}
                  />
                  <span>
                    <span className="block font-semibold text-white">{t.bonusPoints}</span>
                    <span className="text-xs text-white/50">{t.bonusPointsHint}</span>
                  </span>
                </label>
              </div>
              {bonusErr ? <p className="mt-3 text-sm text-rx-red2">{bonusErr}</p> : null}
              <div className="mt-4 flex gap-2">
                <button type="button" disabled={pending} onClick={applyBonus} className={`${chip} ${chipSolid}`}>
                  {t.bonusApply}
                </button>
                <button type="button" onClick={() => setBonusOpen(false)} className={`${chip} ${chipGhost}`}>
                  {d.common.cancel}
                </button>
              </div>
            </div>
          ) : null}
          {bonusNote ? (
            <p role="status" className="mt-3 text-sm text-emerald-300">
              {bonusNote}
            </p>
          ) : null}
        </section>
      </div>

      <section className="mt-6 border border-white/10 p-6">
        <h2 className="text-xs uppercase tracking-wider text-white/40">{t.client}</h2>
        <p className="mt-2 text-white/75">{paid ? t.clientPaid : t.clientTrial}</p>
        <Link href={href("/download")} className="mt-3 inline-block text-rx-red">
          {d.common.downloadWindows}
        </Link>
        {!usesLiveApi && clientApi.mockClientSession ? (
          <div className="mt-5 border-t border-dashed border-white/10 pt-4">
            <button
              type="button"
              disabled={pending}
              onClick={() => demoSession(sessionLive ? "end" : "start")}
              className={`flex items-center gap-2 border px-3 py-2 text-sm transition disabled:opacity-50 ${
                sessionLive
                  ? "border-rx-red/60 bg-rx-red/10 text-rx-red2 hover:bg-rx-red/20"
                  : "border-white/20 text-white/75 hover:border-white"
              }`}
            >
              {sessionLive ? <FlagIcon size={14} /> : <PlayIcon size={14} />}
              {sessionLive ? d.notifications.demoEnd : d.notifications.demoStart}
            </button>
            <p className="mt-2 text-xs text-white/35">{d.notifications.demoNote}</p>
          </div>
        ) : null}
      </section>

      <MyTickets />

      <section className="mt-6 border border-white/10 p-6">
        <h2 className="text-xs uppercase tracking-wider text-white/40">{t.personalData}</h2>
        <p className="mt-2 max-w-xl text-sm text-white/50">{t.deleteHint}</p>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setDeleteErr(null);
            setDeleting(true);
          }}
          className={`mt-4 ${chip} ${chipDanger}`}
        >
          <TrashIcon size={14} />
          {t.deleteBtn}
        </button>
      </section>
      <DeleteAccountDialog
        open={deleting}
        pending={pending}
        error={deleteErr}
        onConfirm={deleteAccount}
        onClose={closeDelete}
      />
      {message ? <p className="mt-6 text-sm text-white/70">{message}</p> : null}
      <PurchaseConfirm
        plan={confirm}
        pending={pending}
        error={confirmErr}
        onConfirm={confirmPay}
        onClose={closeConfirm}
      />

      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 flex animate-toast-in items-center gap-3 border border-rx-red bg-rx-black px-4 py-3">
          <AchievementBadge months={ach.top?.months ?? 1} unlocked size={36} fresh />
          <p className="text-sm font-semibold">{toast}</p>
        </div>
      ) : null}
    </div>
  );
}
