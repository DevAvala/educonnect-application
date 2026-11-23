# EduConnect AI in Education Lab: Student Brain

**Document type:** Product concept and planning specification  
**Status:** Brainstorming draft, not an approved implementation specification  
**Prepared:** 12 November 2026  
**Product:** EduConnect, a school information system  
**Scope:** Student Brain, its assessment integration, adaptive learning, and parent/teacher experiences. The competition system is deliberately excluded from this document.

---

## 1. Vision

**Student Brain is a continuously updated, evidence-based knowledge map for each learner.** Rather than treating a subject grade as the complete picture of a student's ability, it identifies the **topics and subtopics** in which the learner performs well, needs support, is improving, or may be ready to explore more challenging work.

The system is meant to help:

- **Students** understand what they know, where they need practice, and what they can explore next.
- **Teachers** identify individual and class-wide learning gaps and choose targeted interventions.
- **Parents/guardians** understand academic results and provide meaningful support, even when they cannot personally teach the topic.

### Core principles

1. **Track concepts, not just subjects.** “Improving in linear equations but struggling with arithmetic progressions” is more useful than “Mathematics: 72%.”
2. **Use data the school actually has.** Student Brain does **not** require a student's written answer scripts or steps.
3. **Use evidence, not labels.** A poor score on one question suggests a potential learning gap, not a permanent judgment of ability.
4. **Recognize uneven ability.** A student can be ahead of the class in one concept and need reinforcement in another.
5. **Encourage learning beyond grade level.** Readiness is based on demonstrated prerequisite skills, not only class placement.
6. **Guide, do not gatekeep.** Recommendations support curiosity; they should not prevent students from exploring advanced topics.
7. **Make AI outputs reviewable.** AI may suggest tags and explanations, but validated assessment data and deterministic calculations anchor the system.
8. **Protect children and school data.** Provide role-based permissions, school isolation, data minimization, and human oversight.

## 2. Data Student Brain Can Use

### 2.1 Available and expected inputs

| Input | What it provides | How it is used |
|---|---|---|
| Question paper or structured assessment | Question ID, subject, wording, maximum marks, potentially topic context | Map each question to relevant curriculum concepts |
| Answer key / marking scheme | Correct answer, marks available, topic context where present | Support question classification and mark validation; **not** interpretation of the learner's reasoning |
| Per-student marking report | Marks earned on each question | Compute question-, topic-, and subtopic-level evidence |
| Historical tests and examinations | Repeated observations across time | Distinguish isolated results from consistent patterns and trends |
| Curriculum and topic catalogue | Subject hierarchy, expected class or stage, prerequisites | Build knowledge nodes and recommend learning paths |
| Optional learner activity records (proposed) | Verified scores on practice and diagnostic activities | Track learning between school assessments, clearly labeled by evidence type |

**Firm constraint:** The school does **not** have access to the students' actual written answers for Student Brain. The product must never claim to know exactly *how* or *why* an individual student answered incorrectly from a question-level mark alone.

### 2.2 Two supported score-collection methods

**Method A: Manual score entry**

- Teacher enters the mark for each student against each question in EduConnect.
- Each question has a maximum score and approved curriculum classification.
- Entry UI should support efficient class-wide marking and validation.

**Method B: Marking report upload**

- Teacher uploads an existing score report, initially prioritizing structured **CSV/XLSX** and later **PDF** where extraction is reliable.
- System previews extracted students, question IDs, earned marks, and maximum marks.
- Teacher resolves mismatches and approves the import before scores are used.
- Uploaded report formats may differ among schools; unrecognized layouts must be rejected or sent for manual reconciliation rather than silently guessed.

These two methods lead to the **same normalized assessment data**. A single assessment may use either method, or a controlled combination, without duplicating a result.

### 2.3 Question classification workflow

