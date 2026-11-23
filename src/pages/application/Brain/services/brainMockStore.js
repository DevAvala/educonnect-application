/**
 * brainMockStore.js — in-memory demo data for Student Brain.
 *
 * ⚠ DEMO DATA ONLY. Every name, mark and topic here is invented so the screens can be built and
 * reviewed before the backend exists. It is never sent anywhere. Pages show a "Demo data" banner
 * while mocks are active (see brainAPIs.js → BRAIN_USE_MOCKS).
 */

export const MOCK_NODES = [
    { id: 'math.alg.linear',    subject: 'Mathematics', topic: 'Algebra',              subtopic: 'Linear equations' },
    { id: 'math.alg.quadratic', subject: 'Mathematics', topic: 'Algebra',              subtopic: 'Quadratic equations' },
    { id: 'math.alg.sim2',      subject: 'Mathematics', topic: 'Algebra',              subtopic: 'Simultaneous equations (two unknowns)' },
    { id: 'math.seq.ap',        subject: 'Mathematics', topic: 'Sequences and series', subtopic: 'Arithmetic progressions' },
    { id: 'math.seq.gp',        subject: 'Mathematics', topic: 'Sequences and series', subtopic: 'Geometric progressions' },
    { id: 'math.geo.circle',    subject: 'Mathematics', topic: 'Geometry',             subtopic: 'Circle theorems' },
];

export const MOCK_STUDENTS = [
    { id: 'std_001', fullName: 'Adaeze Okafor',    admissionNo: 'EDU/JSS2/001' },
    { id: 'std_002', fullName: 'Emeka Nwachukwu',  admissionNo: 'EDU/JSS2/002' },
    { id: 'std_003', fullName: 'Chidinma Eze',     admissionNo: 'EDU/JSS2/003' },
    { id: 'std_004', fullName: 'Tochukwu Obi',     admissionNo: 'EDU/JSS2/004' },
    { id: 'std_005', fullName: 'Ngozi Amadi',      admissionNo: 'EDU/JSS2/005' },
    { id: 'std_006', fullName: 'Chukwuemeka Igwe', admissionNo: 'EDU/JSS2/006' },
    { id: 'std_007', fullName: 'David Bello',      admissionNo: 'EDU/JSS2/007' },
    { id: 'std_008', fullName: 'Fatima Yusuf',     admissionNo: 'EDU/JSS2/008' },
];

const T = (nodeId, share) => (share == null ? { nodeId } : { nodeId, share });
const LIN = 'math.alg.linear'; const QUAD = 'math.alg.quadratic'; const SIM2 = 'math.alg.sim2';
const AP = 'math.seq.ap'; const GP = 'math.seq.gp'; const CIRC = 'math.geo.circle';

// [label, text, maxMarks, tags]
const PAPERS = {
    bas_001: [
        ['Q1', 'Solve 3x + 5 = 20.', 5, [T(LIN)]],
        ['Q2', 'Solve 2(x − 4) = 3x − 11.', 5, [T(LIN)]],
        ['Q3', 'Solve x² − 5x + 6 = 0 by factorising.', 6, [T(QUAD)]],
        ['Q4', 'Solve x² + 3x − 10 = 0.', 6, [T(QUAD)]],
        ['Q5', 'Solve x + y = 7 and x − y = 1.', 6, [T(SIM2)]],
        ['Q6', 'Write the next term of 3, 7, 11, 15, …', 3, [T(AP)]],
        ['Q7', 'Find the 10th term of 5, 8, 11, …', 5, [T(AP)]],
        ['Q8', 'A tangent meets a radius at point P. State the angle formed and give a reason.', 4, [T(CIRC)]],
    ],
    bas_002: [
        ['Q1', 'Solve 5x − 7 = 3x + 9.', 5, [T(LIN)]],
        ['Q2', 'Solve (x + 2)/3 = 4.', 4, [T(LIN)]],
        ['Q3', 'Solve 2x² − 7x + 3 = 0.', 6, [T(QUAD)]],
        ['Q4', 'Solve 2x + 3y = 12 and x − y = 1.', 6, [T(SIM2)]],
        ['Q5', 'Find the 15th term of 2, 6, 10, …', 5, [T(AP)]],
        ['Q6', 'Find the common ratio of 2, 6, 18, 54, …', 3, [T(GP)]],
        ['Q7', 'Find the 6th term of the sequence 3, 6, 12, …', 5, [T(GP)]],
        ['Q8', 'An arithmetic progression has a + 2d = 11 and a + 5d = 20. Find a and d.', 6, [T(AP, 0.5), T(SIM2, 0.5)]],
    ],
    bas_003: [
        ['Q1', 'Solve 4(x − 1) = 2x + 10.', 5, [T(LIN)]],
        ['Q2', 'Solve (3x − 2)/4 = 5.', 4, [T(LIN)]],
        ['Q3', 'Solve x² − 9 = 0 and x² + 4x = 0.', 6, [T(QUAD)]],
        ['Q4', 'Solve 3x + 2y = 16 and 2x − y = 6.', 6, [T(SIM2)]],
        ['Q5', 'The 4th term of an AP is 17 and the 9th is 37. Find the 20th term.', 6, [T(AP)]],
        ['Q6', 'Find the sum of the first 12 terms of 4, 7, 10, …', 5, [T(AP)]],
        ['Q7', 'Find the sum of the first 5 terms of 3, 6, 12, …', 4, [T(GP)]],
        ['Q8', 'Angle at the centre is 110°. Find the angle at the circumference on the same arc.', 4, [T(CIRC)]],
    ],
};

