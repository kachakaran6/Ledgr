# ==========================================
# Multi-stage Dockerfile for Ledgr (LogPast)
# ==========================================

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy full source
COPY package.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps

# Build shared package
WORKDIR /app/packages/shared
RUN npm install --no-package-lock && npm run build

# Build web frontend
WORKDIR /app/apps/web
RUN npm install --no-package-lock && npm run build

# Build api backend
WORKDIR /app/apps/api
RUN npm install --no-package-lock && npm run build

# Stage 2: Production Runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

COPY package.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

COPY apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Copy built web assets to api/public for static serving
COPY --from=builder /app/apps/web/dist ./apps/api/public

WORKDIR /app/packages/shared
RUN npm install --omit=dev --no-package-lock

WORKDIR /app/apps/api
RUN npm install --omit=dev --no-package-lock

EXPOSE 3000

CMD ["node", "dist/index.js"]
