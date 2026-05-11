"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { ChatMessage } from "./ChatMessage";

interface Props {
  messages: ChatMessageType[];
  isStreaming: boolean;
  disabled: boolean;
  onSend: (question: string) => void;
  onSeek: (label: "A" | "B", seconds: number) => void;
  onNewThread: () => void;
}

const SUGGESTIONS = [
  { emoji: "🏆", text: "Why did one Video outperform another Video?" },
  { emoji: "🎣", text: "Compare the hooks in the first 30 seconds." },
  { emoji: "📈", text: "What drove higher engagement on one video?" },
  { emoji: "💡", text: "What should the creator do differently next time?" },
];

export function ChatPanel({
  messages,
  isStreaming,
  disabled,
  onSend,
  onSeek,
  onNewThread,
}: Props) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  function submit() {
    if (!input.trim() || isStreaming || disabled) return;
    onSend(input.trim());
    setInput("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
          <span className="text-sm font-semibold text-[var(--fg)]">Content Intelligence</span>
        </div>
        <button
          type="button"
          onClick={onNewThread}
          disabled={isEmpty || isStreaming}
          className="text-xs text-[var(--muted)] hover:text-[var(--fg)] disabled:opacity-30 disabled:cursor-not-allowed px-3 py-1 rounded-lg hover:bg-[var(--border-soft)] transition-all"
        >
          New thread
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center gap-5 py-8">
            {disabled ? (
              <div className="text-center space-y-2">
                <div className="text-4xl">🎬</div>
                <div className="text-sm font-medium text-[var(--fg)]">
                  Paste two YouTube URLs above
                </div>
                <div className="text-xs text-[var(--muted)] max-w-xs">
                  Compare any two videos. Find out what made one outperform the other — with timestamps.
                </div>
              </div>
            ) : (
              <>
                <div className="text-center space-y-1">
                  <div className="text-3xl">✨</div>
                  <div className="text-sm font-semibold text-[var(--fg)]">
                    Videos loaded. Start your analysis.
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    Ask anything — I'll cite exact timestamps.
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.text}
                      onClick={() => onSend(s.text)}
                      className="flex items-center gap-3 text-left text-xs bg-[var(--bg)] hover:bg-[var(--accent-soft)] border border-[var(--border)] hover:border-[rgba(249,115,22,0.3)] rounded-xl px-4 py-3 transition-all group"
                    >
                      <span className="text-base">{s.emoji}</span>
                      <span className="text-[var(--fg-soft)] group-hover:text-[var(--accent)] font-medium transition-colors">
                        {s.text}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <ChatMessage key={i} message={m} onSeek={onSeek} />
            ))}
            {isStreaming && (
              <div className="flex gap-1 items-center px-2 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] dot-1" />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] dot-2" />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] dot-3" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[var(--border)] p-4">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              disabled
                ? "Submit two videos to start asking…"
                : "Ask about the videos… (Enter to send)"
            }
            disabled={disabled || isStreaming}
            rows={2}
            className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] focus:border-[var(--accent)] disabled:opacity-40 resize-none text-[var(--fg)] placeholder:text-[var(--muted-light)] transition-all"
          />
          <button
            onClick={submit}
            disabled={disabled || isStreaming || !input.trim()}
            className="px-4 py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            Send
          </button>
        </div>
        <div className="mt-1.5 text-[10px] text-[var(--muted-light)]">
          Enter to send · Shift+Enter for newline
        </div>
      </div>
    </div>
  );
}
