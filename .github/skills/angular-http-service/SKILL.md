---
name: angular-http-service
description: Add or change a typed Angular HTTP service, API model, dev-proxy route or backend contract integration, including error handling and keeping the frontend in step with backend endpoints.
---

<!-- Managed by dev-standards (stacks/angular/skills/angular-http-service/SKILL.md). Edit it in https://github.com/omkarchorghe16/dev-standards and run sync.sh; local edits are overwritten. -->

# Angular HTTP service workflow

Use this skill when calling a new backend endpoint, changing a request/response shape, adding a
proxy route, or mapping backend data for the UI. The backends this app calls and their base URLs
are listed in `.github/instructions/project.instructions.md`.

## Conventions

- One service per backend resource in `core/services`, named after it:
  `watchlists.service.ts` / `WatchlistsService`. Provided in root.
- Service methods are verb + noun and return typed observables: `getProfiles(symbols):
  Observable<FmpProfile[]>`, `createWatchlist(request)`, `deleteWatchlist(id)`.
- Type every request and response. Model optional backend fields as `T | null` and keep them null
  instead of defaulting to `0` or `''`.
- Base URLs come from `environment` or relative proxied paths. Adding a proxied path means editing
  `proxy.conf.json` and restarting `ng serve`.
- Let errors propagate to the caller as observable errors; the component shows a message. Use
  `catchError` only to translate an error, not to hide it behind an empty result.
- Keep request/response payload logging out of committed code.

## Implementation sequence

1. Read the backend contract (controller, DTO, OpenAPI or Postman) in the sibling backend repo.
2. Add or update the TypeScript interfaces and the service method.
3. Add the proxy route if the path is new, and restart the dev server.
4. Update the calling component(s) and their loading/error states.
5. Run `npx ng build` and the `tsc --noUnusedLocals --noUnusedParameters` check.
6. With the backend running, load the affected page. A `200` whose body is `<!doctype html>`
   means the dev server is not proxying that path.
7. Update README/architecture docs and the affected skills for new endpoints or data flow.

## Verification checklist

- The service is the only place that knows the URL.
- Request and response types match the backend DTOs field for field.
- Failures reach the user as a message.
- No secrets, provider keys or hard-coded hosts in the frontend.
