# StudyTrack UI

Angular 22 front end for **StudyTrack**, a study tracker: subjects, topics and Q&A items with rich
content, topic completion, "continue where you left off", flashcards, and LLM-assisted import of
Word/PDF notes. The look follows Folio Pro: dark charcoal surfaces, blue actions, warm-yellow accents.

The back end is [`study-track-api`](https://github.com/omkarchorghe16/study-track-api) (port 8083).
The build plan is in that repository's `docs/BUILD_PLAN.md`.

## Status

Phases 1 to 4 are done: the shell and dev proxy, subjects, topic tree, item list, item reading view and
Quill item editor, images and highlighted code in items, and progress tracking (item status, confidence,
bookmarks, topic completion, the dashboard and flashcards). Pages from later phases show a placeholder
naming the phase that builds them.

## Screens

| Route | Screen | State |
|---|---|---|
| `/dashboard` (also `/`) | Overall progress ring, "Continue where you left off", today's due and new cards with the streak, progress per subject, 30-day review chart (`GET /api/v1/stats/overview`, `GET /api/v1/sessions/resume`) | live |
| `/subjects` | Subject cards (icon, description, counts, progress bar, Study link) with create, edit, archive and delete | live |
| `/subjects/:id?topic=` | Subject progress; topic tree with % and check marks (add, rename, move, delete topics); the selected topic's items with status, filtered by status, difficulty and tag, 20 per page; "Mark topic complete" | live |
| `/items/:id` | Reading view: status (Not started / Learning / Done), confidence stars, bookmark, question, answer, notes, tags, previous/next in the topic, edit and delete. Opening it saves the resume point | live |
| `/items/new?topicId=`, `/items/:id/edit` | Quill editors for question, answer and notes (images by button, paste or drop); title, type, difficulty, topic and tags | live |
| `/study/:subjectId` | Flashcards: cards due today, then new ones; show the answer, rate Again / Hard / Good / Easy (`GET /api/v1/reviews/due`, `POST /api/v1/reviews`) | live |
| `/import` | Import wizard | placeholder (phase 5) |
| `/settings` | LLM provider and theme | placeholder (phase 5) |
| `/search` | Search | placeholder (phase 6) |

Unknown paths redirect to `/dashboard`. There is no login; the API acts as user 1.

## Run locally

```bash
npm install
npm start                 # http://localhost:4201, proxies /api to http://localhost:8083
```

Start `study-track-api` first (see its README). If it is not running, pages say
"… The StudyTrack API (port 8083) is not reachable." with a Retry button.

## Notes

- Progress: `ProgressService` (item progress, topic completion, reviews, due cards, resume point) and
  `StatsService` (dashboard numbers). The rating buttons show the next interval with
  `reviewIntervalDays` (`core/models/progress.models.ts`), which mirrors the API's `ReviewScheduler`;
  change both together.
- `ProgressBarComponent` (`shared/components/progress-bar`) is the one progress bar; the dashboard's ring
  and 30-day chart live in `features/dashboard`. The chart has a hover/focus tooltip per day and a table view.

- Images are uploaded to `POST /api/v1/media` (`MediaService`) and stored in the HTML as
  `<img src="/api/v1/media/{id}">`, never base64. `shared/editor/quill-media.ts` wires Quill's image button,
  its uploader (pasted and dropped files) and a paste filter that drops base64 and external images.
  PNG, JPEG, GIF and WebP up to 5 MB; other files get a message without a request.
- Stored HTML is rendered only by `RichContentComponent`: DOMPurify (same rules as the API's jsoup
  sanitiser, images only from `/api/v1/media/`), then highlight.js on code blocks (theme `github-dark`,
  a global style in `angular.json`). The API also sanitises every save.
- Quill 2 writes spaces as `&nbsp;`; the editor's `valueGetter` turns them back into spaces so answers wrap.
- Empty editors are saved as `null`, so an unanswered question shows "No answer yet".

## Checks

```bash
npx ng build              # no errors or budget warnings
npm run typecheck         # strict tsc with --noUnusedLocals --noUnusedParameters
```

`npm test` does not work yet (no spec files).

## Layout

```
src/app/
  core/models/       typed API payloads and tree helpers (subject, topic, item, media, progress, stats)
  core/services/     one HTTP service per API area (subjects, topics, items, media, progress, stats), api-error.ts
  features/          routed pages: dashboard/, subjects/, subject-detail/, item-view/, item-editor/, study/
  shared/components/ shell/, dialog/ (native <dialog>), confirm-dialog/, topic-tree/, rich-content/, progress-bar/,
                     coming-soon/ (placeholder for later phases)
  shared/editor/     Quill image upload and paste handling (quill-media.ts)
```

Rules for contributors and Claude Code are in `CLAUDE.md` and `.github/`; shared rules come from
[dev-standards](https://github.com/omkarchorghe16/dev-standards).
