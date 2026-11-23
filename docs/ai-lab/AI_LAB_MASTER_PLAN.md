# EduConnect AI Lab: Master Plan and UI/UX Brief

> **Instruction to Claude:** Read this file in full BEFORE designing or building any EduConnect AI Lab UI/UX.
> It records what was agreed, what is only suggested, and the rules every screen must follow.
> The four original plans in `sources/` are the source of truth for detail. If this file and a source plan
> disagree, stop and ask the user. Do not invent features, data, or decisions that are not written here.

**Created:** 2026-11-23 (from plans dated 2026-11-12)
**Repos in scope:** `devavala/educonnect-frontend`, `devavala/educonnect-application`
**Status of everything below:** planning only. No implementation, AI model or vendor has been chosen or authorised.

---

## 0. PARKED: features that need a student sign-in (read this first)

**Decision (user, 2026-11-23):** ignore anything that needs a student to sign in, **for now**. Do not build,
design or estimate these until the user brings them back. They are parked, not cancelled.

| Parked | Why it is parked | What to ask before un-parking |
|---|---|---|
| **AI Study Companion** (student chat, practice, flashcards, "Explore any topic") | Written entirely for a student using it directly | Parent-led, teacher-led, or real student access? Age limits, parent controls, chat retention, safety escalation to a teacher |
| **Career & Talent Discovery Hub** (interests, career explorer, try-a-career projects, student-owned Growth Portfolio) | Student-facing by design, and the portfolio is meant to be student-controlled | Who owns the interest data and the portfolio if students cannot sign in? Which ages? Parent-visible or private? |
| **Academic Arena, student/player side** (join lobby, answer live, see own results and badges) | Competitors must sign in to take part | How do students join live: own login, class code on a shared device, teacher-run on a projector? |
| **Brain: student views** (My Brain, Knowledge Frontier) | Already dropped for Student Brain | Only if student logins return |
| Student-owned interests / "Discovery Brain" | Student authors their own interests | Same as the Career Hub |

**Not parked (no student sign-in needed), safe to work on when asked:**
- Student Brain for **teachers and parents** (built, see section 9).
- Arena, **organizer side only** (suggestion, not yet agreed): school staff creating events, question banks, rosters, results and certificates. Running a live event still needs a decision on how students join, so do not build the live player.
- Parent-facing pieces that read Brain data: home support plan, parent assistant, parent-teacher "discuss this topic" (Brain plan phases 2 to 3).
- Teacher-facing tools: per-student notes, printable or shareable class lists, AI question and topic suggestions (once a model is chosen).

**When the user says "un-park", "bring back the student features" or names one of these:** stop, re-read the
source plan in `sources/`, ask the "before un-parking" questions above, and record the answers in section 2.

---

## 1. The four features (numbering confirmed by user)

| # | Feature | One-line purpose | Source plan |
|---|---|---|---|
| 1 | **Student Brain** | Evidence-based knowledge map per student, by topic/subtopic, built from question-level marks | `sources/educonnect_student_brain_plan.md` |
| 2 | **Academic Arena** | Live academic competitions, intra- and inter-school, hosted by schools or EduConnect | `sources/educonnect_academic_arena_competition_plan.md` |
| 3 | **AI Study Companion** | Personal AI tutor that teaches rather than gives answers | `sources/educonnect_ai_study_companion_plan.md` |
| 4 | **Career & Talent Discovery Hub** | Interest, career and talent exploration with a student-controlled portfolio | `sources/educonnect_ai_career_talent_discovery_hub_plan.md` |

Student Brain is the centre. Companion, Arena and Career Hub read from it or feed evidence into it.

> **Parked (see section 0):** Companion and Career Hub, plus the student side of Arena, need a student sign-in and are on hold. Only Student Brain (teachers and parents) is being built.

---

## 2. Decision log

Status key: **CONFIRMED** = user said so. **SUGGESTED** = Claude proposed, user has not yet approved (confirm before treating as final). **OPEN** = undecided.

