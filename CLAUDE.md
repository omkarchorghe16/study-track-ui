# StudyTrack Angular app — guide for Claude Code

`README.md` describes the screens, the setup and what is built so far. The build plan (phases, routes,
API) is in `../study-track-api/docs/BUILD_PLAN.md`. Work one phase at a time.

## Rules

Before any code change, use the `angular-coding-standards` skill
(`.claude/skills/angular-coding-standards/SKILL.md`). It loads the project rules, which live in
`.github/` and are shared with GitHub Copilot:

- `.github/copilot-instructions.md`: product context and the list of rule files.
- `.github/instructions/project.instructions.md`: rules for this app only (backend and proxy,
  `ShellComponent`, routes and placeholders, change detection, verification, docs).
- `.github/instructions/*.instructions.md` (the rest): shared change-hygiene, Angular coding, UI and
  accessibility rules.
- `.github/skills/*/SKILL.md`: workflows for components, HTTP services and testing.

### Where to change a rule

- Rules for this app only: edit `project.instructions.md` or `copilot-instructions.md` here.
- Shared rules and skills: every file that starts with a `Managed by dev-standards` comment, plus
  `.claude/skills/angular-coding-standards`, is copied from
  https://github.com/omkarchorghe16/dev-standards (cloned at `../dev-standards`) and listed in
  `.github/dev-standards.lock`. Do not edit those copies here. Change them in `../dev-standards`, then
  run `./sync.sh --all` there and commit the result in each repository.
- `../dev-standards/sync.sh --check .` (run from this repository) reports drift.

## Commands

```bash
npm start                                   # ng serve on 4201 with proxy.conf.json (/api -> 8083)
npx ng build                                # production build; must have no errors or budget warnings
npm run typecheck                           # tsc --noEmit -p tsconfig.app.json --noUnusedLocals --noUnusedParameters
```

`npm test` does not work yet (no spec files).

## Related repositories (siblings in ../)

- `study-track-api` (8083): the only backend. Flyway migrations; keep its H2 `test-schema.sql` in step.

## Before debugging "no data" problems

Check that the API was started after the relevant change (`lsof -nP -iTCP:8083 -sTCP:LISTEN`). `ng serve`
loads `proxy.conf.json` only at startup. A `200` whose body is `<!doctype html>` means the dev server is
not proxying that path; a `502`/`504` means the proxy works but the API is not running.
