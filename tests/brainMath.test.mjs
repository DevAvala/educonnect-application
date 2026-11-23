import test from 'node:test';
import assert from 'node:assert/strict';
import {
    parseMarkInput, formatMark, validateTags, mappingProblems,
    studentEvidence, evidenceStrength, performanceBand, trendDirection, describeTrend,
    classInsights, parseCsv, previewImport, importIsApplicable, BANDS, summariseChild,
    findStudentsForSupport, topicsByNeed, brainSummary, SUPPORT_LEVELS,
} from '../src/pages/application/Brain/brainMath.js';

// ─── Mark entry ──────────────────────────────────────────────────────────────

test('blank mark is "not marked", never zero', () => {
    assert.deepEqual(parseMarkInput('', 10), { status: 'not_marked', earned: null, error: null });
    assert.deepEqual(parseMarkInput('   ', 10), { status: 'not_marked', earned: null, error: null });
    assert.equal(parseMarkInput('0', 10).status, 'scored');
    assert.equal(parseMarkInput('0', 10).earned, 0);
});

test('absent and exempt codes are recognised', () => {
    assert.equal(parseMarkInput('a', 10).status, 'absent');
    assert.equal(parseMarkInput('ABS', 10).status, 'absent');
    assert.equal(parseMarkInput('e', 10).status, 'exempt');
});

test('marks outside 0..max or non-numeric are rejected', () => {
    assert.match(parseMarkInput('11', 10).error, /more than 10/);
    assert.ok(parseMarkInput('-1', 10).error);
    assert.ok(parseMarkInput('abc', 10).error);
    assert.equal(parseMarkInput('10', 10).error, null);
    assert.equal(parseMarkInput('7.5', 10).earned, 7.5);
});

test('formatMark round-trips the grid codes', () => {
    assert.equal(formatMark({ status: 'absent' }), 'A');
    assert.equal(formatMark({ status: 'exempt' }), 'E');
    assert.equal(formatMark({ status: 'scored', earned: 0 }), '0');
    assert.equal(formatMark({ status: 'not_marked', earned: null }), '');
    assert.equal(formatMark(undefined), '');
});

// ─── Tags ────────────────────────────────────────────────────────────────────

test('tag validation: needs a topic, unique topics, shares add to 100%', () => {
    assert.equal(validateTags([]).ok, false);
    assert.equal(validateTags([{ nodeId: 'a' }]).ok, true);
    assert.equal(validateTags([{ nodeId: 'a', share: 0.5 }, { nodeId: 'b', share: 0.5 }]).ok, true);
    assert.match(validateTags([{ nodeId: 'a', share: 0.5 }, { nodeId: 'b', share: 0.4 }]).error, /90%/);
    assert.match(validateTags([{ nodeId: 'a', share: 0.5 }, { nodeId: 'a', share: 0.5 }]).error, /twice/);
    assert.match(validateTags([{ nodeId: 'a', share: 1 }, { nodeId: 'b', share: 0 }]).error, /above 0/);
});

test('mappingProblems lists each unready question', () => {
    const problems = mappingProblems([
        { id: 'q1', label: 'Q1', tags: [{ nodeId: 'a' }] },
        { id: 'q2', label: 'Q2', tags: [] },
    ]);
    assert.equal(problems.length, 1);
    assert.equal(problems[0].label, 'Q2');
});

// ─── Aggregation ─────────────────────────────────────────────────────────────

const mk = (id, date, questions, status = 'approved') => ({ id, title: id, date, mappingStatus: status, questions });

test('aggregates earned and available per topic, and splits multi-topic marks by share', () => {
    const a = mk('t1', '2026-09-01', [
        { id: 'q1', maxMarks: 10, tags: [{ nodeId: 'alg' }] },
        { id: 'q2', maxMarks: 10, tags: [{ nodeId: 'alg', share: 0.5 }, { nodeId: 'geo', share: 0.5 }] },
    ]);
    const marks = { t1: { s1: { q1: { status: 'scored', earned: 8 }, q2: { status: 'scored', earned: 6 } } } };
    const ev = studentEvidence([a], marks, 's1');
    assert.equal(ev.alg.earned, 11);      // 8 + 6*0.5
    assert.equal(ev.alg.available, 15);   // 10 + 10*0.5
    assert.equal(ev.geo.earned, 3);
    assert.equal(ev.geo.available, 5);
    assert.equal(ev.alg.pct, 73);
    // no double counting: total available across topics equals the paper total
    assert.equal(ev.alg.available + ev.geo.available, 20);
});