### Confirmed (from the plans and the user)
- Brain tracks topic/subtopic performance, not just subject grades. **CONFIRMED**
- Schools do NOT have students' written answers. Only question papers, answer keys and per-question marks. The product must never claim to know *why* an answer was wrong. **CONFIRMED**
- Marks enter by manual entry or by marking-report upload (CSV/XLSX first, PDF later). **CONFIRMED**
- Students may explore topics above their class level when evidence supports it. **CONFIRMED**
- Arena: intra-school AND inter-school; both schools and EduConnect can host; core experience is LIVE. **CONFIRMED**
- Feature numbering 1 to 4 as in the table above. **CONFIRMED**
- The features should work together rather than be separate silos. **CONFIRMED (direction)**
- **Student Brain has no student view: teachers and parents only.** **CONFIRMED (2026-11-23)**
- **Features that need a student sign-in are parked for now (not cancelled). See section 0.** **CONFIRMED (2026-11-23)**
- Teachers get a repository of every student's brain, filterable to find students who could use support in a topic. **CONFIRMED (2026-11-23)**

### Suggested, awaiting user approval
| Topic | Suggestion |
|---|---|
| Evidence types | One shared evidence record with `source_type`. School assessment = official. Practice and competition = supplementary, shown as separate layers, never alter official numbers. Interests/projects = not academic evidence. |
| Practice weight in Brain | Zero effect on official performance figures. May influence recommendations and readiness only. Revisit after pilot data. |
| Interest data ownership | Career Hub owns `StudentInterest`. Brain's "Discovery Brain" is a view of the same data, not a second copy. Student authors interests; parents can only suggest, student accepts or declines. |
| Security | Phase 0 gate: no real student data to any AI service until the security items in section 6 are done. |
| AI models | No vendor yet. Thin model layer so extraction, tutoring, question drafting and explanations can use different models. Per-school monthly cost cap for the pilot. User will propose models later. |
| Consent and retention | Schools opt in per feature. Guardian consent at enrolment for minors. Companion chats private to the student by default, with safety escalation to a teacher. Short retention (90 days as a starting point). Legal review against the Nigeria Data Protection Act 2023 before pilot. |
| Pilot scope | 1 to 3 schools, Mathematics only, JSS1 to JSS3. Brain Phase 1 + Companion Phase 1. Arena: school-hosted class-vs-class or house contest, all players answer the same question each round. Career Hub: Explore only, no Brain link yet. |

### Open (must be asked, never assumed)
- Which curricula, classes, subjects and languages at launch.
- Arena: individuals vs official school teams (user is undecided); scoring rules; tiebreakers; which formats in v1.
- Thresholds and minimum evidence for labels like "strong", "needs practice", "ready for advancement".
- Whether Arena results update Brain by default, opt-in, or only after teacher/guardian approval.
- Parent controls, portfolio visibility (private, parent-visible, selectively shared), age limits per feature.
- Spectator mode and public leaderboards (and for which ages).
- Whether career information is curated manually or sourced dynamically.

---

## 3. How the features connect

```
Brain ──topic gaps / readiness──▶ Companion ──practice results──▶ Brain (supplementary layer)
  │                                   ▲
  └──topic insights (permissioned)──▶ Career Hub ──suggests lessons──┘
Arena ──topic-tagged results (opt-in)──▶ Brain
Arena achievements + Companion milestones + Career projects ──▶ Growth Portfolio
```

Shared data split:
- **Academic layer (Brain):** question-level marks, topic performance, trends, evidence strength.
- **Discovery layer (Career Hub):** interests, projects, Growth Portfolio.

Rules that keep it fair:
- Arena must NOT use Brain data to adjust live difficulty between opponents.
- AI never changes official assessment marks or official standings. Scoring is deterministic and auditable.
- Official school evidence and AI/practice/competition evidence are always visually and technically distinguishable.

---

## 4. Suggested build order

> **Update 2026-11-23:** steps that need a student sign-in are parked (section 0). Read the list below with the Companion, Career Hub and Arena player parts struck out.

1. **Phase 0, Security gate** (section 6).
2. **Phase 1, Brain Phase 1:** topic hierarchy, teacher-approved question tags, manual marks, CSV/XLSX import with preview, basic knowledge map, read-only student/teacher/parent views.
3. **Phase 2:** Companion Phases 1 to 2. In parallel and independent of Brain: Arena Phase 1 (live school competitions) and Career Hub "Explore".
4. **Phase 3:** the connections: shared evidence model, Growth Portfolio, Companion/Career links, Arena to Brain (opt-in).
5. **Later:** Brain Phases 2 to 4, Arena Phases 2 to 4 (formats, inter-school, Academic League), Career Hub Try/Connect/Guide.

---

## 5. UI/UX brief

### 5.1 Screens to design (from the source plans)

