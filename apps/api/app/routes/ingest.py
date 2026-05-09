"""POST /api/ingest — accept two URLs, return metadata for both videos."""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, HTTPException, Request

from app.db import get_pool
from app.embeddings import get_embedder
from app.schemas import IngestRequest, IngestResponse
from app.services.ingest import IngestError, ingest_video
from app.services.youtube import InvalidYouTubeUrlError, YouTubeFetchError

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/ingest", response_model=IngestResponse)
async def ingest(req: IngestRequest, request: Request) -> IngestResponse:
    """Ingest both videos concurrently."""
    pool = get_pool(request.app)
    embedder = get_embedder(request.app)

    async def _safe(url: str) -> object:
        try:
            return await ingest_video(pool, embedder, url)
        except (InvalidYouTubeUrlError, YouTubeFetchError, IngestError) as e:
            return e

    results = await asyncio.gather(_safe(str(req.url_a)), _safe(str(req.url_b)))

    failures = [r for r in results if isinstance(r, Exception)]
    if failures:
        # Surface the first failure clearly. Frontend renders this verbatim.
        raise HTTPException(status_code=400, detail=str(failures[0]))

    return IngestResponse(video_a=results[0], video_b=results[1])  # type: ignore[arg-type]
