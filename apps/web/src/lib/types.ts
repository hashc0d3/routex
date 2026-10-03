export type ErrorCode =
  | "generic"
  | "session_invalid"
  | "consents_required"
  | "nickname_invalid"
  | "nickname_taken"
  | "email_taken"
  | "bad_credentials"
  | "image_type"
  | "image_too_big"
  | "image_unsupported"
  | "image_failed"
  | "network"
  | "timeout"
  | "rate_limited"
  | "validation"
  | "ticket_description_short"
  | "ticket_contact_required"
  | "ticket_phone_invalid"
  | "ticket_not_found"
  | "support_offline"
  | "bonus_empty";

/** Ошибки API приходят кодом; текст подставляет UI на языке страницы. */
export class ApiError extends Error {
  constructor(
    public readonly code: ErrorCode | string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "ApiError";
  }
}

export type SubscriptionStatus = "trial" | "active" | "grace" | "expired";

export type User = {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  createdAt: string;
};

export type Subscription = {
  status: SubscriptionStatus;
  planCode: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string;
};

export type UnlockedAchievement = {
  code: string;
  unlockedAt: string;
};

export type Loyalty = {
  monthsTogether: number;
  unlocked: UnlockedAchievement[];
};

export type Referral = {
  /** Код для ссылки вида /register?ref=… */
  code: string;
  /** Сколько человек зарегистрировалось по ссылке. */
  invited: number;
  /** Сколько из них оплатили подписку. */
  paid: number;
  /** Бонусы на счету. 300 = 10 дней подписки. */
  balance: number;
  /** Хватает ли бонусов, чтобы забрать 10 дней. */
  claimable: boolean;
};

export type Me = {
  user: User;
  subscription: Subscription;
  loyalty: Loyalty;
  referral: Referral;
};

export type FaqArticle = {
  slug: string;
  title: string;
  bodyMd: string;
};

export type TicketContact = { type: "phone" | "nickname"; value: string };

/** Авторизованному хватает описания; гость оставляет телефон или ник и согласие на ПДн. */
export type TicketPayload = {
  description: string;
  contact?: TicketContact;
  pdConsent?: boolean;
  attachOk?: boolean;
  source: "web";
  locale: string;
  page: string;
};

export type TicketStatus = "open" | "in_progress" | "waiting" | "resolved" | "closed";

export type MyTicket = {
  id: string;
  number: number;
  subject: string;
  status: TicketStatus;
  source: "web" | "app";
  createdAt: string;
  updatedAt: string;
  /** Есть ответ поддержки, который пользователь ещё не открыл. */
  unread: boolean;
};

/** `system` — смена статуса: body = новый статус, текст собирает UI. */
export type TicketChatMessage = {
  id: string;
  author: "user" | "staff" | "system";
  authorName: string | null;
  body: string;
  createdAt: string;
};

export type MyTicketDetail = MyTicket & { messages: TicketChatMessage[] };

export type DataRequestType = "export" | "delete";

export type AuthResult = {
  accessToken: string;
};

export type RegisterPayload = {
  email: string;
  password: string;
  nickname: string;
  consentOffer: boolean;
  consentPersonalData: boolean;
  consentMarketing: boolean;
  /** Реферальный код из ссылки, по которой пришёл человек. */
  refCode?: string;
};

export type NotificationType =
  | "account_created"
  | "subscription_purchased"
  | "subscription_renewed"
  | "achievement_unlocked"
  | "session_started"
  | "session_ended"
  | "ticket_reply"
  | "ticket_status"
  | "referral_bonus"
  | "bonus_spent";

/** Текст не хранится: UI собирает его из type + data на языке страницы. */
export type AppNotification = {
  id: string;
  type: NotificationType;
  data: Record<string, string | number>;
  createdAt: string;
  readAt: string | null;
};

export type Api = {
  register(payload: RegisterPayload): Promise<AuthResult>;
  /** Без учёта регистра; финальная проверка всё равно при register (409 nickname_taken). */
  checkNickname(nickname: string): Promise<{ available: boolean }>;
  login(email: string, password: string): Promise<AuthResult>;
  logout(): Promise<void>;
  me(token: string): Promise<Me>;
  /** Лёгкая проверка, что сессию не отозвали. Кидает session_invalid, остальное — наружу. */
  sessionAlive(token: string): Promise<void>;
  updateProfile(token: string, patch: { nickname: string }): Promise<User>;
  setAvatar(token: string, image: Blob | null): Promise<User>;
  mockPay(token: string, planCode: string): Promise<Subscription>;
  /** Привязать регистрацию к реферальному коду из ссылки. Пустой код — ничего не делать. */
  claimReferral(token: string, code: string): Promise<void>;
  /** Потратить 300 бонусов на 10 дней подписки. */
  claimBonus(token: string): Promise<Pick<Me, "subscription" | "loyalty" | "referral">>;
  listFaq(locale: string): Promise<FaqArticle[]>;
  createTicket(token: string | null, payload: TicketPayload): Promise<{ id: string; number: number }>;
  listMyTickets(token: string): Promise<MyTicket[]>;
  getMyTicket(token: string, id: string): Promise<MyTicketDetail>;
  replyMyTicket(token: string, id: string, body: string): Promise<MyTicketDetail>;
  requestPersonalData(token: string, type: DataRequestType): Promise<{ id: string }>;
  /** Необратимо: профиль, подписка, ачивки и уведомления. Сессия после этого недействительна. */
  deleteAccount(token: string): Promise<void>;
  listNotifications(token: string): Promise<AppNotification[]>;
  markNotificationsRead(token: string): Promise<void>;
  clearNotifications(token: string): Promise<void>;
  /** Только mock: имитация старта/окончания сессии в PC-клиенте. */
  mockClientSession?(token: string, action: "start" | "end"): Promise<void>;
};
