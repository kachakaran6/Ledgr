# ==========================================
# Multi-stage Dockerfile for Ledgr (LogPast)
# ==========================================

# 1. Build Shared Package & Frontend & API
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root monorepo metadata
COPY package.json ./
COPY tsconfig.base.json ./

# Copy packages & apps
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY apps/web ./apps/web

# Install & build shared
WORKDIR /app/packages/shared
RUN npm install && npm run build && npm pack

# Install & build web frontend
WORKDIR /app/apps/web
RUN npm install && npm run build

# Install & build backend api
WORKDIR /app/apps/api
RUN npm install && npm run build

# 2. Production Runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copy root configs & built packages
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/dist ./packages/shared/dist
COPY packages/shared/ledgr-shared-*.tgz ./packages/shared/

COPY apps/api/package.json ./apps/api/
COPY apps/api/dist ./apps/api/dist

# Copy built frontend assets to api/public for static serving
COPY --from=builder /app/apps/web/dist ./apps/api/public

WORKDIR /app/apps/api
RUN npm install --omit=dev

EXPOSE 3000

CMD ["node", "dist/index.js"]
