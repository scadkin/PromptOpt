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

// Pipeline order matters:
// 1. Normalize whitespace/quotes first
// 2. Clean up filler words while text is still flat
// 3. Structure into sections
// 4. Extract constraints from structured text
// 5. Add output format based on prompt type
// 6. Add context placeholders
// 7. Infer role (scans full text including headers)
// 8. Flag conflicts/ambiguity last (analyzes the final prompt)
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

export function optimizeLocal(prompt: string): string {
  const normalized = trimAndNormalize(prompt);
  let result = normalized;

  for (const transform of transforms) {
    result = transform(result);
  }

  // If nothing changed, wrap with a Task header so the user gets something back
  if (result === normalized) {
    result = `## Task\n${normalized}`;
  }

  return result;
}
