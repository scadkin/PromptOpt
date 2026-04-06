import {
  trimAndNormalize,
  inferRole,
  structurePrompt,
  extractConstraints,
  addOutputFormatHint,
  cleanUpLanguage,
  addContextPlaceholders,
  flagConflictsAndAmbiguity,
} from "./transforms";

const transforms = [
  trimAndNormalize,
  cleanUpLanguage,
  structurePrompt,
  extractConstraints,
  addOutputFormatHint,
  addContextPlaceholders,
  inferRole,
  flagConflictsAndAmbiguity,
];

export function optimizeLocal(prompt: string, customInstructions?: string): string {
  let result = prompt;

  for (const transform of transforms) {
    result = transform(result);
  }

  // If nothing changed and prompt is long enough, add minimal structure
  const normalized = trimAndNormalize(prompt);
  if (result === normalized) {
    if (normalized.length >= 80) {
      result = `## Task\n${normalized}`;
    }
  }

  // Append custom instructions as a note section
  if (customInstructions) {
    result += `\n\n## Additional Instructions\n${customInstructions}`;
  }

  return result;
}
