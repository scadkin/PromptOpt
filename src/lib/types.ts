export type OptimizationMode = "local" | "gemini";

export interface OptimizeRequest {
  prompt: string;
  mode: OptimizationMode;
}

export interface OptimizeResponse {
  optimizedPrompt: string;
}

export interface OptimizeErrorResponse {
  error: string;
}
