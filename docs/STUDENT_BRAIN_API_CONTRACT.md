# Student Brain — Proposed API Contract (Phase 1)

**Status:** proposal for the backend developer. The frontend is built and reviewed against an in-memory demo
store (`src/pages/application/Brain/services/brainMockStore.js`). Nothing here exists on the server yet.
Set `VITE_BRAIN_USE_MOCKS=false` to make the screens call these endpoints instead of the demo store.

Source of truth for the product rules: `AI_LAB_MASTER_PLAN.md` and `educonnect_student_brain_plan.md`.
Frontend logic that the server must reproduce exactly: `src/pages/application/Brain/brainMath.js`
(covered by `tests/brainMath.test.mjs`, which can be used as a reference test suite).

## Principles the API must uphold

1. **The server is the source of truth for every figure.** The browser must never be trusted to compute
   official evidence. The frontend only mirrors the maths in demo mode.
2. **Official marks are never changed by Brain.** Brain stores evidence derived from marks; it never edits
   the existing assessment or report-card records.
3. **School isolation.** Every query is scoped to the caller's school. A teacher only sees classes and
   subjects they teach. A parent only sees children linked to their account. Return 404 (not 403) for
   records outside the caller's scope.
4. **Marks only count once the topic mapping is approved.**
5. **Missing is not zero.** `absent`, `exempt` and `not_marked` are stored distinctly and are excluded from
   both earned and available totals.
6. **Auditable.** Mapping approvals, reopenings (with reason), imports and mark saves each write a history
   entry: who, when, what, why.

## Data model (new entities)

Existing school entities (students, classes, subjects, terms, teachers) are reused by id.

| Entity | Fields |
|---|---|
| `KnowledgeNode` | `id`, `subject`, `topic`, `subtopic` (hierarchy: Subject → Topic → Subtopic; deeper levels later) |
| `BrainAssessment` | `id`, `title`, `className`, `subjectName`, `termId`, `date`, `mappingStatus` (`draft` \| `awaiting_approval` \| `approved`), `marksSource` (`manual` \| `import` \| null), `history[]` |
| `AssessmentQuestion` | `id`, `assessmentId`, `label` (e.g. "Q1"), `text`, `maxMarks`, `tags[]`, `suggested` (bool) |
| `QuestionTag` | `nodeId`, `share` (0–1; omit when a question has a single topic) |
| `StudentQuestionScore` | `studentId`, `questionId`, `status` (`scored` \| `absent` \| `exempt` \| `not_marked`), `earned` (number or null) |
| `HistoryEntry` | `title`, `user`, `at` (ISO), `tone`, `comment` |

Open question for the product owner: how a `BrainAssessment` relates to the existing `AssessmentEntry`
(grading). Brain needs per-question marks, which the current grading model does not store. Options are a
1:1 link to an existing entry, or independent records that only share the class/subject/term.

## Validation rules (server must enforce)

- `0 ≤ earned ≤ maxMarks` for `scored`; `earned` must be null for other statuses.
- A question's tags: at least one; unique `nodeId`s; shares each > 0 and summing to 1 (tolerance 0.005);
  a single tag implies share 1.
- `approve-mapping` is rejected unless **every** question has valid tags.
- Tags cannot be edited while `mappingStatus` is `approved`. `reopen-mapping` requires a non-empty reason,
  sets status back to `draft`, and removes the assessment's marks from all evidence until re-approved.
- Marks can only be saved when `mappingStatus` is `approved`.
- Import: the client previews and validates in the browser, but the server must re-validate the payload.

## Teacher endpoints

All under `/api/teacher/brain`, teacher role required. Responses are wrapped as the rest of the API is
(`{ success, data }`); the frontend unwraps `data`.

