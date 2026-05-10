"use client";

import { useState } from "react";

interface Props {
  loading: boolean;
  onSubmit: (urlA: string, urlB: string) => void;
  errorMessage?: string | null;
}

export function IngestForm({ loading, onSubmit, errorMessage }: Props) {
  const [urlA, setUrlA] = useState("");
  const [urlB, setUrlB] = useState("");

  const canSubmit = urlA.trim().length > 0 && urlB.trim().length > 0 && !loading;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(urlA.trim(), urlB.trim());
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-2 w-full max-w-3xl"
    >
      <div className="flex gap-2 items-center flex-1">
        <input
          value={urlA}
          onChange={(e) => setUrlA(e.target.value)}
          placeholder="Video A — youtube.com/watch?v=…"
          disabled={loading}
          className="flex-1 min-w-0 bg-transparent border border-[var(--border)] rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
        />
        <input
          value={urlB}
          onChange={(e) => setUrlB(e.target.value)}
          placeholder="Video B — youtube.com/watch?v=…"
          disabled={loading}
          className="flex-1 min-w-0 bg-transparent border border-[var(--border)] rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="px-4 py-2 text-sm rounded bg-[var(--accent)] text-black font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Analyzing…" : "Analyze"}
        </button>
      </div>
      {errorMessage && (
        <div
          role="alert"
          className="border border-red-500/40 bg-red-500/10 text-red-300 rounded px-3 py-2 text-xs font-mono leading-relaxed"
        >
          <strong className="text-red-400">Ingest failed:</strong> {errorMessage}
        </div>
      )}
    </form>
  );
}
