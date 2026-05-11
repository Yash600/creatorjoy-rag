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
    <form onSubmit={submit} className="flex flex-col gap-2 w-full max-w-3xl">
      <div className="flex gap-2 items-center flex-1">
        <div className="relative flex-1 min-w-0">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold tracking-widest text-[var(--accent)] select-none">A</span>
          <input
            value={urlA}
            onChange={(e) => setUrlA(e.target.value)}
            placeholder="youtube.com/watch?v=…"
            disabled={loading}
            className="w-full bg-white border border-[var(--border)] rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] focus:border-[var(--accent)] disabled:opacity-50 disabled:bg-[var(--border-soft)] text-[var(--fg)] placeholder:text-[var(--muted-light)] transition-all"
          />
        </div>
        <div className="relative flex-1 min-w-0">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold tracking-widest text-[var(--muted)] select-none">B</span>
          <input
            value={urlB}
            onChange={(e) => setUrlB(e.target.value)}
            placeholder="youtube.com/watch?v=…"
            disabled={loading}
            className="w-full bg-white border border-[var(--border)] rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] focus:border-[var(--accent)] disabled:opacity-50 disabled:bg-[var(--border-soft)] text-[var(--fg)] placeholder:text-[var(--muted-light)] transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={!canSubmit}
          className="px-5 py-2 text-sm rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          {loading ? "Analyzing…" : "Analyze"}
        </button>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted-light)]">
        <span>⚡</span>
        <span>Free tier · Best with videos under 8 mins · First load ~20s, cached loads are instant</span>
      </div>
      {errorMessage && (
        <div
          role="alert"
          className="border border-red-200 bg-red-50 text-red-700 rounded-lg px-3 py-2 text-xs leading-relaxed"
        >
          <strong className="font-semibold">Error:</strong> {errorMessage}
        </div>
      )}
    </form>
  );
}
