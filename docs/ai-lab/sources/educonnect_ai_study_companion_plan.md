# EduConnect AI Lab: AI Study Companion

**Feature:** 3 of the current EduConnect AI Lab concepts  
**Status:** Brainstorming and planning only. No implementation or AI model selected.  
**Last discussed:** 12 November 2026

## 1. Vision

Give each student an accessible, personalized AI tutor that helps them understand schoolwork, practise difficult concepts, and develop independent study habits. The Companion should **teach**, not simply provide finished answers.

## 2. Core Experience

- **Ask and learn:** Students ask questions in natural language and receive clear, age-appropriate, step-by-step explanations.
- **Guided tutoring:** The Companion asks follow-up questions and offers hints before showing solutions, especially for homework and practice.
- **Personal revision:** Suggest topics and learning activities using the student's EduConnect Student Brain knowledge map.
- **Practice materials:** Generate short quizzes, flashcards, worked examples, and revision exercises aligned with the approved curriculum.
- **Adaptive difficulty:** Start at the student's demonstrated level, revisit prerequisites when needed, and suggest advanced topics when they are ready.
- **Study routine:** Help students set achievable goals, plan short study sessions, and review progress.

## 3. Integration With Student Brain

Student Brain is the **source of academic progress evidence**, built primarily from question-to-topic mappings and students' question-level marks from tests and exams. Schools can enter marks manually or upload marking reports.

The Study Companion uses that evidence to recommend lessons and practice:

1. Student Brain identifies a topic with consistently low performance, such as arithmetic progressions.
2. Study Companion offers a focused explanation, examples, and practice.
3. A student completes an optional diagnostic quiz.
4. The quiz is scored using validated answer keys or transparent rubrics.
5. The result is recorded as **practice evidence**, separately from official school exam results, and may inform the knowledge map.

**Important:** EduConnect does not receive students' written answers to their existing school exams. Question-level scores reveal where performance was weak, not necessarily why an answer was wrong. The Companion should never invent an error diagnosis.

## 4. Example Student Journey

A JSS2 student is strong at simultaneous equations with two unknowns but struggles with arithmetic progressions. The Companion recommends practice in arithmetic progressions while optionally offering more advanced simultaneous-equation problems. The student can choose either path, including topics above their current class.

## 5. Student Interface (Proposed)

- Simple **Ask the Companion** area.
- **Recommended for You** topics based on Student Brain.
- **Practice & Flashcards** area.
- **Learning Progress** showing completed sessions and demonstrated improvement.
- An option to **Explore Any Topic**, not restricted to the student's year level.

## 6. Teacher and Parent Touchpoints (Proposed)

- Teachers can recommend approved lessons, topics, or practice sets for a class or student.
- Parents can see high-level study progress and suggested ways to help without needing subject expertise.
- Both views should use permissions and avoid exposing private student conversations by default.

## 7. Safety and Quality Rules

- Curriculum-aligned explanations and checked answer keys for graded practice.
- AI makes suggestions; it does not change official assessment marks.
- Clear distinction between **school assessment evidence** and **AI practice evidence**.
- Age-appropriate responses, anti-cheating guidance, and safeguards for minors.
- School-scoped access, limited retention, parent/guardian controls as appropriate, and no unnecessary student identifiers sent to models.
- A student can ask for a different explanation, challenge an answer, or escalate to a teacher.
- Support low-bandwidth and mobile-first use where practical.

## 8. Possible Delivery Phases (Not Approved)

1. **Foundation:** Student chat, curriculum topics, explanations, and basic practice.
2. **Personalization:** Read Student Brain topic performance and recommend activities.
3. **Adaptive tutoring:** Guided lessons, prerequisite review, and advanced learning pathways.
4. **Home-school connection:** Teacher assignments, parent summaries, and optional progress insights.

## 9. Open Decisions

- Which AI model or models to use and the per-student usage budget.
- Supported classes, subjects, curricula, and languages at launch.
- Whether schools can approve or curate companion-generated practice questions.
- How strongly practice scores should affect Student Brain mastery estimates.
- Parent controls, conversation retention, and age-based feature limits.

**Planning note:** This document captures proposed functionality, not a commitment to implementation.
