##############################
# Base image
FROM node:20-bullseye-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

##############################
# Dependencies layer
FROM base AS deps
ENV NODE_ENV=development
RUN apt-get update && apt-get install -y --no-install-recommends \
	ca-certificates openssl git && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install --no-audit --no-fund

##############################
# Builder layer
FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --omit=dev

##############################
# Production runtime layer using standalone output
FROM node:20-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
	PORT=3000
RUN apt-get update && apt-get install -y --no-install-recommends curl \
	&& rm -rf /var/lib/apt/lists/*

# Copy standalone server + minimal node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD curl -fsS http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
