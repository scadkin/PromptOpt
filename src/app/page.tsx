"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  const [loadingPhase, setLoadingPhase] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const phaseLabels = ["Analyzing structure...", "Rewriting for clarity...", "Polishing output..."];

  useEffect(() => { setHistory(getHistory()); }, []);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0';
    el.style.height = Math.min(Math.max(el.scrollHeight, 120), 400) + 'px';
  }, [input]);

  // Loading phase cycling
  useEffect(() => {
    if (!loading) { setLoadingPhase(0); return; }
    const interval = setInterval(() => {
      setLoadingPhase(p => (p + 1) % 3);
    }, 2000);
    return () => clearInterval(interval);
  }, [loading]);

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

  const hasInput = input.trim().length > 0;

  return (
    <>
      {/* Grain texture */}
      <div className="grain-overlay" />

      <div className="relative z-10 min-h-[100dvh] px-4 py-8 md:py-10 flex justify-center md:justify-start">
        <div className="w-full max-w-2xl md:ml-[8vw] lg:ml-[12vw] space-y-0">

          {/* ===== TAPE DECK CASING (from 3010) ===== */}
          <div className="tape-casing">
            {/* Screw holes */}
            <div className="screw-hole" style={{ top: 14, left: 14 }} />
            <div className="screw-hole" style={{ top: 14, right: 14 }} />
            <div className="screw-hole" style={{ bottom: 14, left: 14 }} />
            <div className="screw-hole" style={{ bottom: 14, right: 14 }} />

            {/* Grip texture -- left side */}
            <div className="grip-texture grip-texture-left">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={`gl-${i}`} className="grip-line" />
              ))}
            </div>

            {/* Grip texture -- right side */}
            <div className="grip-texture grip-texture-right">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={`gr-${i}`} className="grip-line" />
              ))}
            </div>

            {/* Top trim band */}
            <div className="trim-band trim-band-top" />

            {/* ===== HEADER AREA (from 3011 typography on 3010 cream casing) ===== */}
            <div className="px-8 pt-5 pb-3 md:px-10">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="engraved-title text-3xl md:text-4xl">
                    PROMPTOPT
                  </h1>
                  <p
                    className="engraved mt-1.5"
                    style={{ fontSize: "8px", letterSpacing: "0.2em" }}
                  >
                    Prompt Optimization Instrument
                  </p>
                </div>

                {/* History counter as LCD display (from 3010) */}
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="lcd-display mt-1 transition-all duration-150 hover:brightness-110"
                  style={{
                    cursor: 'pointer',
                    border: showHistory ? '1px solid rgba(90,154,90,0.3)' : '1px solid transparent',
                  }}
                >
                  {history.length > 0 ? `RCL ${String(history.length).padStart(2, '0')}` : "RCL --"}
                </button>
              </div>
            </div>

            {/* ===== RECESSED DARK PANEL ===== */}
            <div className="mx-4 md:mx-6 mb-4">
              <div className="recessed-panel overflow-hidden px-5 py-4 space-y-4">

                {/* Signal LEDs row (from 3012) */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className={`led ${hasInput ? "led-green" : "led-off"}`} />
                    <span className="channel-label" style={{ fontSize: "8px" }}>SIG</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`led ${loading ? "led-red" : "led-off"}`} />
                    <span className="channel-label" style={{ fontSize: "8px" }}>PROC</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`led ${output ? "led-amber" : "led-off"}`} />
                    <span className="channel-label" style={{ fontSize: "8px" }}>OUT</span>
                  </div>
                  <div className="groove flex-1" />
                </div>

                {/* CH 1: MODE SELECT (from 3012) */}
                <div>
                  <div className="channel-label mb-2">Ch 1: Mode Select</div>
                  <div className="flex gap-0">
                    <button
                      onClick={() => setMode("local")}
                      className={`fader-btn flex-1 rounded-l-lg ${mode === "local" ? "fader-btn-active" : "fader-btn-inactive"}`}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                        </svg>
                        Local
                        {mode === "local" && (
                          <span className="led led-green inline-block" style={{ width: 5, height: 5 }} />
                        )}
                      </span>
                    </button>
                    <button
                      onClick={() => setMode("gemini")}
                      className={`fader-btn flex-1 rounded-r-lg ${mode === "gemini" ? "fader-btn-active" : "fader-btn-inactive"}`}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
                        </svg>
                        Gemini
                        {mode === "gemini" && (
                          <span className="led led-amber inline-block" style={{ width: 5, height: 5 }} />
                        )}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="groove" />

                {/* CH 2: INPUT (from 3012 label style) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="channel-label">Ch 2: Input</div>
                    <span
                      className="font-mono text-[10px] tabular-nums font-bold"
                      style={{
                        color: input.length > 45000 ? '#c25a38' : input.length > 40000 ? '#d4a026' : '#5a5448',
                      }}
                    >
                      {input.length.toLocaleString()} / 50,000
                    </span>
                  </div>

                  {/* Textarea */}
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    maxLength={50000}
                    placeholder="Type or paste your rough prompt here..."
                    className="tape-input rounded"
                  />

                  {/* Custom instructions toggle */}
                  <div className="flex items-center justify-between mt-2">
                    <button
                      onClick={() => setShowInstructions(!showInstructions)}
                      className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] transition-colors duration-150"
                      style={{
                        color: showInstructions || customInstructions.trim() ? '#c25a38' : '#5a5448',
                      }}
                    >
                      {customInstructions.trim() ? "* Custom instr. active" : "+ Custom instructions"}
                    </button>
                  </div>

                  {/* Example prompt chips */}
                  {input.trim().length === 0 && !output && (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {[
                        "make me a website that sells shoes and looks good",
                        "write a python script that does web scraping",
                        "explain how machine learning works to my boss",
                      ].map((example) => (
                        <button
                          key={example}
                          onClick={() => setInput(example)}
                          className="patch-chip"
                        >
                          &ldquo;{example}&rdquo;
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Custom instructions (inside recessed panel) */}
                {showInstructions && (
                  <div className="animate-slide-down">
                    <div className="section-divider mb-2">
                      <span className="panel-label-dark">Custom Instructions</span>
                    </div>
                    <textarea
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      maxLength={500}
                      placeholder='e.g., "This is for a coding task in Python" or "Optimize for Claude"'
                      className="tape-input rounded"
                      style={{
                        minHeight: '72px',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '4px',
                        border: '1px solid rgba(92,90,74,0.15)',
                        padding: '12px 16px',
                      }}
                    />
                    <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em]" style={{ color: '#5a5448' }}>
                      Additional context for the optimization.
                    </p>
                  </div>
                )}

                <div className="groove" />

                {/* CH 3: PROCESS (from 3012) */}
                <div>
                  <div className="channel-label mb-2">Ch 3: Process</div>

                  {/* VU meter bar -- visible during processing (from 3012) */}
                  {loading && (
                    <div className="vu-meter-track mb-3">
                      <div className="vu-meter-fill" />
                    </div>
                  )}

                  {/* THE OPTIMIZE BUTTON (from 3012 terracotta concave style) */}
                  <button
                    onClick={handleOptimize}
                    disabled={loading || input.trim().length === 0}
                    className="optimize-btn w-full"
                  >
                    {loading ? (
                      <span className="inline-flex items-center gap-3">
                        <span
                          className="inline-block h-4 w-4 rounded-full border-2"
                          style={{
                            borderColor: 'rgba(240,232,220,0.2)',
                            borderTopColor: 'rgba(240,232,220,0.8)',
                            animation: 'spin 0.8s linear infinite',
                          }}
                        />
                        <span>{phaseLabels[loadingPhase]}</span>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-3">
                        Optimize
                        <span
                          className="font-mono text-[10px] font-medium tracking-normal"
                          style={{ color: 'rgba(240,232,220,0.35)' }}
                        >
                          Cmd+Enter
                        </span>
                      </span>
                    )}
                  </button>
                </div>

                {/* ===== ERROR ===== */}
                {error && (
                  <div className="animate-fade-in">
                    <div
                      className="rounded px-4 py-2.5 font-mono text-xs font-bold"
                      style={{
                        background: 'rgba(168, 74, 44, 0.1)',
                        border: '1px solid rgba(168, 74, 44, 0.3)',
                        color: '#c25a38',
                      }}
                    >
                      ERR: {error}
                    </div>
                  </div>
                )}

                {/* Groove before output */}
                {output && <div className="groove" />}

                {/* ===== CH 4: OUTPUT (from 3012 style) ===== */}
                {output && (
                  <div className="animate-fade-in">
                    <div className="flex items-center justify-between mb-2">
                      <div className="channel-label flex items-center gap-2">
                        Ch 4: Output
                        <span className="led led-amber" />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowDiff(!showDiff)}
                          className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] rounded px-2.5 py-1 transition-all duration-150"
                          style={{
                            color: showDiff ? '#c25a38' : '#5a5448',
                            background: showDiff ? 'rgba(168,74,44,0.1)' : 'transparent',
                            border: showDiff ? '1px solid rgba(168,74,44,0.2)' : '1px solid transparent',
                          }}
                        >
                          Diff
                        </button>
                        <button
                          onClick={handleCopy}
                          className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] rounded px-2.5 py-1 transition-all duration-150"
                          style={{
                            color: copied ? '#5a9a5a' : '#5a5448',
                            background: copied ? 'rgba(90,154,90,0.1)' : 'transparent',
                          }}
                        >
                          {copied ? (
                            <span className="flex items-center gap-1.5">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                              Copied
                            </span>
                          ) : "Copy"}
                        </button>
                      </div>
                    </div>

                    {/* Output content area */}
                    <div
                      className="rounded overflow-hidden"
                      style={{
                        background: 'rgba(0,0,0,0.12)',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
                      }}
                    >
                      {showDiff && diffSegments ? (
                        <div className="p-5 font-mono text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: '#3a3630' }}>
                          {diffSegments.map((seg, idx) => {
                            if (seg.type === "removed") return <span key={idx} style={{ background: 'rgba(168,74,44,0.15)', color: '#c25a38', textDecoration: 'line-through', textDecorationColor: 'rgba(194,90,56,0.4)' }}>{seg.text}</span>;
                            if (seg.type === "added") return <span key={idx} style={{ background: 'rgba(90,154,90,0.15)', color: '#5a9a5a' }}>{seg.text}</span>;
                            return <span key={idx}>{seg.text}</span>;
                          })}
                        </div>
                      ) : (
                        <div className="markdown-output p-5 text-sm">
                          <ReactMarkdown>{output}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* ===== FOOTER (from 3011 model plate typography) ===== */}
            <div className="px-8 md:px-10 pb-2 pt-1">
              <div className="groove-on-cream mb-2" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="led-pwr" />
                  <span className="model-plate" style={{ fontSize: '7px', letterSpacing: '0.12em' }}>Pwr</span>
                </div>
                <p className="model-plate">
                  PromptOpt PO-1.0 | Serial: 001 | Cal: 2026
                </p>
              </div>
            </div>

            {/* Bottom trim band */}
            <div className="trim-band trim-band-bottom" />
          </div>

          {/* Device feet (from 3010) */}
          <div className="device-feet">
            <div className="device-foot" />
            <div className="device-foot" />
            <div className="device-foot" />
            <div className="device-foot" />
          </div>

          {/* ===== HISTORY (below the casing, from 3010 layout) ===== */}
          {showHistory && (
            <div className="animate-slide-down tape-casing overflow-hidden mt-4">
              <div className="trim-band trim-band-top" />
              <div
                className="flex items-center justify-between px-6 py-3"
                style={{ borderBottom: '1px solid rgba(92,90,74,0.2)' }}
              >
                <span className="engraved" style={{ color: '#5c5a4a' }}>Recent Prompts</span>
                {history.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] transition-colors duration-150"
                    style={{ color: '#8a8274' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#c25a38'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#8a8274'; }}
                  >
                    Clear All
                  </button>
                )}
              </div>
              {history.length === 0 ? (
                <p className="p-5 font-mono text-xs" style={{ color: '#8a8274' }}>No history yet.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="group flex items-center gap-3 px-6 py-3 transition-all duration-150"
                      style={{ borderBottom: '1px solid rgba(92,90,74,0.15)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(200,191,174,0.3)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <button onClick={() => loadFromHistory(entry)} className="flex-1 text-left">
                        <p className="truncate text-sm font-medium" style={{ color: '#2a2620' }}>{entry.input}</p>
                        <p className="mt-0.5 text-[10px] font-mono" style={{ color: '#8a8274' }}>
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{
                                background: entry.mode === "local" ? '#5c5a4a' : '#a84a2c',
                              }}
                            />
                            {entry.mode}
                          </span>
                          {" / "}
                          {new Date(entry.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </p>
                      </button>
                      <button
                        onClick={() => handleDeleteHistory(entry.id)}
                        className="shrink-0 rounded p-1.5 opacity-0 transition-all duration-150 group-hover:opacity-100"
                        style={{ color: '#8a8274' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#c25a38'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#8a8274'; }}
                        title="Delete"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="trim-band trim-band-bottom" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
