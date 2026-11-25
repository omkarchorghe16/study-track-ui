---
applyTo: "**"
---

<!-- Managed by dev-standards (stacks/common/instructions/change-hygiene.instructions.md). Edit it in https://github.com/omkarchorghe16/dev-standards and run sync.sh; local edits are overwritten. -->

# Change hygiene (all repositories)

These rules apply to every change, in every stack.

## Scope

- Keep changes focused on the request. Preserve existing behavior unless a behavior change is
  asked for, and do not refactor unrelated code as a side effect.
- When existing code breaks a rule, follow the rule in new and changed code; do not rewrite the
  rest of the file unless asked.
- Add or update tests for changed behavior.

## Secrets

- Never commit credentials, API keys, tokens or real personal data. Read them from environment
  variables or git-ignored local files.
- Never log secrets, authorization headers, credential-bearing URLs or full request/response
  payloads.

## Documentation and skills stay in step with the code

For every new or changed behavior:

1. Review every skill in `.github/skills/`, not only the one used for the task. Update each skill
   whose instructions, examples or workflow the change affects. Do not make wording-only edits to
   unaffected skills.
2. Update `README.md` when features, setup, configuration, API usage, architecture or contributor
   workflows change.
3. Update directly related documentation (API docs, OpenAPI annotations, Postman collections,
   configuration examples, deployment notes) when their behavior or contract changes.
4. In the final handoff, name any relevant documentation you deliberately left unchanged and why.

## Shared standards versus project rules

- Files that start with a `Managed by dev-standards` comment are copied from
  https://github.com/omkarchorghe16/dev-standards by `sync.sh`. Do not edit them in the
  application repository: change them in `dev-standards` and run `sync.sh` again, or the next
  sync overwrites the edit.
- Rules that only apply to one repository live in that repository's
  `.github/copilot-instructions.md`, `.github/instructions/project.instructions.md` and its own
  (unmanaged) skills. Project rules win when they are more specific than a shared rule.

## Reporting

- Run the smallest relevant build or test command after a change.
- Do not claim that tests or builds passed unless they were actually run. Report failures with
  their output.
