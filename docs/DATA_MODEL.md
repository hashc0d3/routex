# RouteX — модель данных (Prisma / PostgreSQL)

UUID везде. Время `timestamptz`. Мягкое удаление пользователя: `deleted_at` в identity, каскад в других сервисах — job, не FK между схемами.

Prisma только в Nest. Поля ниже — канон для `schema.prisma` каждого сервиса.

---

## identity (schema `identity`)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["identity"]
}

enum ConsentType {
  OFFER
  PERSONAL_DATA
  MARKETING
  TELEMETRY
  TICKET_ATTACHMENTS
}

model User {
  id              String    @id @default(uuid()) @db.Uuid
  email           String    @unique
  emailVerifiedAt DateTime? @map("email_verified_at")
  passwordHash    String    @map("password_hash")
  nickname        String    // 3–24: буквы, цифры, _ . - и одиночные пробелы между словами
  nicknameLower   String    @unique @map("nickname_lower") // уникальность без учёта регистра
  avatarKey       String?   @map("avatar_key") // ключ в S3/MinIO, null = дефолтный
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")
  devices         Device[]
  refreshTokens   RefreshToken[]
  consents        Consent[]
  @@map("users")
  @@schema("identity")
}

model Device {
  id          String    @id @default(uuid()) @db.Uuid
  userId      String    @map("user_id") @db.Uuid
  user        User      @relation(fields: [userId], references: [id])
  fingerprint String
  label       String?
  lastSeenAt  DateTime  @map("last_seen_at")
  isActive    Boolean   @default(true) @map("is_active")
  createdAt   DateTime  @default(now()) @map("created_at")
  @@unique([userId, fingerprint])
  @@map("devices")
  @@schema("identity")
}

model RefreshToken {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  user      User      @relation(fields: [userId], references: [id])
  tokenHash String    @unique @map("token_hash")
  expiresAt DateTime  @map("expires_at")
  revokedAt DateTime? @map("revoked_at")
  createdAt DateTime  @default(now()) @map("created_at")
  @@map("refresh_tokens")
  @@schema("identity")
}

model Consent {
  id        String      @id @default(uuid()) @db.Uuid
  userId    String      @map("user_id") @db.Uuid
  user      User        @relation(fields: [userId], references: [id])
  type      ConsentType
  version   String
  accepted  Boolean
  createdAt DateTime    @default(now()) @map("created_at")
  @@index([userId, type])
  @@map("consents")
  @@schema("identity")
}

model AuditEvent {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String?  @map("user_id") @db.Uuid
  action    String
  ip        String?
  meta      Json     @default("{}")
  createdAt DateTime @default(now()) @map("created_at")
  @@index([userId, createdAt])
  @@map("audit_events")
  @@schema("identity")
}
```

MVP: лимит **1 активный Device** на пользователя (enforce в identity).

---

## billing (schema `billing`)

`user_id` без Prisma-relation на identity.

```prisma
enum SubscriptionStatus {
  trial
  active
  grace
  expired
}

enum PaymentStatus {
  pending
  succeeded
  failed
}

model Plan {
  id           String         @id @default(uuid()) @db.Uuid
  code         String         @unique
  periodDays   Int            @map("period_days")
  priceMinor   Int            @map("price_minor")
  currency     String         @default("RUB")
  subscriptions Subscription[]
  @@map("plans")
  @@schema("billing")
}

model Subscription {
  id         String               @id @default(uuid()) @db.Uuid
  userId     String               @map("user_id") @db.Uuid
  planId     String               @map("plan_id") @db.Uuid
  plan       Plan                 @relation(fields: [planId], references: [id])
  status     SubscriptionStatus
  trialEndsAt DateTime?           @map("trial_ends_at")
  currentPeriodEnd DateTime       @map("current_period_end")
  createdAt  DateTime             @default(now()) @map("created_at")
  updatedAt  DateTime             @updatedAt @map("updated_at")
  payments   Payment[]
  @@index([userId])
  @@map("subscriptions")
  @@schema("billing")
}

model Payment {
  id             String        @id @default(uuid()) @db.Uuid
  subscriptionId String        @map("subscription_id") @db.Uuid
  subscription   Subscription  @relation(fields: [subscriptionId], references: [id])
  provider       String
  providerRef    String        @unique @map("provider_ref")
  status         PaymentStatus
  amountMinor    Int           @map("amount_minor")
  currency       String
  raw            Json          @default("{}")
  createdAt      DateTime      @default(now()) @map("created_at")
  @@map("payments")
  @@schema("billing")
}

