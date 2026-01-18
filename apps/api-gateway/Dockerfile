# ===============================================
# API Gateway - Production Dockerfile
# Multi-stage build with security hardening
# ===============================================

# ----------------------------------------------
# Stage 1: Dependencies
# ----------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY tsconfig.base.json ./
COPY packages/roles-permissions/package.json ./packages/roles-permissions/
COPY packages/event-contracts/package.json ./packages/event-contracts/
COPY packages/api-contracts/package.json ./packages/api-contracts/
COPY packages/schemas/package.json ./packages/schemas/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api-gateway/package.json ./apps/api-gateway/

# Install all dependencies
RUN npm install --legacy-peer-deps

# ----------------------------------------------
# Stage 2: Builder
# ----------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./
COPY --from=deps /app/tsconfig.base.json ./

# Copy source code
COPY packages/ ./packages/
COPY apps/api-gateway/ ./apps/api-gateway/

# Build shared packages
RUN npm run build:packages

# Build the api-gateway service
WORKDIR /app/apps/api-gateway
RUN npm run build

# ----------------------------------------------
# Stage 3: Production
# ----------------------------------------------
FROM node:20-alpine AS production

# Install tini for proper signal handling
RUN apk add --no-cache tini

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

# Copy package files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/tsconfig.base.json ./

# Copy built packages
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

# Copy service package.json
COPY --from=builder /app/apps/api-gateway/package.json ./apps/api-gateway/

# Install production dependencies only
RUN npm install --legacy-peer-deps --omit=dev

# Copy built service
COPY --from=builder /app/apps/api-gateway/dist ./apps/api-gateway/dist

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Set working directory to service
WORKDIR /app/apps/api-gateway

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/live || exit 1

# Use tini as init system for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the service
CMD ["node", "dist/main.js"]

