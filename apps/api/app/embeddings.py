"""Embedder interface + BGE-small-en-v1.5 implementation.

The `Embedder` protocol exists so swapping to OpenAI / Cohere / Voyage is a
30-line change. BGE is the default because it's free, runs locally on CPU,
and matches `text-embedding-3-small` on MTEB retrieval benchmarks at 4×
smaller vector size.

Loaded once at app startup via the lifespan handler — first call after that
is a CPU pass of ~20ms per chunk on a Render free-tier instance.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator, Protocol

from fastapi import FastAPI

from app.config import settings


class Embedder(Protocol):
    dim: int

    def embed(self, texts: list[str]) -> list[list[float]]: ...

    def embed_one(self, text: str) -> list[float]: ...


class BGEEmbedder:
    """Local sentence-transformers BGE-small-en-v1.5 embedder."""

    dim: int = 384

    def __init__(self, model_name: str = settings.embedding_model) -> None:
        # Imported lazily so module load doesn't trigger torch import in tests
        from sentence_transformers import SentenceTransformer

        self._model = SentenceTransformer(model_name, device="cpu")

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        # normalize_embeddings=True so cosine distance == 1 - dot product
        vectors = self._model.encode(
            texts,
            normalize_embeddings=True,
            show_progress_bar=False,
            convert_to_numpy=True,
        )
        return vectors.tolist()

    def embed_one(self, text: str) -> list[float]:
        return self.embed([text])[0]


@asynccontextmanager
async def embedder_lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Load the embedding model once at startup, attach to app.state."""
    app.state.embedder = BGEEmbedder()
    try:
        yield
    finally:
        # Nothing to release — let GC handle the model
        pass


def get_embedder(app: FastAPI) -> Embedder:
    return app.state.embedder
