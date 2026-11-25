# StudyTrack UI

Angular 22 front end for **StudyTrack**, a study tracker: subjects, topics and Q&A items with rich
content, topic completion, "continue where you left off", flashcards, and LLM-assisted import of
Word/PDF notes. The look follows Folio Pro: dark charcoal surfaces, blue actions, warm-yellow accents.

The back end is [`study-track-api`](https://github.com/omkarchorghe16/study-track-api) (port 8083).
The build plan is in that repository's `docs/BUILD_PLAN.md`.

## Status

Phases 1 to 6 are done: the shell and dev proxy, subjects, topic tree, item list, item reading view and
Quill item editor, images and highlighted code in items, progress tracking (item status, confidence,
bookmarks, topic completion, the dashboard and flashcards), LLM import with review, and search and
polish (full-text search, duplicate warning, flashcard shortcuts, toasts, light and dark themes).
Phase 7 (accounts and deployment) is not started.

## Screens

| Route | Screen | State |
|---|---|---|
| `/dashboard` (also `/`) | Overall progress ring, "Continue where you left off", today's due and new cards with the streak, progress per subject, 30-day review chart (`GET /api/v1/stats/overview`, `GET /api/v1/sessions/resume`) | live |
| `/subjects` | Subject cards (icon, description, counts, progress bar, Study link) with create, edit, archive and delete | live |
| `/subjects/:id?topic=` | Subject progress; topic tree with % and check marks (add, rename, move, delete topics); the selected topic's items with status, filtered by status, difficulty and tag, 20 per page; "Mark topic complete" | live |
| `/items/:id` | Reading view: status (Not started / Learning / Done), confidence stars, bookmark, question, answer, notes, tags, previous/next in the topic, edit and delete. Opening it saves the resume point | live |
| `/items/new?topicId=`, `/items/:id/edit` | Quill editors for question, answer and notes (images by button, paste or drop); title, type, difficulty, topic and tags. Before saving a new question (or a changed one) it lists items of the subject with the same question and offers "Save anyway" (`POST /api/v1/items/duplicate-check`) | live |
| `/study/:subjectId` | Flashcards: cards due today, then new ones; show the answer, rate Again / Hard / Good / Easy (`GET /api/v1/reviews/due`, `POST /api/v1/reviews`). Keys: Space or Enter shows the answer, 1–4 rate it | live |
| `/import`, `/import?job=` | Import wizard: choose a subject and a .docx/.pdf/.md/.txt file (≤20 MB, checked before upload), follow the progress (polled every 2.5 s), then review the candidates: preview, edit (Quill editors, type, difficulty, tags, topic or topic path), approve or reject one by one, selected or all. Duplicates of saved items start unselected. Recent imports are listed | live |
| `/settings` | LLM for imports: provider, model, base URL, on/off, whether the server has the API key, Test connection, Save. Appearance: Dark (default), Light or same as the system | live |
| `/search?q=&subject=` | Full-text search across all items (or one subject): every word must match as a prefix; results show subject › topic, a snippet with the matching words highlighted, type, difficulty and status; 20 at a time (`GET /api/v1/items/search`) | live |

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
- Empty editors are saved as `null`, so an unanswered question shows "No answer yet". The editor helpers
  (`toStoredHtml`, `readEditorHtml`, `parseTags`) are in `shared/editor/editor-html.ts`.
- Toasts: `ToastService.showSuccess` / `showError` for the result of an action (saved, deleted, approved,
  failed); `ToastHostComponent` sits in the shell. Load errors and form validation stay inline.
- Themes: colours are CSS variables in `styles.scss` (`:root` dark, `:root[data-theme=light]` light).
  `ThemeService` stores the choice in this browser's localStorage and sets `data-theme` on `<html>` at
  startup. Use the variables (`--sunken`, `--overlay-1`, `--info-text`, …) instead of hex colours. Code
  blocks stay dark in both themes.
- Search snippets come from the API as `{text, match}` parts and are rendered as text with `<mark>`, never
  as HTML.
- Imports: `ImportsService` (`/api/v1/imports`) and `SettingsService` (`/api/v1/settings/llm`). Nothing
  becomes an item until a candidate is approved. API keys are never entered or shown in the app: the
  settings page only says whether `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` is set on the server.

## Checks

```bash
npx ng build              # no errors or budget warnings
npm run typecheck         # strict tsc with --noUnusedLocals --noUnusedParameters
```

`npm test` does not work yet (no spec files).

## Layout

```
src/app/
  core/models/       typed API payloads and tree helpers (subject, topic, item, media, progress, stats, import, llm-settings, search)
  core/services/     one HTTP service per API area (subjects, topics, items, media, progress, stats, imports, settings,
                     search), theme.service.ts, toast.service.ts, api-error.ts
  features/          routed pages: dashboard/, subjects/, subject-detail/, item-view/, item-editor/, study/,
                     import/, settings/, search/
  shared/components/ shell/, dialog/ (native <dialog>), confirm-dialog/, topic-tree/, rich-content/, progress-bar/,
                     toast-host/,
                     coming-soon/ (placeholder for planned pages; unused now)
  shared/editor/     Quill image upload and paste handling (quill-media.ts), editor HTML helpers (editor-html.ts)
```

Rules for contributors and Claude Code are in `CLAUDE.md` and `.github/`; shared rules come from
[dev-standards](https://github.com/omkarchorghe16/dev-standards).
