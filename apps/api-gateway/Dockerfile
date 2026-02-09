# ===============================================
# API Gateway - Dockerfile
# Single-stage build using ts-node for simplicity
# ===============================================

FROM node:20-alpine

# Install tini for proper signal handling
RUN apk add --no-cache tini

WORKDIR /app

# Copy root package files first
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy all workspace package.json files
COPY packages/roles-permissions/package.json ./packages/roles-permissions/
COPY packages/event-contracts/package.json ./packages/event-contracts/
COPY packages/api-contracts/package.json ./packages/api-contracts/
COPY packages/schemas/package.json ./packages/schemas/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api-gateway/package.json ./apps/api-gateway/

# Install all dependencies at root level (includes dev deps for ts-node)
RUN npm install --legacy-peer-deps

# Copy all source files
COPY packages/ ./packages/
COPY apps/api-gateway/ ./apps/api-gateway/

# Set working directory to service
WORKDIR /app/apps/api-gateway

# Environment variables
ENV NODE_ENV=development
ENV PORT=3002

# Expose port
EXPOSE 3002

# Health check - Use 127.0.0.1 instead of localhost to avoid IPv6 resolution issues
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3002/health/live || exit 1

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Run with ts-node (transpile only for performance)
CMD ["npx", "ts-node", "--transpile-only", "src/main.ts"]