model ReferralCode {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  code      String   @unique
  createdAt DateTime @default(now()) @map("created_at")
  @@map("referral_codes")
  @@schema("billing")
}

model ReferralAttribution {
  id             String    @id @default(uuid()) @db.Uuid
  codeId         String    @map("code_id") @db.Uuid
  referredUserId String    @unique @map("referred_user_id") @db.Uuid
  paidAt         DateTime? @map("paid_at")
  createdAt      DateTime  @default(now()) @map("created_at")
  @@map("referral_attributions")
  @@schema("billing")
}
```

Бонус реферала начислять **только** когда `paidAt` заполнен (первая успешная оплата).

### Лояльность и ачивки

```prisma
model Loyalty {
  userId         String   @id @map("user_id") @db.Uuid
  monthsTogether Int      @default(0) @map("months_together")
  updatedAt      DateTime @updatedAt @map("updated_at")
  @@map("loyalty")
  @@schema("billing")
}

model UserAchievement {
  userId     String   @map("user_id") @db.Uuid
  code       String   // months_1 | months_3 | months_6 | months_12 | months_24 | months_36
  unlockedAt DateTime @default(now()) @map("unlocked_at")
  @@id([userId, code])
  @@map("user_achievements")
  @@schema("billing")
}
```

- `monthsTogether` — сумма **оплаченных** месяцев (trial не считается): `pro_month` +1, `pro_year` +12. Пересчитывается в той же транзакции, что и `Payment.status = succeeded`; при refund — вычитается, но уже выданные ачивки **не отзываются**.
- Каталог ачивок (код → порог месяцев, название) живёт в коде billing и в `apps/web/src/lib/achievements.ts`, в БД хранится только факт получения.
- Выдача идемпотентна (`@@id([userId, code])`, `INSERT … ON CONFLICT DO NOTHING`), событие `achievement.unlocked` → в очередь для уведомлений.

---

## routing (schema `routing`)

```prisma
model Region {
  id    String    @id @default(uuid()) @db.Uuid
  code  String    @unique
  name  String
  pops  PopNode[]
  @@map("regions")
  @@schema("routing")
}

model PopNode {
  id          String    @id @default(uuid()) @db.Uuid
  regionId    String    @map("region_id") @db.Uuid
  region      Region    @relation(fields: [regionId], references: [id])
  name        String
  publicHost  String    @map("public_host")
  wgPort      Int       @map("wg_port")
  isHealthy   Boolean   @default(true) @map("is_healthy")
  capacity    Int       @default(500)
  peersFrom   PopPeer[] @relation("PeerFrom")
  peersTo     PopPeer[] @relation("PeerTo")
  @@map("pop_nodes")
  @@schema("routing")
}

model PopPeer {
  id         String  @id @default(uuid()) @db.Uuid
  fromPopId  String  @map("from_pop_id") @db.Uuid
  toPopId    String  @map("to_pop_id") @db.Uuid
  fromPop    PopNode @relation("PeerFrom", fields: [fromPopId], references: [id])
  toPop      PopNode @relation("PeerTo", fields: [toPopId], references: [id])
  @@unique([fromPopId, toPopId])
  @@map("pop_peers")
  @@schema("routing")
}

model Game {
  id        String        @id @default(uuid()) @db.Uuid
  slug      String        @unique
  name      String
  processes GameProcess[]
  @@map("games")
  @@schema("routing")
}

model GameProcess {
  id      String @id @default(uuid()) @db.Uuid
  gameId  String @map("game_id") @db.Uuid
  game    Game   @relation(fields: [gameId], references: [id])
  exeName String @map("exe_name")
  @@unique([gameId, exeName])
  @@map("game_processes")
  @@schema("routing")
}

model TunnelGrant {
  id         String    @id @default(uuid()) @db.Uuid
  userId     String    @map("user_id") @db.Uuid
  popId      String    @map("pop_id") @db.Uuid
  tokenHash  String    @unique @map("token_hash")
  expiresAt  DateTime  @map("expires_at")
  revokedAt  DateTime? @map("revoked_at")
  createdAt  DateTime  @default(now()) @map("created_at")
  sessionId  String    @map("session_id") @db.Uuid
  pathIndex  Int       @map("path_index")
  role       String    @default("entry")
  @@index([userId])
  @@index([sessionId])
  @@map("tunnel_grants")
  @@schema("routing")
}
```

`pathIndex` 0..2. Один из грантов сессии `role = exit` (узел, который говорит с игровым IP). На 1 Debian два `PopNode` могут быть loopback с разными портами.

---

## telemetry (schema `telemetry`)

```prisma
enum SessionStatus {
  starting
  active
  degraded
  stopped
  failed
}