**Brain**
| Audience | Screen | Primary action |
|---|---|---|
| Teacher | Question mapping | Verify question to topic/subtopic |
| Teacher | Manual question marks | Enter scores with validation, efficient class-wide entry |
| Teacher | Import report | Upload, map columns, preview, resolve mismatches, approve |
| Teacher | Class concept insights | See topics to reteach, with sample sizes and coverage |
| Student | My Brain | Explore topic knowledge map |
| Student | Topic detail | Evidence, history, trend, practice, next steps |
| Student | Knowledge Frontier | Demonstrated knowledge / learning frontier / future topics |
| Parent | Child's Brain | Strengths, gaps, growth in plain language |
| Parent | Ask about my child | Chat with record-grounded assistant |
| Parent | Home support plan | Short plans (e.g. 15 min Monday), completion tracking |
| Parent | Growth timeline | Topic performance across terms with comparability info |
| Parent | Discuss with teacher | Evidence-backed focused conversation |

**Companion:** Ask the Companion; Recommended for You; Practice & Flashcards; Learning Progress; Explore Any Topic (not restricted to year level).

**Arena:** organizer setup (title, subjects, eligibility, scope, rounds, timers, scoring, question bank approval, roster); live lobby; live question screen; live leaderboard/standings; results archive; certificates and badges; moderator controls; optional spectator view. Roles: student, teacher/organizer, school admin, EduConnect event team, parent, spectator.

**Career Hub:** Interest Discovery; Career Explorer; Try-a-Career challenges; Pathway Suggestions; Growth Portfolio. Views for student, parent, teacher/counsellor.

### 5.2 Rules every screen must follow

**Honest data display**
- Every topic insight shows its **evidence strength** (number of questions/assessments, marks available), **recency / last assessed date**, and links to the underlying assessments.
- Show "limited evidence" states instead of conclusions when evidence is thin. Do not label *mastered / improving / struggling* without the agreed criteria.
- Wording is about **observed performance on assessed questions**, never about ability, intelligence, personality or potential as a fixed trait.
- Never say or imply why a student got a question wrong. Possible prerequisite gaps are **hypotheses to check**, worded that way.
- Distinguish missing / absent / exempt / not-marked from zero. Never render missing as 0.
- Keep **school assessment**, **practice**, **competition** and **interest/portfolio** evidence visually distinct (separate layers, labels, or colours). Practice must never look like an official result.
- Trend claims must note comparability of assessments (difficulty, coverage).

**Tone and child safety**
- Celebrate effort and demonstrated improvement. No comparison with other students in Brain views, no rankings.
- Notifications must not be alarmist or fire on a single wrong answer.
- Career Hub: never deterministic ("you are meant to be a doctor", "you cannot become an engineer"). Show a range of options. Time-sensitive admission/qualification facts need a current verified source or a clear "verify" note.
- Struggling students get a supportive pathway, never a "you can't".
- Public leaderboards for minors: minimal identifying data, no grades or learning difficulties exposed, school/guardian controls.
- Students can always: ask for a different explanation, challenge an answer, escalate to a teacher.
- Parent and teacher views must not expose private student conversations by default.

**Control and consent**
- Students (and guardians as appropriate) control what is shared with teachers/parents. Portfolio sharing is explicit.
- Teachers approve question tags and imported reports before they affect interpretations. Unrecognised report layouts are rejected or sent to manual reconciliation, never silently guessed.
- AI suggestions are clearly marked as suggestions and are reviewable and editable.

**Practical constraints**
- **Mobile-first and low-bandwidth.** Nigerian school conditions: inconsistent connectivity, modest devices. Keep payloads light.
- Live Arena screens: readable question view, server-authoritative timers, graceful reconnection, visible reconnect/disconnect state. Do not require fast typing or fast connections to compete.
- Accessible interaction modes where feasible.
- Role-based views and school isolation: a user only ever sees records they are authorised for.

---

## 6. Security and compliance gate (Phase 0)

No real student data goes to any AI service until these are done:
1. Review the **publicly accessible report-card storage bucket** noted in the Brain plan. Make it private, serve files via short-lived signed URLs, check what was exposed (object list and access logs), rotate anything sensitive.
2. Enforce **school-scoped access** on every read, upload, calculation and AI retrieval.
3. Add **audit logging** and **scan/validate uploads** (treat uploaded documents as untrusted).
4. **Pseudonymise** students before sending anything to a model. Send only what is needed.
5. Legal review against the **Nigeria Data Protection Act 2023** and child-privacy requirements before pilot.

