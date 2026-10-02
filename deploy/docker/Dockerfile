# Один образ на каждый workspace монорепо: сайт, админка и Nest-сервисы.
#   docker build -f deploy/docker/Dockerfile --build-arg WORKSPACE=services/identity .
# Слой с npm ci общий для всех образов — собирается один раз.
FROM node:22-bookworm-slim AS deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/admin/package.json apps/admin/
COPY services/support/package.json services/support/
COPY services/identity/package.json services/identity/
COPY services/billing/package.json services/billing/
COPY services/audit/package.json services/audit/
RUN npm ci --no-audit --no-fund

FROM deps AS app
COPY . .
ARG WORKSPACE
# Только для сайта: адреса API вшиваются в клиентский JS на этапе сборки
ARG NEXT_PUBLIC_SUPPORT_API_URL
ARG NEXT_PUBLIC_IDENTITY_API_URL
ARG NEXT_PUBLIC_BILLING_API_URL
ARG NEXT_PUBLIC_AUDIT_API_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN test -n "$WORKSPACE" \
  && if [ -f "$WORKSPACE/prisma/schema.prisma" ]; then (cd "$WORKSPACE" && npx prisma generate); fi \
  && npm run build --workspace "$WORKSPACE"
ENV NODE_ENV=production
WORKDIR /app/$WORKSPACE
