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
  "Why did Video A get more engagement than Video B?",
  "Compare the hooks in the first 5 seconds.",
  "What's the engagement rate of each?",
  "Suggest improvements for B based on what worked in A.",
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

  // Auto-scroll on new messages / streaming tokens
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

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-3">
        <div className="text-sm font-medium">Chat</div>
        <button
          type="button"
          onClick={onNewThread}
          disabled={messages.length === 0 || isStreaming}
          className="text-xs text-[var(--muted)] hover:text-[var(--fg)] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          new thread
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="text-sm text-[var(--muted)]">
            <div className="mb-3">
              {disabled
                ? "Submit two YouTube URLs above to start."
                : "Ask anything about the two videos. Try one of these:"}
            </div>
            {!disabled && (
              <div className="flex flex-col gap-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => onSend(s)}
                    className="text-left text-xs text-[var(--accent)] hover:underline"
                  >
                    → {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map((m, i) => (
            <ChatMessage key={i} message={m} onSeek={onSeek} />
          ))
        )}
      </div>

      <div className="border-t border-[var(--border)] p-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            disabled
              ? "Submit videos first…"
              : "Ask anything about the two videos…"
          }
          disabled={disabled || isStreaming}
          rows={2}
          className="w-full bg-transparent border border-[var(--border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] disabled:opacity-50 resize-none"
        />
        <div className="flex justify-between items-center mt-1 text-[10px] text-[var(--muted)]">
          <span>Enter to send · Shift+Enter for newline</span>
          {isStreaming && <span>streaming…</span>}
        </div>
      </div>
    </div>
  );
}
