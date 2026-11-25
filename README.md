# StudyTrack UI

Angular 22 front end for **StudyTrack**, a study tracker: subjects, topics and Q&A items with rich
content, topic completion, "continue where you left off", flashcards, and LLM-assisted import of
Word/PDF notes. The look follows Folio Pro: dark charcoal surfaces, blue actions, warm-yellow accents.

The back end is [`study-track-api`](https://github.com/omkarchorghe16/study-track-api) (port 8083).
The build plan is in that repository's `docs/BUILD_PLAN.md`.

## Status

Phase 1 (scaffolding) is done: the shell, every route (lazy-loaded), the dev proxy and a dashboard that
checks the API connection. Pages from later phases show a placeholder naming the phase that builds them.

## Screens

| Route | Screen | State |
|---|---|---|
| `/dashboard` (also `/`) | Dashboard | Phase 1: API connection card (`GET /api/v1/status`). Progress and charts in phase 4 |
| `/subjects`, `/subjects/:id` | Subjects, subject with topic tree and items | placeholder (phase 2) |
| `/items/:id`, `/items/:id/edit`, `/items/new` | Item reading view and editor | placeholder (phase 2) |
| `/study/:subjectId` | Flashcards | placeholder (phase 4) |
| `/import` | Import wizard | placeholder (phase 5) |
| `/settings` | LLM provider and theme | placeholder (phase 5) |
| `/search` | Search | placeholder (phase 6) |

Unknown paths redirect to `/dashboard`. There is no login; the API acts as user 1.

## Run locally

```bash
npm install
npm start                 # http://localhost:4201, proxies /api to http://localhost:8083
```

Start `study-track-api` first (see its README). If it is not running, the dashboard says
"Not connected … The StudyTrack API (port 8083) is not reachable."

## Checks

```bash
npx ng build              # no errors or budget warnings
npm run typecheck         # strict tsc with --noUnusedLocals --noUnusedParameters
```

`npm test` does not work yet (no spec files).

## Layout

```
src/app/
  core/models/       typed API payloads (status.models.ts)
  core/services/     one HTTP service per API area (status.service.ts), api-error.ts
  features/          routed pages (dashboard/)
  shared/components/ shell/ (page frame and navigation), coming-soon/ (placeholder for later phases)
```

Rules for contributors and Claude Code are in `CLAUDE.md` and `.github/`; shared rules come from
[dev-standards](https://github.com/omkarchorghe16/dev-standards).
