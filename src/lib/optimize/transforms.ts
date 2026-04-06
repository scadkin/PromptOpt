// Each transform is a pure function: (prompt: string) => string
// They run in sequence, each receiving the output of the previous one.

const ABBREVIATIONS = /(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|e\.g|i\.e|etc|approx|dept|govt)\./gi;

// --- Helpers ---

function splitSentences(text: string): string[] {
  const placeholders: string[] = [];
  const working = text.replace(ABBREVIATIONS, (match) => {
    placeholders.push(match);
    return `__ABBR${placeholders.length - 1}__`;
  });

  const sentences = working
    .split(/(?<=\.)\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return sentences.map((s) =>
    s.replace(/__ABBR(\d+)__/g, (_, i) => placeholders[parseInt(i)])
  );
}

function isQuestion(text: string): boolean {
  return /\?\s*$/.test(text.trim()) ||
    /\b(how (?:do|can|should|would)|is there a way|what (?:is|are|should)|can I|could you|where (?:do|can|should)|why (?:does|is)|when should)\b/i.test(text);
}

function hasStructure(text: string): boolean {
  return /^#{1,3}\s/m.test(text) ||
    /^[-*]\s/m.test(text) ||
    /^\d+\.\s/m.test(text) ||
    text.includes("\n\n");
}

// --- Domain keyword maps for role inference ---
// More specific patterns first, generic ones last

const ROLE_KEYWORD_MAP: [RegExp, string][] = [
  [/\b(claude code)\b/i, "You are an expert in Claude Code configuration and AI-assisted development workflows."],
  [/\b(claude|anthropic)\b/i, "You are an expert in AI tools and prompt engineering."],
  [/\b(react|next\.?js|vue|angular|svelte|frontend|tailwind|component)\b/i, "You are a senior frontend developer."],
  [/\b(node\.?js|express|fastapi|django|flask|backend|server|api endpoint|rest api|graphql)\b/i, "You are a senior backend developer."],
  [/\b(python|pip|pandas|numpy|jupyter)\b/i, "You are an expert Python developer."],
  [/\b(typescript|javascript|npm|yarn|eslint)\b/i, "You are an expert TypeScript/JavaScript developer."],
  [/\b(rust|cargo|crate)\b/i, "You are an expert Rust developer."],
  [/\b(go|golang|goroutine)\b/i, "You are an expert Go developer."],
  [/\b(swift|swiftui|xcode|ios)\b/i, "You are a senior iOS/Swift developer."],
  [/\b(kotlin|android|gradle)\b/i, "You are a senior Android/Kotlin developer."],
  [/\b(sql|database|postgres|mysql|sqlite|mongodb|redis)\b/i, "You are a database and data modeling expert."],
  [/\b(docker|kubernetes|k8s|ci\/cd|deploy|aws|gcp|azure|terraform|infra)\b/i, "You are a DevOps and infrastructure expert."],
  [/\b(git\b|branch|merge|commit|pull request|pr\b|repo)\b/i, "You are an expert in Git workflows and version control."],
  [/\b(test|testing|jest|pytest|unittest|spec|tdd)\b/i, "You are a software testing expert."],
  [/\b(security|auth\b|authentication|oauth|jwt|encryption|vulnerability)\b/i, "You are a security engineer."],
  [/\b(data science|machine learning|ml model|training|dataset)\b/i, "You are a data science and machine learning expert."],
  [/\b(marketing|seo|content strategy|brand|campaign)\b/i, "You are a marketing and content strategy expert."],
  [/\b(writing|essay|article|blog post|story|narrative)\b/i, "You are an expert writer and editor."],
  [/\b(email|outreach|cold email|follow.up|subject line)\b/i, "You are an expert in professional communication."],
  [/\b(prompt|llm|ai assistant|chatgpt|gpt|gemini)\b/i, "You are an expert in AI tools and prompt engineering."],
];

// --- Transforms ---

export function trimAndNormalize(prompt: string): string {
  return prompt
    .trim()
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/\u2014/g, " - ")
    .replace(/\u2013/g, "-")
    .replace(/ {2,}/g, " ");
}

