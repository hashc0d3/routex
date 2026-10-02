# RouteX — рабочая спецификация

Документ — источник правды. «По доке» / «используй доку» = прочитать **этот файл и связанные** `docs/SERVICES.md`, `docs/DATA_MODEL.md`, `docs/MESH.md`, `proto/engine/v1/engine.proto`.

Data plane (mesh, 2–3 path, пиринг релеев): **[MESH.md](./MESH.md)** перекрывает любые старые фразы про «один PoP».

Продукт: оптимизация игровой трассировки (аналог ExitLag). Игровой трафик **не** идёт через Nest.

---

## Решения, зафиксированные пользователем

| Тема | Решение |
|---|---|
| Срез сейчас | **MVP** |
| Ресурсы сейчас | ПК разработчика + **один Debian** (временно). В понедельник — закупка серверов |
| БД | **PostgreSQL 16** + **Prisma ORM** (только TypeScript control plane) |
| Масштаб | Считать, что будет **Kubernetes**; сервисы и контракты сразу под это |
| Подход | **Микросервисы** (реальные процессы, не модули одного Nest) |
| UI↔engine | **gRPC** |
| Клиенты → API | REST + WebSocket через **api-gateway** |
| Data plane (заказчик) | **Малый mesh 2–3 Debian-релея, пиринг между ними, клиент 2–3 туннеля сразу, трафик параллельно (dup/dedup), без дыры на switch** |

Старый тезис «монолит Nest, без k8s» **снят** этим решением. Компромисс на этой неделе: те же образы микросервисов поднимаются **Docker Compose на Debian**, не minikube ради галочки. В понедельник те же сервисы уезжают в k8s.

---

## 1. Три плоскости

| Плоскость | Стек |
|---|---|
| Control plane | Next.js; **api-gateway** + Nest-микросервисы; PostgreSQL (схемы по сервисам); Redis; Prisma |
| Data plane | Mesh релеев: WG + **Go pop-agent** (пиринг, exit, dedup). Клиент: 2–3 path сразу |
| Client plane | **C# WinUI 3** + **Go Windows Service** (bonding/seq, не один WG) |

Поток: Web/WinUI → REST/WS **gateway** → gRPC внутренних сервисов. WinUI → Go engine по gRPC localhost. Engine → **2–3 WG** → mesh релеев → exit → игра.

---

## 2. PC (без изменений стека)

- UI: WinUI 3 / .NET 8. Не SYSTEM, не туннель, не пакеты.
- Engine: Go service, WFP по PID, **2–3 туннеля сразу**, заголовок seq/path, fail-open, Auto = скорер не LLM.
- MVP: **один процесс** (несколько PID — этап Product); **не один path**.
- GUI не на Go. Не Tauri/Electron.

---

## 3. Web (MVP)

Next.js App Router в `apps/web`: лендинг, логин/регистрация (раздельные согласия), скачать клиент, кабинет подписки (mock pay), политики-заглушки, тикет + FAQ, запросы 152-ФЗ из кабинета.

Профиль: уникальный **ник** (вводится при регистрации, меняется в кабинете) и **аватар** — дефолтный (буква на цветном фоне) или загруженный, браузер заранее режет его до 256×256 webp. Ник и аватар показываются в шапке сайта и в WinUI. **Ачивки лояльности** — за оплаченные месяцы вместе с RouteX (1/3/6/12/24/36), хранятся в billing, каталог в `apps/web/src/lib/achievements.ts`. API — см. SERVICES «Профиль и /v1/me».

Пока нет gateway: `NEXT_PUBLIC_API_URL` пустой → mock в localStorage. Контракт тот же `/v1/...`.

Рефералка: **таблицы есть**, публичный UX — после MVP (этап Product).

---

## 4. Control plane — микросервисы

Состав, gRPC-карта, масштабирование: **[SERVICES.md](./SERVICES.md)**.

Данные Prisma: **[DATA_MODEL.md](./DATA_MODEL.md)**.

Prisma **только** в Nest-сервисах. Go engine и PoP Prisma не используют.

Надёжность MVP на одном Debian:

- Compose: restart unless-stopped, healthchecks, одна сеть.
- Postgres volume + ежедневный dump cron.
- Gateway — единственный публичный порт (80/443).
- После закупки: Ingress, 2+ реплики gateway/identity/telemetry, managed PG + PITR, Redis не на том же диске что PG.

---

## 5. Data plane

См. **[MESH.md](./MESH.md)**.

Сейчас 1× Debian: control plane в Compose + **имитация 2 path** (два WG peer/netns на одной машине). После закупки: 2–3 Debian-релея, полный пиринг, k8s только для Nest/Next, релеи **не** в общем кластере приложений.

Route preview: 2–3 path + exit, метрики **per-path** и после дедупа.

---

## 6. 152-ФЗ

Без изменений по смыслу: минимизация, согласия в `identity`, тикеты без вложений по умолчанию. ПДн на Debian — временный контур; после закупки — хостинг РФ для баз.

---

## 7. Срез MVP (делать это, не весь продукт)

Входит:

- Репозиторий: monorepo, proto, Prisma-схемы, docker-compose.
- Сервисы: gateway, identity, billing, routing, telemetry, support.
- Next: лендинг + auth + кабинет статуса подписки.
- WinUI: auth, монитор, подключение (один процесс, Auto/Manual, **2–3 канала**), history, профиль, тикет.
- Go engine: gRPC; Start/Stop **набора path**; метрики per-path + aggregate; bonding. WFP или явный stub — **не врать, что туннель есть**.
- Billing: trial 7 дней; ЮKassa sandbox или mock.
- История + скор по формуле доки.

Не входит: реферальный UX, multi-PID, TCP fallback, LLM, k8s на одном Debian, kill-switch, 20 регионов.

---

## 8. Ресурсы и имитация

| Ресурс | Сейчас |
|---|---|
| ПК | Разработка WinUI + Go engine |
| Debian | Compose (PG, Redis, сервисы, Next) + WireGuard PoP |
| Серверы | Понедельник → Debian-релеи (mesh) + отдельно k8s под control plane |
| ЮKassa / домен | Не выданы → billing mock/sandbox |

Контур: **Control + UI + мультипуть**. На 1 Debian — 2 имитированных path; на 2–3 серверах — настоящий mesh.

---

## 9. Запреты агента

- Стек PC: WinUI 3 + Go. Не Tauri/Electron/Go-GUI.
- Не тащить игровой трафик через Nest.
- Не LLM на выбор path/exit.
- Не один WG как целевая архитектура сессии.
- Не failover «сорвали туннель — подняли другой» как способ смены канала.
- Не kill-switch по умолчанию.
- Не сливать все таблицы в одну Prisma-схему «для удобства».
- Не ставить полный Kubernetes на единственный временный Debian.
- Не плодить сервисы без bounded context (нет отдельного «faq-service»).
- Не коммитить/пушить без просьбы.

---

## 10. «Сделай по доке»

Срез = **MVP**. Ресурсы = ПК + Debian. Схема и сервисы описаны.

Порядок работ агента без нового вопроса:

1. Каркас monorepo + compose + Prisma-схемы + proto engine.
2. Сервисы и gateway до рабочего auth + session telemetry.
3. Next auth/кабинет.
4. Go engine gRPC + **2 path** (реальные или netns на Debian).
5. WinUI к gateway и к engine (каналы видно отдельно).

Макеты экранов по-прежнему не нарисованы: агент делает нейтральный WinUI, не выдумывает бренд.
