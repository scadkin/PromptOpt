"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { OptimizationMode } from "@/lib/types";

export default function Home() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<OptimizationMode>("local");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleOptimize() {
    setLoading(true);
    setError("");
    setOutput("");
    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Optimization failed");
      setOutput(data.optimizedPrompt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (copied) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">PromptOpt</h1>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">
            Optimize your prompts for better AI results
          </p>
        </div>

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
          <div className="mt-1 flex justify-end">
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
            "Optimize"
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
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Optimized Prompt
              </span>
              <button
                onClick={handleCopy}
                className="rounded-md px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none p-4">
              <ReactMarkdown>{output}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
