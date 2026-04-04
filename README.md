# PromptOpt

A prompt optimization tool where you type or paste a rough prompt, an AI rewrites it for clarity, structure, and effectiveness (optionally tailored to a specific model like Claude, GPT, or Gemini), and you review the improved version before copying it.

## Prerequisites

- Node.js 18+
- npm 9+
- An API key for at least one AI provider (Anthropic, OpenAI, or Google AI)

## Setup

1. Clone the repository:

```bash
git clone https://github.com/scadkin/PromptOpt.git
cd PromptOpt
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

```bash
cp .env.example .env
```

Edit `.env` and fill in your API keys. See `.env.example` for details on each variable.

4. Run the development server:

```bash
npm run dev
```

Open http://localhost:3000.

## Environment Variables

See [.env.example](.env.example) for the full list of environment variables and where to get each API key.

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude |
| `OPENAI_API_KEY` | No | OpenAI API key for GPT |
| `GOOGLE_AI_API_KEY` | No | Google AI API key for Gemini |
