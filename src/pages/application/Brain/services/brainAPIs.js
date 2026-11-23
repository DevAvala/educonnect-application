/**
 * brainAPIs.js — Student Brain: API layer (PROPOSED CONTRACT, backend pending).
 *
 * While the backend does not exist, every call is answered from an in-memory demo store
 * (brainMockStore.js). Set `VITE_BRAIN_USE_MOCKS=false` to call the real endpoints below instead.
 * Pages show a "Demo data" banner whenever `BRAIN_USE_MOCKS` is true.
 *
 * The full contract (request/response shapes, permissions, validation) is written up in
 * docs/STUDENT_BRAIN_API_CONTRACT.md for the backend developer.
 *
 * Teacher
 *   GET  /api/teacher/brain/topics                          → { nodes }
 *   GET  /api/teacher/brain/assessments                     → { assessments }
 *   GET  /api/teacher/brain/assessments/:id                 → { assessment, students, marks }
 *   POST /api/teacher/brain/assessments/:id/suggest-topics  → { assessment }
 *   PUT  /api/teacher/brain/assessments/:id/questions/:qid/tags   body { tags }
 *   POST /api/teacher/brain/assessments/:id/approve-mapping → { assessment }
 *   POST /api/teacher/brain/assessments/:id/reopen-mapping  body { reason }
 *   PUT  /api/teacher/brain/assessments/:id/marks           body { marks, source }
 *   GET  /api/teacher/brain/class-insights?className=&subjectName= → { nodes, rows }
 * Parent
 *   GET  /api/parent/brain/children/:studentId              → { student, nodes, evidence }
 *
 * The server is the source of truth for every figure. In mock mode the same calculations run in
 * the browser through brainMath.js so the screens show realistic numbers.
 */

import apiClient from '../../../../utils/axiosConfig.js';
import { studentEvidence, classInsights, mappingProblems } from '../brainMath.js';
import { mockState, MOCK_NODES, MOCK_STUDENTS, MOCK_TEACHER } from './brainMockStore.js';

export const BRAIN_USE_MOCKS = import.meta.env.VITE_BRAIN_USE_MOCKS !== 'false';

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const clone = (v) => JSON.parse(JSON.stringify(v));
const fail = (message, status = 400) => Promise.reject({ message, status });

