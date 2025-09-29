# Multi-stage Node.js Dockerfile for Dytallix Faucet
FROM node:18-alpine AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S dytallix -u 1001

# Copy package files
COPY package*.json ./

# Install dependencies
FROM base AS deps
RUN npm ci --only=production

# Development stage
FROM base AS dev
RUN npm ci
COPY . .
RUN chown -R dytallix:nodejs /app
USER dytallix
EXPOSE 8787
CMD ["dumb-init", "npm", "run", "dev"]

# Production stage
FROM base AS production
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Remove unnecessary files and set permissions
RUN npm prune --production && \
    rm -rf .git .gitignore README.md test/ && \
    mkdir -p logs && \
    chown -R dytallix:nodejs /app

USER dytallix

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8787/health || exit 1

# Expose port
EXPOSE 8787

# Use dumb-init to handle signals properly
CMD ["dumb-init", "npm", "start"]