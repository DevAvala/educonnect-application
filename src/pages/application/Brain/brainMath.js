/**
 * brainMath.js — Student Brain: deterministic evidence calculations.
 *
 * Everything in here is plain arithmetic on validated marks. No AI is involved and nothing here
 * ever changes an official mark (Brain plan §4, §9). It is kept free of imports so it can be unit
 * tested with `node --test`.
 *
 * Rules this file encodes (see AI_LAB_MASTER_PLAN.md §5.2):
 *   - A missing mark is NOT a zero. Absent, exempt and not-marked questions are left out of both
 *     the earned and the available totals.
 *   - A multi-topic question splits its marks between topics by approved shares, so no marks are
 *     counted twice.
 *   - A topic is only given a performance label when there is enough evidence behind it.
 *   - We describe observed performance on assessed questions. We never claim to know why a
 *     student lost marks.
 *
 * ⚠ THRESHOLDS ARE PROVISIONAL. The product owner has not yet approved the cut-offs or the
 * minimum-evidence rules (open decision, Brain plan §14 Q6). Change them here, in one place.
 */

export const BAND_THRESHOLDS = Object.freeze({ strong: 85, well: 70, developing: 50 });

/** Below this much evidence a topic is shown as "Limited evidence" and gets no performance label. */
export const MIN_EVIDENCE = Object.freeze({ questions: 3, marks: 10 });

/** A change smaller than this many percentage points is described as "similar". */
export const TREND_MIN_CHANGE = 10;

/** Class insights count a student as "below" a topic at or under this percentage. */
export const CLASS_BELOW_PCT = 50;

/** Mark statuses. Only 'scored' contributes to evidence. */
export const MARK_STATUS = Object.freeze({
    SCORED: 'scored',
    ABSENT: 'absent',
    EXEMPT: 'exempt',
    NOT_MARKED: 'not_marked',
});

const round1 = (n) => Math.round(n * 10) / 10;
const EPS = 1e-6;

// ─── Mark entry ──────────────────────────────────────────────────────────────

/**
 * Turn what a teacher typed into a stored mark.
 *   ''        → not marked yet (never zero)
 *   'A'/'ABS' → absent        'E'/'EX' → exempt
 *   number    → scored, must satisfy 0 ≤ earned ≤ max
 * Returns { status, earned, error }.
 */
export function parseMarkInput(raw, maxMarks) {
    const text = String(raw ?? '').trim();
    if (text === '') return { status: MARK_STATUS.NOT_MARKED, earned: null, error: null };
    const upper = text.toUpperCase();
    if (upper === 'A' || upper === 'ABS') return { status: MARK_STATUS.ABSENT, earned: null, error: null };
    if (upper === 'E' || upper === 'EX') return { status: MARK_STATUS.EXEMPT, earned: null, error: null };

    if (!/^\d+(\.\d+)?$/.test(text)) {
        return { status: MARK_STATUS.NOT_MARKED, earned: null, error: 'Enter a number, A (absent) or E (exempt)' };
    }
    const earned = Number(text);
    if (earned > maxMarks + EPS) {
        return { status: MARK_STATUS.NOT_MARKED, earned: null, error: `Cannot be more than ${maxMarks}` };
    }
    return { status: MARK_STATUS.SCORED, earned, error: null };
}

/** The text to show in a grid cell for a stored mark. */
export function formatMark(mark) {
    if (!mark) return '';
    if (mark.status === MARK_STATUS.ABSENT) return 'A';
    if (mark.status === MARK_STATUS.EXEMPT) return 'E';
    if (mark.status === MARK_STATUS.SCORED && mark.earned != null) return String(mark.earned);
    return '';
}

// ─── Question → topic tags ───────────────────────────────────────────────────

/**
 * Tags look like [{ nodeId, share }] where shares are fractions that add up to 1.
 * A question tagged to a single topic needs no explicit share.
 */
export function normaliseTags(tags = []) {
    if (!tags.length) return [];
    if (tags.length === 1) return [{ nodeId: tags[0].nodeId, share: 1 }];
    return tags.map((t) => ({ nodeId: t.nodeId, share: Number(t.share) || 0 }));
}

/** A question is ready for approval when it has ≥1 topic and its shares add up to 100%. */
export function validateTags(tags = []) {
    if (!tags.length) return { ok: false, error: 'Choose at least one topic' };
    const ids = tags.map((t) => t.nodeId);
    if (new Set(ids).size !== ids.length) return { ok: false, error: 'The same topic is used twice' };
    const norm = normaliseTags(tags);
    if (norm.some((t) => t.share <= 0)) return { ok: false, error: 'Every topic needs a share above 0%' };
    const total = norm.reduce((s, t) => s + t.share, 0);
    if (Math.abs(total - 1) > 0.005) {
        return { ok: false, error: `Shares add up to ${Math.round(total * 100)}%, not 100%` };
    }
    return { ok: true, error: null };
}

