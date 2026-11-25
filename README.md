# StudyTrack UI

Angular 22 front end for **StudyTrack**, a study tracker: subjects, topics and Q&A items with rich
content, topic completion, "continue where you left off", flashcards, and LLM-assisted import of
Word/PDF notes. The look follows Folio Pro: dark charcoal surfaces, blue actions, warm-yellow accents.

The back end is [`study-track-api`](https://github.com/omkarchorghe16/study-track-api) (port 8083).
The build plan is in that repository's `docs/BUILD_PLAN.md`.

## Status

Phases 1 to 3 are done: the shell and dev proxy, an API connection card on the dashboard, the
subjects, topic tree, item list, item reading view and Quill item editor, and images and highlighted code
in items. Pages from later phases show a
placeholder naming the phase that builds them.

## Screens

| Route | Screen | State |
|---|---|---|
| `/dashboard` (also `/`) | Dashboard | Phase 1: API connection card (`GET /api/v1/status`). Progress and charts in phase 4 |
| `/subjects` | Subject cards (icon, description, topic and item counts) with create, edit, archive and delete | live |
| `/subjects/:id?topic=` | Topic tree (add, rename, move, delete topics) and the selected topic's items, filtered by difficulty and tag, 20 per page | live |
| `/items/:id` | Reading view: question, answer, notes, tags, previous/next in the topic, edit and delete | live |
| `/items/new?topicId=`, `/items/:id/edit` | Quill editors for question, answer and notes (images by button, paste or drop); title, type, difficulty, topic and tags | live |
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

## Notes

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
  core/models/       typed API payloads and tree helpers (subject, topic, item, media, status)
  core/services/     one HTTP service per API area (subjects, topics, items, media, status), api-error.ts
  features/          routed pages: dashboard/, subjects/, subject-detail/, item-view/, item-editor/
  shared/components/ shell/, dialog/ (native <dialog>), confirm-dialog/, topic-tree/, rich-content/,
                     coming-soon/ (placeholder for later phases)
  shared/editor/     Quill image upload and paste handling (quill-media.ts)
```

Rules for contributors and Claude Code are in `CLAUDE.md` and `.github/`; shared rules come from
[dev-standards](https://github.com/omkarchorghe16/dev-standards).