// Per-student demonstrated performance (%) by topic for tests 1–3. null = topic not on that paper.
const ABILITY = {
    std_001: { [LIN]: [85, 90, 92], [QUAD]: [70, 80, 84], [SIM2]: [75, 85, 90], [AP]: [20, 45, 75], [GP]: [null, 50, 65], [CIRC]: [80, 85, 89] },
    std_002: { [LIN]: [60, 65, 70], [QUAD]: [45, 50, 55], [SIM2]: [50, 55, 60], [AP]: [30, 35, 40], [GP]: [null, 30, 35], [CIRC]: [55, 60, 60] },
    std_003: { [LIN]: [95, 95, 98], [QUAD]: [90, 92, 95], [SIM2]: [88, 90, 95], [AP]: [60, 70, 80], [GP]: [null, 70, 75], [CIRC]: [90, 92, 92] },
    std_004: { [LIN]: [40, 45, 50], [QUAD]: [30, 35, 40], [SIM2]: [35, 40, 45], [AP]: [25, 30, 30], [GP]: [null, 20, 25], [CIRC]: [40, 45, 50] },
    std_005: { [LIN]: [75, 80, 82], [QUAD]: [60, 65, 70], [SIM2]: [65, 70, 72], [AP]: [40, 45, 50], [GP]: [null, 40, 45], [CIRC]: [70, 72, 75] },
    std_006: { [LIN]: [50, 55, 60], [QUAD]: [40, 40, 45], [SIM2]: [45, 50, 50], [AP]: [20, 25, 30], [GP]: [null, 25, 30], [CIRC]: [50, 50, 55] },
    std_007: { [LIN]: [92, 92, 92], [QUAD]: [84, 84, 86], [SIM2]: [95, 96, 98], [AP]: [40, 38, 38], [GP]: [null, 60, 65], [CIRC]: [89, 90, 89] },
    std_008: { [LIN]: [70, 75, 80], [QUAD]: [55, 60, 65], [SIM2]: [60, 60, 65], [AP]: [35, 40, 45], [GP]: [null, 35, 40], [CIRC]: [65, 70, 70] },
};

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

function buildMarks(assessmentId, testIndex, questions) {
    const out = {};
    MOCK_STUDENTS.forEach((s, si) => {
        const perStudent = {};
        questions.forEach((q, qi) => {
            // Absent for the whole of test 2; one question left unmarked in test 3.
            if (s.id === 'std_008' && testIndex === 1) { perStudent[q.id] = { status: 'absent', earned: null }; return; }
            if (s.id === 'std_006' && testIndex === 2 && q.label === 'Q8') { perStudent[q.id] = { status: 'not_marked', earned: null }; return; }
            // Blend the topic percentages by tag share, then add a small repeatable wobble.
            const pct = q.tags.reduce((sum, tag) => {
                const p = ABILITY[s.id][tag.nodeId]?.[testIndex] ?? 50;
                return sum + p * (tag.share ?? 1);
            }, 0);
            const wobble = ((qi * 7 + si * 3) % 3) - 1;
            perStudent[q.id] = { status: 'scored', earned: clamp(Math.round((q.maxMarks * pct) / 100) + wobble, 0, q.maxMarks) };
        });
        out[s.id] = perStudent;
    });
    return out;
}

