# ===============================================
# Notification Service - Production Dockerfile
# Multi-stage build with security hardening
# ===============================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY tsconfig.base.json ./
COPY packages/roles-permissions/package.json ./packages/roles-permissions/
COPY packages/event-contracts/package.json ./packages/event-contracts/
COPY packages/api-contracts/package.json ./packages/api-contracts/
COPY packages/schemas/package.json ./packages/schemas/
COPY packages/shared/package.json ./packages/shared/
COPY apps/notification-service/package.json ./apps/notification-service/
RUN npm install --legacy-peer-deps

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./
COPY --from=deps /app/tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/notification-service/ ./apps/notification-service/
RUN npm run build:packages
WORKDIR /app/apps/notification-service
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS production
RUN apk add --no-cache tini
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/tsconfig.base.json ./
COPY --from=builder /app/packages/roles-permissions/dist ./packages/roles-permissions/dist
COPY --from=builder /app/packages/roles-permissions/package.json ./packages/roles-permissions/
COPY --from=builder /app/packages/event-contracts/dist ./packages/event-contracts/dist
COPY --from=builder /app/packages/event-contracts/package.json ./packages/event-contracts/
COPY --from=builder /app/packages/api-contracts/dist ./packages/api-contracts/dist
COPY --from=builder /app/packages/api-contracts/package.json ./packages/api-contracts/
COPY --from=builder /app/packages/schemas/dist ./packages/schemas/dist
COPY --from=builder /app/packages/schemas/package.json ./packages/schemas/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/apps/notification-service/package.json ./apps/notification-service/
RUN npm install --legacy-peer-deps --omit=dev
COPY --from=builder /app/apps/notification-service/dist ./apps/notification-service/dist
RUN chown -R nodejs:nodejs /app
USER nodejs
WORKDIR /app/apps/notification-service
ENV NODE_ENV=production
ENV PORT=3006
EXPOSE 3006
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3006/health/live || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
