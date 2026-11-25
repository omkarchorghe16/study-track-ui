# Copilot instructions — StudyTrack

## Product context
StudyTrack is a study tracker: subjects, topics and Q&A items with rich content and images, topic
completion, a "continue where you left off" pointer, flashcard reviews, and LLM-assisted import of
Word/PDF notes that the user reviews before saving. Its visual language follows Folio Pro:
charcoal/dark surfaces, restrained borders, muted gray text, bright blue actions and small
warm-yellow accents.

The app talks only to `study-track-api` (port 8083) through relative `/api/...` paths served by the
dev proxy. Pages not built yet show a placeholder naming the phase that builds them.

## Rules

For every code change, follow:

- `.github/instructions/project.instructions.md`: backend and proxy, component and model
  conventions, routes, verification and documentation for this app. Edited here.
- Shared standards, copied from https://github.com/omkarchorghe16/dev-standards (do not edit them
  here; change them there and run its `sync.sh`):
  - `.github/instructions/change-hygiene.instructions.md`
  - `.github/instructions/angular-coding-standards.instructions.md`
  - `.github/instructions/angular-ui-and-accessibility.instructions.md`

Reusable workflows are in `.github/skills/*/SKILL.md` (components, HTTP services, testing). Use the
relevant skill; the instruction files stay authoritative for rules that apply to every change.
`project.instructions.md` wins where it is more specific.
