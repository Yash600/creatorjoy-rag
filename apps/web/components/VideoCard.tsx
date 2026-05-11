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
  nonce: number;
}

interface Props {
  label: "A" | "B";
  video: VideoMetadata;
  seek: SeekRequest | null;
}

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
  const isWhisper = video.transcript_source === "whisper_fallback";

  return (
    <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden shadow-sm fade-in">
      {/* Label bar */}
      <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
            style={{ background: label === "A" ? "var(--accent)" : "#6366F1" }}
          >
            {label}
          </span>
          <span className="text-sm font-medium text-[var(--fg)] truncate max-w-[200px]">
            {video.channel_name}
          </span>
        </div>
        <span className="text-[10px] text-[var(--muted-light)] bg-[var(--border-soft)] px-2 py-0.5 rounded-full">
          {isWhisper ? "whisper" : "native captions"}
        </span>
      </div>

      {/* Embed */}
      <div className="relative aspect-video bg-[#000]">
        <iframe
          ref={iframeRef}
          src={embedSrc}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* Info */}
      <div className="px-4 py-3 space-y-3">
        <div className="text-sm font-semibold leading-snug line-clamp-2 text-[var(--fg)]">
          {video.title}
        </div>
        <div className="text-xs text-[var(--muted)]">
          {formatCount(video.follower_count)} subscribers · uploaded {formatDate(video.upload_date)}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <Stat label="Views" value={formatCount(video.view_count)} />
          <Stat label="Likes" value={formatCount(video.like_count)} />
          <Stat label="Comments" value={formatCount(video.comment_count)} />
          <Stat label="Duration" value={formatDuration(video.duration_seconds)} />
          <Stat
            label="Engagement"
            value={formatRate(video.engagement_rate)}
            highlight
          />
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
    <div className={`rounded-lg px-2.5 py-2 ${highlight ? "bg-[var(--accent-soft)] border border-[rgba(249,115,22,0.2)]" : "bg-[var(--border-soft)]"}`}>
      <div className="text-[9px] uppercase tracking-wider font-semibold text-[var(--muted-light)] mb-0.5">
        {label}
      </div>
      <div
        className={`text-sm font-bold ${highlight ? "text-[var(--accent)]" : "text-[var(--fg-soft)]"}`}
      >
        {value}
      </div>
    </div>
  );
}
