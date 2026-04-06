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

  // Simple LCS-based diff on words
  const m = oldWords.length;
  const n = newWords.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff
  const result: DiffSegment[] = [];
  let i = m,
    j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      result.unshift({ type: "same", text: oldWords[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: "added", text: newWords[j - 1] });
      j--;
    } else {
      result.unshift({ type: "removed", text: oldWords[i - 1] });
      i--;
    }
  }

  // Merge adjacent segments of the same type
  for (const seg of result) {
    if (segments.length > 0 && segments[segments.length - 1].type === seg.type) {
      segments[segments.length - 1].text += seg.text;
    } else {
      segments.push({ ...seg });
    }
  }

  return segments;
}

// --- Main component ---

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

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleOptimize = useCallback(async () => {
    if (loading || input.trim().length === 0) return;
    setLoading(true);
    setError("");
    setOutput("");
    setOriginalInput(input);
    try {
      const body: Record<string, string> = { prompt: input, mode };
      if (customInstructions.trim()) {
        body.customInstructions = customInstructions.trim();
      }
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Optimization failed");
      setOutput(data.optimizedPrompt);
      const entry = addToHistory({
        input,
        output: data.optimizedPrompt,
        mode,
      });
      setHistory((prev) => [entry, ...prev.slice(0, 49)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [input, mode, customInstructions, loading]);

  // Cmd+Enter / Ctrl+Enter to optimize
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleOptimize();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleOptimize]);

  async function handleCopy() {
    if (copied) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function loadFromHistory(entry: HistoryEntry) {
    setInput(entry.input);
    setOutput(entry.output);
    setOriginalInput(entry.input);
    setMode(entry.mode);
    setShowHistory(false);
  }

  function handleDeleteHistory(id: string) {
    deleteFromHistory(id);
    setHistory((prev) => prev.filter((e) => e.id !== id));
  }

  function handleClearHistory() {
    clearHistory();
    setHistory([]);
  }

  const diffSegments =
    showDiff && output && originalInput
      ? computeWordDiff(originalInput, output)
      : null;

  return (
    <div className="flex flex-1 items-start justify-center px-4 py-8">
      <div className="w-full max-w-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">PromptOpt</h1>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">
              Optimize your prompts for better AI results
            </p>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              showHistory
                ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
                : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            History{history.length > 0 ? ` (${history.length})` : ""}
          </button>
        </div>

        {/* History Panel */}
        {showHistory && (
          <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-700">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Recent Prompts
              </span>
              {history.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-red-500 hover:text-red-600 dark:text-red-400"
                >
                  Clear all
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="p-4 text-sm text-zinc-400 dark:text-zinc-500">
                No history yet. Optimize a prompt to get started.
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="group flex items-center gap-2 border-b border-zinc-100 px-4 py-2.5 last:border-b-0 dark:border-zinc-800"
                  >
                    <button
                      onClick={() => loadFromHistory(entry)}
                      className="flex-1 text-left"
                    >
                      <p className="truncate text-sm text-zinc-700 dark:text-zinc-300">
                        {entry.input}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                        {entry.mode} &middot;{" "}
                        {new Date(entry.timestamp).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </button>
                    <button
                      onClick={() => handleDeleteHistory(entry.id)}
                      className="shrink-0 rounded p-1 text-zinc-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                      title="Delete"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mode Toggle */}
        <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
          <button
            onClick={() => setMode("local")}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              mode === "local"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            Local
            <span className="ml-1.5 text-xs text-zinc-400 dark:text-zinc-500">
              instant
            </span>
          </button>
          <button
            onClick={() => setMode("gemini")}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              mode === "gemini"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            Gemini
            <span className="ml-1.5 text-xs text-zinc-400 dark:text-zinc-500">
              AI
            </span>
          </button>
        </div>

        {/* Input */}
        <div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={50000}
            placeholder="Paste your prompt here..."
            className="w-full min-h-[200px] resize-y rounded-lg border border-zinc-200 bg-white p-4 font-mono text-sm leading-relaxed placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder:text-zinc-600 dark:focus:border-zinc-500"
          />
          <div className="mt-1 flex items-center justify-between">
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className={`text-xs transition-colors ${
                showInstructions || customInstructions.trim()
                  ? "font-medium text-zinc-700 dark:text-zinc-300"
                  : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-400"
              }`}
            >
              {customInstructions.trim() ? "Custom instructions active" : "+ Custom instructions"}
            </button>
            <span
              className={`text-xs ${
                input.length > 45000
                  ? "text-red-500"
                  : input.length > 40000
                    ? "text-amber-500"
                    : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              {input.length.toLocaleString()} / 50,000
            </span>
          </div>
        </div>

        {/* Custom Instructions */}
        {showInstructions && (
          <div>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              maxLength={500}
              placeholder='e.g., "This is for a coding task in Python" or "Optimize for Claude" or "Keep it under 200 words"'
              className="w-full min-h-[80px] resize-y rounded-lg border border-zinc-200 bg-white p-3 text-sm leading-relaxed placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder:text-zinc-600 dark:focus:border-zinc-500"
            />
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              Additional context to guide the optimization. Used by both modes.
            </p>
          </div>
        )}

        {/* Optimize Button */}
        <button
          onClick={handleOptimize}
          disabled={loading || input.trim().length === 0}
          className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Optimizing...
            </span>
          ) : (
            <>
              Optimize
              <span className="ml-2 text-xs opacity-50">⌘↵</span>
            </>
          )}
        </button>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {/* Output */}
        {output && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Optimized Prompt
                </span>
                <button
                  onClick={() => setShowDiff(!showDiff)}
                  className={`rounded px-2 py-0.5 text-xs transition-colors ${
                    showDiff
                      ? "bg-zinc-200 font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                      : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-400"
                  }`}
                >
                  Diff
                </button>
              </div>
              <button
                onClick={handleCopy}
                className="rounded-md px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            {showDiff && diffSegments ? (
              <div className="p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                {diffSegments.map((seg, i) => {
                  if (seg.type === "removed") {
                    return (
                      <span
                        key={i}
                        className="bg-red-100 text-red-700 line-through dark:bg-red-900/30 dark:text-red-400"
                      >
                        {seg.text}
                      </span>
                    );
                  }
                  if (seg.type === "added") {
                    return (
                      <span
                        key={i}
                        className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      >
                        {seg.text}
                      </span>
                    );
                  }
                  return <span key={i}>{seg.text}</span>;
                })}
              </div>
            ) : (
              <div className="markdown-output p-4 text-sm">
                <ReactMarkdown>{output}</ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