| Method & path | Body | Returns |
|---|---|---|
| `GET /topics` | — | `{ nodes: KnowledgeNode[] }` |
| `GET /assessments` | — | `{ assessments: Summary[] }`, summary = `id, title, className, subjectName, date, mappingStatus, marksSource, questionCount, questionsMapped, totalMarks, studentsMarked, studentCount` |
| `GET /assessments/:id` | — | `{ assessment, students: [{ id, fullName, admissionNo }], marks: { [studentId]: { [questionId]: { status, earned } } } }` |
| `POST /assessments/:id/suggest-topics` | — | `{ assessment }` — proposes tags for questions that have none; sets `suggested: true`. **Suggestions only.** No tool or model is chosen yet. |
| `PUT /assessments/:id/questions/:qid/tags` | `{ tags: [{ nodeId, share? }] }` | `{ assessment }` — clears `suggested` on that question |
| `POST /assessments/:id/approve-mapping` | — | `{ assessment }` — 400 with a message if any question is invalid |
| `POST /assessments/:id/reopen-mapping` | `{ reason }` | `{ assessment }` |
| `PUT /assessments/:id/marks` | `{ marks: { [studentId]: { [questionId]: { status, earned } } }, source: 'manual' \| 'import' }` | `{ assessment, marks }` — replaces the marks for each student present in the body; students not in the body are untouched |
| `GET /class-insights?className=&subjectName=` | — | `{ className, subjectName, studentCount, nodes, assessments: [{ id, title, date }], rows }` |
| `GET /students` | — | `{ className, subjectName, nodes, students: [{ id, fullName, admissionNo }], evidence: { [studentId]: { [nodeId]: NodeEvidence } }, assessments: [{ id, title, date }] }` — every student in the teacher's class with their per-topic evidence (same shape as the parent endpoint). Powers the Student brains list. Only students from classes this teacher teaches. |
| `GET /students/:studentId` | — | `{ student, className, subjectName, nodes, evidence, assessments }` — one student's brain. 404 if the student is not in one of the teacher's classes. |

The Student brains list filters on the client from this one response ("who could use support in topic X" is `findStudentsForSupport()` in `brainMath.js`, covered by tests). For large schools the server may paginate or filter by `?topic=&level=`; the rules to reproduce are: a student counts as "needs focused practice" only when their evidence for the topic is not `limited` and `pct < 50`; students with `limited` evidence are listed separately as "not enough evidence yet" and are **never** counted as needing support; students with no evidence on the topic are "not assessed".

`rows[]` (one per topic with any evidence):
`{ nodeId, classPct, studentsWithEvidence, studentsLimited, studentsBelow, pctBelow, questions, assessments }`
— see `classInsights()` in `brainMath.js` for the exact definition. A student only counts as "below"
(≤ 50%) when their evidence for that topic is not "limited".

## Parent endpoint

| Method & path | Returns |
|---|---|
| `GET /api/parent/brain/children/:studentId` | `{ studentId, nodes, evidence, assessmentCount }` |

`evidence` is `{ [nodeId]: NodeEvidence }`:

```json
{
  "nodeId": "math.seq.ap",
  "earned": 12.5, "available": 33, "pct": 38,
  "questions": 6, "assessments": 3,
  "lastAssessed": "2026-11-17",
  "series": [
    { "assessmentId": "bas_001", "title": "Mathematics Test 1", "date": "2026-09-22",
      "earned": 2, "available": 8, "pct": 25, "questions": 2 }
  ]
}
```

Only approved assessments contribute. Return only children linked to the signed-in parent. Return `evidence: {}`
(not an error) when no approved assessments have marks yet.

## Calculations to reproduce (see `brainMath.js`)

- **Per topic:** sum `earned × share` and `maxMarks × share` over scored questions; `pct = round(earned/available × 100)`.
- **Evidence strength:** `limited` if `questions < 3` or `available < 10`; `good` if `assessments ≥ 2` and `questions ≥ 5`; otherwise `moderate`.
- **Performance bands** (only when evidence is not limited): `≥ 85` strong, `≥ 70` well, `≥ 50` developing, else needs focused practice.
- **Trend:** needs ≥ 2 assessments; ±10 points between first and last counts as increased/decreased.

> ⚠ **All thresholds above are provisional.** The product owner has not approved the cut-offs or the minimum
> evidence rules (Brain plan §14, question 6). Keep them in one configuration place so they are easy to change,
> and have the server return the band and strength rather than having clients re-derive them.

## Security and privacy requirements

- Do not send student names or admission numbers to any AI service. Use opaque ids.
- No AI service is chosen. `suggest-topics` must work behind an interface that can be swapped.
- Do not expose these endpoints to students or to other schools' staff.
- Apply the Phase 0 gate in `AI_LAB_MASTER_PLAN.md` §6 (private storage for uploaded reports, signed URLs,
  school-scoped access, audit logging) before any real student data is used with AI features.