export function inferRole(prompt: string): string {
  if (prompt.length < 40) return prompt;

  // Check the raw text content, ignoring markdown headers
  const textContent = prompt.replace(/^#{1,3}\s+.*$/gm, "").trim();
  const firstNonHeaderLine = prompt.split("\n").find((l) => !l.startsWith("#"))?.trim() ?? "";

  const EXISTING_ROLE = [
    /^you are\b/i,
    /^act as\b/i,
    /^as an?\b/i,
    /^imagine you'?re\b/i,
    /^you'?re an?\b/i,
    /^take (?:on )?the role\b/i,
    /^play the role\b/i,
  ];
  if (EXISTING_ROLE.some((p) => p.test(firstNonHeaderLine))) return prompt;

  // Score all matching roles and pick the best one
  const matches: { role: string; score: number; index: number }[] = [];
  for (let i = 0; i < ROLE_KEYWORD_MAP.length; i++) {
    const [pattern, role] = ROLE_KEYWORD_MAP[i];
    const hits = textContent.match(new RegExp(pattern, "gi"));
    if (hits) {
      matches.push({ role, score: hits.length, index: i });
    }
  }
  if (matches.length > 0) {
    // Most keyword hits wins; on tie, prefer earlier (more specific) entries
    matches.sort((a, b) => b.score - a.score || a.index - b.index);
    return `${matches[0].role}\n\n${prompt}`;
  }

  return prompt;
}

export function structurePrompt(prompt: string): string {
  if (hasStructure(prompt)) return prompt;
  if (prompt.length < 150) return prompt;

  const sentences = splitSentences(prompt);
  if (sentences.length < 2) return prompt;

  const promptIsQuestion = isQuestion(prompt);

  if (promptIsQuestion) {
    const questionSentences: string[] = [];
    const backgroundSentences: string[] = [];

    for (const s of sentences) {
      if (isQuestion(s)) {
        questionSentences.push(s);
      } else {
        backgroundSentences.push(s);
      }
    }

    if (questionSentences.length === 0) {
      questionSentences.push(sentences[sentences.length - 1]);
      backgroundSentences.length = 0;
      backgroundSentences.push(...sentences.slice(0, -1));
    }

    let result = "";
    if (backgroundSentences.length > 0) {
      result += `## Background\n${backgroundSentences.join(" ")}\n\n`;
    }
    result += `## Question\n${questionSentences.join("\n")}`;
    return result;
  }

  const contextCount = Math.min(2, Math.max(1, Math.floor(sentences.length / 3)));
  const contextPart = sentences.slice(0, contextCount).join(" ");
  const taskPart = sentences.slice(contextCount).join(" ");

  if (!taskPart) return prompt;

  return `## Context\n${contextPart}\n\n## Task\n${taskPart}`;
}

const CONSTRAINT_INDICATORS = [
  /^(?:make sure|ensure|be sure)\b/i,
  /^(?:do not|don't|never|avoid)\b/i,
  /^(?:always|must|shall)\b/i,
  /^(?:keep|limit|restrict|cap)\b/i,
  /^(?:only|exclusively)\b/i,
];

export function extractConstraints(prompt: string): string {
  if (prompt.length < 100) return prompt;
  if (/^##\s*constraints/im.test(prompt)) return prompt;

  const lines = prompt.split("\n");
  const constraintLines: string[] = [];
  const otherLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^#{1,3}\s/.test(trimmed) || /^[-*]\s/.test(trimmed) || trimmed.length < 15) {
      otherLines.push(line);
      continue;
    }

    const sentencesInLine = trimmed.split(/(?<=\.)\s+/).filter((s) => s.trim().length > 0);
    const extracted: string[] = [];
    const kept: string[] = [];

    for (const sentence of sentencesInLine) {
      const s = sentence.trim();
      if (CONSTRAINT_INDICATORS.some((p) => p.test(s))) {
        extracted.push(s);
      } else {
        kept.push(s);
      }
    }

    if (extracted.length > 0) {
      constraintLines.push(...extracted);
      if (kept.length > 0) otherLines.push(kept.join(" "));
    } else {
      otherLines.push(line);
    }
  }

  if (constraintLines.length === 0) return prompt;

  const unique = [...new Set(constraintLines)];
  const base = otherLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return `${base}\n\n## Constraints\n${unique.map((c) => `- ${c}`).join("\n")}`;
}

export function addOutputFormatHint(prompt: string): string {
  if (prompt.length < 150) return prompt;
  if (/^##\s*output/im.test(prompt)) return prompt;

  const FORMAT_KEYWORDS = [
    /\bformat\b/i, /\bjson\b/i, /\bmarkdown\b/i, /\btable\b/i,
    /\bcode block\b/i, /\brespond with\b/i, /\breturn as\b/i,
    /\boutput as\b/i,
  ];
  if (FORMAT_KEYWORDS.some((p) => p.test(prompt))) return prompt;

  // Use the text content without headers for keyword matching
  const textContent = prompt.replace(/^#{1,3}\s+.*$/gm, "").trim();

  // Check for questions first — most specific format
  if (isQuestion(prompt)) {
    return `${prompt}\n\n## Output Format\nProvide a direct answer first, then supporting explanation with any necessary steps or configuration details.`;
  }
  // Check for comparison/trade-off requests
  if (/\b(compare|pros and cons|trade.?offs|versus|vs\.?)\b/i.test(textContent)) {
    return `${prompt}\n\n## Output Format\nProvide a structured comparison with clear sections for each option.`;
  }
  // Check for how-to/tutorial requests
  if (/\b(steps|how to|guide|tutorial|walkthrough|instructions)\b/i.test(textContent)) {
    return `${prompt}\n\n## Output Format\nProvide numbered step-by-step instructions.`;
  }
  // Check for code requests — but exclude mentions of tools/products with "code" in the name
  const codeContext = textContent.replace(/\b(claude code|vs ?code|visual studio code|code editor|source code)\b/gi, "");
  if (/\b(code|function|implement|script|program|class|module)\b/i.test(codeContext)) {
    return `${prompt}\n\n## Output Format\nProvide working code with brief inline comments explaining key decisions.`;
  }
  // Check for explanation requests
  if (/\b(explain|what is|why does|how does)\b/i.test(textContent)) {
    return `${prompt}\n\n## Output Format\nProvide a clear explanation, starting with a brief summary followed by details.`;
  }
  // Check for list/ideas requests
  if (/\b(list|examples|options|ideas|suggestions)\b/i.test(textContent)) {
    return `${prompt}\n\n## Output Format\nProvide a bulleted list with a brief explanation for each item.`;
  }

  return prompt;
}

const FILLER_REPLACEMENTS: [RegExp, string][] = [
  // Multi-word phrases first (longer matches before shorter to avoid partial replacements)
  [/\bsome kind of\s+/gi, "a "],
  [/\bsome sort of\s+/gi, "a "],
  [/\bI would like you to\s+/gi, ""],
  [/\bI need you to\s+/gi, ""],
  [/\bI want you to\s+/gi, ""],
  [/\bwrite something about\b/gi, "write a comprehensive piece about"],
  [/\bhelp me with\b/gi, "provide detailed guidance on"],
  [/\bstuff about\s+/gi, "information about "],
  [/\ba bunch of\s+/gi, "multiple "],
  [/\btell me about\b/gi, "explain"],
  // Common filler words
  [/\boftentimes\b/gi, "often"],
  [/\bbasically,?\s*/gi, ""],
  [/\blike,\s*/gi, ""],
  [/\bI guess\s*/gi, ""],
  [/\bI think\s+/gi, ""],
  [/\bmaybe\s+/gi, ""],
  [/\bprobably\s+/gi, ""],
  [/\bkind of\s+/gi, ""],
  [/\bsort of\s+/gi, ""],
  // Note: "can you", "could you", "would you" are handled separately
  // in convertPoliteRequests() to preserve question framing
  // Improve vague language
  [/\bgive me\b/gi, "provide"],
  [/\bfigure out\b/gi, "analyze and determine"],
];

export function cleanUpLanguage(prompt: string): string {
  let result = prompt;

  // Convert polite requests to imperatives at sentence boundaries
  // "Can you explain React?" → "Explain React."
  // Leaves mid-sentence usage untouched: "I wonder if you can do this"
  result = result.replace(
    /(^|(?<=[.!?]\s))(?:can|could|would) you\s+(.+?[.?!])/gi,
    (_, boundary, rest) => {
      const imperative = rest.charAt(0).toUpperCase() + rest.slice(1);
      return boundary + imperative.replace(/\?\s*$/, ".");
    }
  );

  for (const [pattern, replacement] of FILLER_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  // Clean up artifacts: double/triple spaces, leading spaces after newlines
  result = result.replace(/ {2,}/g, " ");
  result = result.replace(/\n +/g, "\n");
  // Capitalize first letter of sentences after cleanup
  result = result.replace(/(^|[.!?]\s+)([a-z])/g, (_, pre, c) => pre + c.toUpperCase());
  return result;
}

// --- Conflict and ambiguity detection ---

interface PromptWarning {
  type: "conflict" | "ambiguity";
  message: string;
}

function detectIssues(prompt: string): PromptWarning[] {
  const warnings: PromptWarning[] = [];
  const lower = prompt.toLowerCase();

  // Detect conflicting instructions
  // Patterns are intentionally broad — match the concepts, not exact phrasing
  const conflictPairs: [RegExp, RegExp, string][] = [
    [/\b(brief|concise|short|succinct)\b/i, /\b(detailed|thorough|comprehensive|exhaustive|in[- ]depth)\b/i, "The prompt asks to be both brief and detailed"],
    [/\b(keep it simple|simple)\b/i, /\b(detailed|thorough|comprehensive)\b/i, "The prompt asks to keep it simple but also be detailed"],
    [/\b(don'?t include|exclude|omit|skip|no) examples\b/i, /\b(include|add|provide|give) examples\b/i, "The prompt both asks for and against including examples"],
    [/\b(formal|professional)\b/i, /\b(casual|informal|conversational)\b/i, "The prompt requests both formal and casual tone"],
    [/\b(don'?t explain|no explanat\w*|without explain\w*)\b/i, /\b(explain|walk.* through|describe why)\b/i, "The prompt asks to both explain and not explain"],
    [/\b(one|single|1)\b.*\b(option|answer|response|solution)\b/i, /\b(multiple|several|many|various|all)\b.*\b(options|answers|responses|solutions)\b/i, "The prompt asks for both a single and multiple responses"],
  ];

  for (const [patternA, patternB, message] of conflictPairs) {
    if (patternA.test(prompt) && patternB.test(prompt)) {
      warnings.push({ type: "conflict", message });
    }
  }

  // Only flag ambiguous pronouns at the start of the prompt (before context is established)
  const firstSentence = prompt.split(/[.!?]\s/)[0] || "";
  if (/^(it|this|that)\b/i.test(firstSentence.trim()) && prompt.length > 100) {
    warnings.push({
      type: "ambiguity",
      message: "The prompt starts with an unclear reference (\"" +
        firstSentence.trim().split(/\s+/).slice(0, 3).join(" ") +
        "...\") — consider specifying what \"" +
        (firstSentence.trim().match(/^(it|this|that)/i)?.[0] || "it") +
        "\" refers to",
    });
  }

  // Detect vague scope
  if (/\b(everything|anything|all of it|the whole thing)\b/i.test(lower) && !hasStructure(prompt)) {
    warnings.push({
      type: "ambiguity",
      message: "The prompt uses broad scope language (\"everything\", \"all of it\") without specifying boundaries",
    });
  }

  // Detect missing subject/object for action verbs
  if (/^(fix|update|change|modify|improve|refactor|optimize)\s+(it|this|that)\b/i.test(prompt.trim())) {
    warnings.push({
      type: "ambiguity",
      message: "The prompt starts with an action on an unclear target — specify what to " +
        (prompt.trim().match(/^(\w+)/)?.[1]?.toLowerCase() || "do"),
    });
  }

  return warnings;
}

export function flagConflictsAndAmbiguity(prompt: string): string {
  const warnings = detectIssues(prompt);
  if (warnings.length === 0) return prompt;

  const warningBlock = warnings
    .map((w) => `- ⚠️ ${w.type === "conflict" ? "CONFLICT" : "AMBIGUITY"}: ${w.message}`)
    .join("\n");

  return `${prompt}\n\n## Potential Issues\n${warningBlock}\n<!-- Review the above and clarify or remove conflicting instructions before using this prompt -->`;
}

const CONTEXT_REFERENCES = [
  /\bmy code\b/i,
  /\bthe file\b/i,
  /\bthis project\b/i,
  /\bthe data\b/i,
  /\bthe document\b/i,
  /\bmy app\b/i,
  /\bthe repo\b/i,
  /\bmy function\b/i,
  /\bthis code\b/i,
  /\bthe codebase\b/i,
  /\bmy config\b/i,
  /\bthe error\b/i,
  /\bthe log\b/i,
  /\bmy database\b/i,
];

export function addContextPlaceholders(prompt: string): string {
  if (/```/.test(prompt)) return prompt;
  if (/<code>|<context>/i.test(prompt)) return prompt;

  const matches = CONTEXT_REFERENCES.filter((p) => p.test(prompt));
  if (matches.length === 0) return prompt;

  const suggestions: string[] = [];
  if (/\b(code|function|class|module|codebase)\b/i.test(prompt)) suggestions.push("the relevant code");
  if (/\b(file|config)\b/i.test(prompt)) suggestions.push("the file contents");
  if (/\b(error|log)\b/i.test(prompt)) suggestions.push("the error message or log output");
  if (/\b(data|database)\b/i.test(prompt)) suggestions.push("a sample of the data");
  if (/\b(project|repo|app)\b/i.test(prompt)) suggestions.push("relevant project details");

  const hint = suggestions.length > 0
    ? `Paste ${suggestions.join(", ")} below for better results`
    : "Paste your actual code, data, or context below for better results";

  return `${prompt}\n\n<context>\n<!-- ${hint} -->\n</context>`;
}
