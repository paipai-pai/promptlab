<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# PromptLab development rules

## Before changing code

- Read the relevant requirement, this file, and the existing implementation before editing.
- For Next.js work, read the matching guide under `node_modules/next/dist/docs/` first. The installed Next.js version is the source of truth.
- Keep changes scoped to the requested task. Do not perform unrelated refactors or expand the product scope without approval.

## Architecture and organization

- Keep the Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase, Zod, Vitest, and npm stack.
- Keep TypeScript strict. Do not bypass errors with `any`, broad casts, or disabled checks without a documented reason.
- Organize business code by feature under `src/features/<feature>/`. Put reusable UI primitives in `src/components/ui`, shared layout in `src/components/layout`, and framework-agnostic utilities in `src/lib`.
- Prefer Server Components. Add `"use client"` only at the smallest interactive boundary.
- Validate untrusted input at the server boundary with Zod or an equivalent schema.

## Data and security

- Never place secrets in browser code, commit them to Git, or expose them through `NEXT_PUBLIC_*` variables.
- All database schema changes must be delivered as versioned SQL migrations. Never edit production data or schema manually.
- Every business table must enable Supabase Row Level Security and define least-privilege policies before use.
- Authorize every data mutation on the server. Client-side hiding is not access control.
- Prompt body history is append-only: create a new `prompt_versions` row for a saved body change; never overwrite a historical version.
- Experiments may reference only persisted Prompt versions, never an unsaved draft.

## Quality and delivery

- Add or update tests for changed behavior.
- At task completion, run the relevant tests plus lint, TypeScript type checking, and a production build when the task affects the application.
- Report changed files, actual verification results, and remaining risks or follow-up items.
- Do not run destructive Git commands, rewrite history, discard user changes, or push/commit without explicit authorization.