/** Everything that stops an assessment's topic mapping from being approved. */
export function mappingProblems(questions = []) {
    return questions
        .map((q) => ({ question: q, ...validateTags(q.tags) }))
        .filter((r) => !r.ok)
        .map((r) => ({ questionId: r.question.id, label: r.question.label, error: r.error }));
}

// ─── Aggregation ─────────────────────────────────────────────────────────────

/**
 * One student's evidence per topic, from approved assessments only.
 *
 * @param assessments  [{ id, title, date, mappingStatus, questions:[{ id, maxMarks, tags }] }]
 * @param marks        { [assessmentId]: { [studentId]: { [questionId]: { status, earned } } } }
 * @returns Map-like object { [nodeId]: NodeEvidence }
 *
 * NodeEvidence = { nodeId, earned, available, pct, questions, assessments, series[], lastAssessed }
 *   series = [{ assessmentId, title, date, earned, available, pct, questions }] oldest first
 */
export function studentEvidence(assessments, marks, studentId) {
    const byNode = {};

    for (const a of assessments) {
        if (a.mappingStatus !== 'approved') continue; // unapproved mappings never count
        const studentMarks = marks?.[a.id]?.[studentId];
        if (!studentMarks) continue;

        const perNode = {};
        for (const q of a.questions) {
            const mark = studentMarks[q.id];
            if (!mark || mark.status !== MARK_STATUS.SCORED || mark.earned == null) continue;
            for (const tag of normaliseTags(q.tags)) {
                const slot = (perNode[tag.nodeId] ??= { earned: 0, available: 0, questions: 0 });
                slot.earned += mark.earned * tag.share;
                slot.available += q.maxMarks * tag.share;
                slot.questions += 1;
            }
        }

        for (const [nodeId, slot] of Object.entries(perNode)) {
            if (slot.available <= 0) continue;
            const node = (byNode[nodeId] ??= {
                nodeId, earned: 0, available: 0, questions: 0, assessments: 0, series: [], lastAssessed: null,
            });
            node.earned += slot.earned;
            node.available += slot.available;
            node.questions += slot.questions;
            node.assessments += 1;
            node.series.push({
                assessmentId: a.id,
                title: a.title,
                date: a.date,
                earned: round1(slot.earned),
                available: round1(slot.available),
                pct: Math.round((slot.earned / slot.available) * 100),
                questions: slot.questions,
            });
            if (!node.lastAssessed || a.date > node.lastAssessed) node.lastAssessed = a.date;
        }
    }

    for (const node of Object.values(byNode)) {
        node.series.sort((x, y) => String(x.date).localeCompare(String(y.date)));
        node.pct = Math.round((node.earned / node.available) * 100);
        node.earned = round1(node.earned);
        node.available = round1(node.available);
    }
    return byNode;
}

// ─── Evidence strength, bands, trend ─────────────────────────────────────────

/** 'limited' | 'moderate' | 'good' — how much assessment evidence sits behind a topic figure. */
export function evidenceStrength({ questions = 0, assessments = 0, available = 0 }) {
    if (questions < MIN_EVIDENCE.questions || available < MIN_EVIDENCE.marks) return 'limited';
    if (assessments >= 2 && questions >= 5) return 'good';
    return 'moderate';
}

export const BANDS = Object.freeze({
    strong:         { key: 'strong',         label: 'Performing strongly',  tone: 'green' },
    well:           { key: 'well',           label: 'Performing well',      tone: 'green' },
    developing:     { key: 'developing',     label: 'Developing',           tone: 'blue'  },
    needs_practice: { key: 'needs_practice', label: 'Needs focused practice', tone: 'amber' },
    limited:        { key: 'limited',        label: 'Limited evidence',     tone: 'gray'  },
});

/** Performance band for a topic. Returns the 'limited' band whenever evidence is thin. */
export function performanceBand(node) {
    if (!node || evidenceStrength(node) === 'limited') return BANDS.limited;
    if (node.pct >= BAND_THRESHOLDS.strong) return BANDS.strong;
    if (node.pct >= BAND_THRESHOLDS.well) return BANDS.well;
    if (node.pct >= BAND_THRESHOLDS.developing) return BANDS.developing;
    return BANDS.needs_practice;
}