test('absent, exempt and not-marked questions are excluded, not counted as zero', () => {
    const a = mk('t1', '2026-09-01', [
        { id: 'q1', maxMarks: 10, tags: [{ nodeId: 'alg' }] },
        { id: 'q2', maxMarks: 10, tags: [{ nodeId: 'alg' }] },
        { id: 'q3', maxMarks: 10, tags: [{ nodeId: 'alg' }] },
    ]);
    const marks = { t1: { s1: {
        q1: { status: 'scored', earned: 10 },
        q2: { status: 'absent', earned: null },
        q3: { status: 'not_marked', earned: null },
    } } };
    const ev = studentEvidence([a], marks, 's1');
    assert.equal(ev.alg.available, 10);
    assert.equal(ev.alg.pct, 100);
    assert.equal(ev.alg.questions, 1);
});

test('assessments whose mapping is not approved never count', () => {
    const a = mk('t1', '2026-09-01', [{ id: 'q1', maxMarks: 10, tags: [{ nodeId: 'alg' }] }], 'awaiting_approval');
    const marks = { t1: { s1: { q1: { status: 'scored', earned: 10 } } } };
    assert.deepEqual(studentEvidence([a], marks, 's1'), {});
});

test('series is ordered by date and carries each assessment separately', () => {
    const q = (id) => ({ id, maxMarks: 10, tags: [{ nodeId: 'ap' }] });
    const a1 = mk('t1', '2026-09-01', [q('q1'), q('q2')]);
    const a2 = mk('t2', '2026-10-01', [q('q1'), q('q2')]);
    const marks = {
        t2: { s1: { q1: { status: 'scored', earned: 9 }, q2: { status: 'scored', earned: 9 } } },
        t1: { s1: { q1: { status: 'scored', earned: 2 }, q2: { status: 'scored', earned: 2 } } },
    };
    const ev = studentEvidence([a2, a1], marks, 's1');
    assert.deepEqual(ev.ap.series.map((s) => s.pct), [20, 90]);
    assert.equal(ev.ap.assessments, 2);
    assert.equal(ev.ap.lastAssessed, '2026-10-01');
});

// ─── Evidence strength, bands, trend ─────────────────────────────────────────

test('thin evidence yields "limited" and no performance label', () => {
    const node = { questions: 2, assessments: 1, available: 20, pct: 10 };
    assert.equal(evidenceStrength(node), 'limited');
    assert.equal(performanceBand(node), BANDS.limited);
    assert.equal(evidenceStrength({ questions: 5, assessments: 1, available: 8 }), 'limited');
});

test('evidence strength and bands', () => {
    assert.equal(evidenceStrength({ questions: 3, assessments: 1, available: 12 }), 'moderate');
    assert.equal(evidenceStrength({ questions: 6, assessments: 2, available: 30 }), 'good');
    const base = { questions: 6, assessments: 2, available: 30 };
    assert.equal(performanceBand({ ...base, pct: 92 }).key, 'strong');
    assert.equal(performanceBand({ ...base, pct: 84 }).key, 'well');
    assert.equal(performanceBand({ ...base, pct: 65 }).key, 'developing');
    assert.equal(performanceBand({ ...base, pct: 38 }).key, 'needs_practice');
});

test('no band uses a red/alarming tone', () => {
    for (const band of Object.values(BANDS)) assert.notEqual(band.tone, 'red');
});

test('trend direction needs two assessments and a real change', () => {
    assert.equal(trendDirection([{ pct: 40 }]), 'single');
    assert.equal(trendDirection([{ pct: 20 }, { pct: 45 }, { pct: 75 }]), 'increased');
    assert.equal(trendDirection([{ pct: 70 }, { pct: 55 }]), 'decreased');
    assert.equal(trendDirection([{ pct: 60 }, { pct: 64 }]), 'similar');
});

test('trend sentence describes observed performance and never claims a cause', () => {
    const text = describeTrend('Arithmetic progressions', [{ pct: 20 }, { pct: 45 }, { pct: 75 }]);
    assert.match(text, /assessed arithmetic progressions questions increased across 3 assessments \(20% → 45% → 75%\)/);
    assert.doesNotMatch(text, /because|mastered|struggl/i);
    assert.match(describeTrend('X', [{ pct: 50 }]), /no trend/);
});

// ─── Class insights ──────────────────────────────────────────────────────────

