---
name: angular-testing
description: Add or run unit tests for Angular components and services (TestBed, HttpTestingController), or verify an Angular change with the production build and strict type check.
---

<!-- Managed by dev-standards (stacks/angular/skills/angular-testing/SKILL.md). Edit it in https://github.com/omkarchorghe16/dev-standards and run sync.sh; local edits are overwritten. -->

# Angular testing and verification workflow

Use this skill when adding tests, fixing a regression, or verifying a change before handing it
off. Whether this repository has a working test runner yet is stated in
`.github/instructions/project.instructions.md`.

## Conventions

- Spec files sit next to the code: `watchlists.service.spec.ts`.
- Service tests use `provideHttpClient()` and `provideHttpClientTesting()` with
  `HttpTestingController`: assert the URL, method and body, flush a typed response, and call
  `verify()` after each test.
- Component tests use `TestBed` with the standalone component in `imports`, mock services with
  simple stubs returning `of(...)` / `throwError(...)`, and assert rendered text and states
  (loading, empty, error) rather than private fields.
- After async updates call `fixture.detectChanges()` (or `await fixture.whenStable()`); with
  `OnPush`, a test that passes only after a manual `markForCheck` points to a real refresh bug.
- Fixtures are synthetic; never use real account data or keys.
- Tests never call a running backend.

## Implementation sequence

1. Find nearby specs and follow their setup.
2. Test the service contract (URL, method, payload, error propagation) and the component's visible
   behavior.
3. Run the tests if the runner works (`npm test`); otherwise say so in the handoff.
4. Always run `npx ng build` (no errors or budget warnings) and
   `npx tsc --noEmit -p tsconfig.app.json --noUnusedLocals --noUnusedParameters`.
5. For UI changes, load the affected page with the required backends running.

## Verification checklist

- Every reported check was actually run, with its result.
- Tests are deterministic and do not touch the network.
- Build and strict type check are clean.
