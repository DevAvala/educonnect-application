# EduConnect application: notes for Claude

## EduConnect AI Lab (Student Brain, Academic Arena, AI Study Companion, Career & Talent Hub)

Before designing or building ANY of these features, read `docs/ai-lab/AI_LAB_MASTER_PLAN.md` in full.
It records what was agreed, what is only suggested, the UI/UX rules every screen must follow, the build
order, the security gate, and a build log. The four original plans are in `docs/ai-lab/sources/`.
If the master plan and a source plan disagree, stop and ask the user. Do not invent features, data or decisions.

Student Brain lives in this repo. Its backend does not exist yet: see `docs/STUDENT_BRAIN_API_CONTRACT.md`.

## Working in this codebase

- Use the shared pattern library (`src/components/patterns`, rules in its README). Never build one-off tables,
  status badges, modal detail views or spinners.
- Plain JS/JSX, Tailwind 4, shadcn/Radix. Tests: `npm test`. Lint: `npm run lint`. Build: `npm run build`.
- Some files use CRLF line endings (e.g. `ParentLayout.jsx`). Preserve them. Check `git diff --stat` after edits.