test('class insights count only students with enough evidence as "below"', () => {
    const qs = [1, 2, 3].map((n) => ({ id: `q${n}`, maxMarks: 10, tags: [{ nodeId: 'ap' }] }));
    const a = mk('t1', '2026-09-01', qs);
    const full = (e) => Object.fromEntries(qs.map((q) => [q.id, { status: 'scored', earned: e }]));
    const marks = { t1: {
        s1: full(2),                                   // 20%  → below
        s2: full(9),                                   // 90%  → not below
        s3: { q1: { status: 'scored', earned: 0 } },   // 1 question → limited, excluded
    } };
    const [row] = classInsights([a], marks, ['s1', 's2', 's3']);
    assert.equal(row.studentsWithEvidence, 2);
    assert.equal(row.studentsLimited, 1);
    assert.equal(row.studentsBelow, 1);
    assert.equal(row.pctBelow, 50);
});

// ─── CSV import ──────────────────────────────────────────────────────────────

test('parseCsv handles quotes, commas, CRLF and BOM', () => {
    const rows = parseCsv('﻿Name,Q1\r\n"Okafor, Adaeze",8\r\n"He said ""hi""",5\r\n');
    assert.deepEqual(rows, [['Name', 'Q1'], ['Okafor, Adaeze', '8'], ['He said "hi"', '5']]);
});

const questions = [
    { id: 'q1', label: 'Q1', maxMarks: 10 },
    { id: 'q2', label: 'Q2', maxMarks: 5 },
];
const students = [
    { id: 's1', fullName: 'Adaeze Okafor', admissionNo: 'EDU/001' },
    { id: 's2', fullName: 'Emeka Nwachukwu', admissionNo: 'EDU/002' },
];

test('import preview matches questions, students and flags problems without applying', () => {
    const p = previewImport(parseCsv('Student,Q1 (10),Q2 (5)\nAdaeze Okafor,8,A\nEDU/002,12,3\nGhost Student,1,1'), questions, students);
    assert.equal(p.recognised, true);
    assert.equal(p.rows.length, 2);
    assert.equal(p.rows[0].marks.q2.status, 'absent');
    assert.equal(p.rows[1].errors.length, 1);          // Q1 = 12 > 10
    assert.deepEqual(p.unmatchedStudents, ['Ghost Student']);
    assert.equal(importIsApplicable(p), false);
});

test('a clean import is applicable', () => {
    const p = previewImport(parseCsv('Student,Q1,Q2\nAdaeze Okafor,8,4\nEmeka Nwachukwu,5,E'), questions, students);
    assert.equal(importIsApplicable(p), true);
});

test('a wrong maximum in the header blocks the import', () => {
    const p = previewImport(parseCsv('Student,Q1 (20)\nAdaeze Okafor,8'), questions, students);
    assert.equal(p.maxMismatches.length, 1);
    assert.equal(importIsApplicable(p), false);
});

test('an unrecognised layout is rejected, not guessed', () => {
    const p = previewImport(parseCsv('Student,Alpha,Beta\nAdaeze Okafor,1,2'), questions, students);
    assert.equal(p.recognised, false);
    assert.match(p.reason, /question labels/);
    assert.equal(previewImport([], questions, students).recognised, false);
    const noStudent = previewImport(parseCsv('Foo,Q1\nx,1'), questions, students);
    assert.equal(noStudent.recognised, false);
});

// ─── Parent summary ──────────────────────────────────────────────────────────

test('parent summary highlights strengths, rises and focus areas, and stays silent on thin evidence', () => {
    const nodes = [
        { id: 'a', subtopic: 'Linear equations' },
        { id: 'b', subtopic: 'Arithmetic progressions' },
        { id: 'c', subtopic: 'Circle theorems' },
    ];
    const base = { questions: 6, assessments: 3, available: 30 };
    const evidence = {
        a: { ...base, pct: 92, series: [{ pct: 80 }, { pct: 85 }, { pct: 92 }] },
        b: { ...base, pct: 38, series: [{ pct: 40 }, { pct: 38 }, { pct: 38 }] },
        c: { questions: 1, assessments: 1, available: 4, pct: 0, series: [{ pct: 0 }] },
    };
    const text = summariseChild(nodes, evidence, 'David').join(' ');
    assert.match(text, /David is showing stronger performance in linear equations/);
    assert.match(text, /arithmetic progressions questions have been lower, so short, focused practice/);
    assert.match(text, /1 topic there is not enough evidence/);
    assert.doesNotMatch(text, /circle/i);            // limited-evidence topic is not described
    assert.doesNotMatch(text, /because|weak|struggl|fail/i);
    assert.deepEqual(summariseChild(nodes, {}, 'X'), []);
});

// ─── Animated brain layout ───────────────────────────────────────────────────

import { layoutBrain, insideCerebrum, dustPoints, cerebrumPath, NODE_RADIUS, TONE_COLOR } from '../src/pages/application/Brain/brainViz.js';

