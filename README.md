# StoryZ / Vidz

AI production studio for generating documentary-style YouTube videos from a topic.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Project Shape

- `app/` - Next.js App Router UI and API routes
- `lib/ai/` - typed AI module wrappers
- `lib/db/` - Neon PostgreSQL client
- `lib/pipeline/` - shared pipeline and storyboard types
- `lib/remotion/` - Remotion video composition
- `migrations/` - manual SQL migrations
- `scripts/` - GitHub Actions runner scripts
- `.github/workflows/render.yml` - render workflow
- `docs/` - product and architecture documentation

## Current Status

This is the initial scaffold. AI providers, asset generation, upload storage, auth, and full pipeline orchestration are intentionally stubbed for incremental implementation.

## Environment

Use `.env.example` as the template. For a feature-by-feature checklist, read `docs/ENVIRONMENT.MD`.
