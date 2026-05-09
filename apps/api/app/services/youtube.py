"""yt-dlp wrappers — video metadata, channel metadata, audio download.

yt-dlp is preferred over the official YouTube Data API for three reasons:
  1. No API key, no quota anxiety.
  2. Works on Shorts, age-gated public videos, and region-flexible URLs.
  3. Single library covers metadata extraction AND audio download (used for
     the Whisper transcription fallback).

All calls here are synchronous yt-dlp invocations. Callers should wrap them
in ``asyncio.to_thread`` so the event loop isn't blocked.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any

from yt_dlp import YoutubeDL
from yt_dlp.utils import DownloadError


# ─── URL parsing ──────────────────────────────────────────────────────────

_YOUTUBE_ID_PATTERNS = [
    re.compile(r"(?:youtube\.com/watch\?v=)([a-zA-Z0-9_-]{11})"),
    re.compile(r"(?:youtu\.be/)([a-zA-Z0-9_-]{11})"),
    re.compile(r"(?:youtube\.com/shorts/)([a-zA-Z0-9_-]{11})"),
    re.compile(r"(?:youtube\.com/embed/)([a-zA-Z0-9_-]{11})"),
    re.compile(r"(?:youtube\.com/v/)([a-zA-Z0-9_-]{11})"),
]


class InvalidYouTubeUrlError(ValueError):
    """Raised when a string can't be parsed as a YouTube URL."""


def extract_video_id(url: str) -> str:
    """Pull the canonical 11-char video ID from any flavor of YouTube URL."""
    if not url:
        raise InvalidYouTubeUrlError("empty URL")
    # Bare 11-char ID
    if re.fullmatch(r"[a-zA-Z0-9_-]{11}", url):
        return url
    for pat in _YOUTUBE_ID_PATTERNS:
        if m := pat.search(url):
            return m.group(1)
    raise InvalidYouTubeUrlError(f"could not extract video id from: {url}")


def canonical_url(video_id: str) -> str:
    return f"https://www.youtube.com/watch?v={video_id}"


# ─── Metadata DTOs ────────────────────────────────────────────────────────


@dataclass(slots=True)
class VideoInfo:
    """Flat metadata bundle yt-dlp returns for a single video."""

    video_id: str
    url: str
    title: str
    channel_name: str
    channel_id: str | None
    follower_count: int | None
    view_count: int
    like_count: int
    comment_count: int
    duration_seconds: int | None
    upload_date: date | None
    thumbnail_url: str | None
    description: str | None
    tags: list[str]
    language: str | None


@dataclass(slots=True)
class ChannelInfo:
    channel_id: str
    channel_name: str
    follower_count: int | None


# ─── yt-dlp invocations ───────────────────────────────────────────────────


_SHARED_YDL_OPTS: dict[str, Any] = {
    "quiet": True,
    "no_warnings": True,
    "skip_download": True,
    "extract_flat": False,
}


class YouTubeFetchError(RuntimeError):
    """Raised when yt-dlp can't reach or parse a video / channel."""


def _parse_upload_date(s: str | None) -> date | None:
    if not s:
        return None
    try:
        return datetime.strptime(s, "%Y%m%d").date()
    except ValueError:
        return None


def fetch_video_info(video_id: str) -> VideoInfo:
    """Fetch metadata for a single video. Blocking — wrap in to_thread."""
    url = canonical_url(video_id)
    try:
        with YoutubeDL(_SHARED_YDL_OPTS) as ydl:
            info = ydl.extract_info(url, download=False)
    except DownloadError as e:
        raise YouTubeFetchError(f"yt-dlp failed for {video_id}: {e}") from e

    if info is None:
        raise YouTubeFetchError(f"yt-dlp returned no info for {video_id}")

    return VideoInfo(
        video_id=info.get("id") or video_id,
        url=url,
        title=info.get("title") or "Untitled",
        channel_name=info.get("channel") or info.get("uploader") or "Unknown",
        channel_id=info.get("channel_id") or info.get("uploader_id"),
        follower_count=info.get("channel_follower_count"),
        view_count=int(info.get("view_count") or 0),
        like_count=int(info.get("like_count") or 0),
        comment_count=int(info.get("comment_count") or 0),
        duration_seconds=info.get("duration"),
        upload_date=_parse_upload_date(info.get("upload_date")),
        thumbnail_url=info.get("thumbnail"),
        description=info.get("description"),
        tags=info.get("tags") or [],
        language=info.get("language"),
    )


def fetch_channel_info(channel_id: str) -> ChannelInfo | None:
    """Fetch follower count for a channel. Returns None on failure (non-fatal)."""
    if not channel_id:
        return None
    url = f"https://www.youtube.com/channel/{channel_id}/about"
    opts = {**_SHARED_YDL_OPTS, "extract_flat": "in_playlist"}
    try:
        with YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except DownloadError:
        return None
    if not info:
        return None
    return ChannelInfo(
        channel_id=info.get("channel_id") or channel_id,
        channel_name=info.get("channel") or info.get("uploader") or "Unknown",
        follower_count=info.get("channel_follower_count"),
    )


def download_audio(video_id: str, dest_dir: str | Path) -> Path:
    """Download lowest-bitrate audio for Whisper transcription. Blocking.

    Returns the path to the downloaded file. Caller is responsible for cleanup.
    """
    dest_dir = Path(dest_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    outtmpl = str(dest_dir / f"{video_id}.%(ext)s")

    opts: dict[str, Any] = {
        "quiet": True,
        "no_warnings": True,
        "format": "bestaudio[ext=m4a]/bestaudio/best",
        "outtmpl": outtmpl,
        "noplaylist": True,
        # Limit audio quality to keep files small (Whisper accepts low-bitrate)
        "postprocessors": [],
    }
    url = canonical_url(video_id)
    try:
        with YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=True)
    except DownloadError as e:
        raise YouTubeFetchError(f"audio download failed for {video_id}: {e}") from e

    # Find the produced file (extension varies by source format)
    candidates = list(dest_dir.glob(f"{video_id}.*"))
    if not candidates:
        raise YouTubeFetchError(f"audio file missing after download for {video_id}")
    return candidates[0]
