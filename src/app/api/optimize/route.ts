import { NextRequest, NextResponse } from "next/server";
import { optimizeLocal } from "@/lib/optimize/local";
import { optimizeWithGemini } from "@/lib/providers/google";
import { checkRateLimit } from "@/lib/rate-limit";
import type { OptimizationMode } from "@/lib/types";

const VALID_MODES: Set<OptimizationMode> = new Set(["local", "gemini"]);

const SAFE_ERROR_FRAGMENTS = [
  "Rate limit exceeded",
  "Request timed out",
  "Gemini returned an empty response",
  "not configured",
];

export async function POST(request: NextRequest) {
  const rateCheck = checkRateLimit();
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rateCheck.retryAfterMs || 1000) / 1000)) },
      }
    );
  }

  try {
    const body = await request.json();
    const { prompt, mode, customInstructions } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    if (prompt.length > 50000) {
      return NextResponse.json(
        { error: "Prompt is too long (max 50,000 characters)" },
        { status: 400 }
      );
    }

    if (!VALID_MODES.has(mode)) {
      return NextResponse.json(
        { error: "Invalid optimization mode" },
        { status: 400 }
      );
    }

    const instructions = typeof customInstructions === "string"
      ? customInstructions.trim().slice(0, 500)
      : undefined;

    let optimizedPrompt: string;

    if (mode === "local") {
      optimizedPrompt = optimizeLocal(prompt, instructions);
    } else {
      optimizedPrompt = await optimizeWithGemini(prompt, instructions);
    }

    return NextResponse.json({ optimizedPrompt });
  } catch (error: unknown) {
    console.error("Optimization error:", error);

    let message = "Optimization failed. Please try again.";
    if (error instanceof Error) {
      const isSafe = SAFE_ERROR_FRAGMENTS.some((f) => error.message.includes(f));
      if (isSafe) message = error.message;
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
