"""Transcript fetcher with two-stage fallback.

Stage 1 (free, fast):  ``youtube-transcript-api`` — pulls native captions
                       (auto-generated or manually uploaded).
Stage 2 (paid, robust): ``yt-dlp`` audio download → Groq Whisper Large V3.

Returns a normalized list of ``TranscriptSegment`` objects regardless of
which path produced them, plus a ``source`` tag the ingest layer stores
on the video row for analytics.
"""

from __future__ import annotations

import asyncio
import logging
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from groq import AsyncGroq
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    NoTranscriptFound,
    TranscriptsDisabled,
    VideoUnavailable,
)

from app.config import settings
from app.services.youtube import download_audio

logger = logging.getLogger(__name__)


TranscriptSource = Literal["native_captions", "whisper_fallback"]


@dataclass(slots=True)
class TranscriptSegment:
    """One piece of timestamped transcript text."""

    text: str
    start: float           # seconds from video start
    duration: float        # seconds

    @property
    def end(self) -> float:
        return self.start + self.duration

    def to_dict(self) -> dict[str, float | str]:
        return {"text": self.text, "start": self.start, "duration": self.duration}


# ─── Stage 1: native captions ─────────────────────────────────────────────


def _fetch_native_sync(video_id: str) -> list[TranscriptSegment]:
    """Blocking call — caller wraps in to_thread."""
    from app.services.youtube import _COOKIES_FILE

    kwargs: dict = {"languages": ["en", "en-US", "en-GB", "a.en"]}
    if _COOKIES_FILE:
        kwargs["cookies"] = _COOKIES_FILE

    raw = YouTubeTranscriptApi.get_transcript(video_id, **kwargs)
    return [
        TranscriptSegment(
            text=seg["text"].replace("\n", " ").strip(),
            start=float(seg["start"]),
            duration=float(seg.get("duration", 0.0)),
        )
        for seg in raw
        if seg.get("text", "").strip()
    ]


async def fetch_native_captions(video_id: str) -> list[TranscriptSegment] | None:
    """Try the free path. Returns None if captions are unavailable."""
    try:
        return await asyncio.to_thread(_fetch_native_sync, video_id)
    except (TranscriptsDisabled, NoTranscriptFound, VideoUnavailable) as e:
        logger.info("native captions unavailable for %s: %s", video_id, type(e).__name__)
        return None
    except Exception as e:
        # Network blips, parse errors, etc. Fall through to Whisper.
        logger.warning("native captions errored for %s: %s", video_id, e)
        return None


# ─── Stage 2: Groq Whisper ────────────────────────────────────────────────


GROQ_WHISPER_MAX_BYTES = 24 * 1024 * 1024  # Groq caps at 25 MB; 24 leaves headroom


async def _whisper_transcribe(audio_path: Path) -> list[TranscriptSegment]:
    """Send a local audio file to Groq Whisper Large V3 with segment timestamps."""
    size = audio_path.stat().st_size
    if size > GROQ_WHISPER_MAX_BYTES:
        raise RuntimeError(
            f"audio file {audio_path.name} is {size / 1024 / 1024:.1f} MB — "
            f"exceeds Groq Whisper's 25 MB limit. Try a shorter video, or "
            f"chunk the audio (production work)."
        )
    client = AsyncGroq(api_key=settings.groq_api_key)
    with open(audio_path, "rb") as f:
        audio_bytes = f.read()
    response = await client.audio.transcriptions.create(
        file=(audio_path.name, audio_bytes),
        model=settings.groq_whisper_model,
        response_format="verbose_json",
        timestamp_granularities=["segment"],
        temperature=0.0,
    )
    # Groq returns either a pydantic model or a dict depending on SDK version.
    segments = getattr(response, "segments", None) or response.get("segments", [])  # type: ignore[union-attr]
    out: list[TranscriptSegment] = []
    for seg in segments:
        # Each seg has: id, start, end, text, ...
        text = (seg["text"] if isinstance(seg, dict) else seg.text).strip()
        if not text:
            continue
        start = float(seg["start"] if isinstance(seg, dict) else seg.start)
        end = float(seg["end"] if isinstance(seg, dict) else seg.end)
        out.append(TranscriptSegment(text=text, start=start, duration=max(end - start, 0.01)))
    return out


async def fetch_whisper_fallback(video_id: str) -> list[TranscriptSegment]:
    """Download audio + transcribe via Groq Whisper. Cleans up temp files."""
    with tempfile.TemporaryDirectory(prefix="creatorjoy_") as tmpdir:
        audio_path = await asyncio.to_thread(download_audio, video_id, tmpdir)
        return await _whisper_transcribe(audio_path)


# ─── Public API ───────────────────────────────────────────────────────────


async def fetch_transcript(
    video_id: str,
) -> tuple[list[TranscriptSegment], TranscriptSource]:
    """Two-stage fetch. Native captions first, Whisper fallback otherwise.

    Raises if BOTH paths fail — the ingest orchestrator turns that into a
    user-facing error.
    """
    native = await fetch_native_captions(video_id)
    if native:
        return native, "native_captions"
    logger.info("falling back to Whisper for %s", video_id)
    whisper = await fetch_whisper_fallback(video_id)
    return whisper, "whisper_fallback"
