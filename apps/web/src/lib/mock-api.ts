import { nicknameError, unlockedCodesFor } from "./achievements";
import { blobToDataUrl } from "./image";
import { safeStorage } from "./storage";
import { uuid } from "./uuid";
import {
  type Api,
  ApiError,
  type AppNotification,
  type FaqArticle,
  type Me,
  type NotificationType,
  type RegisterPayload,
  type Subscription,
  type UnlockedAchievement,
  type User,
} from "./types";

const STORE = "routex.mock.db";
const MAX_NOTIFICATIONS = 50;
const MOCK_GAMES = ["Counter-Strike 2", "Dota 2", "Valorant", "Apex Legends", "Fortnite"];

type ActiveSession = { id: string; game: string; startedAt: string };

type Row = {
  password: string;
  user: User;
  subscription: Subscription;
  paidMonths: number;
  /** Реферальный код этого пользователя. */
  refCode: string;
  /** Чей код использован при регистрации. */
  referredBy: string | null;
  /** Приглашённый уже оплатил — бонус пригласившему начислен. */
  referralPaid: boolean;
  /** Бонусы на счету. */
  bonus: number;
  unlocked: UnlockedAchievement[];
  notifications: AppNotification[];
  activeSession: ActiveSession | null;
};

type Db = { users: Record<string, Row> };

type LegacyUser = Partial<User> & { displayName?: string };

function trialSub(): Subscription {
  const end = new Date();
  end.setDate(end.getDate() + 3);
  return {
    status: "trial",
    planCode: "trial_3d",
    trialEndsAt: end.toISOString(),
    currentPeriodEnd: end.toISOString(),
  };
}

function normalize(row: Row): Row {
  const legacy = row.user as LegacyUser;
  return {
    ...row,
    user: {
      id: row.user.id,
      email: row.user.email,
      nickname: legacy.nickname ?? legacy.displayName ?? row.user.email.split("@")[0],
      avatarUrl: legacy.avatarUrl ?? null,
      createdAt: row.user.createdAt,
    },
    paidMonths: row.paidMonths ?? (row.subscription.status === "active" ? 1 : 0),
    refCode: row.refCode ?? row.user.id.replace(/-/g, "").slice(0, 8),
    referredBy: row.referredBy ?? null,
    referralPaid: row.referralPaid ?? false,
    bonus: row.bonus ?? 0,
    unlocked: row.unlocked ?? [],
    notifications: row.notifications ?? [],
    activeSession: row.activeSession ?? null,
  };
}

function load(): Db {
  const raw = safeStorage.get(STORE);
  if (!raw) return { users: {} };
  try {
    const db = JSON.parse(raw) as Db;
    for (const key of Object.keys(db.users)) db.users[key] = normalize(db.users[key]);
    return db;
  } catch {
    return { users: {} };
  }
}

function save(db: Db) {
  if (!safeStorage.set(STORE, JSON.stringify(db))) throw new ApiError("generic");
}

function tokenFor(email: string) {
  return `mock.${btoa(unescape(encodeURIComponent(email)))}`;
}

function emailFromToken(token: string): string | null {
  if (!token.startsWith("mock.")) return null;
  try {
    return decodeURIComponent(escape(atob(token.slice(5))));
  } catch {
    return null;
  }
}

function rowFor(db: Db, token: string): Row {
  const email = emailFromToken(token);
  const row = email ? db.users[email] : undefined;
  if (!row) throw new ApiError("session_invalid");
  return row;
}

function nicknameTaken(db: Db, nickname: string, exceptEmail?: string) {
  const n = nickname.trim().toLowerCase();
  return Object.values(db.users).some(
    (r) => r.user.email !== exceptEmail && r.user.nickname.toLowerCase() === n,
  );
}

function notify(row: Row, type: NotificationType, data: AppNotification["data"] = {}) {
  row.notifications.unshift({
    id: uuid(),
    type,
    data,
    createdAt: new Date().toISOString(),
    readAt: null,
  });
  row.notifications.length = Math.min(row.notifications.length, MAX_NOTIFICATIONS);
}

function syncAchievements(row: Row) {
  const have = new Set(row.unlocked.map((u) => u.code));
  const now = new Date().toISOString();
  for (const code of unlockedCodesFor(row.paidMonths)) {
    if (have.has(code)) continue;
    row.unlocked.push({ code, unlockedAt: now });
    notify(row, "achievement_unlocked", { code });
  }
}

const BONUS_PER_FRIEND = 300;