/** 'increased' | 'decreased' | 'similar' | 'single' — needs ≥2 assessments to say anything. */
export function trendDirection(series = []) {
    if (series.length < 2) return 'single';
    const change = series[series.length - 1].pct - series[0].pct;
    if (change >= TREND_MIN_CHANGE) return 'increased';
    if (change <= -TREND_MIN_CHANGE) return 'decreased';
    return 'similar';
}

/**
 * Plain-language trend sentence. Worded as observed performance on assessed questions, with the
 * caveat that the questions differ between tests (Brain plan §4.2, §4.3).
 */
export function describeTrend(topicName, series = []) {
    const dir = trendDirection(series);
    if (dir === 'single') return `Only one assessment so far, so there is no trend to show yet.`;
    const path = series.map((s) => `${s.pct}%`).join(' → ');
    const n = series.length;
    const verb = { increased: 'increased', decreased: 'decreased', similar: 'stayed similar' }[dir];
    return `Performance on assessed ${topicName.toLowerCase()} questions ${verb} across ${n} assessments (${path}).`;
}

// ─── Class level ─────────────────────────────────────────────────────────────

/**
 * Class view: per topic, how many students are at or below the cut-off, among students who have
 * enough evidence. Students with limited evidence are counted separately, never as "below".
 */
export function classInsights(assessments, marks, studentIds, belowPct = CLASS_BELOW_PCT) {
    const evidenceByStudent = Object.fromEntries(
        studentIds.map((id) => [id, studentEvidence(assessments, marks, id)]),
    );
    const nodeIds = new Set();
    Object.values(evidenceByStudent).forEach((e) => Object.keys(e).forEach((id) => nodeIds.add(id)));

    const rows = [];
    for (const nodeId of nodeIds) {
        let earned = 0; let available = 0; let questions = 0;
        const assessmentIds = new Set();
        let enough = 0; let below = 0; let limited = 0;

        for (const sid of studentIds) {
            const ev = evidenceByStudent[sid][nodeId];
            if (!ev) continue;
            earned += ev.earned; available += ev.available; questions += ev.questions;
            ev.series.forEach((s) => assessmentIds.add(s.assessmentId));
            if (evidenceStrength(ev) === 'limited') { limited += 1; continue; }
            enough += 1;
            if (ev.pct <= belowPct) below += 1;
        }
        if (available <= 0) continue;
        rows.push({
            nodeId,
            classPct: Math.round((earned / available) * 100),
            studentsWithEvidence: enough,
            studentsLimited: limited,
            studentsBelow: below,
            pctBelow: enough ? Math.round((below / enough) * 100) : null,
            questions,
            assessments: assessmentIds.size,
        });
    }
    return rows;
}

// ─── CSV import ──────────────────────────────────────────────────────────────

/** Small RFC-4180-style CSV parser (quoted fields, escaped quotes, CRLF). Returns string[][]. */
export function parseCsv(text) {
    const rows = []; let row = []; let cell = ''; let inQuotes = false;
    const src = String(text ?? '').replace(/^\uFEFF/, '');
    for (let i = 0; i < src.length; i += 1) {
        const ch = src[i];
        if (inQuotes) {
            if (ch === '"') {
                if (src[i + 1] === '"') { cell += '"'; i += 1; } else inQuotes = false;
            } else cell += ch;
        } else if (ch === '"') inQuotes = true;
        else if (ch === ',') { row.push(cell); cell = ''; }
        else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && src[i + 1] === '\n') i += 1;
            row.push(cell); cell = '';
            if (row.some((c) => c.trim() !== '')) rows.push(row);
            row = [];
        } else cell += ch;
    }
    row.push(cell);
    if (row.some((c) => c.trim() !== '')) rows.push(row);
    return rows;
}

const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Check an uploaded marking report against an assessment, WITHOUT applying anything.
 *
 * Expected layout: one header row; a student column (name or admission number); one column per
 * question whose header matches a question label ("Q1") — an optional "(10)" max suffix is
 * checked against the paper. A layout we cannot recognise is rejected, never guessed.
 *
 * @returns {
 *   recognised: boolean, reason?: string,
 *   studentColumn, matchedQuestions[], unmatchedColumns[], maxMismatches[],
 *   rows[{ studentId, studentName, marks:{[qid]:{status,earned}}, errors[] }],
 *   unmatchedStudents[], errorCount
 * }
 */
