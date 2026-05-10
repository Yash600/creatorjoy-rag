# ─── Build stage ─────────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

# Build tools needed by asyncpg, psycopg, and other C-extension packages
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        gcc \
        g++ \
        libpq-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry (pinned for reproducibility)
RUN pip install --no-cache-dir poetry==1.8.3

WORKDIR /app

# Copy lock files first — layer-cached unless deps change
COPY pyproject.toml poetry.lock ./

# Install all runtime deps into the system Python (no virtualenv in Docker)
RUN poetry config virtualenvs.create false \
    && poetry install --no-root --without dev --no-interaction --no-ansi

# Pre-download BGE-small so cold starts don't hit HuggingFace at runtime.
RUN python - <<'EOF'
from sentence_transformers import SentenceTransformer
SentenceTransformer("BAAI/bge-small-en-v1.5", device="cpu")
print("BGE model cached successfully.")
EOF


# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM python:3.11-slim

# ffmpeg for yt-dlp audio extraction + libpq for psycopg at runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        libpq5 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy installed Python packages from builder
COPY --from=builder /usr/local/lib/python3.11 /usr/local/lib/python3.11
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy pre-downloaded HuggingFace model cache
COPY --from=builder /root/.cache /root/.cache

# Copy application source
COPY app/ ./app/
COPY migrations/ ./migrations/

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