1. Teacher creates an assessment or supplies the question paper and available answer key/marking scheme.
2. AI **may propose** subject → topic → subtopic → concept/skill classifications for each question.
3. Teacher reviews and approves classifications; teachers can also assign them directly without AI.
4. EduConnect associates each question with maximum marks and an approved topic mapping.
5. Student marks arrive through manual entry or upload.
6. Backend validates and aggregates scores before updating the learner's knowledge map.

Question classification can be coarse when the question supports only coarse conclusions. Where a question tests several concepts, assign defensible topic shares (or mark it as multi-topic) rather than counting the full marks in every topic.

## 3. Knowledge Map Structure

**Hierarchy:** `Subject → Topic → Subtopic → Concept → Skill`.

Example (illustrative taxonomy, to be aligned to each school's curriculum):

```text
Mathematics
├── Algebra
│   ├── Linear equations
│   ├── Quadratic equations
│   └── Simultaneous equations
│       ├── Two unknowns
│       ├── Three unknowns
│       └── Four unknowns
├── Sequences and series
│   ├── Arithmetic progressions
│   │   ├── Recognize the sequence
│   │   └── Find the nth term
│   └── Geometric progressions
└── Geometry
    └── Circle theorems
```

**Implementation distinction:** Student Brain may display a concept or skill only as precisely as the mapped questions and their available scores justify. A single question classified as “arithmetic progressions” cannot establish that the student specifically failed “substitution into the nth-term formula.” A finer conclusion requires separately scored components or additional targeted assessments.

### 3.1 Example map (invented for product illustration)

| Subject | Topic / subtopic | Observed score | Suggested interpretation |
|---|---|---:|---|
| Mathematics | Algebra: Linear equations | 92% | Performing strongly |
| Mathematics | Algebra: Quadratic equations | 84% | Performing well |
| Mathematics | Sequences: Arithmetic progressions | 38% | Needs focused practice |
| Mathematics | Sequences: Geometric progressions | 65% | Developing |
| Mathematics | Geometry: Circle theorems | 89% | Performing strongly |

Scores above are **fictional examples**. Real UI must also communicate how much assessment evidence supports each conclusion.

### 3.2 Recommended node fields

Each knowledge node can carry:

- **Evidence-based performance:** Earned marks / available marks on mapped questions, with a defined window and weighting policy.
- **Evidence strength:** Number of independently assessed questions, assessments, marks available, and recency.
- **Trend:** Change in comparable performance over time, when sufficient observations exist.
- **Coverage:** Whether all major parts of a topic have been assessed or only a narrow part.
- **Readiness:** Whether prerequisites for optional next concepts have been demonstrated.
- **Source breakdown:** Formal school assessments versus optional practice/diagnostic work, if added.
- **Last assessed date:** To avoid treating old scores as current knowledge.

Words like *mastered*, *improving*, or *struggling* should be tied to transparent criteria and withheld where evidence is insufficient. A number alone should not be presented as a clinical or psychological measure of intelligence.

## 4. How Performance Updates the Brain

### 4.1 Basic rule

For each tagged question, the platform records:

```text
student_id + assessment_id + question_id
+ max_marks + earned_marks
+ approved topic/subtopic tags
```

**Example:** Q1 is tagged “Algebra → Linear equations,” worth 10 marks; the student earns 2/10. Student Brain records weak **observed performance on that question/topic**, without pretending to know the student's written method.

### 4.2 Aggregation

- Validate `0 ≤ earned_marks ≤ max_marks` and question/assessment ownership.
- Aggregate earned and available marks for each mapped node; use a documented rule for multi-topic questions.
- Preserve missing, absent, exempt, not-marked, and not-attempted statuses distinctly. Do not convert missing data automatically to zero.
- Track each assessment separately so trends remain auditable.
- Avoid double counting marks across topic rollups.
- Distinguish a topic's **performance percentage** from a stronger **mastery estimate**, which may need more evidence and a calibrated algorithm.
- Compare similar question difficulty and coverage when making trend claims; a higher raw percentage on an easier test may not mean better mastery.

### 4.3 Repeated evidence

A sample sequence of scores on arithmetic progression questions might be:

| Assessment | Observed performance |
|---|---:|
| Test 1 | 20% |
| Test 2 | 45% |
| Test 3 | 75% |

The Brain can say: **“Performance on assessed arithmetic progression questions increased across these three assessments.”** It should avoid saying all related skills are now mastered unless the coverage and evidence support that statement.

### 4.4 Learning-gap recommendations

When repeated evidence shows poor performance in a mapped topic, the system proposes:

- A short explanation of the topic.
- Practice questions at an appropriate difficulty.
- Links to prerequisite topics, where known.
- A short optional knowledge check to see whether performance improves.

The system **cannot identify the exact misconception** from total question marks alone. It can suggest possible prerequisite gaps as **hypotheses to check** using targeted practice.

## 5. Adaptive Learning and Beyond-Class Advancement

### 5.1 Learning pathways

1. **Recovery path:** Revisit topics with repeated low performance and relevant prerequisites.
2. **Standard path:** Reinforce current curriculum topics and build confidence.
3. **Advancement path:** Offer more challenging topics when prerequisite performance is strong.

These are recommendations per **concept**, not fixed labels assigned to the child. A student may be on the advancement path in algebra and the recovery path in geometry at the same time.

### 5.2 Personal example that motivated the feature

A student in **JSS2** who demonstrates strong understanding of simultaneous equations with **two unknowns** may be ready to try problems with **three unknowns**, then **four unknowns**, even if those problems are generally taught in later classes.

Illustrative progression:

```text
Strong evidence: simultaneous equations with two unknowns
            ↓
Offer exploratory questions with three unknowns
            ↓
Use results to decide whether to suggest four unknowns
            ↓
Continue learning regardless of current class level
```

The platform must not equate one high score with full readiness; recommendations should consider prerequisites and verified assessment coverage.

### 5.3 Knowledge Frontier (proposed visual treatment)

- **Demonstrated knowledge:** Topics with adequate supporting evidence.
- **Learning frontier:** Topics the learner may be ready to explore next.
- **Future topics:** Topics with unconfirmed prerequisites, still available for exploration.

**Open exploration:** A student interested in calculus or astronomy should be able to access age-appropriate introductory material without being blocked by their class or prior scores. The Brain can explain recommended prerequisites and starting points.

## 6. Student Experience

### Student Brain dashboard

- Interactive map organized by subjects, topics, and subtopics.
- Clear visual distinction between observed strengths, developing areas, and limited evidence.
- Topic details showing assessment history, trend, and learning recommendations.
- Suggested next lesson or practice activity.
- Optional advanced challenges tied to readiness, not class alone.
- Progress celebrations that focus on effort and demonstrated improvement, not comparison with other students.

### Optional continuous practice loop (proposal)

```text
School assessment identifies topic gap
  → Student sees targeted revision
  → Student completes practice/diagnostic activity
  → Result is recorded as practice evidence
  → Knowledge map and recommendation are updated
```

Formal examination evidence and practice evidence should remain distinguishable so extra practice does not overwrite or misrepresent school grades.

## 7. Parent / Guardian Experience

**Parent value proposition:** Turn a report card into a clear explanation of learning progress, specific ways to help, and appropriate opportunities for advancement.

### 7.1 Parent Intelligence Dashboard

Show:

- A plain-language summary of the child's academic development.
- Topics performing well, topics needing attention, and where evidence is still limited.
- Recent improvements and persistent learning gaps.
- Optional advanced topics the child may be ready to explore.
- Links to recommended home learning activities.

**Sample explanation (fictional):**

> “David is showing stronger performance in linear and quadratic equations. Arithmetic progression questions remain difficult across recent assessments. His results suggest trying short, focused practice in arithmetic progressions. He may also be ready to explore more advanced simultaneous equations.”

### 7.2 AI Parenting Assistant

An assistant grounded in the child's **authorized academic records** and verified topic mappings, not generic invented explanations.

Example questions parents can ask:

- “What topics are holding my child back in Mathematics?”
- “How did their algebra performance change this term?”
- “I don't know this topic. How can I help them practise?”
- “Which advanced topics could they try next?”
- “What should we focus on for the next two weeks?”

The assistant should cite or link back to the relevant assessments and state uncertainty where needed. It must not infer mental health conditions or diagnose learning disorders from marks.

### 7.3 Academic Growth Timeline

Show topic-level performance across tests and terms rather than relying solely on term averages.

| Topic | Term 1 | Term 2 | Term 3 |
|---|---:|---:|---:|
| Linear equations | 55% | 78% | 92% |
| Arithmetic progressions | 40% | 38% | 45% |
| Geometry | 70% | 82% | 89% |

*Illustrative scores only. Views should include the number and comparability of assessments.*

### 7.4 Home Learning Companion

Create short, flexible, parent-friendly plans such as:

- Monday: 15 minutes of arithmetic progression revision.
- Wednesday: 10 minutes of guided practice.
- Friday: Short knowledge check.
- Weekend: Review progress and decide what to practise next.

Parents may specify available time and ask for simple ways to encourage learning without having to know the subject themselves.

### 7.5 Intelligent Notifications

Possible events, subject to evidence thresholds and parental preferences:

- **Academic breakthrough:** Clear improvement across repeated assessments.
- **Learning gap:** A topic continues to show weak observed performance.
- **Advanced learning opportunity:** Sufficient prerequisite evidence for a suggested next challenge.
- **Improvement after practice:** Better verified performance following an assigned activity.

Avoid alarmist notifications and frequent messages about a single wrong answer.

### 7.6 Parent–Teacher Intelligence

- Parent can choose **Discuss with Teacher** on a specific topic.
- EduConnect drafts an evidence-grounded summary of relevant scores and concerns.
- Teacher reviews, replies, and may recommend an activity.
- Follow-up appears in the parent view without replacing teacher judgment.

### 7.7 Growth and potential discovery

Parents see topic-specific potential instead of a single “gifted” or “weak” label. For instance, a child could be ready to explore more advanced algebra while still benefiting from support in sequences.

### 7.8 Parent Impact Tracking (proposed)

Show home learning activities completed alongside changes in later assessment results. Phrase this as **association**, not proof that the parent's support caused improvement.

### 7.9 Parent-contributed interests / Discovery Brain (proposed)

Parents could note interests such as astronomy, robotics, music, or wildlife. The platform could offer optional, age-appropriate exploration paths.

Keep **Academic Brain** (demonstrated assessed knowledge) separate from **Discovery Brain** (interests and exploration preferences): liking astronomy is not evidence of competence in astronomy. Consider allowing students to express interests directly and review or opt out of parent-suggested activities.

## 8. Teacher Experience

- Review and edit AI-proposed question-to-topic classifications.
- Enter question scores manually or import a structured marking report.
- View each student's topic-level map and supporting assessment evidence.
- See class-wide topic patterns, such as “Many students missed arithmetic progression questions,” with sample sizes and coverage.
- Create targeted revision recommendations or assignments.
- Review parent-facing messages and respond to focused requests.
- Correct erroneous tags and reprocess affected summaries with an audit trail.

**Class example:** “On the latest assessment, 68% of students scored below the chosen threshold on arithmetic progression questions.” This is a sample of the intended report style, not real data.

## 9. AI vs Deterministic Logic

### Suitable AI roles

- Suggest topic/subtopic tags from question papers and marking schemes.
- Structure information from uploaded marking reports (with human verification).
- Explain calculated results in accessible language.
- Generate study plans, explanations, and optional practice material.
- Answer parent questions using retrieved, permission-checked student records.
- Suggest possible next concepts based on an approved prerequisite graph.

### Suitable deterministic roles

- Validate student identity, question IDs, mark bounds, and totals.
- Apply approved topic tags and mark allocations.
- Compute aggregation, evidence counts, changes, and notification eligibility.
- Manage role permissions, consent, school isolation, and audit logs.
- Keep official assessment records authoritative and unchanged by AI-generated text.

**Model selection is intentionally undecided.** The user will propose AI systems and provider choices later. Design should allow different models for extraction, tutoring, and natural-language explanations without committing to a provider in this planning phase.

## 10. Conceptual Data Model (Proposal, Not Existing Schema)

| Entity | Purpose |
|---|---|
| `CurriculumVersion` | School/curriculum context and versioned subject structure |
| `KnowledgeNode` | Topic, subtopic, concept, or skill in a hierarchy |
| `PrerequisiteEdge` | Related skills and recommended learning order |
| `Assessment` | Test/examination metadata, date, class, subject, status |
| `AssessmentQuestion` | Question ID, max marks, source paper reference |
| `QuestionKnowledgeTag` | Approved link between question and knowledge node, optional attribution weight |
| `StudentQuestionScore` | Student's earned marks or non-score status for a question |
| `KnowledgeEvidence` | Computed evidence by learner, node, assessment, and source |
| `KnowledgeSnapshot` | Versioned topic performance, trends, and confidence summary |
| `LearningRecommendation` | Suggested remediation, reinforcement, or advancement |
| `StudentLearningActivity` | Optional learning/practice result, kept distinct from official assessments |
| `StudentInterest` | Optional exploration interests, separate from assessment evidence |
| `ParentSupportPlan` | Optional parent-friendly learning tasks and completion data |
| `ReviewAudit` | Changes to mappings, imports, approvals, and generated summaries |

**Note:** This is a conceptual design only. Existing EduConnect entities, schemas, and endpoints must be inspected before any technical design is finalized.

## 11. Safety, Privacy, and Fairness

- **Minor/student data:** Use strict role-based access and verified guardian–student links.
- **Tenant isolation:** All reads, calculations, uploads, and AI retrieval must be limited to the authorized school and learner.
- **Data minimization:** Send only needed information to AI services. Replace pupil names with placeholders where possible.
- **Human approval:** Teachers confirm question mapping and imported reports before they affect official interpretations.
- **Data quality:** Show when classifications are uncertain or assessments do not cover a whole topic.
- **Explainability:** Every topic insight should link to its assessment evidence and calculation method.
- **No harmful labeling:** Do not infer IQ, fixed aptitude, disability, personality, or psychological traits from scores.
- **Notification care:** Avoid shaming, pressure, or rankings that discourage students.
- **Responsible document processing:** Treat uploaded documents as untrusted content, scan/validate, and restrict retention.
- **Guardian involvement:** Respect appropriate student agency and privacy, particularly for older students.
- **Operational prerequisite:** Review the currently noted public report-card storage bucket and other security controls before processing real student data with AI.
- **Legal review:** Check compliance with applicable Nigerian data protection and child privacy requirements before rollout.

## 12. UX Screens to Design (Proposed)

| Audience | Screen | Primary action |
|---|---|---|
| Teacher | Question mapping | Verify question → topic/subtopic associations |
| Teacher | Manual question marks | Enter scores with validation |
| Teacher | Import report | Upload, map columns, preview, approve |
| Teacher | Class concept insights | Identify areas to reteach |
| Student | My Brain | Explore personal topic knowledge map |
| Student | Topic detail | View evidence, practice, and next recommendations |
| Student | Knowledge Frontier | Explore advanced concepts |
| Parent | Child's Brain | See strengths, learning gaps, and growth |
| Parent | Ask about my child | Chat with a record-grounded assistant |
| Parent | Home support plan | View and track suggested learning activities |
| Parent | Growth timeline | Compare topic progress across assessments |
| Parent | Discuss with teacher | Initiate a focused, evidence-backed conversation |

## 13. Suggested Delivery Phases (Not Approved)

### Phase 1: Trustworthy assessment-to-topic foundation

- Curriculum / topic hierarchy.
- Teacher-approved question tags.
- Manual question-score entry.
- CSV/XLSX report import with preview and reconciliation.
- Basic evidence-based knowledge map and topic history.
- Student, teacher, and basic parent read-only views.

**Goal:** Prove that schools can capture reliable question-level performance without accessing student answer scripts.

### Phase 2: Useful learning support

- Topic trends, evidence-strength indicators, and class insights.
- Personalized explanations and revision recommendations.
- Parent Intelligence Dashboard and parent assistant.
- Parent–teacher topic discussions.

### Phase 3: Adaptive advancement

- Versioned prerequisite graph.
- Knowledge Frontier and optional advanced concept recommendations.
- Student practice and diagnostic checks, if approved.
- Home learning companion and growth timeline.

### Phase 4: Expanded experiences

- Higher-quality PDF extraction and diverse marking report formats.
- Parent-configured interests / Discovery Brain, if approved.
- Evidence-calibrated notifications and parent impact view.
- Continuous evaluation of accuracy, fairness, privacy, and educational outcomes.

**No implementation, repository change, deployment, or provider choice has been authorized by this document.**

## 14. Questions to Resolve Before Development

1. Which Nigerian curricula, classes, and subjects should the initial topic catalogue support?
2. How much detail can real school marking reports provide: per question only, or sometimes sub-question scores?
3. What import formats and sample reports do pilot schools actually use?
4. Who creates and approves the topic tags: subject teachers, academic admins, or both?
5. How should multi-topic questions share marks without double counting?
6. What thresholds and minimum evidence justify labels such as “strong,” “needs practice,” or “ready for advancement”?
7. What is the policy for retakes, absent students, revised marks, and changed answer keys?
8. Should independent diagnostic exercises update the main academic map, or be displayed as separate practice evidence?
9. Which parent capabilities should launch first, and what student controls are appropriate?
10. Should schools opt into AI features individually, and what usage/cost ceiling should apply?
11. What AI models/providers will be chosen for classification, explanation, and tutoring?
12. What consent, retention, and child-safety policies are required for the initial pilot?

## 15. Success Criteria to Evaluate

A pilot should evaluate whether:

- Teachers can consistently tag questions and capture question marks with low error rates.
- Topic summaries reproduce the underlying validated scores accurately.
- Recommendations are useful and do not make unjustified claims about causes of mistakes.
- Students and parents understand topic-level feedback better than subject grades alone.
- Teachers can act on class-level topic insights.
- Students can explore advanced topics without losing appropriate support in weaker areas.
- Privacy, authorization, school separation, and audit requirements hold under testing.
- Import and AI processing costs are sustainable for participating schools.

---

## 16. Summary of Decisions and Proposals

### Established in the brainstorming conversation

- Student Brain tracks **topic- and subtopic-level performance** rather than only subject grades.
- The school does **not** provide students' actual written answer scripts; question papers, answer keys/marking schemes, and each student's question-level marks are sufficient for the basic system.
- Teachers can supply scores by **manual entry** or **marking-report upload**.
- The map updates across assessments to show performance patterns and improvement.
- Students should have opportunities to explore concepts **above their current class level** when their demonstrated knowledge supports it.
- Parents need practical visibility into strengths, learning gaps, progress, and potential.
- Competitions are **out of scope for this planning document**.

### Proposed, not yet decided

- Exact mastery/confidence formula and evidence thresholds.
- AI-assisted paper classification and report extraction details.
- Diagnostic tests as an additional knowledge source.
- Knowledge Frontier UI, recovery/standard/advancement paths, and prerequisite sequencing.
- Parent AI assistant, home learning plans, intelligent notifications, and teacher messaging.
- Parent-entered interest exploration (“Discovery Brain”).
- Data schema, delivery phases, model providers, and rollout policy.

**Next step:** Brainstorm the next EduConnect AI Lab idea separately. Student Brain remains a planning concept until scope and implementation decisions are confirmed.