export function previewImport(csvRows, questions, students) {
    if (!csvRows.length) return { recognised: false, reason: 'The file is empty.' };

    const header = csvRows[0].map((h) => String(h ?? '').trim());
    const labelIndex = Object.fromEntries(questions.map((q) => [norm(q.label), q]));

    const matched = []; const unmatchedColumns = []; const maxMismatches = [];
    header.forEach((h, col) => {
        const m = h.match(/^(.*?)\s*(?:\(\s*(\d+(?:\.\d+)?)\s*\))?$/);
        const q = labelIndex[norm(m?.[1] ?? h)];
        if (!q) { unmatchedColumns.push({ col, header: h }); return; }
        matched.push({ col, question: q });
        if (m?.[2] != null && Number(m[2]) !== q.maxMarks) {
            maxMismatches.push({ label: q.label, file: Number(m[2]), paper: q.maxMarks });
        }
    });

    if (!matched.length) {
        return {
            recognised: false,
            reason: 'No column headers match this assessment\'s question labels (for example Q1, Q2). '
                + 'Rename the columns or enter the marks by hand.',
        };
    }

    const matchedCols = new Set(matched.map((m) => m.col));
    const studentCol = header.findIndex((h, i) => !matchedCols.has(i)
        && /^(student|name|full ?name|admission|admission ?(no|number)|student ?id|id)\b/i.test(h));
    if (studentCol === -1) {
        return { recognised: false, reason: 'Could not find a student name or admission number column.' };
    }

    const byKey = new Map();
    students.forEach((s) => {
        byKey.set(norm(s.fullName), s);
        if (s.admissionNo) byKey.set(norm(s.admissionNo), s);
    });

    const rows = []; const unmatchedStudents = []; let errorCount = 0;
    const seen = new Set();
    for (const r of csvRows.slice(1)) {
        const key = norm(r[studentCol]);
        if (!key) continue;
        const student = byKey.get(key);
        if (!student) { unmatchedStudents.push(String(r[studentCol]).trim()); continue; }

        const errors = []; const marksOut = {};
        if (seen.has(student.id)) errors.push('Student appears more than once');
        seen.add(student.id);
        for (const { col, question } of matched) {
            const parsed = parseMarkInput(r[col], question.maxMarks);
            if (parsed.error) errors.push(`${question.label}: ${parsed.error}`);
            else marksOut[question.id] = { status: parsed.status, earned: parsed.earned };
        }
        errorCount += errors.length;
        rows.push({ studentId: student.id, studentName: student.fullName, marks: marksOut, errors });
    }

    return {
        recognised: true,
        studentColumn: header[studentCol],
        matchedQuestions: matched.map((m) => m.question),
        unmatchedColumns: unmatchedColumns.filter((c) => c.col !== studentCol),
        maxMismatches, rows, unmatchedStudents, errorCount,
    };
}

/** Can this preview be applied? Blocked by any error, mismatched maximum, or empty match. */
export function importIsApplicable(preview) {
    return !!preview?.recognised && preview.errorCount === 0
        && preview.maxMismatches.length === 0 && preview.rows.length > 0;
}

// ─── Parent summary ──────────────────────────────────────────────────────────

const joinList = (items) => {
    if (items.length <= 1) return items.join('');
    return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
};

/**
 * Plain-language summary for a parent, built from templates over the calculated figures.
 * It never states a cause and never speaks about topics that have only limited evidence.
 *
 * @param nodes     [{ id, subtopic }]
 * @param evidence  output of studentEvidence()
 * @returns string[] — sentences, in reading order
 */
export function summariseChild(nodes, evidence, firstName = 'Your child') {
    const named = nodes
        .map((n) => ({ name: n.subtopic.toLowerCase(), ev: evidence[n.id] }))
        .filter((x) => x.ev);
    if (!named.length) return [];

    const banded = named.map((x) => ({ ...x, band: performanceBand(x.ev) }));
    const strong = banded.filter((x) => x.band.key === 'strong' || x.band.key === 'well')
        .sort((a, b) => b.ev.pct - a.ev.pct).slice(0, 3);
    const focus = banded.filter((x) => x.band.key === 'needs_practice').sort((a, b) => a.ev.pct - b.ev.pct);
    const rising = banded.filter((x) => x.band.key !== 'limited' && trendDirection(x.ev.series) === 'increased');
    const limited = banded.filter((x) => x.band.key === 'limited');

    const out = [];
    if (strong.length) out.push(`${firstName} is showing stronger performance in ${joinList(strong.map((x) => x.name))}.`);
    if (rising.length) {
        out.push(`Marks on ${joinList(rising.map((x) => x.name))} questions have gone up across recent assessments.`);
    }
    if (focus.length) {
        out.push(`Marks on ${joinList(focus.map((x) => x.name))} questions have been lower, so short, focused practice there may help.`);
    }
    if (limited.length) {
        out.push(`For ${limited.length} topic${limited.length === 1 ? '' : 's'} there is not enough evidence yet to say much.`);
    }
    return out;
}