function referralOf(db: Db, row: Row) {
  const friends = Object.values(db.users).filter((u) => u.referredBy === row.refCode);
  return {
    code: row.refCode,
    invited: friends.length,
    paid: friends.filter((u) => u.referralPaid).length,
    balance: row.bonus,
    claimable: row.bonus >= BONUS_PER_FRIEND,
  };
}

function toMe(db: Db, row: Row): Me {
  return {
    user: row.user,
    subscription: row.subscription,
    loyalty: { monthsTogether: row.paidMonths, unlocked: row.unlocked },
    referral: referralOf(db, row),
  };
}

const FAQ: Record<string, FaqArticle[]> = {
  ru: [
    {
      slug: "what-is-routex",
      title: "Что делает RouteX?",
      bodyMd:
        "Клиент ведёт трафик выбранной игры сразу по 2–3 каналам через наши узлы. Если один канал просел, пакеты уже идут по другим — переподключаться не нужно.",
    },
    {
      slug: "ping-method",
      title: "Как вы считаете пинг?",
      bodyMd:
        "Сравниваем 30–60 секунд до включения с пингом, джиттером и потерями во время сессии. Цифры видны в клиенте.",
    },
    {
      slug: "achievements",
      title: "Как получить ачивки?",
      bodyMd:
        "Ачивки открываются за оплаченные месяцы с RouteX: 1, 3, 6, 12, 24 и 36. Годовой тариф сразу засчитывает 12 месяцев.",
    },
  ],
  en: [
    {
      slug: "what-is-routex",
      title: "What does RouteX do?",
      bodyMd:
        "The client sends the selected game's traffic over 2–3 paths through our nodes at once. If one path degrades, packets are already flowing over the others — no reconnect needed.",
    },
    {
      slug: "ping-method",
      title: "How do you measure ping?",
      bodyMd:
        "We compare 30–60 seconds before turning it on with ping, jitter and loss during the session. The numbers are shown in the client.",
    },
    {
      slug: "achievements",
      title: "How do I get achievements?",
      bodyMd:
        "Achievements unlock for paid months with RouteX: 1, 3, 6, 12, 24 and 36. The yearly plan counts 12 months at once.",
    },
  ],
};

