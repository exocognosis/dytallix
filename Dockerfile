# Dytallix Blockchain Node Dockerfile
FROM rust:1.70
WORKDIR /app
COPY . .
RUN cargo build --release
CMD ["./target/release/dytallix-node"]
