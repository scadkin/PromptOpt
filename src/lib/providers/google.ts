import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY ?? "");

export async function optimizeWithGemini(prompt: string): Promise<string> {
  // TODO: Implement prompt optimization with Gemini
  void prompt;
  void genAI;
  throw new Error("Not implemented");
}
