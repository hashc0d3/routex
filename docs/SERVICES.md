# RouteX — микросервисы и масштабирование

Клиенты (Next, WinUI) видят **один** HTTP/WS вход: `api-gateway`. Внутри — gRPC. Игровой трафик сюда не входит.

## Состав MVP (6 приложений Nest + инфраструктура)

| Сервис | Ответственность | Prisma-схема PG | Масштаб later |
|---|---|---|---|
| `api-gateway` | REST OpenAPI, JWT access, WS уведомлений, BFF, rate limit | нет БД | HPA по RPS |
| `identity` | Пользователь, пароль, refresh, устройства, согласия, audit | `identity` | 2+ реплики |
| `billing` | Планы, подписка, платежи, trial, реферальные **записи** | `billing` | мало RPS, важно идемпотентность |
| `routing` | Регионы, релеи, **рёбра пиринга**, игры, назначение **2–3 path + exit**, tunnel tokens | `routing` | мало, кэш Redis |
| `telemetry` | Сессии, checkpoint, скор | `telemetry` | HPA + больше IOPS |
| `support` | Тикеты, FAQ | `support` | мало |

Go (не Nest, не Prisma):

- `engine` — Windows, gRPC к WinUI, 2–3 WG, seq/dup.
- `pop-agent` — Linux: WG, **пиринг с соседями**, forward к exit, **dedup по seq**, health.

Redis: кэш, rate limit, pub/sub событий (`session.started`, `billing.*`, `entitlement.expiring_in_3d`), BullMQ (письма, webhook retry).

## Почему не 15 сервисов

Отдельный процесс = свой деплой, health, Prisma migrate. FAQ, согласия, «notification-service» на MVP не окупаются: уведомления пишет publisher в Redis, gateway пушит WS; согласия лежат в identity.

## Контракты

```
WinUI / Next  --REST/WS-->  api-gateway  --gRPC-->  identity
                                         --gRPC-->  billing
                                         --gRPC-->  routing
                                         --gRPC-->  telemetry
                                         --gRPC-->  support

WinUI  --gRPC localhost-->  engine  --WG path1..3-->  relays (mesh) --> exit --> игра

routing --gRPC control-->  pop-agents   # пиры, grants; не игровые пакеты
```

Идентификация пользователя между сервисами: `user_id` UUID из identity. **Нет join’ов Prisma между схемами.** Ссылки — UUID + eventual consistency.

## Одна БД сейчас, не shared-tables

Один PostgreSQL 16, **отдельная schema** на сервис (`identity`, `billing`, …). Так на Debian проще бэкап; в k8s можно вынести `telemetry` на отдельный инстанс, не переписывая домен.

Prisma: свой `schema.prisma` в каждом сервисе, `schemas = ["identity"]` и т.д.

## Деплой

**Сейчас (Debian):** `docker compose` — postgres, redis, 6 Nest, next, pop-agent/wg. Имена контейнеров = будущие k8s Service.

Что уже собрано в `deploy/`: один `docker/Dockerfile` на все workspace (`WORKSPACE=services/identity` и т.д.), `docker-compose.yml` (postgres, support, identity, billing, audit, web, admin, loki, grafana, caddy), `Caddyfile`, `gen-env.sh` (секреты → `deploy/.env`, не в git). Пока gateway нет, браузер ходит в сервисы через Caddy по префиксам `/api/<сервис>/…`; `/v1/admin/*` и приём событий журнала снаружи закрыты. Миграции Prisma — `migrate deploy` при старте контейнера. Админка и Grafana слушают только `127.0.0.1` сервера (SSH-туннель). Владельцы из `ADMIN_USERS` при каждом старте админки — super admin без блокировки; тот же логин — админ Grafana.

**После закупки:** Kubernetes.

- Deployment + Service на каждый Nest и на Next.
- Ingress → только gateway и Next.
- HPA: gateway, identity, telemetry.
- Postgres/Redis **не** в том же namespace как «ещё один под без бэкапа»: managed или оператор с PVC + snapshots.
- PoP — **не** в общем k8s приложения: отдельные ноды/VM с хост-сетью под WG.
- Конфиг: Kustomize/Helm с теми же env, что Compose.

Отказоустойчивость control plane: 2 реплики stateless. Для игрока: **несколько живых path + mesh**, не число подов Nest. Релеи — отдельные VM с хост-сетью, не под в общем Deployment с API.

## Auth-поток MVP

1. Next/WinUI: `POST /v1/auth/login` → gateway → identity.
2. Access JWT (короткий) + refresh (httpOnly cookie на web; WinUI — secure storage).
3. Gateway проверяет JWT, в gRPC metadata: `user_id`.
4. Start сессии: gateway → billing (entitlement) → routing (**2–3 path + exit + tokens**) → telemetry (session open) → WinUI отдаёт набор path в engine.

## Billing MVP

Нет ключей ЮKassa → `billing` в режиме `PROVIDER=mock`: trial 3 дня при регистрации, ручной `POST /internal/mock/pay`. Когда ключи появятся — тот же сервис, `PROVIDER=yookassa`, идемпотентный webhook.

