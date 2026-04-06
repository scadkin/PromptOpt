"use client";

import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import type { OptimizationMode } from "@/lib/types";
import {
  getHistory,
  addToHistory,
  deleteFromHistory,
  clearHistory,
  type HistoryEntry,
} from "@/lib/history/storage";

// --- Diff helpers ---

interface DiffSegment {
  type: "same" | "added" | "removed";
  text: string;
}

function computeWordDiff(original: string, optimized: string): DiffSegment[] {
  const oldWords = original.split(/(\s+)/);
  const newWords = optimized.split(/(\s+)/);
  const segments: DiffSegment[] = [];
  const m = oldWords.length;
  const n = newWords.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const result: DiffSegment[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      result.unshift({ type: "same", text: oldWords[i - 1] }); i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: "added", text: newWords[j - 1] }); j--;
    } else {
      result.unshift({ type: "removed", text: oldWords[i - 1] }); i--;
    }
  }
  for (const seg of result) {
    if (segments.length > 0 && segments[segments.length - 1].type === seg.type)
      segments[segments.length - 1].text += seg.text;
    else segments.push({ ...seg });
  }
  return segments;
}

export default function Home() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<OptimizationMode>("local");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [originalInput, setOriginalInput] = useState("");

  useEffect(() => { setHistory(getHistory()); }, []);

  const handleOptimize = useCallback(async () => {
    if (loading || input.trim().length === 0) return;
    setLoading(true); setError(""); setOutput(""); setOriginalInput(input);
    try {
      const body: Record<string, string> = { prompt: input, mode };
      if (customInstructions.trim()) body.customInstructions = customInstructions.trim();
      const res = await fetch("/api/optimize", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Optimization failed");
      setOutput(data.optimizedPrompt);
      const entry = addToHistory({ input, output: data.optimizedPrompt, mode });
      setHistory((prev) => [entry, ...prev.slice(0, 49)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally { setLoading(false); }
  }, [input, mode, customInstructions, loading]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); handleOptimize(); }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleOptimize]);

  async function handleCopy() {
    if (copied) return;
    await navigator.clipboard.writeText(output);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  function loadFromHistory(entry: HistoryEntry) {
    setInput(entry.input); setOutput(entry.output); setOriginalInput(entry.input);
    setMode(entry.mode); setShowHistory(false);
  }

  function handleDeleteHistory(id: string) {
    deleteFromHistory(id); setHistory((prev) => prev.filter((e) => e.id !== id));
  }

  function handleClearHistory() { clearHistory(); setHistory([]); }

  const diffSegments = showDiff && output && originalInput ? computeWordDiff(originalInput, output) : null;

  return (
    <>
      {/* Aurora background */}
      <div className="aurora-bg">
        <div className="aurora-orb aurora-orb-1" />
        <div className="aurora-orb aurora-orb-2" />
        <div className="aurora-orb aurora-orb-3" />
      </div>

      {/* Noise texture */}
      <div className="noise-overlay" />

      <div className="relative z-10 flex flex-1 items-start justify-center px-4 py-14">
        <div className="w-full max-w-2xl space-y-7">

          {/* ===== HEADER ===== */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight">
                <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-orange-400 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                  PromptOpt
                </span>
              </h1>
              <p className="mt-1.5 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Transform rough ideas into powerful prompts
              </p>
            </div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="glass rounded-2xl px-4 py-2.5 text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ color: showHistory ? "var(--accent-text)" : "var(--text-secondary)" }}
            >
              <span className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {history.length > 0 ? `${history.length}` : "History"}
              </span>
            </button>
          </div>

          {/* ===== HISTORY ===== */}
          {showHistory && (
            <div className="animate-slide-down glass rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <span className="text-[11px] font-bold uppercase tracking-[0.15em] bg-gradient-to-r from-sky-400 to-orange-400 bg-clip-text text-transparent">
                  Recent Prompts
                </span>
                {history.length > 0 && (
                  <button onClick={handleClearHistory} className="text-xs font-medium transition-colors duration-150 text-[var(--text-tertiary)] hover:text-rose-400">
                    Clear all
                  </button>
                )}
              </div>
              {history.length === 0 ? (
                <p className="p-5 text-sm" style={{ color: "var(--text-tertiary)" }}>No history yet.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {history.map((entry) => (
                    <div key={entry.id} className="group flex items-center gap-3 px-5 py-3 transition-all duration-150 hover:bg-[var(--accent-subtle)]" style={{ borderBottom: "1px solid var(--border)" }}>
                      <button onClick={() => loadFromHistory(entry)} className="flex-1 text-left">
                        <p className="truncate text-sm font-medium" style={{ color: "var(--foreground)" }}>{entry.input}</p>
                        <p className="mt-0.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="inline-block h-2 w-2 rounded-full" style={{ background: entry.mode === "local" ? "linear-gradient(135deg, #0ea5e9, #06b6d4)" : "linear-gradient(135deg, #f97316, #ef4444)" }} />
                            {entry.mode}
                          </span>
                          {" · "}{new Date(entry.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </p>
                      </button>
                      <button onClick={() => handleDeleteHistory(entry.id)} className="shrink-0 rounded-xl p-2 text-[var(--text-tertiary)] opacity-0 transition-all duration-150 hover:bg-rose-500/10 hover:text-rose-400 group-hover:opacity-100" title="Delete">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== MODE TOGGLE ===== */}
          <div className="glass flex gap-2 rounded-2xl p-2">
            <button
              onClick={() => setMode("local")}
              className={`flex-1 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all duration-250 ${
                mode === "local"
                  ? "bg-gradient-to-r from-sky-600/20 via-cyan-600/15 to-sky-600/10 text-sky-300 shadow-lg shadow-sky-500/10"
                  : "text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--accent-subtle)]"
              }`}
            >
              <span className="flex items-center justify-center gap-2.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                Local
                <span className="text-[10px] font-bold rounded-full px-2 py-0.5 bg-sky-500/10 text-sky-400/70">FAST</span>
              </span>
            </button>
            <button
              onClick={() => setMode("gemini")}
              className={`flex-1 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all duration-250 ${
                mode === "gemini"
                  ? "bg-gradient-to-r from-orange-600/20 via-amber-600/15 to-orange-600/10 text-orange-300 shadow-lg shadow-orange-500/10"
                  : "text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--accent-subtle)]"
              }`}
            >
              <span className="flex items-center justify-center gap-2.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
                </svg>
                Gemini
                <span className="text-[10px] font-bold rounded-full px-2 py-0.5 bg-orange-500/10 text-orange-400/70">AI</span>
              </span>
            </button>
          </div>

          {/* ===== INPUT ===== */}
          <div>
            <div className="glow-border">
              <div className="rounded-[calc(1.25rem-1.5px)] bg-[var(--surface-solid)]">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  maxLength={50000}
                  placeholder="Type or paste your rough prompt here..."
                  className="w-full min-h-[260px] resize-y rounded-[calc(1.25rem-1.5px)] border-0 bg-transparent p-6 font-mono text-sm leading-relaxed transition-all duration-200 placeholder:text-[var(--text-tertiary)] focus:outline-none"
                  style={{ color: "var(--foreground)" }}
                />
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between px-2">
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="text-xs font-medium transition-all duration-150 hover:scale-105"
                style={{ color: showInstructions || customInstructions.trim() ? "var(--accent-text)" : "var(--text-tertiary)" }}
              >
                {customInstructions.trim() ? "✦ Custom instructions active" : "+ Custom instructions"}
              </button>
              <span className="text-xs tabular-nums font-medium" style={{ color: input.length > 45000 ? "#f43f5e" : input.length > 40000 ? "#f59e0b" : "var(--text-tertiary)" }}>
                {input.length.toLocaleString()} / 50,000
              </span>
            </div>
          </div>

          {/* ===== CUSTOM INSTRUCTIONS ===== */}
          {showInstructions && (
            <div className="animate-slide-down">
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                maxLength={500}
                placeholder='e.g., "This is for a coding task in Python" or "Optimize for Claude"'
                className="glass w-full min-h-[80px] resize-y rounded-2xl p-4 text-sm leading-relaxed transition-all duration-200 placeholder:text-[var(--text-tertiary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30"
                style={{ color: "var(--foreground)" }}
              />
              <p className="mt-1.5 px-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                Additional context for the optimization.
              </p>
            </div>
          )}

          {/* ===== OPTIMIZE BUTTON ===== */}
          <button
            onClick={handleOptimize}
            disabled={loading || input.trim().length === 0}
            className="btn-glow w-full rounded-2xl bg-gradient-to-r from-sky-600 via-cyan-500 to-orange-500 px-6 py-4.5 text-base font-bold text-white shadow-xl shadow-sky-500/25 transition-all duration-250 hover:shadow-2xl hover:shadow-sky-500/40 hover:scale-[1.01] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none disabled:hover:scale-100 animate-gradient bg-[length:200%_auto]"
          >
            {loading ? (
              <span className="inline-flex items-center gap-3">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                <span>Optimizing...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2.5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
                </svg>
                Optimize
                <span className="text-sm text-white/30 font-medium">⌘↵</span>
              </span>
            )}
          </button>

          {/* ===== ERROR ===== */}
          {error && (
            <div className="animate-fade-in glass rounded-2xl border-rose-500/20 px-5 py-3">
              <p className="text-sm font-medium text-rose-400">{error}</p>
            </div>
          )}

          {/* ===== OUTPUT ===== */}
          {output && (
            <div className="animate-fade-in glow-border">
              <div className="rounded-[calc(1.25rem-1.5px)] bg-[var(--surface-solid)]">
                <div className="flex items-center justify-between px-6 py-3.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-[0.15em] bg-gradient-to-r from-sky-400 via-cyan-300 to-orange-400 bg-clip-text text-transparent">
                      Optimized
                    </span>
                    <button
                      onClick={() => setShowDiff(!showDiff)}
                      className={`rounded-xl px-3 py-1 text-xs font-semibold transition-all duration-150 ${
                        showDiff
                          ? "bg-gradient-to-r from-sky-500/15 to-cyan-500/15 text-sky-300"
                          : "text-[var(--text-tertiary)] hover:text-[var(--accent-text)] hover:bg-[var(--accent-subtle)]"
                      }`}
                    >
                      Diff
                    </button>
                  </div>
                  <button
                    onClick={handleCopy}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95 ${
                      copied
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "text-[var(--text-tertiary)] hover:text-[var(--accent-text)] hover:bg-[var(--accent-subtle)]"
                    }`}
                  >
                    {copied ? (
                      <span className="flex items-center gap-1.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        Copied!
                      </span>
                    ) : "Copy"}
                  </button>
                </div>

                {showDiff && diffSegments ? (
                  <div className="p-6 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                    {diffSegments.map((seg, idx) => {
                      if (seg.type === "removed") return <span key={idx} className="rounded bg-rose-500/10 text-rose-400 line-through decoration-rose-400/50">{seg.text}</span>;
                      if (seg.type === "added") return <span key={idx} className="rounded bg-emerald-500/10 text-emerald-400">{seg.text}</span>;
                      return <span key={idx}>{seg.text}</span>;
                    })}
                  </div>
                ) : (
                  <div className="markdown-output p-6 text-sm">
                    <ReactMarkdown>{output}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
