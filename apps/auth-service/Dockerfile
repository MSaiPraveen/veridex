FROM node:20-alpine

WORKDIR /app

# Copy root package files for workspace
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy shared packages
COPY packages/ ./packages/

# Copy this service
COPY apps/auth-service/ ./apps/auth-service/

# Install all dependencies from root
RUN npm install --legacy-peer-deps

# Build shared packages
RUN npm run build:packages || true

WORKDIR /app/apps/auth-service

EXPOSE 3001
CMD ["npx", "ts-node-dev", "--respawn", "--transpile-only", "src/main.ts"]