Лояльность: на успешный платёж billing увеличивает `monthsTogether` и выдаёт `UserAchievement` (см. DATA_MODEL). Ачивки — часть billing, отдельного сервиса нет.

## Уведомления

Типы: `account_created`, `subscription_purchased`, `subscription_renewed`, `achievement_unlocked`, `session_started`, `session_ended`. Хранится только `type` + `data` (JSON) — текст собирает клиент на своём языке (ru/en).

- Источники событий: identity (регистрация), billing (оплата, продление, ачивка), telemetry (старт/конец сессии из engine) → BullMQ `notifications`.
- Консьюмер в identity пишет `identity.notifications (id, user_id, type, data jsonb, created_at, read_at)`, индекс `(user_id, created_at desc)`, хранение 90 дней, и публикует в Redis pub/sub → gateway пушит по WS.
- `GET /v1/me/notifications` (последние 50), `POST /v1/me/notifications/read`. На MVP web опрашивает раз в 15 с; WS — когда gateway будет готов.

## Заявки (support) и админка

Первый реально поднятый сервис: `services/support` (Nest 11 + Prisma 6, порт 4010), Postgres из `docker-compose.yml` (`routex-postgres`, порт 5433).

| Метод | Путь | Кто | Что делает |
|-------|------|-----|-----------|
| POST | `/v1/support/tickets` | сайт, клиент | `{ description, contact?, pdConsent?, attachOk?, source, locale, page }`; throttle 5 / 10 мин |
| GET | `/v1/support/me/tickets` | пользователь | свои заявки + флаг `unread` (есть непрочитанный ответ) |
| GET | `/v1/support/me/tickets/:id` | пользователь | чат заявки; отмечает ответы прочитанными |
| POST | `/v1/support/me/tickets/:id/messages` | пользователь | ответ: `waiting → in_progress`, `resolved`/`closed → open` |
| GET/POST | `/v1/support/me/notifications`, `/read` | пользователь | уведомления `ticket_reply`, `ticket_status` (временно здесь, потом — identity) |
| GET | `/v1/admin/tickets?status&q&page&take` | админка | список + счётчики по статусам; поиск по №, нику, email, телефону, теме |
| GET | `/v1/admin/tickets/:id` | админка | заявка с сообщениями |
| PATCH | `/v1/admin/tickets/:id` | админка | `{ status }` |
| POST | `/v1/admin/tickets/:id/messages` | админка | заметка / ответ поддержки |

- Авторизованному достаточно описания; гость обязан указать телефон или ник и дать согласие на ПДн (`pdConsentAt`).
- Пока gateway нет, сайт шлёт снимок `user` сам (`NEXT_PUBLIC_SUPPORT_API_URL`). За gateway `user` будет браться из JWT, присланное поле — игнорироваться.
- `/v1/admin/*` закрыт сервисным `ADMIN_API_TOKEN`; токен знает только сервер админки.
- `/v1/support/me/*` определяет пользователя по `X-RouteX-User` (UUID). В проде заголовок ставит gateway из JWT и вырезает присланный клиентом; сейчас его шлёт сайт — это временно и небезопасно для прода.
- Смена статуса и ответ поддержки пишут системное сообщение в чат (история работы по заявке) и уведомление владельцу. Ответ поддержки сам переводит `open/in_progress → waiting`.

`apps/admin` — отдельный Next.js (порт 3001), единая панель для сайта, клиента и сервисов. Сейчас: обзор (health сервисов, счётчики), заявки (фильтры, поиск, статусы, заметки). Вход — временно список `ADMIN_USERS` в env (email + scrypt-хеш, запись делает `apps/admin/scripts/hash-password.mjs`) с подписанной httpOnly-cookie; дальше — роли в identity. Наружу админка не публикуется: Ingress только для gateway и сайта, админка — через VPN/allowlist.

## Профиль и /v1/me

Регистрация: `GET /v1/auth/nickname-available?nickname=` (identity, без авторизации, rate limit) → `{ available }`, сравнение по `nicknameLower`. Сайт дёргает его с задержкой 400 мс при вводе; `POST /v1/auth/register` всё равно отвечает 409 `nickname_taken` на гонку.

| Метод | Путь | Сервис | Что делает |
|-------|------|--------|-----------|
| GET | `/v1/me` | gateway агрегирует identity + billing | `{ user, subscription, loyalty: { monthsTogether, unlocked[] } }` |
| PATCH | `/v1/me/profile` | identity | `{ nickname }`, 409 если ник занят (сравнение по `nicknameLower`) |
| PUT | `/v1/me/avatar` | identity | multipart `file`, ≤ 5 МБ, png/jpeg/webp/gif |
| DELETE | `/v1/me/avatar` | identity | вернуть дефолтный |

Аватары: identity повторно декодирует картинку (sharp), режет до 256×256 webp, убирая EXIF, и кладёт в S3-совместимое хранилище (MinIO на Debian, позже — облачный S3) с ключом `avatars/{userId}/{hash}.webp`. В БД хранится только `avatarKey`; `avatarUrl` отдаётся через CDN/публичный bucket. Дефолтный аватар — буква ника на цветном фоне, его рисует клиент, файла нет.
