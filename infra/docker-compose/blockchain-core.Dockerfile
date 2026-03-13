# Build stage
FROM rust:1.82 AS builder

# Install required dependencies including libclang for bindgen
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    ca-certificates \
    libclang-dev \
    clang \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy the blockchain-core source code and dependencies
COPY blockchain-core ./blockchain-core
COPY pqc-crypto ./pqc-crypto

# Set working directory to blockchain-core
WORKDIR /app/blockchain-core

# Build only the library (skip binaries for now due to compilation issues)
RUN cargo build --lib --release

# Runtime stage
FROM debian:bookworm-slim

# Install CA certificates for HTTPS
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy the built library (for future use)
COPY --from=builder /app/blockchain-core/target/release/libdytallix_node.rlib /usr/local/lib/

# Create non-root user
RUN useradd -m -u 1001 dytallix
USER dytallix

# Expose ports (blockchain node ports)
EXPOSE 8080 9090

# Keep the container running
CMD ["sleep", "infinity"]