export const mockApi: Api = {
  async checkNickname(nickname) {
    const nickError = nicknameError(nickname);
    if (nickError) throw new ApiError(nickError);
    return { available: !nicknameTaken(load(), nickname) };
  },
  async register(payload: RegisterPayload) {
    if (!payload.consentOffer || !payload.consentPersonalData) throw new ApiError("consents_required");
    const nickError = nicknameError(payload.nickname);
    if (nickError) throw new ApiError(nickError);
    const db = load();
    const email = payload.email.trim().toLowerCase();
    if (db.users[email]) throw new ApiError("email_taken");
    if (nicknameTaken(db, payload.nickname)) throw new ApiError("nickname_taken");
    const row: Row = {
      password: payload.password,
      user: {
        id: uuid(),
        email,
        nickname: payload.nickname.trim(),
        avatarUrl: null,
        createdAt: new Date().toISOString(),
      },
      subscription: trialSub(),
      paidMonths: 0,
      refCode: uuid().replace(/-/g, "").slice(0, 8),
      referredBy: payload.refCode?.trim().toLowerCase() || null,
      referralPaid: false,
      bonus: 0,
      unlocked: [],
      notifications: [],
      activeSession: null,
    };
    notify(row, "account_created", { nickname: row.user.nickname });
    db.users[email] = row;
    save(db);
    return { accessToken: tokenFor(email) };
  },
  async login(email, password) {
    const db = load();
    const row = db.users[email.trim().toLowerCase()];
    if (!row || row.password !== password) throw new ApiError("bad_credentials");
    return { accessToken: tokenFor(row.user.email) };
  },
  async logout() {
    return;
  },
  async sessionAlive(token) {
    rowFor(load(), token);
  },
  async me(token) {
    const db = load();
    const row = rowFor(db, token);
    save(db);
    return toMe(db, row);
  },
  async updateProfile(token, patch) {
    const db = load();
    const row = rowFor(db, token);
    const nickError = nicknameError(patch.nickname);
    if (nickError) throw new ApiError(nickError);
    if (nicknameTaken(db, patch.nickname, row.user.email)) throw new ApiError("nickname_taken");
    row.user.nickname = patch.nickname.trim();
    save(db);
    return row.user;
  },
  async setAvatar(token, image) {
    const db = load();
    const row = rowFor(db, token);
    row.user.avatarUrl = image ? await blobToDataUrl(image) : null;
    save(db);
    return row.user;
  },
  async mockPay(token, planCode) {
    const db = load();
    const row = rowFor(db, token);
    const year = planCode === "pro_year";
    const renewing =
      row.subscription.status === "active" && new Date(row.subscription.currentPeriodEnd) > new Date();
    const base = renewing ? new Date(row.subscription.currentPeriodEnd) : new Date();
    if (year) base.setFullYear(base.getFullYear() + 1);
    else base.setMonth(base.getMonth() + 1);
    row.subscription = {
      status: "active",
      planCode: year ? "pro_year" : "pro_month",
      trialEndsAt: null,
      currentPeriodEnd: base.toISOString(),
    };
    notify(row, renewing ? "subscription_renewed" : "subscription_purchased", {
      plan: row.subscription.planCode,
      until: row.subscription.currentPeriodEnd,
    });
    row.paidMonths += year ? 12 : 1;
    syncAchievements(row);
    // первая оплата приглашённого — 300 бонусов тому, кто дал ссылку
    if (row.referredBy && !row.referralPaid) {
      row.referralPaid = true;
      const inviter = Object.values(db.users).find((u) => u.refCode === row.referredBy);
      if (inviter) {
        inviter.bonus += BONUS_PER_FRIEND;
        notify(inviter, "referral_bonus", { bonus: BONUS_PER_FRIEND, balance: inviter.bonus });
      }
    }
    save(db);
    return row.subscription;
  },
  async claimReferral() {
    return;
  },
  async claimBonus(token) {
    const db = load();
    const row = rowFor(db, token);
    if (row.bonus < BONUS_PER_FRIEND) throw new ApiError("bonus_empty");
    row.bonus -= BONUS_PER_FRIEND;
    const base = new Date(row.subscription.currentPeriodEnd) > new Date() ? new Date(row.subscription.currentPeriodEnd) : new Date();
    base.setDate(base.getDate() + 10);
    row.subscription = { ...row.subscription, status: "active", trialEndsAt: null, currentPeriodEnd: base.toISOString() };
    notify(row, "bonus_spent", { days: 10, until: row.subscription.currentPeriodEnd });
    save(db);
    return { subscription: row.subscription, loyalty: { monthsTogether: row.paidMonths, unlocked: row.unlocked }, referral: referralOf(db, row) };
  },
  async listFaq(locale) {
    return FAQ[locale] ?? FAQ.ru;
  },
  async createTicket(token, payload) {
    if (token) rowFor(load(), token);
    if (payload.description.trim().length < 10) throw new ApiError("ticket_description_short");
    if (!token && !payload.contact?.value.trim()) throw new ApiError("ticket_contact_required");
    if (!token && !payload.pdConsent) throw new ApiError("consents_required");
    return { id: uuid(), number: Math.floor(Date.now() / 1000) % 100000 };
  },
  // без сервиса support заявки нигде не хранятся — переписку показать неоткуда
  async listMyTickets() {
    return [];
  },
  async getMyTicket() {
    throw new ApiError("support_offline");
  },
  async replyMyTicket() {
    throw new ApiError("support_offline");
  },
  async requestPersonalData() {
    return { id: uuid() };
  },
  async deleteAccount(token) {
    const db = load();
    const row = rowFor(db, token);
    delete db.users[row.user.email];
    save(db);
  },
  async listNotifications(token) {
    return rowFor(load(), token).notifications;
  },
  async markNotificationsRead(token) {
    const db = load();
    const row = rowFor(db, token);
    const now = new Date().toISOString();
    for (const n of row.notifications) n.readAt ??= now;
    save(db);
  },
  async clearNotifications(token) {
    const db = load();
    rowFor(db, token).notifications = [];
    save(db);
  },
  async mockClientSession(token, action) {
    const db = load();
    const row = rowFor(db, token);
    if (action === "start") {
      if (row.activeSession) return;
      const game = MOCK_GAMES[Math.floor(Math.random() * MOCK_GAMES.length)];
      row.activeSession = { id: uuid(), game, startedAt: new Date().toISOString() };
      notify(row, "session_started", { game, paths: 3 });
    } else {
      const s = row.activeSession;
      if (!s) return;
      const minutes = Math.max(1, Math.round((Date.now() - new Date(s.startedAt).getTime()) / 60000));
      notify(row, "session_ended", {
        game: s.game,
        minutes,
        ping: 38 + Math.round(Math.random() * 6),
        gain: 30 + Math.round(Math.random() * 20),
      });
      row.activeSession = null;
    }
    save(db);
  },
};

export function mockHasActiveSession(token: string): boolean {
  try {
    return Boolean(rowFor(load(), token).activeSession);
  } catch {
    return false;
  }
}
