# Multi-stage build for Dytallix Cross-Chain Bridge
FROM rust:latest AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    protobuf-compiler \
    curl \
    build-essential \
    clang \
    libclang-dev \
    cmake \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables for better cargo performance
ENV CARGO_REGISTRIES_CRATES_IO_PROTOCOL=sparse

WORKDIR /usr/src/app

# Copy workspace configuration (without Cargo.lock to avoid conflicts)
COPY Cargo.toml ./

# Copy all workspace members
COPY blockchain-core ./blockchain-core/
COPY developer-tools ./developer-tools/
COPY pqc-crypto ./pqc-crypto/
COPY smart-contracts ./smart-contracts/
COPY governance ./governance/
COPY interoperability ./interoperability/

# Build the bridge server application
RUN cargo build --release --bin bridge-server

# Runtime stage
FROM debian:bullseye-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl1.1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN groupadd -r app && useradd -r -g app app

WORKDIR /app

# Copy the binary from builder stage
COPY --from=builder /usr/src/app/target/release/bridge-server ./

# Change ownership to app user
RUN chown -R app:app /app

USER app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Expose ports for bridge server
EXPOSE 8080 9090

# Run the bridge server
ENTRYPOINT ["./bridge-server"]