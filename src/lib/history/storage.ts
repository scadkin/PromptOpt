import type { OptimizationMode } from "@/lib/types";

export interface HistoryEntry {
  id: string;
  input: string;
  output: string;
  mode: OptimizationMode;
  timestamp: number;
}

const STORAGE_KEY = "promptopt-history";
const MAX_ENTRIES = 50;

export function getHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export function addToHistory(entry: Omit<HistoryEntry, "id" | "timestamp">): HistoryEntry {
  const newEntry: HistoryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  const history = getHistory();
  history.unshift(newEntry);
  if (history.length > MAX_ENTRIES) history.length = MAX_ENTRIES;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return newEntry;
}

export function deleteFromHistory(id: string): void {
  const history = getHistory().filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
