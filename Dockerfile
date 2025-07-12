# Dytallix Blockchain Node Dockerfile
FROM rust:1.82

# Set the working directory
WORKDIR /app

# Install system dependencies for blockchain development
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    protobuf-compiler \
    clang \
    libclang-dev \
    llvm-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace Cargo.toml first for better layer caching
COPY Cargo.toml ./

# Copy all project directories
COPY blockchain-core/ blockchain-core/
COPY developer-tools/ developer-tools/
COPY pqc-crypto/ pqc-crypto/
COPY smart-contracts/ smart-contracts/
COPY governance/ governance/
COPY interoperability/ interoperability/

# Generate lock file and build the workspace
RUN RUSTFLAGS="--cfg tokio_unstable" cargo generate-lockfile && \
    RUSTFLAGS="--cfg tokio_unstable" cargo build --release --workspace --locked || \
    (cargo update -p base64ct --precise 1.6.0 && \
     cargo update -p time --precise 0.3.36 && \
     RUSTFLAGS="--cfg tokio_unstable" cargo build --release --workspace)

# Expose the default port for the blockchain node
EXPOSE 8545 30303

# Start the blockchain node
CMD ["./target/release/dytallix-node"]
