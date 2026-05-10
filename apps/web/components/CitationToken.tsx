"use client";

interface Props {
  label: "A" | "B";
  seconds: number;
  raw: string; // "[A:0:32]"
  onSeek: (label: "A" | "B", seconds: number) => void;
}

/** A clickable inline pill that seeks the matching YouTube embed. */
export function CitationToken({ label, seconds, raw, onSeek }: Props) {
  const mm = Math.floor(seconds / 60);
  const ss = (seconds % 60).toString().padStart(2, "0");
  return (
    <button
      type="button"
      className="citation"
      title={`Jump Video ${label} to ${mm}:${ss}`}
      onClick={() => onSeek(label, seconds)}
    >
      {label}:{mm}:{ss}
    </button>
  );
}