**Ownership (to confirm with user):** backend developer implements items 1 to 4 (needs cloud-account access). Product owner decides timing, consent and retention policy, and arranges legal review. Frontend consumes signed URLs and builds consent screens.

---

## 7. Working agreements with the user

- Nothing here authorises code, deployment, schema migration or repo change by itself. Wait for the user to say start.
- Before technical design, inspect the existing EduConnect entities, schemas and endpoints in both repos. The data model in the Brain plan is conceptual only.
- When starting any UI/UX build: re-read section 5, ask about any **Open** items that affect the screen being built, and use the user's own approvals to update section 2.
- Update this file when decisions change. Keep `sources/` as the original record.

---

## 8. Codebase findings (inspected 2026-11-23)

**Where Student Brain lives: `devavala/educonnect-application`** (confirmed by user). Branch `dev` is the default; session work goes on `claude/gracious-curie-ylyt1w`.

- **`educonnect-application`** is the school portal: React 19, Vite 7, Tailwind 4, shadcn/ui (new-york style) + Radix, a few Chakra remnants, Recharts, react-hook-form + zod, axios, framer-motion, lucide icons, PWA with offline support. Plain JS/JSX (no TypeScript). Tests: `node --test tests/*.test.mjs`. Lint: `eslint .`.
- **`educonnect-frontend`** is the public marketing site. Not where Brain lives.
- **There is no backend repo in this session's scope.** The app calls an external API via `VITE_API_URL`. All new endpoints for Brain/Companion/Arena/Career Hub need the backend developer. Frontend work should be built against mocked API contracts first (repo already has `MockAPIswithLive.js` and per-area `services/*APIs.js` files as the pattern).
- **Roles that exist today: `admin`, `teacher`, `parent` only.** There is NO student role, login or dashboard. Student-facing screens (My Brain, Knowledge Frontier, Companion, Career Hub, Arena player) need a student role first. Routes are `/dashboard/{role}/...` guarded by `ProtectedRoute requiredRole`. **Decision (2026-11-23): Student Brain has no student view, so no student role is needed for it.**
- **Existing grading stores one score per student per assessment entry** (`maxObtainableScore`, `scoreObtained`, policy components CA/exam) in `TeacherDashboard/ScoreEntryPage.jsx` and `services/assessmentEntryAPIs.js`. **There is no question-level data anywhere.** Brain needs new entities: questions, question-to-topic tags, per-question scores, knowledge nodes, evidence, snapshots (see Brain plan section 10), plus new endpoints.
- **Reusable pieces:** `AcademicContext` (year/term scope), `utils/csv.js` and `settings/DataImportPage.jsx` (import patterns), teacher `StudentAnalytics.jsx`, parent `MyChildren.jsx` (child selection), admin `StudentProfilePage.jsx` (DetailPage example), `Recharts` for charts.
- **Design tokens** (`src/index.css`): brand/primary `#002684`, font Inter, radius 0.75rem, chart colours `#002684 #3b82f6 #10b981 #f59e0b #ef4444`, dark mode via `data-theme="dark"` + `.dark` (`pages/application/dark-mode.css`, `utils/theme.js`).
- **Mandatory pattern library** (`src/components/patterns/README.md`, import from the barrel): `WorkbenchTable` (every list; row click opens a detail page, never a modal), `DetailPage`, `Wizard`, `StatusChip` (one colour vocabulary, map new statuses in `STATUS_TONES`), `ApprovalInbox`, `EmptyState` (first-use / filtered / error), `FormKit`, `useKeyboardGrid` (spreadsheet-style score entry, Excel paste), `ConfirmDestructiveDialog`, `Timeline`, `pushToast`, `Skeletons` (skeleton-first loading, no spinners). Never build one-off tables, badges, modal detail views or spinners.
- **Existing design philosophy** (`docs/FRONTEND_EXPERIENCE_BLUEPRINT.md`): dashboards lead with tasks, setup is a wizard, lifecycles visible as chips/steppers, one canonical detail page per entity, approvals as an inbox, tables as workbenches, parent and teacher are phone-first (bottom tab bar), admin is desktop-first. Brain screens must follow this.
- **Navigation lives in** `AdminDashboard/navigation/navConfig.js`, `TeacherLayout.jsx`, `ParentLayout.jsx`.

---

## 9. Build log

### 2026-11-23 — Student Brain, Phase 1 slice (teacher + parent), built against demo data

