---
applyTo: "src/**/*.{ts,html,scss}"
---

<!-- Managed by dev-standards (stacks/angular/instructions/angular-ui-and-accessibility.instructions.md). Edit it in https://github.com/omkarchorghe16/dev-standards and run sync.sh; local edits are overwritten. -->

# Angular UI, formatting and accessibility standards

## Display

- Show missing values as `—`, never as `0`.
- Keep raw numbers for sorting and filtering; format only for display (for example market cap as
  T/B/M, percentages with two decimals, currency with its code or symbol).
- Do not present sample, mock or delayed data as live, and do not word figures as investment
  advice.

## Styles

- Use the global theme variables (`var(--muted)`, `var(--primary)` and similar) instead of new
  hard-coded colors.
- Keep component styles small: the `anyComponentStyle` budget in `angular.json` applies. Move
  shared rules to the global stylesheet instead of copying them between components.
- Layouts must work from phone width up; avoid fixed widths that cause horizontal page scroll.

## Accessibility

- Every input has a visible or `aria-label` label; icon-only buttons have an `aria-label`.
- Controls are real `<button>`/`<a>`/`<input>` elements, operable by keyboard, with visible focus
  states.
- Use semantic headings in order and adequate color contrast; do not rely on color alone for
  up/down or error states.
- External links use `target="_blank" rel="noopener noreferrer"`.

## Security

- Never store real passwords or add production authentication behavior without a backend contract.
- Do not bind untrusted HTML with `[innerHTML]` or bypass sanitization.
