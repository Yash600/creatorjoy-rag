# ─── Build stage ─────────────────────────────────────────────────────────────
# python:3.11-slim matches the pyproject.toml constraint (>=3.11,<3.13).
FROM python:3.11-slim AS builder

# System packages needed at build time
RUN apt-get update && apt-get install -y --no-install-recommends \
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
# Model is ~90 MB and lives in /root/.cache/huggingface inside the image.
RUN python - <<'EOF'
from sentence_transformers import SentenceTransformer
SentenceTransformer("BAAI/bge-small-en-v1.5", device="cpu")
print("BGE model cached successfully.")
EOF


# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM python:3.11-slim

# ffmpeg is required by yt-dlp to extract and slice audio streams.
# Without it, the Whisper fallback path (long videos / no native captions)
# silently fails. Install here so it's baked into the final image.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
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

# Render injects $PORT at runtime; default to 8000 for local Docker runs.
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
