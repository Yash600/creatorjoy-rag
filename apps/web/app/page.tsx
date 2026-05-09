"use client";

import { useState } from "react";

/**
 * Home page — scaffold layout.
 *
 * Layout intent:
 *   ┌────────────────────────────────────────────┐
 *   │ Header: title + URL inputs + Analyze       │
 *   ├──────────────────────┬─────────────────────┤
 *   │ Video A card         │                     │
 *   │ ───────────          │   Chat panel        │
 *   │ Video B card         │   (streaming SSE)   │
 *   └──────────────────────┴─────────────────────┘
 *
 * Wiring (ingest call, streaming chat, citation parsing) lands in Task #4.
 */
export default function Home() {
  const [urlA, setUrlA] = useState("");
  const [urlB, setUrlB] = useState("");
  const [loading, setLoading] = useState(false);

  // Placeholder — real implementation hits POST /api/ingest in the next pass.
  async function onAnalyze() {
    if (!urlA || !urlB) return;
    setLoading(true);
    try {
      // const res = await fetch("/api/ingest", { ... });
      console.log("ingest", { urlA, urlB });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* ─── Header ───────────────────────────────────────── */}
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
          <div className="flex gap-2 items-center flex-1 min-w-0 max-w-3xl">
            <input
              value={urlA}
              onChange={(e) => setUrlA(e.target.value)}
              placeholder="Video A — https://youtube.com/watch?v=..."
              className="flex-1 min-w-0 bg-transparent border border-[var(--border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
            />
            <input
              value={urlB}
              onChange={(e) => setUrlB(e.target.value)}
              placeholder="Video B — https://youtube.com/watch?v=..."
              className="flex-1 min-w-0 bg-transparent border border-[var(--border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
            />
            <button
              onClick={onAnalyze}
              disabled={!urlA || !urlB || loading}
              className="px-4 py-2 text-sm rounded bg-[var(--accent)] text-black font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Analyzing…" : "Analyze"}
            </button>
          </div>
        </div>
      </header>

      {/* ─── Body: video stack | chat ─────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_1fr] gap-0">
        <aside className="border-r border-[var(--border)] p-4 space-y-3 overflow-y-auto">
          <VideoCardPlaceholder label="A" />
          <VideoCardPlaceholder label="B" />
        </aside>

        <section className="flex flex-col">
          <ChatPanelPlaceholder />
        </section>
      </div>
    </main>
  );
}

function VideoCardPlaceholder({ label }: { label: "A" | "B" }) {
  return (
    <div className="border border-[var(--border)] rounded-lg p-3">
      <div className="text-xs text-[var(--muted)] mb-2">Video {label}</div>
      <div className="aspect-video bg-[#111] rounded mb-3" />
      <div className="text-sm font-medium text-[var(--muted)]">
        Submit URLs to load metadata.
      </div>
    </div>
  );
}

function ChatPanelPlaceholder() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="text-sm text-[var(--muted)]">
          Once both videos are loaded, ask questions like:
          <ul className="mt-2 ml-4 list-disc space-y-1">
            <li>Why did Video A get more engagement than Video B?</li>
            <li>Compare the hooks in the first 5 seconds.</li>
            <li>What worked in A that B is missing?</li>
            <li>What&apos;s the engagement rate of each?</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--border)] p-4">
        <input
          placeholder="Ask anything about the two videos…"
          disabled
          className="w-full bg-transparent border border-[var(--border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
        />
      </div>
    </div>
  );
}
