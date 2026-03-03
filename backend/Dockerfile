# ── Build stage ────────────────────────────────────────
FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src ./src

# ── Runtime ────────────────────────────────────────────
FROM node:20-alpine

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/src ./src
COPY package*.json ./

USER appuser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "src/index.js"]