const HISTORY = (title, user, at, tone, comment) => ({ title, user, at, tone, comment });

function paper(id, rows, extra = {}) {
    return rows.map(([label, text, maxMarks, tags], i) => ({
        id: `${id}_q${i + 1}`, label, text, maxMarks, tags, ...extra,
    }));
}

function makeApproved(id, title, date, testIndex) {
    const questions = paper(id, PAPERS[id]);
    return {
        assessment: {
            id, title, className: 'JSS 2', subjectName: 'Mathematics', termId: 'current', date,
            mappingStatus: 'approved', marksSource: testIndex === 1 ? 'import' : 'manual',
            questions,
            history: [
                HISTORY('Question paper added', 'Mrs. Kenechukwu Ajufo', `${date}T08:00:00.000Z`, 'gray'),
                HISTORY('Topic mapping approved', 'Mrs. Kenechukwu Ajufo', `${date}T09:30:00.000Z`, 'green'),
                HISTORY(testIndex === 1 ? 'Marks imported from report' : 'Marks entered', 'Mrs. Kenechukwu Ajufo', `${date}T15:00:00.000Z`, 'blue'),
            ],
        },
        marks: buildMarks(id, testIndex, questions),
    };
}

function buildInitial() {
    const t1 = makeApproved('bas_001', 'Mathematics Test 1', '2026-09-22', 0);
    const t2 = makeApproved('bas_002', 'Mathematics Test 2', '2026-10-20', 1);
    const t3 = makeApproved('bas_003', 'Mathematics Test 3', '2026-11-17', 2);

    // Paper uploaded, AI-suggested topics waiting for the teacher to review.
    const midQuestions = [
        ['Q1', 'Solve 6x − 4 = 2x + 12.', 5, [T(LIN)]],
        ['Q2', 'Solve x² + x − 12 = 0.', 6, [T(QUAD)]],
        ['Q3', 'Find the 8th term of 12, 9, 6, …', 4, [T(AP)]],
        ['Q4', 'Solve 2x + y = 9 and x + 3y = 13.', 6, [T(SIM2)]],
        ['Q5', 'Find the sum of the first 10 terms of 1, 2, 4, …', 5, [T(GP)]],
    ];
    const mid = {
        assessment: {
            id: 'bas_004', title: 'Mathematics Mid-Term Exam', className: 'JSS 2', subjectName: 'Mathematics',
            termId: 'current', date: '2026-11-20', mappingStatus: 'awaiting_approval', marksSource: null,
            questions: paper('bas_004', midQuestions, { suggested: true }),
            history: [
                HISTORY('Question paper added', 'Mrs. Kenechukwu Ajufo', '2026-11-20T08:00:00.000Z', 'gray'),
                HISTORY('Topics suggested', 'Suggestion tool', '2026-11-20T08:02:00.000Z', 'amber', 'Suggestions only. A teacher must review and approve them.'),
            ],
        },
        marks: {},
    };

    // Draft: questions added, no topics chosen yet.
    const quiz = {
        assessment: {
            id: 'bas_005', title: 'Geometry Class Quiz', className: 'JSS 2', subjectName: 'Mathematics',
            termId: 'current', date: '2026-11-21', mappingStatus: 'draft', marksSource: null,
            questions: paper('bas_005', [
                ['Q1', 'State the angle in a semicircle.', 3, []],
                ['Q2', 'Opposite angles of a cyclic quadrilateral add up to what?', 3, []],
                ['Q3', 'Find x where the angle at the centre is 80°.', 4, []],
            ]),
            history: [HISTORY('Question paper added', 'Mrs. Kenechukwu Ajufo', '2026-11-21T08:00:00.000Z', 'gray')],
        },
        marks: {},
    };

    return [t1, t2, t3, mid, quiz];
}

let store = buildInitial();

export const mockState = {
    all: () => store,
    find: (id) => store.find((x) => x.assessment.id === id),
    reset: () => { store = buildInitial(); },
};

export const MOCK_TEACHER = 'Mrs. Kenechukwu Ajufo';