model Session {
  id               String          @id @default(uuid()) @db.Uuid
  userId           String          @map("user_id") @db.Uuid
  deviceId         String          @map("device_id") @db.Uuid
  gameId           String?         @map("game_id") @db.Uuid
  processName      String          @map("process_name")
  exitPopId        String          @map("exit_pop_id") @db.Uuid
  pathPopIds       Json            @map("path_pop_ids")
  regionCode       String          @map("region_code")
  status           SessionStatus
  startedAt        DateTime        @map("started_at")
  endedAt          DateTime?       @map("ended_at")
  bytesIn          BigInt          @default(0) @map("bytes_in")
  bytesOut         BigInt          @default(0) @map("bytes_out")
  baselineRttMs    Float?          @map("baseline_rtt_ms")
  baselineJitterMs Float?          @map("baseline_jitter_ms")
  baselineLossPct  Float?          @map("baseline_loss_pct")
  rttP50Ms         Float?          @map("rtt_p50_ms")
  rttP95Ms         Float?          @map("rtt_p95_ms")
  jitterMs         Float?          @map("jitter_ms")
  lossPct          Float?          @map("loss_pct")
  score            Int?
  scoreConfidence  String?         @map("score_confidence")
  checkpoints      Checkpoint[]
  @@index([userId, startedAt])
  @@map("sessions")
  @@schema("telemetry")
}

model Checkpoint {
  id         String   @id @default(uuid()) @db.Uuid
  sessionId  String   @map("session_id") @db.Uuid
  session    Session  @relation(fields: [sessionId], references: [id])
  at         DateTime
  rttMs      Float    @map("rtt_ms")
  jitterMs   Float    @map("jitter_ms")
  lossPct    Float    @map("loss_pct")
  bytesIn    BigInt   @map("bytes_in")
  bytesOut   BigInt   @map("bytes_out")
  status     SessionStatus
  perPath    Json     @default("[]") @map("per_path")
  @@index([sessionId, at])
  @@map("checkpoints")
  @@schema("telemetry")
}
```

Скор: `round(50*normΔRTT + 30*normΔjitter + 20*normΔloss)`, `low` если checkpoint’ов `< 30`. Live-метрики в UI идут с engine по gRPC, не пишутся каждый пакет в PG.

---

## support (schema `support`)

Актуальная схема — `services/support/prisma/schema.prisma` (схема PG выбирается через `?schema=support` в `DATABASE_URL`).

```prisma
enum TicketStatus { open in_progress waiting resolved closed }
enum TicketSource { web app }
enum TicketAuthor { user staff }

model Ticket {
  id              String       @id @default(uuid()) @db.Uuid
  number          Int          @unique @default(autoincrement())   // #123 для людей
  source          TicketSource @default(web)
  status          TicketStatus @default(open)
  subject         String                                            // первая строка описания, ≤ 80
  userId          String?      // снимок автора: join'ов с identity нет
  userNickname    String?
  userEmail       String?
  contactPhone    String?      // гость: телефон (+цифры) ИЛИ ник
  contactNickname String?
  locale          String       @default("ru")
  page            String?      // откуда отправили
  pdConsentAt     DateTime?    // согласие гостя на ПДн (152-ФЗ)
  attachOk        Boolean      @default(false)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  messages        TicketMessage[]
  @@index([status, createdAt(sort: Desc)])
  @@index([userId])
}

model TicketMessage {
  id         String       @id @default(uuid()) @db.Uuid
  ticketId   String       @db.Uuid
  author     TicketAuthor
  authorName String?
  body       String
  createdAt  DateTime     @default(now())
}
```

Хранение: до закрытия заявки + 1 год, затем удаление (контакты гостя — тоже ПДн).

model FaqArticle {
  id      String @id @default(uuid()) @db.Uuid
  slug    String @unique
  title   String
  bodyMd  String @map("body_md")
  sort    Int    @default(0)
  @@map("faq_articles")
  @@schema("support")
}
```

`meta` логов — только при `attachOk` и согласии `TICKET_ATTACHMENTS`.
