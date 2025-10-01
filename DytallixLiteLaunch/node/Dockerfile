# Multi-stage Dockerfile for Dytallix Node
FROM rust:1.82-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    libssl-dev \
    ca-certificates \
    curl \
    clang \
    libclang-dev \
    llvm-dev \
    cmake \
    protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*

# Set workspace at repo root
WORKDIR /workspace

# Copy the entire repository to ensure all workspace members are available
# (workspace members include interoperability, cli, explorer, etc.)
COPY . .

# Build the Dytallix node binary from blockchain-core crate
WORKDIR /workspace
RUN LIBCLANG_PATH=$(llvm-config --libdir) cargo build --release --bin dytallix || (echo "Rust build failed. Ensure workspace crates exist." && exit 1)

# Runtime stage
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Create dytallix user
RUN useradd -m -u 1001 dytallix

# Copy binary from builder
COPY --from=builder /workspace/target/release/dytallix /usr/local/bin/dytallix

# Copy configuration from the DytallixLiteLaunch package (kept for compatibility)
COPY DytallixLiteLaunch/node/genesis.json /etc/dytallix/genesis.json
COPY DytallixLiteLaunch/node/config/ /etc/dytallix/config/

# Create data directory
RUN mkdir -p /var/lib/dytallix/data && \
    chown -R dytallix:dytallix /var/lib/dytallix /etc/dytallix

USER dytallix

# Set working directory
WORKDIR /var/lib/dytallix

# Expose ports actually used by the Rust node (Warp API on 3030)
EXPOSE 3030

# Health check against API server
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3030/health || exit 1

# Default command simply runs the node (no Tendermint-style args)
CMD ["dytallix"]