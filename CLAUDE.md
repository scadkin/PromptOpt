# PromptOpt

A prompt optimization tool that rewrites rough prompts for clarity, structure, and effectiveness, optionally tailored to a specific AI model (Claude, GPT, or Gemini).

## Stack

- **Framework**: Next.js 15 (App Router) with TypeScript — full-stack React framework handling both UI and API routes in one project
- **Styling**: Tailwind CSS 4 — utility-first CSS for rapid UI development
- **AI SDKs**: @anthropic-ai/sdk, openai, @google/generative-ai — direct provider SDKs for calling each model's API
- **Runtime**: Node.js 18+

## Install dependencies

```bash
npm install
```

## Run locally

```bash
npm run dev
```

Opens at http://localhost:3000

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
│   ├── app/                  # Next.js App Router pages and API routes
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Home page (prompt input/output UI)
│   │   └── api/
│   │       └── optimize/
│   │           └── route.ts  # POST /api/optimize — prompt optimization endpoint
│   └── lib/
│       └── providers/        # AI provider integrations
│           ├── anthropic.ts  # Claude API wrapper
│           ├── openai.ts     # GPT API wrapper
│           └── google.ts     # Gemini API wrapper
├── public/                   # Static assets
├── .env.example              # Environment variable template
├── CLAUDE.md                 # This file
├── README.md                 # Project readme
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

## Conventions

- **Naming**: camelCase for variables/functions, PascalCase for components/types, kebab-case for file names
- **Formatting**: Follow ESLint config (eslint-config-next)
- **API routes**: Use Next.js Route Handlers in `src/app/api/`
- **Environment variables**: All API keys in `.env`, never committed — reference `.env.example` for structure
