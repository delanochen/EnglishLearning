FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.2 --activate
WORKDIR /app

FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile=false

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate && pnpm build

FROM base AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/package.json ./package.json
RUN mkdir -p /app/uploads /app/logs /backups && chown -R nextjs:nodejs /app/uploads /app/logs /backups && chmod +x /app/scripts/entrypoint.sh
USER nextjs
EXPOSE 3000
ENTRYPOINT ["/app/scripts/entrypoint.sh"]
