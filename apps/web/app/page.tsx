"use client";

import { useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { IngestForm } from "@/components/IngestForm";
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
    // Clear prior session state immediately so the user can see whether the
    // new ingest succeeded or failed without stale cards/chat lingering.
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
    // Bump nonce so re-clicking the same citation re-triggers seek
    setSeek({ label, seconds, nonce: Date.now() });
  }

  const hasVideos = !!videoA && !!videoB;

  return (
    <main className="h-screen flex flex-col">
      <header className="border-b border-[var(--border)] px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Creatorjoy <span className="text-[var(--accent)]">RAG</span>
            </h1>
            <p className="text-xs text-[var(--muted)]">
              Paste two YouTube URLs. Ask why one outperformed the other.
            </p>
          </div>
          <IngestForm
            loading={ingestLoading}
            onSubmit={handleIngest}
            errorMessage={ingestError}
          />
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,440px)_1fr] overflow-hidden">
        <aside className="border-r border-[var(--border)] p-4 space-y-3 overflow-y-auto">
          {videoA ? (
            <VideoCard
              label="A"
              video={videoA}
              seek={seek?.label === "A" ? seek : null}
            />
          ) : (
            <Placeholder label="A" />
          )}
          {videoB ? (
            <VideoCard
              label="B"
              video={videoB}
              seek={seek?.label === "B" ? seek : null}
            />
          ) : (
            <Placeholder label="B" />
          )}
        </aside>

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
  );
}

function Placeholder({ label }: { label: "A" | "B" }) {
  return (
    <div className="border border-dashed border-[var(--border)] rounded-lg p-8 text-center">
      <div className="text-xs font-mono text-[var(--muted)] mb-2">
        VIDEO {label}
      </div>
      <div className="text-sm text-[var(--muted)]">
        Submit URLs to load video.
      </div>
    </div>
  );
}