const vizNodes = (spec) => spec.flatMap(([subject, topic, subs]) =>
    subs.map((s) => ({ id: `${subject}.${topic}.${s}`, subject, topic, subtopic: s })));

test('brain layout places every topic exactly once, inside the brain, without overlap', () => {
    const nodes = vizNodes([
        ['Maths', 'Algebra', ['Linear', 'Quadratic', 'Simultaneous']],
        ['Maths', 'Sequences', ['AP', 'GP']],
        ['Maths', 'Geometry', ['Circles']],
        ['English', 'Reading', ['Inference', 'Vocabulary', 'Summary', 'Tone']],
    ]);
    const { items } = layoutBrain(nodes);
    assert.equal(items.length, nodes.length);
    assert.equal(new Set(items.map((i) => i.id)).size, nodes.length);
    for (const it of items) assert.ok(insideCerebrum(it.x, it.y), `${it.id} at ${it.x},${it.y} is outside the brain`);
    for (let a = 0; a < items.length; a += 1) {
        for (let b = a + 1; b < items.length; b += 1) {
            const d = Math.hypot(items[a].x - items[b].x, items[a].y - items[b].y);
            assert.ok(d >= 14, `${items[a].id} and ${items[b].id} overlap (${d.toFixed(1)}px)`);
        }
    }
});

test('brain layout is stable: same topics in any input order give the same picture', () => {
    const nodes = vizNodes([['Maths', 'Algebra', ['Linear', 'Quadratic']], ['Maths', 'Geometry', ['Circles']]]);
    const a = layoutBrain(nodes).items.map((i) => [i.id, i.x, i.y]);
    const b = layoutBrain([...nodes].reverse()).items.map((i) => [i.id, i.x, i.y]).sort();
    assert.deepEqual([...a].sort(), b);
});

test('topics of one group sit closer together than topics of different groups, and only same-group points are linked', () => {
    const nodes = vizNodes([['Maths', 'Algebra', ['Linear', 'Quadratic', 'Simultaneous']], ['Maths', 'Geometry', ['Circles', 'Angles']]]);
    const { items, links } = layoutBrain(nodes);
    const byId = Object.fromEntries(items.map((i) => [i.id, i]));
    const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
    const algebra = items.filter((i) => i.node.topic === 'Algebra');
    const geometry = items.filter((i) => i.node.topic === 'Geometry');
    const within = Math.max(dist(algebra[0], algebra[1]), dist(geometry[0], geometry[1]));
    const between = Math.min(...algebra.flatMap((a) => geometry.map((g) => dist(a, g))));
    assert.ok(within < between);
    assert.ok(links.length > 0);
    for (const l of links) assert.equal(byId[l.from].groupKey, byId[l.to].groupKey);
});

test('a single-topic group has no links; more groups than slots still land inside the brain', () => {
    assert.equal(layoutBrain(vizNodes([['M', 'Solo', ['One']]])).links.length, 0);
    const many = vizNodes(Array.from({ length: 14 }, (_, i) => ['S', `T${String(i).padStart(2, '0')}`, ['x']]));
    const { items } = layoutBrain(many);
    assert.equal(items.length, 14);
    for (const it of items) assert.ok(insideCerebrum(it.x, it.y));
});