**Decisions made this session (confirmed by the user):**
- Start with **teacher and parent screens, built in code** inside `educonnect-application` using the existing pattern library. Figma-first was not chosen.
- **No student view. Student Brain is for teachers and parents only (confirmed by the user).** There is no student login for Brain, so My Brain and Knowledge Frontier screens are dropped. **Knock-on for the other features (open, must be decided before they are built):** the source plans for the AI Study Companion and the Career & Talent Hub, and the player side of Academic Arena, are student-facing. Without student logins each needs a decision: parent-mediated, teacher-mediated, or a separate student access later. **Now parked: see section 0.**

**What exists** (branch `claude/gracious-curie-ylyt1w`, all under `src/pages/application/Brain/`):
- `brainMath.js`: the deterministic evidence rules (missing is not zero, shared marks for multi-topic questions, evidence strength, bands, trend, class insights, CSV import preview, parent summary). 22 unit tests in `tests/brainMath.test.mjs`.
- Teacher routes: `/dashboard/teacher/brain` (assessments list), `/brain/assessments/:id` (questions and topics, enter marks, import report), `/brain/insights` (class insights).
- Parent route: `/dashboard/parent/brain` (learning map with evidence, trend, "see the assessments behind this", progress across tests).
- `services/brainAPIs.js` + `brainMockStore.js`: all data is an invented in-memory demo set. Every Brain page shows a "Demo data" banner while it is on. `VITE_BRAIN_USE_MOCKS=false` switches to real endpoints.
- `docs/STUDENT_BRAIN_API_CONTRACT.md`: the proposed endpoints and rules for the backend developer.
- **Animated brain map** (`brainViz.js`, `components/BrainViz.jsx`), shown on the parent Learning Map. A 2D SVG brain, chosen over 3D so it stays light on cheap phones and slow data. One glowing point per topic: colour = performance band (never red), size = evidence strength, hollow dashed = limited evidence, dim = not assessed yet, outward ripple = marks have gone up. Lines join only points of the same topic group (no cross-topic links, because prerequisites are undecided). Slow idle motion with a Pause button, switched off entirely for "reduce motion". Keyboard and screen-reader accessible; the topic list below it is the full-detail version. It states plainly that it is not a measure of intelligence. Meant to be reused for the student's own "My Brain" view once student logins are decided.

### 2026-11-23 (later) — Teacher repository of student brains

- **Student brains** is now the teacher's landing page at `/dashboard/teacher/brain` (tabs: Student brains, Class insights, Assessments at `/brain/assessments`). Opens with every student and a still mini brain each. A "Who could use support?" panel narrows it by topic and level (Everyone, Needs focused practice, Needs practice or still developing, Not enough evidence yet), with one-tap "Most common" topics. Filters live in the URL so a view can be shared.
- Row click opens that student's full brain (`/brain/students/:studentId`): animated brain, topic cards, progress across tests, plain-words summary. The filtered topic is pre-selected. Class-insights rows click through to the matching focused-practice list.
- **Rules kept:** students with limited evidence are never listed as needing practice, they appear under "Not enough evidence yet" and in a "Not included above" note. Unassessed students are listed separately. Sorting puts enough-evidence students first, lowest marks first; thin evidence never floats to the top. Wording is "could use support", never "weak" or "lacking", and the page says it is not a ranking.
- Endpoints added to the contract: `GET /api/teacher/brain/students` and `/students/:studentId`. Teachers must only ever receive students from classes they teach.

**Provisional and awaiting the product owner** (all in `brainMath.js`, one place to change):
- Band cut-offs (strong ≥ 85, well ≥ 70, developing ≥ 50, else needs focused practice).
- Minimum evidence for a label (3 marked questions and 10 marks). Below it a topic is "Limited evidence".
- Trend counts as a change at ±10 points. Class view counts "at or below 50%".
- Topic suggestions are a **keyword mock**. No AI tool or model is chosen. The UI always labels them "Suggested, needs review".

**Not built yet (Phase 1 gaps):** PDF/XLSX import (CSV only), creating or uploading a question paper, teacher-picks-class/subject selector on insights, "Discuss with teacher", home support plan, Parent AI assistant.

**Open question for the backend developer:** how a Brain assessment relates to the existing grading `AssessmentEntry` (see the API contract). Existing grading stores one total score per student, not per question.

**Do not forget:** the Phase 0 security gate (section 6) still applies before any real student data is used.
