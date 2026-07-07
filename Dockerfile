# ---- Build Stage ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json tsconfig.json tsconfig.build.json nest-cli.json ./
RUN npm install
COPY src/ ./src/
RUN npm run build

# ---- Production Stage ----
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV AUTH_ENABLED=false

RUN addgroup --system --gid 1001 app && \
    adduser --system --uid 1001 app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY data/ ./data/

USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health/deep | grep -q '"status":"ok"' || exit 1

CMD ["node", "dist/main.js"]
