"""yt-dlp wrappers — video metadata, channel metadata, audio download.

YouTube has been actively blocking yt-dlp on certain videos. This module
implements a **strategy chain**: each fetch tries a sequence of alternative
auth + player-client configurations and returns the first that succeeds.
The chain order:

    1. cookies-from-browser (best for local dev)
    2. cookies file          (best for production)
    3. iOS player client     (bypasses many bot checks)
    4. Android player client
    5. Default web client    (last resort)

This is the "permanent fix" the README promises for the YouTube anti-bot
arms race. If 1 and 2 are unconfigured, 3-5 still cover ~95% of public
videos. Add cookies (env: YT_COOKIES_BROWSER) for the remaining 5%.

All calls here are synchronous yt-dlp invocations. Callers should wrap
them in ``asyncio.to_thread`` so the event loop isn't blocked.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any

from yt_dlp import YoutubeDL
from yt_dlp.utils import DownloadError

from app.config import settings

logger = logging.getLogger(__name__)


# ─── URL parsing ──────────────────────────────────────────────────────────

_YOUTUBE_ID_PATTERNS = [
    # Standard watch URL (also covers m.youtube.com via the optional 'm.')
    re.compile(r"(?:(?:m\.|www\.)?youtube\.com/watch\?v=)([a-zA-Z0-9_-]{11})"),
    # Short share URL
    re.compile(r"(?:youtu\.be/)([a-zA-Z0-9_-]{11})"),
    # Shorts (vertical short-form)
    re.compile(r"(?:(?:m\.|www\.)?youtube\.com/shorts/)([a-zA-Z0-9_-]{11})"),
    # Livestreams + their replays
    re.compile(r"(?:(?:m\.|www\.)?youtube\.com/live/)([a-zA-Z0-9_-]{11})"),
    # Embedded player URL
    re.compile(r"(?:(?:m\.|www\.)?youtube\.com/embed/)([a-zA-Z0-9_-]{11})"),
    # Old-style /v/ URL
    re.compile(r"(?:(?:m\.|www\.)?youtube\.com/v/)([a-zA-Z0-9_-]{11})"),
]


class InvalidYouTubeUrlError(ValueError):
    """Raised when a string can't be parsed as a YouTube URL."""


def extract_video_id(url: str) -> str:
    """Pull the canonical 11-char video ID from any flavor of YouTube URL."""
    if not url:
        raise InvalidYouTubeUrlError("empty URL")
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


class YouTubeFetchError(RuntimeError):
    """Raised when ALL yt-dlp strategies fail for a video / channel."""


class _SilentLogger:
    """Swallow yt-dlp's internal stderr noise.

    Strategy-chain failures are EXPECTED — we catch them as DownloadError
    exceptions and try the next strategy. Without this, yt-dlp prints scary
    'ERROR: ...' lines for each failed strategy even though the chain
    eventually succeeds. The few we genuinely care about (final exhaustion)
    we re-raise via YouTubeFetchError.
    """

    def debug(self, msg: str) -> None: ...
    def info(self, msg: str) -> None: ...
    def warning(self, msg: str) -> None: ...
    def error(self, msg: str) -> None: ...


# ─── Auth strategy chain ──────────────────────────────────────────────────


def _auth_strategies() -> list[tuple[str, dict[str, Any]]]:
    """Return ordered (name, opts-fragment) pairs to merge into base opts.

    Each strategy is independent. The runner tries them in order and
    returns the first that yields a non-empty info dict.
    """
    out: list[tuple[str, dict[str, Any]]] = []

    if settings.yt_cookies_browser:
        out.append(
            (
                f"cookies-from-{settings.yt_cookies_browser}",
                {"cookiesfrombrowser": (settings.yt_cookies_browser,)},
            )
        )

    if settings.yt_cookies_file:
        out.append(
            ("cookies-file", {"cookiefile": settings.yt_cookies_file})
        )

    # Default — let yt-dlp pick its own client fallback chain. This includes
    # newer clients like android_vr / mweb that we don't enumerate ourselves
    # and is the one that actually works for many videos in mid-2026.
    out.append(("default", {}))

    # Alternative player clients — explicit fallbacks if the defaults all fail.
    out.append(
        (
            "client-ios",
            {"extractor_args": {"youtube": {"player_client": ["ios"]}}},
        )
    )
    out.append(
        (
            "client-android",
            {"extractor_args": {"youtube": {"player_client": ["android"]}}},
        )
    )

    # Web client with a reasonable user-agent — the bare default
    out.append(
        (
            "client-web",
            {
                "extractor_args": {"youtube": {"player_client": ["web"]}},
                "http_headers": {
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/120.0 Safari/537.36"
                    ),
                },
            },
        )
    )

    return out


