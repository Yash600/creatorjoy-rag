"use client";

import { useEffect, useState } from "react";

const STEPS = [
  {
    icon: "🎬",
    label: "Fetching video metadata",
    messages: [
      "Pulling titles, views & subscriber counts…",
      "Reading the engagement signals…",
      "Checking how many stuck around to like…",
    ],
  },
  {
    icon: "📝",
    label: "Extracting transcripts",
    messages: [
      "Capturing every word your creators said…",
      "Reading between the captions…",
      "Finding the exact moments that landed…",
    ],
  },
  {
    icon: "⚡",
    label: "Chunking & indexing content",
    messages: [
      "Slicing the transcript into smart chunks…",
      "Mapping hook moments to timestamps…",
      "Tagging what made viewers stay or leave…",
    ],
  },
  {
    icon: "🧠",
    label: "Building content intelligence",
    messages: [
      "Embedding creator DNA into vector space…",
      "Training on what made Video A pop off…",
      "Almost ready — this is the good part…",
    ],
  },
];

interface Props {
  visible: boolean;
}

export function LoadingOverlay({ visible }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const [fade, setFade] = useState(true);

  // Advance message every 2.8s
  useEffect(() => {
    if (!visible) return;
    setStepIndex(0);
    setMsgIndex(0);
    setFade(true);

    const id = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setMsgIndex((prev) => {
          const step = STEPS[stepIndex] ?? STEPS[STEPS.length - 1];
          const nextMsg = prev + 1;
          if (nextMsg >= step.messages.length) {
            setStepIndex((s) => Math.min(s + 1, STEPS.length - 1));
            setFade(true);
            return 0;
          }
          setFade(true);
          return nextMsg;
        });
      }, 200);
    }, 2800);

    return () => clearInterval(id);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  const currentStep = STEPS[Math.min(stepIndex, STEPS.length - 1)];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg)]/90 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-8 px-8 max-w-md w-full">

        {/* Animated spinner */}
        <div className="relative w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-[var(--border)]" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[var(--accent)] animate-spin" />
          <span className="text-3xl">{currentStep.icon}</span>
        </div>

        {/* Step label */}
        <div className="text-center space-y-2">
          <div className="text-base font-semibold text-[var(--fg)]">
            {currentStep.label}
          </div>
          <div
            className="text-sm text-[var(--muted)] min-h-[1.5rem] transition-opacity duration-200"
            style={{ opacity: fade ? 1 : 0 }}
          >
            {currentStep.messages[msgIndex]}
          </div>
        </div>

        {/* Step dots */}
        <div className="flex gap-2">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-2"
            >
              <div
                className="w-2 h-2 rounded-full transition-all duration-500"
                style={{
                  background: i <= stepIndex ? "var(--accent)" : "var(--border)",
                  transform: i === stepIndex ? "scale(1.4)" : "scale(1)",
                }}
              />
              {i < STEPS.length - 1 && (
                <div
                  className="w-6 h-0.5 transition-all duration-500"
                  style={{
                    background: i < stepIndex ? "var(--accent)" : "var(--border)",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Tip */}
        <div className="text-xs text-[var(--muted-light)] text-center bg-white border border-[var(--border)] rounded-lg px-4 py-3 max-w-sm">
          💡 <span className="font-medium text-[var(--muted)]">Pro tip:</span> Try asking &ldquo;What made the hook of Video A stronger?&rdquo; once loaded.
        </div>
      </div>
    </div>
  );
}
