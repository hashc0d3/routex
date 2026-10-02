import { Injectable, OnModuleInit } from "@nestjs/common";
import { audit } from "./audit";
import type { MockPayDto } from "./dto";
import { PrismaService } from "./prisma.service";

const PLANS = [
  { code: "trial_3d", periodMonths: 0, periodDays: 3, priceMinor: 0 },
  { code: "pro_month", periodMonths: 1, periodDays: 0, priceMinor: 49_000 },
  { code: "pro_year", periodMonths: 12, periodDays: 0, priceMinor: 390_000 },
] as const;

/** Пороги в оплаченных месяцах; названия — на сайте (apps/web/src/lib/achievements.ts). */
const ACHIEVEMENTS = [
  { code: "months_1", months: 1 },
  { code: "months_3", months: 3 },
  { code: "months_6", months: 6 },
  { code: "months_12", months: 12 },
  { code: "months_24", months: 24 },
  { code: "months_36", months: 36 },
];

const MAX_NOTIFICATIONS = 50;

type SubRow = {
  status: "trial" | "active" | "grace" | "expired";
  trialEndsAt: Date | null;
  currentPeriodEnd: Date;
  plan: { code: string };
};

export function subscriptionView(s: SubRow) {
  const ended = s.currentPeriodEnd.getTime() <= Date.now();
  return {
    status: ended ? ("expired" as const) : s.status,
    planCode: s.plan.code,
    trialEndsAt: s.trialEndsAt?.toISOString() ?? null,
    currentPeriodEnd: s.currentPeriodEnd.toISOString(),
  };
}

const SUB_INCLUDE = { plan: { select: { code: true } } } as const;

