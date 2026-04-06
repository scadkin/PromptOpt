# PromptOpt

A prompt optimization tool that rewrites rough prompts for clarity, structure, and effectiveness. Two modes: local (rule-based, instant, free) and Gemini (AI-powered via Google's free tier).

## Stack

- **Framework**: Next.js 15 (App Router) with TypeScript
- **Styling**: Tailwind CSS 4
- **AI**: @google/generative-ai (Gemini 2.5 Flash, free tier)
- **Runtime**: Node.js 18+

## Install dependencies

```bash
npm install
```

## Run locally

```bash
npm run dev
```

Opens at http://localhost:3001

## Run tests

No tests yet. When added:

```bash
npm test
```

## Lint

```bash
npm run lint
```

## File/folder structure

```
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Home page (prompt input/output UI)
│   │   ├── globals.css             # Global styles
│   │   └── api/
│   │       └── optimize/
│   │           └── route.ts        # POST /api/optimize endpoint
│   └── lib/
│       ├── types.ts                # Shared type definitions
│       ├── rate-limit.ts           # In-memory rate limiter
│       ├── optimize/
│       │   ├── transforms.ts       # Rule-based transform pipeline
│       │   ├── local.ts            # Local optimization orchestrator
│       │   └── system-prompt.ts    # Gemini system prompt
│       └── providers/
│           └── google.ts           # Gemini API integration
├── public/                         # Static assets
├── .env.example                    # Environment variable template
├── CLAUDE.md                       # This file
├── README.md                       # Project readme
├── package.json
└── tsconfig.json
```

## Conventions

- **Naming**: camelCase for variables/functions, PascalCase for components/types, kebab-case for file names
- **Formatting**: Follow ESLint config (eslint-config-next)
- **API routes**: Use Next.js Route Handlers in `src/app/api/`
- **Types**: Shared types in `src/lib/types.ts` — use `OptimizationMode` for mode strings
- **Environment variables**: All API keys in `.env`, never committed — reference `.env.example` for structure
