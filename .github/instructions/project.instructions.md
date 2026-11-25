---
applyTo: "**"
---

# Project rules: StudyTrack Angular app

Repository-specific rules. The shared rules in the other `.github/instructions/` files (managed by
dev-standards) also apply; where this file is more specific, it wins. Edit this file here.

## Backend

- `study-track-api` (8083) is the only backend. Services call relative `/api/v1/...` paths;
  `proxy.conf.json` sends `/api` to `http://localhost:8083`. Never put a host in a service URL.
- `environment.apiDocsBaseUrl` is only for links that open on the API itself (Swagger UI).
- There is no authentication; the API acts as its configured user (1). Never send a user id.
- Show failures with `apiErrorMessage` (`core/services/api-error.ts`).

## Components

- Reuse `ShellComponent` for every product page; it owns the main navigation, skip link and
  `#main-content` landmark.
- New components use the current APIs: `inject()`, `signal()`/`computed()`, `input()`, `@if`/`@for`
  with `track`. Inline templates and styles, as in Folio Pro.
- `main.ts` enables `provideZoneChangeDetection` and `withComponentInputBinding()` (route params and
  route data bind to inputs of the same name). `AppComponent` stays `ChangeDetectionStrategy.Eager`.
- Keep each component's styles under the 4 kB budget; shared look lives in `src/styles.scss`.

- Modals use `DialogComponent` (native `<dialog>`: focus trap, Escape, backdrop); confirm destructive
  actions with `ConfirmDialogComponent`. Shared button, field and badge classes live in `src/styles.scss`.
- Render stored HTML only through `RichContentComponent`; never bypass sanitization.
- Rich text uses ngx-quill (`format="html"` with the editor's `valueGetter`, see `ItemEditorComponent`).
  Quill's theme CSS is a global style in `angular.json`; `quill-delta` is an allowed CommonJS dependency.
- Reference pages: `SubjectsComponent` (list + dialog), `SubjectDetailComponent` (two panes, selection
  in the query string), `ItemEditorComponent` (form with editors).

## Routes and placeholders

- Every route is lazy-loaded (`loadComponent`) in `app.routes.ts`.
- A route whose page is not built yet points at `ComingSoonComponent` with `data: { heading, phase,
  summary }`. When a phase builds the page, add `features/<feature>/<feature>.component.ts` and
  point the route at it.

## Models

- Typed API models live in `core/models/<area>.models.ts`, one HTTP service per backend area in
  `core/services/<area>.service.ts`.

## Tests and verification

- `npm test` does not work yet (no spec files). Verify with `npx ng build` (no errors or budget
  warnings) and `npm run typecheck`.
- For pages that call the API, load them with `study-track-api` running and once with it stopped,
  to check the error message.

## Documentation

When behavior, routes, services or setup change, update `README.md`.