@Injectable()
export class BillingService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    for (const p of PLANS) {
      await this.prisma.plan.upsert({ where: { code: p.code }, create: { ...p }, update: { ...p } });
    }
  }

  private planId(code: string) {
    return this.prisma.plan.findUniqueOrThrow({ where: { code }, select: { id: true, periodMonths: true, priceMinor: true, currency: true } });
  }

  /** Пробный период выдаётся при первом обращении нового пользователя — identity про billing не знает. */
  private async subscriptionOf(userId: string) {
    const found = await this.prisma.subscription.findUnique({ where: { userId }, include: SUB_INCLUDE });
    if (found) return found;
    const trial = await this.planId("trial_3d");
    const end = new Date(Date.now() + 3 * 86_400_000);
    return this.prisma.subscription.upsert({
      where: { userId },
      create: { userId, planId: trial.id, status: "trial", trialEndsAt: end, currentPeriodEnd: end },
      update: {},
      include: SUB_INCLUDE,
    });
  }

  async me(userId: string) {
    const [sub, loyalty, unlocked] = await Promise.all([
      this.subscriptionOf(userId),
      this.prisma.loyalty.findUnique({ where: { userId } }),
      this.prisma.userAchievement.findMany({ where: { userId }, orderBy: { unlockedAt: "asc" } }),
    ]);
    return {
      subscription: subscriptionView(sub),
      loyalty: {
        monthsTogether: loyalty?.monthsTogether ?? 0,
        unlocked: unlocked.map((a) => ({ code: a.code, unlockedAt: a.unlockedAt.toISOString() })),
      },
    };
  }

  async mockPay(userId: string, dto: MockPayDto) {
    const sub = await this.subscriptionOf(userId);
    const providerRef = `mock:${dto.idempotencyKey ?? crypto.randomUUID()}`;
    const plan = await this.planId(dto.planCode);

    const done = await this.prisma.$transaction(async (tx) => {
      const dup = await tx.payment.findUnique({ where: { providerRef }, select: { id: true } });
      if (dup) return null;

      const current = await tx.subscription.findUniqueOrThrow({ where: { id: sub.id } });
      const renewing = current.status === "active" && current.currentPeriodEnd > new Date();
      const end = new Date(renewing ? current.currentPeriodEnd : Date.now());
      end.setMonth(end.getMonth() + plan.periodMonths);

      await tx.subscription.update({
        where: { id: sub.id },
        data: { planId: plan.id, status: "active", trialEndsAt: null, currentPeriodEnd: end },
      });
      const payment = await tx.payment.create({
        select: { id: true },
        data: {
          subscriptionId: sub.id,
          planCode: dto.planCode,
          provider: "mock",
          providerRef,
          status: "succeeded",
          amountMinor: plan.priceMinor,
          currency: plan.currency,
        },
      });
      const loyalty = await tx.loyalty.upsert({
        where: { userId },
        create: { userId, monthsTogether: plan.periodMonths },
        update: { monthsTogether: { increment: plan.periodMonths } },
      });

      const have = new Set((await tx.userAchievement.findMany({ where: { userId }, select: { code: true } })).map((a) => a.code));
      const fresh = ACHIEVEMENTS.filter((a) => loyalty.monthsTogether >= a.months && !have.has(a.code));
      if (fresh.length) {
        await tx.userAchievement.createMany({ data: fresh.map((a) => ({ userId, code: a.code })), skipDuplicates: true });
      }

      await tx.notification.createMany({
        data: [
          {
            userId,
            type: renewing ? "subscription_renewed" : "subscription_purchased",
            data: { plan: dto.planCode, until: end.toISOString() },
          },
          ...fresh.map((a) => ({ userId, type: "achievement_unlocked", data: { code: a.code } })),
        ],
      });
      return { renewing, end, paymentId: payment.id, months: loyalty.monthsTogether, unlocked: fresh.map((a) => a.code) };
    });

    if (done) {
      audit({
        type: done.renewing ? "subscription.renewed" : "subscription.purchased",
        userId,
        targetId: done.paymentId,
        meta: {
          plan: dto.planCode,
          amountMinor: plan.priceMinor,
          currency: plan.currency,
          provider: "mock",
          until: done.end.toISOString(),
          monthsTogether: done.months,
          ...(done.unlocked.length ? { achievements: done.unlocked.join(",") } : {}),
        },
      });
    }

    const fresh = await this.prisma.subscription.findUniqueOrThrow({ where: { id: sub.id }, include: SUB_INCLUDE });
    return subscriptionView(fresh);
  }

  async notifications(userId: string) {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: MAX_NOTIFICATIONS,
    });
    return rows.map((n) => ({
      id: n.id,
      type: n.type,
      data: n.data,
      createdAt: n.createdAt.toISOString(),
      readAt: n.readAt?.toISOString() ?? null,
    }));
  }

  async markRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  }

  async clearNotifications(userId: string) {
    await this.prisma.notification.deleteMany({ where: { userId } });
  }

  /** Аккаунт удалён в identity: подписка, платежи, ачивки и уведомления уходят вместе с ним. */
  async forget(userId: string) {
    await this.prisma.$transaction([
      this.prisma.notification.deleteMany({ where: { userId } }),
      this.prisma.userAchievement.deleteMany({ where: { userId } }),
      this.prisma.loyalty.deleteMany({ where: { userId } }),
      this.prisma.subscription.deleteMany({ where: { userId } }),
    ]);
  }

  // ——— админка ———

  async lookup(userIds: string[]) {
    const [subs, loyalty] = await Promise.all([
      this.prisma.subscription.findMany({ where: { userId: { in: userIds } }, include: SUB_INCLUDE }),
      this.prisma.loyalty.findMany({ where: { userId: { in: userIds } } }),
    ]);
    const months = new Map(loyalty.map((l) => [l.userId, l.monthsTogether]));
    return Object.fromEntries(
      subs.map((s) => [s.userId, { ...subscriptionView(s), monthsTogether: months.get(s.userId) ?? 0 }]),
    );
  }

  async adminUser(userId: string) {
    const [sub, loyalty, unlocked] = await Promise.all([
      this.prisma.subscription.findUnique({
        where: { userId },
        include: { ...SUB_INCLUDE, payments: { orderBy: { createdAt: "desc" }, take: 50 } },
      }),
      this.prisma.loyalty.findUnique({ where: { userId } }),
      this.prisma.userAchievement.findMany({ where: { userId }, orderBy: { unlockedAt: "asc" } }),
    ]);
    return {
      subscription: sub ? subscriptionView(sub) : null,
      monthsTogether: loyalty?.monthsTogether ?? 0,
      achievements: unlocked.map((a) => ({ code: a.code, unlockedAt: a.unlockedAt.toISOString() })),
      payments: (sub?.payments ?? []).map((p) => ({
        id: p.id,
        planCode: p.planCode,
        provider: p.provider,
        status: p.status,
        amountMinor: p.amountMinor,
        currency: p.currency,
        createdAt: p.createdAt.toISOString(),
      })),
    };
  }

  async stats() {
    const now = new Date();
    const month = new Date(Date.now() - 30 * 86_400_000);
    const [active, trial, expired, revenue] = await Promise.all([
      this.prisma.subscription.count({ where: { status: "active", currentPeriodEnd: { gt: now } } }),
      this.prisma.subscription.count({ where: { status: "trial", currentPeriodEnd: { gt: now } } }),
      this.prisma.subscription.count({ where: { currentPeriodEnd: { lte: now } } }),
      this.prisma.payment.aggregate({
        where: { status: "succeeded", createdAt: { gte: month } },
        _sum: { amountMinor: true },
        _count: true,
      }),
    ]);
    return { active, trial, expired, payments30d: revenue._count, revenue30dMinor: revenue._sum.amountMinor ?? 0 };
  }
}
