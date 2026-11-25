---
name: angular-component
description: Add or change an Angular standalone component, routed page, template, inputs/outputs or change-detection behavior, including routing, layout shell reuse, display formatting and accessibility.
---

<!-- Managed by dev-standards (stacks/angular/skills/angular-component/SKILL.md). Edit it in https://github.com/omkarchorghe16/dev-standards and run sync.sh; local edits are overwritten. -->

# Angular component workflow

Use this skill when adding a page or reusable component, changing a template, wiring a route, or
fixing a view that does not refresh. The project's shell component, models and page-specific rules
are in `.github/instructions/project.instructions.md`.

## Conventions

- Standalone component in `features/<feature>/` (routed page) or `shared/components/<name>/`
  (reusable). Import only what the template uses.
- Product pages reuse the project's layout shell component instead of rebuilding navigation.
- Components get data from services in `core/services`; they hold view state and call service
  methods, nothing more. Keep heavy logic in services or pure helper functions.
- Keep raw values in component state and format in the template or a small formatting method; show
  missing values as `—`.
- Change detection: components are `OnPush` by default. If the component sets plain fields inside
  `subscribe` callbacks, use signals, `markForCheck()` or `ChangeDetectionStrategy.Eager`.
- Lists use a stable identity (`track item.id` with `@for`, or `trackBy` with `*ngFor`).
- Every loading path has a visible loading, empty and error state.

## Implementation sequence

1. Open the closest existing component of the same kind and match its structure and style.
2. Add or update the route in `app.routes.ts` (with a `title`), if the component is a page.
3. Build the template with semantic HTML and labelled, keyboard-operable controls.
4. Wire data through an existing or new service (see the `angular-http-service` skill).
5. Check that asynchronous updates render without an extra click.
6. Run `npx ng build` (no errors or budget warnings) and the `tsc --noUnusedLocals
   --noUnusedParameters` check.
7. Update README and architecture docs when routes, screens or data flow change, and review the
   affected skills in `.github/skills/`.

## Verification checklist

- No URLs or `HttpClient` in the component.
- Async data renders immediately after it arrives.
- Loading, empty and error states are visible to the user.
- Inputs are labelled; focus is visible; external links use `rel="noopener noreferrer"`.
- Component styles stay within the style budget.
