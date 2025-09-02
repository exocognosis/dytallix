# Multi-stage is kept simple to minimize size and complexity
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN adduser --disabled-password --gecos "" appuser && mkdir -p /app
WORKDIR /app

# Copy source
COPY src /app/src
COPY config /app/config

# Install minimal runtime deps
RUN pip install --no-cache-dir fastapi==0.112.0 uvicorn[standard]==0.30.6 python-multipart==0.0.9

# Optional: analysis toolchain (slither, z3, solc). Toggle via build-arg.
ARG ANALYSIS_TOOLS=false
RUN if [ "$ANALYSIS_TOOLS" = "true" ]; then \
      set -eux; \
      apt-get update; \
      apt-get install -y --no-install-recommends git build-essential ca-certificates wget; \
      pip install --no-cache-dir slither-analyzer==0.10.4 z3-solver==4.12.5.0; \
      rm -rf /var/lib/apt/lists/*; \
    fi

# Default config
ENV PORT=8080 \
    RULES_PATH=/app/src/scanner/rules \
    MAX_FILE_MB=15 \
    TIMEOUT_SEC=60 \
    SCAN_DRIVER=basic

EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=2s --start-period=5s --retries=3 \
  CMD python -c 'import os,urllib.request; urllib.request.urlopen(f"http://127.0.0.1:{os.getenv("PORT","8080")}/health").read()' >/dev/null 2>&1 || exit 1

USER appuser
CMD ["sh", "-c", "python -m uvicorn src.main:app --host 0.0.0.0 --port ${PORT}"]
