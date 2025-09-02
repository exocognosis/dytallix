# Multi-stage build with pinned deps for a slim runtime image
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates && \
    rm -rf /var/lib/apt/lists/*

FROM base AS builder
WORKDIR /wheels
COPY ./src /tmp/src
RUN pip install --upgrade pip==24.2
# Pinned runtime deps
RUN pip wheel --no-cache-dir \
      fastapi==0.112.0 \
      uvicorn[standard]==0.30.6 \
      httpx==0.27.0 \
      networkx==3.3 \
      xgboost==2.1.1 \
      lightgbm==4.5.0 \
      pqcrypto==2.1 \
    -w /wheels || true

FROM base AS runtime
RUN adduser --disabled-password --gecos "" appuser && mkdir -p /app
WORKDIR /app

COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir /wheels/* && rm -rf /wheels

COPY src /app/src
COPY config /app/config

ENV PORT=8090 \
    RPC_URL="" \
    FEATURE_WINDOW=200 \
    ALERT_THRESHOLD=0.8 \
    SINK_URL=""

EXPOSE 8090
HEALTHCHECK --interval=10s --timeout=2s --start-period=5s --retries=3 \
  CMD python -c 'import os,urllib.request; urllib.request.urlopen(f"http://127.0.0.1:{os.getenv("PORT","8090")}/health").read()' >/dev/null 2>&1 || exit 1

USER appuser
CMD ["sh", "-c", "python -m uvicorn src.server:app --host 0.0.0.0 --port ${PORT}"]
