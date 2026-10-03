/** Без серверных импортов: типы и подписи для страниц клиентов. */

export type SubscriptionStatus = "trial" | "active" | "grace" | "expired";

export const SUBSCRIPTION_INFO: Record<SubscriptionStatus, { label: string; tone: string }> = {
  trial: { label: "Пробный", tone: "border-sky-400/50 bg-sky-400/10 text-sky-300" },
  active: { label: "Активна", tone: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" },
  grace: { label: "Льготный период", tone: "border-amber-400/50 bg-amber-400/10 text-amber-300" },
  expired: { label: "Закончилась", tone: "border-white/15 bg-white/5 text-white/50" },
};

export const PLAN_LABEL: Record<string, string> = {
  trial_3d: "Пробный · 3 дня",
  pro_month: "Pro · месяц",
  pro_year: "Pro · год",
  bonus_10d: "Бонус · 10 дней",
};

export const CONSENT_LABEL: Record<string, string> = {
  OFFER: "Оферта",
  PERSONAL_DATA: "Обработка ПДн",
  MARKETING: "Рассылки",
};

/** Сумма операции: деньги в рублях, бонусные дни — в бонусах (300 за операцию). */
export const fmtMoney = (minor: number, currency = "RUB") =>
  currency === "BONUS"
    ? "300 бонусов"
    : new Intl.NumberFormat("ru-RU", { style: "currency", currency, maximumFractionDigits: 0 }).format(minor / 100);
