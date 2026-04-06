import { GoogleGenerativeAI } from "@google/generative-ai";
import { OPTIMIZE_SYSTEM_PROMPT } from "../optimize/system-prompt";

const TIMEOUT_MS = 15_000;

export async function optimizeWithGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    throw new Error(
      "Gemini API key not configured. Use local mode or check your environment setup."
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: OPTIMIZE_SYSTEM_PROMPT,
  });

  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out. Please try again or use local mode.")), TIMEOUT_MS)
    );
    const result = await Promise.race([model.generateContent(prompt), timeout]);
    const text = result.response.text();
    if (!text) {
      throw new Error("Gemini returned an empty response");
    }
    return text.trim();
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes("timed out")) throw error;
      if (error.message.includes("429") || error.message.includes("RESOURCE_EXHAUSTED")) {
        throw new Error("Rate limit exceeded. Please wait a moment and try again, or use local mode.");
      }
    }
    throw error;
  }
}
