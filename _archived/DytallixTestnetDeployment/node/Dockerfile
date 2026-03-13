FROM rust:1.78-bullseye AS builder
# Install system dependencies needed for crates that use bindgen (libclang) and native libs (rocksdb, compression)
RUN apt-get update && apt-get install -y --no-install-recommends \
    clang llvm-dev libclang-dev pkg-config cmake build-essential \
    zlib1g-dev liblz4-dev libsnappy-dev libzstd-dev bzip2 \
  && rm -rf /var/lib/apt/lists/*
# Export libclang path (derive dynamically so it works across minor version changes)
RUN LIBCLANG_LIBDIR=$(llvm-config --libdir) && echo "LIBCLANG_PATH=$LIBCLANG_LIBDIR" >> /etc/environment && echo "Using libclang at $LIBCLANG_LIBDIR" && ln -s $LIBCLANG_LIBDIR/libclang.so /usr/lib/libclang.so || true
ENV LIBCLANG_PATH=/usr/lib/llvm-11/lib
WORKDIR /src
COPY . .
RUN cargo build --locked --release -p dytallixd

FROM debian:bullseye-slim
RUN apt-get update && apt-get install -y ca-certificates curl jq && rm -rf /var/lib/apt/lists/*
COPY --from=builder /src/target/release/dytallixd /usr/local/bin/dytallixd
# Back-compat: some scripts/tools may call dytallix-node
RUN ln -sf /usr/local/bin/dytallixd /usr/local/bin/dytallix-node
EXPOSE 26656 26657
ENV HOME=/root
WORKDIR /root
ENTRYPOINT ["dytallixd"]
CMD ["start", "--home", "/root/.dytallix"]
