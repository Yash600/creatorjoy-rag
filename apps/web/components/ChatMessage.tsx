"use client";

import { parseCitations } from "@/lib/citations";
import type { ChatMessage as ChatMessageType, QueryClass } from "@/lib/types";
import { CitationToken } from "./CitationToken";

interface Props {
  message: ChatMessageType;
  onSeek: (label: "A" | "B", seconds: number) => void;
}

const CLASS_LABEL: Record<QueryClass, string> = {
  engagement_stats: "Engagement stats",
  hook: "Hook analysis",
  comparison: "Comparison",
  single_video: "Single video",
};

export function ChatMessage({ message, onSeek }: Props) {
  const isUser = message.role === "user";
  const tokens = isUser ? null : parseCitations(message.content);

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
    >
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-[#1a1a1a] text-white"
            : "bg-transparent border border-[var(--border)] text-[var(--fg)]"
        }`}
      >
        {!isUser && message.query_class && (
          <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2 font-mono">
            {CLASS_LABEL[message.query_class]}
          </div>
        )}

        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <div className="whitespace-pre-wrap">
            {tokens?.map((t, i) =>
              t.kind === "text" ? (
                <span key={i}>{t.value}</span>
              ) : (
                <CitationToken
                  key={i}
                  label={t.label}
                  seconds={t.seconds}
                  raw={t.raw}
                  onSeek={onSeek}
                />
              ),
            )}
            {message.isStreaming && (
              <span className="inline-block w-1 h-4 ml-0.5 bg-[var(--accent)] animate-pulse align-middle" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
