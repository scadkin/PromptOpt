import { NextRequest, NextResponse } from "next/server";
import { optimizeLocal } from "@/lib/optimize/local";
import { optimizeWithGemini } from "@/lib/providers/google";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, mode } = body;

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

    if (mode !== "local" && mode !== "gemini") {
      return NextResponse.json(
        { error: "Mode must be 'local' or 'gemini'" },
        { status: 400 }
      );
    }

    let optimizedPrompt: string;

    if (mode === "local") {
      optimizedPrompt = optimizeLocal(prompt);
    } else {
      optimizedPrompt = await optimizeWithGemini(prompt);
    }

    return NextResponse.json({ optimizedPrompt });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Optimization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
