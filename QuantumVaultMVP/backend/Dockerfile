FROM node:20-bookworm-slim AS builder

# Prisma engines require OpenSSL to be present.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production image
FROM node:20-bookworm-slim

# Prisma engines require OpenSSL to be present at runtime.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev --legacy-peer-deps

# Prisma CLI is required at runtime for `prisma migrate deploy` in the container CMD.
# Without it, `npx prisma` will download the latest Prisma (which may be incompatible).
RUN npm install --no-save --legacy-peer-deps prisma@5.22.0

# Copy built app from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/blockchain/status', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the application
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
