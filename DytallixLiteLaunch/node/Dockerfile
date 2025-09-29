# Multi-stage Dockerfile for Dytallix Node
FROM rust:1.75-slim as builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    libssl-dev \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Rust workspace files
COPY Cargo.toml Cargo.lock ./
COPY blockchain-core/ ./blockchain-core/
COPY smart-contracts/ ./smart-contracts/
COPY pqc-crypto/ ./pqc-crypto/

# Build the node binary
RUN cargo build --release --bin dytallix-node

# Runtime stage
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create dytallix user
RUN useradd -m -u 1001 dytallix

# Copy binary from builder
COPY --from=builder /app/target/release/dytallix-node /usr/local/bin/dytallix-node
COPY --from=builder /app/target/release/dytallixd /usr/local/bin/dytallixd

# Copy configuration
COPY node/genesis.json /etc/dytallix/genesis.json
COPY node/config/ /etc/dytallix/config/

# Create data directory
RUN mkdir -p /var/lib/dytallix/data && \
    chown -R dytallix:dytallix /var/lib/dytallix /etc/dytallix

USER dytallix

# Set working directory
WORKDIR /var/lib/dytallix

# Expose ports
EXPOSE 26656 26657 26658 1317 9090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:26657/status || exit 1

# Default command
CMD ["dytallix-node", "start", "--home", "/var/lib/dytallix", "--genesis", "/etc/dytallix/genesis.json"]