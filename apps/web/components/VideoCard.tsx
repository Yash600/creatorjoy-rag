"use client";

import { useEffect, useRef } from "react";
import {
  formatCount,
  formatDate,
  formatDuration,
  formatRate,
} from "@/lib/format";
import type { VideoMetadata } from "@/lib/types";

interface SeekRequest {
  seconds: number;
  nonce: number; // increments so identical seeks re-trigger
}

interface Props {
  label: "A" | "B";
  video: VideoMetadata;
  seek: SeekRequest | null;
}

/**
 * YouTube embed + structured metadata.
 *
 * Seeking: when `seek.nonce` changes, we postMessage to the iframe to jump
 * the player to `seek.seconds`. Requires `enablejsapi=1` on the embed URL.
 * We also call `playVideo` so the user immediately sees the cited moment.
 */
export function VideoCard({ label, video, seek }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!seek || !iframeRef.current?.contentWindow) return;
    const cw = iframeRef.current.contentWindow;
    cw.postMessage(
      JSON.stringify({ event: "command", func: "seekTo", args: [seek.seconds, true] }),
      "*",
    );
    cw.postMessage(
      JSON.stringify({ event: "command", func: "playVideo", args: [] }),
      "*",
    );
  }, [seek?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const embedSrc = `https://www.youtube.com/embed/${video.video_id}?enablejsapi=1&rel=0`;

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden bg-[#0d0d0d]">
      <div className="px-3 py-2 border-b border-[var(--border)] flex items-center justify-between text-xs">
        <span className="font-mono text-[var(--accent)]">VIDEO {label}</span>
        <span className="text-[var(--muted)]">
          {video.transcript_source === "whisper_fallback"
            ? "transcript: whisper"
            : "transcript: native"}
        </span>
      </div>

      <div className="relative aspect-video bg-black">
        <iframe
          ref={iframeRef}
          src={embedSrc}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      <div className="px-3 py-3 space-y-2">
        <div className="text-sm font-medium leading-snug line-clamp-2">
          {video.title}
        </div>
        <div className="text-xs text-[var(--muted)]">
          {video.channel_name} · {formatCount(video.follower_count)} subs
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
          <Stat label="views" value={formatCount(video.view_count)} />
          <Stat label="likes" value={formatCount(video.like_count)} />
          <Stat label="comments" value={formatCount(video.comment_count)} />
          <Stat
            label="engagement"
            value={formatRate(video.engagement_rate)}
            highlight
          />
          <Stat label="duration" value={formatDuration(video.duration_seconds)} />
          <Stat label="uploaded" value={formatDate(video.upload_date)} />
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
        {label}
      </div>
      <div
        className={`font-mono text-sm ${
          highlight ? "text-[var(--accent)] font-semibold" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