test('brain decoration is deterministic and inside the outline; no band is coloured red', () => {
    assert.deepEqual(dustPoints(30, 7), dustPoints(30, 7));
    for (const p of dustPoints(60, 3)) assert.ok(insideCerebrum(p.x, p.y));
    assert.match(cerebrumPath(), /^M[\d. ]+L/);
    assert.ok(NODE_RADIUS.good > NODE_RADIUS.moderate && NODE_RADIUS.moderate > NODE_RADIUS.limited && NODE_RADIUS.limited > NODE_RADIUS.none);
    for (const band of Object.values(BANDS)) assert.ok(TONE_COLOR[band.tone], `no colour for tone ${band.tone}`);
    assert.ok(!Object.values(TONE_COLOR).some((c) => /^#(dc2626|ef4444|b91c1c)$/i.test(c)));
});

// ─── Teacher repository: students who could use support ──────────────────────

const ev = (pct, questions = 6, assessments = 2) => ({ pct, questions, assessments, available: questions * 5, series: [{ pct }] });
const roster = [
    { id: 'a', fullName: 'Ada' }, { id: 'b', fullName: 'Bayo' }, { id: 'c', fullName: 'Chi' },
    { id: 'd', fullName: 'Dayo' }, { id: 'e', fullName: 'Efe' },
];
const supportNodes = [{ id: 'ap', subtopic: 'Arithmetic progressions' }, { id: 'lin', subtopic: 'Linear equations' }];
const supportEvidence = {
    a: { ap: ev(30), lin: ev(90) },            // needs practice in ap
    b: { ap: ev(45), lin: ev(40) },            // needs practice in both
    c: { ap: ev(60), lin: ev(95) },            // developing in ap
    d: { ap: ev(10, 1, 1), lin: ev(80) },      // ap: limited evidence (1 question) -> NOT "lacking"
    e: {},                                     // not assessed
};

test('support list for one topic orders by lowest marks and never counts limited evidence as needing practice', () => {
    const r = findStudentsForSupport({ students: roster, evidenceByStudent: supportEvidence, nodes: supportNodes, nodeId: 'ap', level: 'focus' });
    assert.deepEqual(r.rows.map((x) => x.student.id), ['a', 'b']);          // 30% then 45%
    assert.deepEqual(r.limited.map((s) => s.id), ['d']);                    // 10% but only 1 question: we cannot tell
    assert.deepEqual(r.notAssessed.map((s) => s.id), ['e']);
    assert.equal(r.rows[0].matches[0].band.key, 'needs_practice');
});

test('including "still developing" widens the list; the limited level lists who we cannot judge yet', () => {
    const wide = findStudentsForSupport({ students: roster, evidenceByStudent: supportEvidence, nodes: supportNodes, nodeId: 'ap', level: 'focus_developing' });
    assert.deepEqual(wide.rows.map((x) => x.student.id), ['a', 'b', 'c']);
    const lim = findStudentsForSupport({ students: roster, evidenceByStudent: supportEvidence, nodes: supportNodes, nodeId: 'ap', level: 'limited' });
    assert.deepEqual(lim.rows.map((x) => x.student.id), ['d']);
    assert.ok(SUPPORT_LEVELS.focus.label && !/weak|fail|lack|bottom/i.test(Object.values(SUPPORT_LEVELS).map((l) => l.label).join(' ')));
});

test('across all topics, students with the most topics needing practice come first', () => {
    const r = findStudentsForSupport({ students: roster, evidenceByStudent: supportEvidence, nodes: supportNodes, nodeId: null, level: 'focus' });
    assert.deepEqual(r.rows.map((x) => x.student.id), ['b', 'a']);          // b: 2 topics, a: 1 topic
    assert.equal(r.rows[0].matches.length, 2);
    assert.deepEqual(r.rows[0].matches.map((m) => m.nodeId), ['lin', 'ap']); // lowest marks first
    assert.deepEqual(r.notAssessed.map((s) => s.id), ['e']);
});

test('the repository view ("Everyone") lists every student, flagging only genuine need', () => {
    const one = findStudentsForSupport({ students: roster, evidenceByStudent: supportEvidence, nodes: supportNodes, nodeId: 'ap', level: 'all' });
    assert.equal(one.rows.length, roster.length);
    assert.deepEqual(one.rows.map((x) => x.student.id), ['a', 'b', 'c', 'd', 'e']);       // 30, 45, 60, then limited evidence, then not assessed
    assert.equal(one.rows[4].matches.length, 0);                                           // unassessed student still listed
    assert.equal(one.rows[3].matches[0].band.key, 'limited');                              // limited evidence is shown as such
    const any = findStudentsForSupport({ students: roster, evidenceByStudent: supportEvidence, nodes: supportNodes, nodeId: null, level: 'all' });
    assert.equal(any.rows.length, roster.length);
    assert.deepEqual(any.rows.slice(0, 2).map((x) => x.student.id), ['b', 'a']);          // most flagged topics first
    assert.equal(any.rows.find((x) => x.student.id === 'd').matches.length, 0);            // limited evidence is never flagged
    assert.equal(any.rows.find((x) => x.student.id === 'c').matches.length, 0);            // developing is not flagged at this level
});

test('topicsByNeed ranks topics by how many students need focused practice and drops empty ones', () => {
    const t = topicsByNeed(roster, supportEvidence, supportNodes);
    assert.deepEqual(t.map((x) => [x.node.id, x.count]), [['ap', 2], ['lin', 1]]);
    assert.deepEqual(topicsByNeed(roster, { a: { ap: ev(95), lin: ev(95) } }, supportNodes), []);
});

test('brainSummary counts topics by band without inventing data', () => {
    const s = brainSummary(supportNodes, supportEvidence.b);
    assert.equal(s.needs_practice, 2); assert.equal(s.assessed, 2); assert.equal(s.notAssessed, 0);
    const none = brainSummary(supportNodes, {});
    assert.equal(none.notAssessed, 2); assert.equal(none.assessed, 0);
    assert.equal(brainSummary(supportNodes, supportEvidence.d).limited, 1);
});
