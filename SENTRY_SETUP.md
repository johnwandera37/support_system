# Sentry Setup Guide

This documents how Sentry was configured for this project, so it can be reproduced (e.g. on a fresh clone, or by a new contributor) or referenced later.

## 1. Run the setup wizard

```bash
npx @sentry/wizard@latest -i nextjs
```

If it fails during install (e.g. a peer dependency conflict), install manually first, then re-run the wizard:

```bash
npm install @sentry/nextjs@^10 --legacy-peer-deps
npx @sentry/wizard@latest -i nextjs
```

If you have uncommitted/untracked files, the wizard will warn about it before continuing — that's expected, it only means it can't tell what it changed vs. what was already dirty. Safe to continue.

## 2. Wizard prompts and what to choose

| Prompt | Choice | Why |
|---|---|---|
| Sentry SaaS or self-hosted | **SaaS** | Self-hosted means running Sentry's own backend stack yourself (Postgres/Kafka/Redis) — a separate infra project. SaaS just needs a DSN. |
| Already have a Sentry account | Yes / No | Log in or sign up via the browser link the wizard opens. |
| Data storage region | **USA** (or **EU** if you have EU users/GDPR requirements) | No functional difference on the free tier — just where data physically lives. |
| Route requests through Next.js server (avoid ad blockers) | **No** | Avoids extra load on your own server proxying every client error report. |
| Enable Tracing | **Yes** | Server-side performance tracking (slow queries, request durations) — negligible overhead. |
| Enable Session Replay | **No** | Client-side video-like replay of user sessions. Adds bundle size; not needed until you're specifically debugging frontend UX issues. |
| Enable Logs (send app logs to Sentry) | **No** *(see note below)* | Sentry's own log-shipping feature. We already have Winston for routine logs — don't duplicate. |
| Create example page (`/sentry-example-page`) | **Yes** | Lets you verify the whole pipeline (client + server + DSN) works before relying on it. Delete once confirmed. |
| Using CI/CD | **No** *(if deploying manually via Docker)* | If you later add GitHub Actions/similar, re-run with Yes to enable source map uploads. |
| Add Sentry MCP config | **No** | Only useful if using an MCP-compatible AI coding tool (e.g. Claude Code) against this repo. |

> **Note on "Enable Logs":** if you accidentally say Yes (easy to do), it sets `enableLogs: true` in the generated config files. Change it to `false` in all three:
> - `instrumentation-client.ts`
> - `sentry.server.config.ts`
> - `sentry.edge.config.ts`

## 3. Files the wizard generates

- `sentry.server.config.ts` — Sentry init for server runtime
- `sentry.edge.config.ts` — Sentry init for edge runtime
- `instrumentation.ts` — wires up server/edge configs at boot
- `instrumentation-client.ts` — Sentry init for the browser
- `app/global-error.tsx` — catches uncaught React render errors
- `pages/_error.tsx` — legacy pages-router error handler
- `next.config.ts` — wrapped with `withSentryConfig` (review this, wizard adds it automatically but it's worth a read)
- `.env.sentry-build-plugin` — auth token for source map uploads (already gitignored)
- `app/sentry-example-page/page.tsx` + `app/api/sentry-example-api/route.ts` — test page/route, safe to delete after verifying setup works

## 4. Turbopack compatibility

Sentry's SDK requires **Next.js 15.4.1+** for Turbopack compatibility. If you see:

```
WARNING: You are using the Sentry SDK with Turbopack. The Sentry SDK is compatible
with Turbopack on Next.js version 15.4.1 or later.
```

Upgrade within the 15.x line (avoid jumping to Next 16 unless you're deliberately planning that migration — it has breaking changes):

```bash
npm install next@^15.5 react@^19 react-dom@^19 eslint-config-next@^15.5 --legacy-peer-deps
```

## 5. How this project uses Sentry

- **Server-side (`lib/server/logger.ts`)**: `logError()` calls `Sentry.captureException()` with the raw error object, alongside writing to Winston. Only `error`-level events go to Sentry — `info`/`warn`/`debug` stay in Winston only (log files), to avoid noise and duplicate data.
- **Client-side (`utils/console-logger.ts`)**: `errLog()` reports to Sentry in production (console-only in dev).
- React render errors are captured automatically via `app/global-error.tsx` — no manual wiring needed for those.

## 6. Verifying the setup

1. `npm run dev`
2. Visit `/sentry-example-page`
3. Trigger the test error
4. Confirm it appears in your Sentry dashboard (Issues tab)
5. Once confirmed, delete the example page/route and commit
