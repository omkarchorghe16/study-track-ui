---
applyTo: "src/**/*.ts"
---

<!-- Managed by dev-standards (stacks/angular/instructions/angular-coding-standards.instructions.md). Edit it in https://github.com/omkarchorghe16/dev-standards and run sync.sh; local edits are overwritten. -->

# Angular coding standards

## Structure

- Use standalone components, strict TypeScript and SCSS. Organize code as `core/` (models,
  services), `features/<feature>/` (routed pages) and `shared/components/` (reusable UI).
- File names are kebab-case with a type suffix: `watchlists.component.ts`,
  `fmp-profiles.service.ts`. Classes are `<Name>Component` / `<Name>Service`; selectors use the
  `app-` prefix.
- Follow the style of the file you are editing (decorator inputs vs signal inputs, `*ngIf` vs
  `@if`, constructor vs `inject()`). New files may use the current Angular APIs (`input()`,
  `signal()`, `@if`/`@for` with `track`, `inject()`).

## Types

- No `any`. Use `unknown` plus narrowing for untyped data, and typed interfaces for API payloads in
  `core/models` or next to the service that owns them.
- Represent missing backend values as `null`/`undefined`, never as `0` or an empty string.

## HTTP and data

- All HTTP access lives in typed `@Injectable({ providedIn: 'root' })` services under
  `core/services`. Components never build URLs or call `HttpClient`.
- Base URLs come from `environment` files or relative paths served by the dev proxy; never
  hard-code `localhost` hosts in services.
- Return typed `Observable<T>` from services; map backend DTOs to view models in the service or a
  pure helper, not in templates.
- Surface load and save failures to the user (a status or error message), not only in the console.
  Do not leave verbose `console` logging of request or response payloads in committed code.
- Unsubscribe from long-lived streams (`takeUntilDestroyed`, `async` pipe); one-shot HTTP calls may
  be subscribed directly.
- No secrets or API keys in the frontend; provider keys stay in the backends.

## Change detection

- Angular 22 makes components `OnPush` by default. A component that updates plain fields from
  HTTP/RxJS callbacks must use signals, call `ChangeDetectorRef.markForCheck()`, or set
  `changeDetection: ChangeDetectionStrategy.Eager`. Otherwise the view refreshes only after the
  next user event.

## Verifying changes

- `npx ng build` finishes without errors or budget warnings.
- `npx tsc --noEmit -p tsconfig.app.json --noUnusedLocals --noUnusedParameters` reports nothing.
- If the dev proxy (`proxy.conf.json`) changed, restart `ng serve`; it reads the file only at
  startup.
