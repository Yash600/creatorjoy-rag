"use client";

import { useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { IngestForm } from "@/components/IngestForm";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { VideoCard } from "@/components/VideoCard";
import { useChat } from "@/hooks/useChat";
import { ApiError, ingestVideos } from "@/lib/api";
import type { VideoMetadata } from "@/lib/types";

interface SeekRequest {
  label: "A" | "B";
  seconds: number;
  nonce: number;
}

export default function Home() {
  const [videoA, setVideoA] = useState<VideoMetadata | null>(null);
  const [videoB, setVideoB] = useState<VideoMetadata | null>(null);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [seek, setSeek] = useState<SeekRequest | null>(null);

  const chat = useChat({
    videoAId: videoA?.video_id ?? null,
    videoBId: videoB?.video_id ?? null,
  });

  async function handleIngest(urlA: string, urlB: string) {
    setIngestLoading(true);
    setIngestError(null);
    setVideoA(null);
    setVideoB(null);
    setSeek(null);
    try {
      const res = await ingestVideos(urlA, urlB);
      setVideoA(res.video_a);
      setVideoB(res.video_b);
    } catch (e) {
      setIngestError(
        e instanceof ApiError
          ? `${e.status}: ${e.detail}`
          : (e as Error).message,
      );
    } finally {
      setIngestLoading(false);
    }
  }

  function handleSeek(label: "A" | "B", seconds: number) {
    setSeek({ label, seconds, nonce: Date.now() });
  }

  const hasVideos = !!videoA && !!videoB;

  return (
    <>
      <LoadingOverlay visible={ingestLoading} />

      <main className="h-screen flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-[var(--border)] px-6 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center">
                  <span className="text-white text-xs font-black">CJ</span>
                </div>
                <div>
                  <h1 className="text-sm font-bold tracking-tight text-[var(--fg)] leading-tight">
                    Creatorjoy <span className="text-[var(--accent)]">RAG</span>
                  </h1>
                  <p className="text-[10px] text-[var(--muted-light)] leading-tight">
                    AI-powered content intelligence
                  </p>
                </div>
              </div>
            </div>
            <IngestForm
              loading={ingestLoading}
              onSubmit={handleIngest}
              errorMessage={ingestError}
            />
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_1fr] overflow-hidden">
          {/* Left: video cards */}
          <aside className="border-r border-[var(--border)] p-4 space-y-4 overflow-y-auto bg-[var(--bg)]">
            {videoA ? (
              <VideoCard
                label="A"
                video={videoA}
                seek={seek?.label === "A" ? seek : null}
              />
            ) : (
              <Placeholder label="A" loading={ingestLoading} />
            )}
            {videoB ? (
              <VideoCard
                label="B"
                video={videoB}
                seek={seek?.label === "B" ? seek : null}
              />
            ) : (
              <Placeholder label="B" loading={ingestLoading} />
            )}
          </aside>

          {/* Right: chat */}
          <section className="flex flex-col h-full overflow-hidden">
            <ChatPanel
              messages={chat.messages}
              isStreaming={chat.isStreaming}
              disabled={!hasVideos}
              onSend={chat.send}
              onSeek={handleSeek}
              onNewThread={chat.newThread}
            />
          </section>
        </div>
      </main>
    </>
  );
}

function Placeholder({ label, loading }: { label: "A" | "B"; loading: boolean }) {
  return (
    <div className="bg-white border border-dashed border-[var(--border)] rounded-xl overflow-hidden">
      {/* Fake header */}
      <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white opacity-30"
          style={{ background: label === "A" ? "var(--accent)" : "#6366F1" }}
        >
          {label}
        </div>
        {loading ? (
          <div className="h-3 w-24 rounded shimmer" />
        ) : (
          <span className="text-xs text-[var(--muted-light)]">Video {label}</span>
        )}
      </div>

      {/* Fake video area */}
      <div className="aspect-video bg-[var(--border-soft)] flex items-center justify-center">
        {loading ? (
          <div className="w-full h-full shimmer" />
        ) : (
          <div className="text-center space-y-2 opacity-40">
            <div className="text-3xl">▶</div>
            <div className="text-xs text-[var(--muted)]">Submit URLs to load video</div>
          </div>
        )}
      </div>

      {/* Fake stats */}
      <div className="px-4 py-3 space-y-3">
        {loading ? (
          <>
            <div className="h-3 w-4/5 rounded shimmer" />
            <div className="h-2.5 w-2/5 rounded shimmer" />
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 rounded-lg shimmer" />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center text-xs text-[var(--muted-light)] py-4 opacity-60">
            Paste a YouTube URL above
          </div>
        )}
      </div>
    </div>
  );
}
