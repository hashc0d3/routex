import Link from "next/link";
import { ROLE_INFO, type Role } from "@/lib/rbac";

function Arrow({ dir, className = "" }: { dir: "left" | "right"; className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className={className}>
      {dir === "left" ? <path d="M19 12H5M11 6l-6 6 6 6" /> : <path d="M5 12h14M13 6l6 6-6 6" />}
    </svg>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="link-back">
      <span className="arrow">
        <Arrow dir="left" />
      </span>
      {children}
    </Link>
  );
}

/** Кнопка-ссылка со стрелкой вправо («Изменить →», «Все заявки →»). */
export function ActionLink({
  href,
  children,
  tone = "ghost",
  size = "sm",
}: {
  href: string;
  children: React.ReactNode;
  tone?: "ghost" | "primary";
  size?: "sm" | "md";
}) {
  return (
    <Link href={href} className={`btn ${size === "sm" ? "btn-sm" : ""} ${tone === "primary" ? "btn-primary" : "btn-ghost"}`}>
      {children}
      <Arrow dir="right" className="arrow-r" />
    </Link>
  );
}
import { statusOf, type TicketStatus } from "@/lib/support";
import { SUBSCRIPTION_INFO, type SubscriptionStatus } from "@/lib/clients-shared";

export function RoleBadge({ role }: { role: Role }) {
  const r = ROLE_INFO[role];
  return (
    <span className={`inline-block border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${r.tone}`}>{r.label}</span>
  );
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  const s = statusOf(status);
  return <span className={`inline-block border px-2 py-0.5 text-[11px] font-semibold ${s.tone}`}>{s.label}</span>;
}

export function Unavailable({
  message,
  title = "Сервис заявок недоступен",
  scripts = ["dev:support"],
}: {
  message: string;
  title?: string;
  scripts?: string[];
}) {
  return (
    <div className="border border-rx-red/40 bg-rx-red/10 p-5 text-sm">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-white/60">{message}</p>
      <p className="mt-3 text-white/45">
        Проверь, что запущены <code>npm run db:up</code>
        {scripts.map((s) => (
          <span key={s}>
            {" "}
            и <code>npm run {s}</code>
          </span>
        ))}
        .
      </p>
    </div>
  );
}

/** Как на сайте: загруженная картинка или первая буква ника. */
export function ClientAvatar({ nickname, src, size = 36 }: { nickname: string; src: string | null; size?: number }) {
  const style = { width: size, height: size };
  if (src) {
    // картинка с identity (другой origin, уже 256×256) — оптимизация next/image тут не нужна
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" style={style} className="shrink-0 rounded-full object-cover" />;
  }
  return (
    <span
      style={{ ...style, fontSize: size * 0.42 }}
      className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-rx-red to-rx-red2 font-display uppercase text-white"
      aria-hidden
    >
      {nickname.trim().charAt(0) || "?"}
    </span>
  );
}

export function SubscriptionBadge({ status }: { status: SubscriptionStatus | null }) {
  const s = status ? SUBSCRIPTION_INFO[status] : { label: "Нет данных", tone: "border-white/15 bg-white/5 text-white/40" };
  return <span className={`inline-block border px-2 py-0.5 text-[11px] font-semibold ${s.tone}`}>{s.label}</span>;
}

export function PageTitle({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-3xl uppercase">{children}</h1>
      {sub ? <p className="mt-1 text-sm text-white/50">{sub}</p> : null}
    </div>
  );
}
