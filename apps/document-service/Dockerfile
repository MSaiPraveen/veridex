# ===============================================
# Document Service - Dockerfile
# Single-stage build using ts-node for simplicity
# ===============================================

FROM node:20-alpine

# Install tini and build tools for native modules
RUN apk add --no-cache tini python3 make g++

WORKDIR /app

# Copy root package files first
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy all workspace package.json files
COPY packages/roles-permissions/package.json ./packages/roles-permissions/
COPY packages/event-contracts/package.json ./packages/event-contracts/
COPY packages/api-contracts/package.json ./packages/api-contracts/
COPY packages/schemas/package.json ./packages/schemas/
COPY apps/document-service/package.json ./apps/document-service/

# Install all dependencies at root level
RUN npm install --legacy-peer-deps

# Copy all source files
COPY packages/ ./packages/
COPY apps/document-service/ ./apps/document-service/

# Create uploads directory
RUN mkdir -p /app/apps/document-service/uploads

# Set working directory to service
WORKDIR /app/apps/document-service

# Environment variables
ENV NODE_ENV=development
ENV PORT=3005

# Expose port
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3005/health || exit 1

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Run with ts-node (transpile only for performance)
CMD ["npx", "ts-node", "--transpile-only", "src/main.ts"]
