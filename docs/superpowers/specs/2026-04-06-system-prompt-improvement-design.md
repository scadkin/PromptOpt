# System Prompt Improvement

**Goal:** Make Gemini mode produce more structured, expanded, and useful optimized prompts. Target 2-3x the original length — concise but thorough, not a spec generator.

## What changes

**File:** `src/lib/optimize/system-prompt.ts`

Only the system prompt text changes. No changes to `google.ts`, the API route, or any other file.

## Current problems

1. The prompt says "match the length, plus or minus 50%" — this prevents meaningful expansion.
2. "For short prompts, minimal or no sections are fine" — this allows unstructured output.
3. Role assignment is described as optional ("if one isn't present") — it should always be added.
4. Output format guidance is vague ("add a brief hint") — it should be concrete.

## New system prompt rules

### Remove
- "Match the length" / "plus or minus 50%" constraint
- "For short prompts, minimal or no sections are fine"
- "A 3-sentence input should not become a 30-sentence output"

### Change
1. **Length target:** "Aim for 2-3x the original length. Be concise but thorough — every added word should earn its place."
2. **Role assignment:** "Always lead with a clear role assignment that frames the LLM's expertise for the task."
3. **Structure:** "Always organize into clear sections. For short inputs, use at minimum: Role, Task, Output Format. For longer inputs, add Context and Constraints."
4. **Output format:** "Specify a concrete output format — bullet points, numbered steps, markdown structure, code blocks, etc. Be specific about what the response should look like."

### Keep
- "Preserve intent — never change what the user is asking for"
- "Do not add sections, requirements, or constraints the user never mentioned or implied"
- "Conflict and ambiguity detection" section
- "Return ONLY the optimized prompt" instruction
- All existing DO NOT rules (no inventing edge cases, no turning questions into specs)

## Example behavior

**Input:** "make me a website that sells shoes and looks good"

**Current output (too conservative):** "Create a website that sells shoes with an appealing, modern design."

**Desired output (structured, expanded, concise):**
```
You are a senior full-stack web developer with expertise in e-commerce and modern UI design.

## Task
Build a website for selling shoes that prioritizes visual appeal and a smooth shopping experience.

## Requirements
- Product catalog with filtering (size, style, price)
- Clean, modern design with strong product photography focus
- Mobile-responsive layout
- Shopping cart and checkout flow

## Output Format
Provide the implementation as a structured codebase with separate files for components, styling, and data. Start with the homepage and product listing page.
```

## Scope
- One file changed: `src/lib/optimize/system-prompt.ts`
- No API changes, no UI changes, no new dependencies
- Local mode is unaffected (separate pipeline)