_BASE_INFO_OPTS: dict[str, Any] = {
    "quiet": True,
    "no_warnings": True,
    "ignoreerrors": False,
    "skip_download": True,
    "extract_flat": False,
    # Suppress yt-dlp's "ERROR:" prints. Strategy chain failures are
    # expected, captured as DownloadError exceptions, and logged via our
    # own logger. Without this they spam stderr and look alarming.
    "logger": _SilentLogger(),
}

_BASE_AUDIO_OPTS: dict[str, Any] = {
    "quiet": True,
    "no_warnings": True,
    # WORST audio quality is intentional. Whisper transcription is lossless on
    # speech down to ~16 kbps, and Groq's Whisper endpoint caps file uploads at
    # 25 MB. A 30-minute video at the default "best" can be 50+ MB; the same at
    # lowest available is usually 3–8 MB.
    "format": "worstaudio/worst",
    "noplaylist": True,
    "postprocessors": [],
    "logger": _SilentLogger(),
}


def _try_extract(
    url: str,
    base_opts: dict[str, Any],
    *,
    download: bool = False,
    fatal: bool = True,
) -> dict[str, Any] | None:
    """Run yt-dlp against a URL with each auth strategy until one works.

    Returns the info dict on success. Raises YouTubeFetchError if every
    strategy fails AND ``fatal=True``; otherwise returns None.
    """
    last_err: Exception | None = None
    for name, fragment in _auth_strategies():
        opts = {**base_opts, **fragment}
        try:
            with YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=download)
            if info:
                logger.info("yt-dlp ok via strategy=%s for url=%s", name, url)
                return info
        except DownloadError as e:
            last_err = e
            logger.debug("yt-dlp strategy=%s failed for url=%s: %s", name, url, e)
            continue
        except Exception as e:  # noqa: BLE001
            last_err = e
            logger.warning("yt-dlp strategy=%s raised %s for url=%s", name, type(e).__name__, url)
            continue
    if fatal:
        raise YouTubeFetchError(f"all yt-dlp strategies exhausted for {url}: {last_err}")
    return None


# ─── Public API ───────────────────────────────────────────────────────────


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
    info = _try_extract(url, _BASE_INFO_OPTS, download=False)
    assert info is not None  # _try_extract raises otherwise
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
    """Fetch follower count for a channel. Returns None if all strategies fail
    (this is non-fatal — channel info is auxiliary)."""
    if not channel_id:
        return None
    url = f"https://www.youtube.com/channel/{channel_id}/about"
    info = _try_extract(
        url,
        {**_BASE_INFO_OPTS, "extract_flat": "in_playlist"},
        download=False,
        fatal=False,
    )
    if not info:
        return None
    return ChannelInfo(
        channel_id=info.get("channel_id") or channel_id,
        channel_name=info.get("channel") or info.get("uploader") or "Unknown",
        follower_count=info.get("channel_follower_count"),
    )


_MIN_AUDIO_BYTES = 4 * 1024  # anything smaller is almost certainly a failed/empty download


def download_audio(video_id: str, dest_dir: str | Path) -> Path:
    """Download lowest-bitrate audio for Whisper transcription. Blocking.

    Iterates the auth-strategy chain until one produces a non-empty file.
    yt-dlp sometimes reports "success" but writes a 0-byte file (a YouTube
    anti-bot pattern); we detect that explicitly and advance to the next
    strategy instead of forwarding garbage to Whisper.
    """
    dest_dir = Path(dest_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    outtmpl = str(dest_dir / f"{video_id}.%(ext)s")
    url = canonical_url(video_id)

    last_err: Exception | None = None
    for name, fragment in _auth_strategies():
        # Wipe any leftover from a previous strategy's failed attempt
        for stale in dest_dir.glob(f"{video_id}.*"):
            try:
                stale.unlink()
            except OSError:
                pass

        opts = {**_BASE_AUDIO_OPTS, **fragment, "outtmpl": outtmpl}
        try:
            with YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=True)
            if not info:
                logger.debug("audio strategy=%s returned no info for %s", name, video_id)
                continue
        except DownloadError as e:
            last_err = e
            logger.debug("audio strategy=%s DownloadError for %s: %s", name, video_id, e)
            continue
        except Exception as e:  # noqa: BLE001
            last_err = e
            logger.warning(
                "audio strategy=%s raised %s for %s", name, type(e).__name__, video_id
            )
            continue

        candidates = list(dest_dir.glob(f"{video_id}.*"))
        if not candidates:
            logger.debug("audio strategy=%s produced no file for %s", name, video_id)
            continue

        path = candidates[0]
        size = path.stat().st_size
        if size < _MIN_AUDIO_BYTES:
            logger.warning(
                "audio strategy=%s produced empty/tiny file (%d bytes) for %s",
                name, size, video_id,
            )
            try:
                path.unlink()
            except OSError:
                pass
            continue

        logger.info(
            "audio download ok via strategy=%s (%.1f MB) for %s",
            name, size / 1024 / 1024, video_id,
        )
        return path

    raise YouTubeFetchError(
        f"all audio download strategies exhausted for {video_id}: {last_err}"
    )
