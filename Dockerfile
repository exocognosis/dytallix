# Dytallix Blockchain Node Dockerfile
FROM rust:1.82

# Set the working directory
WORKDIR /app

# Install system dependencies for blockchain development
RUN apt-get update && apt-get upgrade -y && apt-get install -y \
    pkg-config \
    libssl-dev \
    protobuf-compiler \
    clang \
    libclang-dev \
    llvm-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user with UID 1000
RUN groupadd -r appuser && useradd -r -g appuser -u 1000 appuser

# Copy workspace Cargo.toml first for better layer caching
COPY Cargo.toml ./

# Copy all project directories (core crates + lean launch)
# Existing copies
COPY blockchain-core/ blockchain-core/
COPY developer-tools/ developer-tools/
COPY pqc-crypto/ pqc-crypto/
COPY smart-contracts/ smart-contracts/
COPY governance/ governance/
COPY interoperability/ interoperability/
COPY dytallix-lean-launch/node/ dytallix-lean-launch/node/
COPY cli/ cli/
COPY sdk/ sdk/
COPY explorer/indexer/ explorer/indexer/
COPY explorer/api/ explorer/api/
# Added: full lean launch workspace so web build & scripts are available
COPY dytallix-lean-launch/ dytallix-lean-launch/

# Generate lock file and build the workspace
RUN RUSTFLAGS="--cfg tokio_unstable" cargo generate-lockfile && \
    RUSTFLAGS="--cfg tokio_unstable" cargo build --release --workspace --locked || \
    (cargo update -p base64ct --precise 1.6.0 && \
     cargo update -p time --precise 0.3.36 && \
     RUSTFLAGS="--cfg tokio_unstable" cargo build --release --workspace)

# Change ownership to non-root user
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose the default ports (RPC + P2P)
EXPOSE 3030 8545 30303

# Set default working directory for node runtime
WORKDIR /app/dytallix-lean-launch

# Start the lean launch node binary (adjust path)
CMD ["/app/target/release/dytallix-lean-node"]
