---
name: angular-coding-standards
description: Coding, UI, accessibility and verification standards for this Angular repository. Use before writing, changing, reviewing or renaming any component, template, style, service, model, route or proxy setting.
---

<!-- Managed by dev-standards (stacks/angular/claude-skills/angular-coding-standards/SKILL.md). Edit it in https://github.com/omkarchorghe16/dev-standards and run sync.sh; local edits are overwritten. -->

# Angular coding standards

This skill applies the repository's rules to Claude Code. The rules live in `.github/` and are
shared with GitHub Copilot, so there is one source of truth. Do not copy them here.

## 1. Load the rules

Read these before writing code:

- `.github/copilot-instructions.md`: product context and repository overview.
- Every `.github/instructions/*.instructions.md` file whose `applyTo` matches the files you will
  change: at least `change-hygiene`, `angular-coding-standards`, `angular-ui-and-accessibility` and
  `project`. `project.instructions.md` holds this app's backends, models and page rules, and wins
  where it is more specific.

Then read the task-specific workflow from `.github/skills/`:

| Task | Skill |
|---|---|
| Page, component, template, route, view not refreshing | `angular-component` |
| Backend call, API model, proxy route | `angular-http-service` |
| Tests and verification | `angular-testing` |

Also read any other skill in `.github/skills/` whose description matches the task.

## 2. Look at nearby code

Open the closest existing component or service and match its style.

## 3. Check before finishing

- [ ] No URLs or `HttpClient` in components; services are typed.
- [ ] Async data renders without an extra click (change detection handled).
- [ ] Missing values show `—`; failures show a message to the user.
- [ ] Labelled, keyboard-operable controls; visible focus.
- [ ] `npx ng build` has no errors or budget warnings, and the strict `tsc` check is clean (actually
      run).
- [ ] README and architecture docs updated for route, service or data-flow changes.
- [ ] Every affected `.github/skills/*` file updated; project-specific checks in
      `project.instructions.md` done.
- [ ] Shared files (marked `Managed by dev-standards`) were not edited here; shared rule changes go
      to the `dev-standards` repository.
