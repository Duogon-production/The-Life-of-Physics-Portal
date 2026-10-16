# syntax=docker/dockerfile:1
ARG NODE_IMAGE=node:24-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5
FROM ${NODE_IMAGE} AS base
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json package-lock.json ./
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npm ci --no-audit --no-fund

FROM dependencies AS builder
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_AUTH_BACKEND=firebase-staging LMS_DATA_BACKEND=supabase-staging EDULABS_STANDALONE=1 NODE_OPTIONS=--max-old-space-size=4096
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
COPY . .
RUN node infra/build-config.cjs && npm run build

FROM base AS web
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_PUBLIC_AUTH_BACKEND=firebase-staging LMS_DATA_BACKEND=supabase-staging MALLOC_ARENA_MAX=2
RUN groupadd --gid 10001 edulabs && useradd --uid 10001 --gid 10001 --no-create-home edulabs
COPY --from=builder --chown=10001:10001 /app/.next/standalone ./
COPY --from=builder --chown=10001:10001 /app/.next/static ./.next/static
COPY --from=builder --chown=10001:10001 /app/public ./public
COPY --from=builder /app/deployment-public.json ./deployment-public.json
COPY infra/runtime.cjs infra/healthcheck.cjs infra/buffer-compat.cjs ./infra/
USER 10001:10001
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD ["node", "infra/healthcheck.cjs"]
CMD ["node", "infra/runtime.cjs"]

FROM base AS worker-dependencies
COPY infra/worker/package.json infra/worker/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
FROM base AS worker
ENV NODE_ENV=production
COPY --from=worker-dependencies /app/node_modules ./node_modules
COPY scripts/notification-dispatch.cjs ./scripts/
COPY infra/worker.cjs infra/worker-health.cjs infra/buffer-compat.cjs ./infra/
USER 10001:10001
HEALTHCHECK --interval=60s --timeout=5s --start-period=90s --retries=3 CMD ["node", "infra/worker-health.cjs"]
CMD ["node", "infra/worker.cjs"]