async function real(method, url, { data, params } = {}) {
    try {
        const res = await apiClient.request({ method, url, data, params });
        return res.data?.data ?? res.data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

const mappedCount = (q) => (q.tags?.length ? 1 : 0);

function summarise({ assessment, marks }) {
    const studentsMarked = Object.values(marks).filter((m) =>
        Object.values(m).some((x) => x.status === 'scored')).length;
    return {
        id: assessment.id, title: assessment.title, className: assessment.className,
        subjectName: assessment.subjectName, date: assessment.date, mappingStatus: assessment.mappingStatus,
        marksSource: assessment.marksSource,
        questionCount: assessment.questions.length,
        questionsMapped: assessment.questions.reduce((n, q) => n + mappedCount(q), 0),
        totalMarks: assessment.questions.reduce((n, q) => n + q.maxMarks, 0),
        studentsMarked, studentCount: MOCK_STUDENTS.length,
    };
}

const addHistory = (assessment, entry) => {
    assessment.history = [...(assessment.history ?? []), { user: MOCK_TEACHER, at: new Date().toISOString(), ...entry }];
};

// ─── Teacher ─────────────────────────────────────────────────────────────────

export async function listTopics() {
    if (!BRAIN_USE_MOCKS) return real('get', '/api/teacher/brain/topics');
    await delay(120);
    return { nodes: clone(MOCK_NODES) };
}

export async function listBrainAssessments() {
    if (!BRAIN_USE_MOCKS) return real('get', '/api/teacher/brain/assessments');
    await delay();
    return { assessments: mockState.all().map(summarise) };
}

export async function getBrainAssessment(id) {
    if (!BRAIN_USE_MOCKS) return real('get', `/api/teacher/brain/assessments/${id}`);
    await delay();
    const entry = mockState.find(id);
    if (!entry) return fail('Assessment not found', 404);
    return clone({ assessment: entry.assessment, students: MOCK_STUDENTS, marks: entry.marks });
}

/**
 * Ask for topic suggestions on questions that have none. Suggestions are only ever proposals:
 * the teacher must review and approve before any mark counts toward a student's Brain.
 * (Mock: a keyword match. The real tool and model are not chosen yet.)
 */
export async function requestTopicSuggestions(id) {
    if (!BRAIN_USE_MOCKS) return real('post', `/api/teacher/brain/assessments/${id}/suggest-topics`);
    await delay(600);
    const entry = mockState.find(id);
    if (!entry) return fail('Assessment not found', 404);
    if (entry.assessment.mappingStatus === 'approved') return fail('Reopen the mapping before changing topics.');
    const rules = [
        [/cyclic|semicircle|circle|tangent|radius|centre|circumference/i, 'math.geo.circle'],
        [/common ratio|geometric|ratio/i, 'math.seq.gp'],
        [/term|sequence|progression|sum of the first/i, 'math.seq.ap'],
        [/x \+ y|and x [−-]|simultaneous/i, 'math.alg.sim2'],
        [/x²|quadratic|factoris/i, 'math.alg.quadratic'],
        [/solve|=/i, 'math.alg.linear'],
    ];
    let added = 0;
    entry.assessment.questions.forEach((q) => {
        if (q.tags.length) return;
        const hit = rules.find(([re]) => re.test(q.text));
        if (hit) { q.tags = [{ nodeId: hit[1] }]; q.suggested = true; added += 1; }
    });
    addHistory(entry.assessment, { title: 'Topics suggested', user: 'Suggestion tool', tone: 'amber',
        comment: `${added} question${added === 1 ? '' : 's'} given suggested topics. Review before approving.` });
    return clone({ assessment: entry.assessment });
}

export async function saveQuestionTags(id, questionId, tags) {
    if (!BRAIN_USE_MOCKS) return real('put', `/api/teacher/brain/assessments/${id}/questions/${questionId}/tags`, { data: { tags } });
    await delay(120);
    const entry = mockState.find(id);
    const q = entry?.assessment.questions.find((x) => x.id === questionId);
    if (!q) return fail('Question not found', 404);
    if (entry.assessment.mappingStatus === 'approved') return fail('Reopen the mapping before changing topics.');
    q.tags = clone(tags);
    q.suggested = false; // a teacher has now set it by hand
    return clone({ assessment: entry.assessment });
}

export async function approveMapping(id) {
    if (!BRAIN_USE_MOCKS) return real('post', `/api/teacher/brain/assessments/${id}/approve-mapping`);
    await delay(300);
    const entry = mockState.find(id);
    if (!entry) return fail('Assessment not found', 404);
    const problems = mappingProblems(entry.assessment.questions);
    if (problems.length) return fail(`${problems.length} question${problems.length === 1 ? ' needs' : 's need'} attention before approval.`);
    entry.assessment.questions.forEach((q) => { q.suggested = false; });
    entry.assessment.mappingStatus = 'approved';
    addHistory(entry.assessment, { title: 'Topic mapping approved', tone: 'green' });
    return clone({ assessment: entry.assessment });
}

export async function reopenMapping(id, reason) {
    if (!BRAIN_USE_MOCKS) return real('post', `/api/teacher/brain/assessments/${id}/reopen-mapping`, { data: { reason } });
    await delay(300);
    const entry = mockState.find(id);
    if (!entry) return fail('Assessment not found', 404);
    if (!String(reason ?? '').trim()) return fail('Give a reason so the change is on record.');
    entry.assessment.mappingStatus = 'draft';
    addHistory(entry.assessment, { title: 'Mapping reopened', tone: 'amber', comment: reason.trim() });
    return clone({ assessment: entry.assessment });
}

/** Save the whole mark sheet. `source` is 'manual' or 'import' (kept for the audit trail). */
export async function saveMarks(id, marks, source = 'manual') {
    if (!BRAIN_USE_MOCKS) return real('put', `/api/teacher/brain/assessments/${id}/marks`, { data: { marks, source } });
    await delay(350);
    const entry = mockState.find(id);
    if (!entry) return fail('Assessment not found', 404);
    const byId = Object.fromEntries(entry.assessment.questions.map((q) => [q.id, q]));
    for (const [sid, perQ] of Object.entries(marks)) {
        for (const [qid, m] of Object.entries(perQ)) {
            const q = byId[qid];
            if (!q) return fail('Unknown question in marks');
            if (m.status === 'scored' && !(m.earned >= 0 && m.earned <= q.maxMarks)) {
                return fail(`Mark for ${qid} must be between 0 and ${q.maxMarks}`);
            }
        }
        entry.marks[sid] = clone(perQ);
    }
    entry.assessment.marksSource = source;
    addHistory(entry.assessment, { title: source === 'import' ? 'Marks imported from report' : 'Marks saved', tone: 'blue' });
    return clone({ assessment: entry.assessment, marks: entry.marks });
}

export async function getClassInsights() {
    if (!BRAIN_USE_MOCKS) return real('get', '/api/teacher/brain/class-insights');
    await delay(350);
    const assessments = mockState.all().map((x) => x.assessment);
    const marks = Object.fromEntries(mockState.all().map((x) => [x.assessment.id, x.marks]));
    const rows = classInsights(assessments, marks, MOCK_STUDENTS.map((s) => s.id));
    const used = assessments.filter((a) => a.mappingStatus === 'approved');
    return clone({
        nodes: MOCK_NODES, rows, className: 'JSS 2', subjectName: 'Mathematics',
        studentCount: MOCK_STUDENTS.length,
        assessments: used.map((a) => ({ id: a.id, title: a.title, date: a.date })),
    });
}

// ─── Parent ──────────────────────────────────────────────────────────────────

/**
 * A parent's view of one child. In mock mode any real student id maps onto a demo learner, so the
 * screen has something to show; the backend will only ever return records the parent is linked to.
 */
export async function getChildBrain(studentId) {
    if (!BRAIN_USE_MOCKS) return real('get', `/api/parent/brain/children/${studentId}`);
    await delay(400);
    const demoIds = MOCK_STUDENTS.map((s) => s.id);
    const key = demoIds.includes(studentId)
        ? studentId
        : demoIds[Math.abs([...String(studentId)].reduce((h, c) => h + c.charCodeAt(0), 0)) % demoIds.length];
    const assessments = mockState.all().map((x) => x.assessment);
    const marks = Object.fromEntries(mockState.all().map((x) => [x.assessment.id, x.marks]));
    return clone({
        studentId: key,
        nodes: MOCK_NODES,
        evidence: studentEvidence(assessments, marks, key),
        assessmentCount: assessments.filter((a) => a.mappingStatus === 'approved').length,
    });
}
