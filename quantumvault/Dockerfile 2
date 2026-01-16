# Build stage
FROM rust:1.75 as builder

WORKDIR /app

# Copy workspace files
COPY ../pqc-crypto /app/pqc-crypto
COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY migrations ./migrations

# Build dependencies first for caching
RUN cargo build --release --bin quantumvault-server

# Runtime stage
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/quantumvault-server /app/
COPY migrations /app/migrations

ENV RUST_LOG=quantumvault=info

EXPOSE 8080

CMD ["./quantumvault-server"]
