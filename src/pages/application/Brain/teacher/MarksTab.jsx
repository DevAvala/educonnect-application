import React, { useCallback, useMemo } from 'react';
import { Lock } from 'lucide-react';
import { EmptyState, gridCellClass, useKeyboardGrid } from '../../../../components/patterns';
import { MARK_STATUS, formatMark, parseMarkInput } from '../brainMath.js';

/** Build the editable text grid ({ [studentId]: { [questionId]: 'raw text' } }) from stored marks. */
export function draftFromMarks(students, questions, marks) {
    const out = {};
    students.forEach((s) => {
        out[s.id] = {};
        questions.forEach((q) => { out[s.id][q.id] = formatMark(marks?.[s.id]?.[q.id]); });
    });
    return out;
}

/** Parse the whole draft. Returns { marks, errors: {[sid]: {[qid]: msg}}, errorCount }. */
export function parseDraft(draft, questions) {
    const marks = {}; const errors = {}; let errorCount = 0;
    for (const [sid, perQ] of Object.entries(draft)) {
        marks[sid] = {};
        for (const q of questions) {
            const parsed = parseMarkInput(perQ[q.id], q.maxMarks);
            if (parsed.error) { (errors[sid] ??= {})[q.id] = parsed.error; errorCount += 1; }
            marks[sid][q.id] = { status: parsed.status, earned: parsed.earned };
        }
    }
    return { marks, errors, errorCount };
}

export default function MarksTab({ assessment, students, draft, setDraft, original, onSave, saving }) {
    const { questions } = assessment;
    const locked = assessment.mappingStatus !== 'approved';

    const parsed = useMemo(() => parseDraft(draft, questions), [draft, questions]);
    const dirty = useMemo(() => students.some((s) => questions.some((q) => (draft[s.id]?.[q.id] ?? '') !== (original[s.id]?.[q.id] ?? ''))), [draft, original, students, questions]);

    const setCell = useCallback((sid, qid, value) => {
        setDraft((d) => ({ ...d, [sid]: { ...d[sid], [qid]: value } }));
    }, [setDraft]);

    const onPasteRows = useCallback((rows, startRow, startCol) => {
        setDraft((d) => {
            const next = { ...d };
            rows.forEach((cells, ri) => {
                const student = students[startRow + ri];
                if (!student) return;
                next[student.id] = { ...next[student.id] };
                cells.forEach((value, ci) => {
                    const q = questions[startCol + ci];
                    if (q) next[student.id][q.id] = String(value).trim();
                });
            });
            return next;
        });
    }, [setDraft, students, questions]);

    const grid = useKeyboardGrid({ onPasteRows });

    if (locked) {
        return (
            <div className="p-5">
                <EmptyState
                    icon={Lock}
                    title="Approve the topics first"
                    description="Marks are only used once each question's topic is approved, so the right topics get the right marks. Approve the topic mapping on the first tab, then come back here."
                />
            </div>
        );
    }

    const notMarked = students.reduce((n, s) => n + questions.filter((q) => parsed.marks[s.id]?.[q.id]?.status === MARK_STATUS.NOT_MARKED).length, 0);

    const rowTotal = (sid) => {
        let earned = 0; let avail = 0;
        questions.forEach((q) => {
            const m = parsed.marks[sid]?.[q.id];
            if (m?.status === MARK_STATUS.SCORED) { earned += m.earned; avail += q.maxMarks; }
        });
        return avail ? { earned: Math.round(earned * 10) / 10, avail } : null;
    };
    const colAverage = (q) => {
        const scored = students.map((s) => parsed.marks[s.id]?.[q.id]).filter((m) => m?.status === MARK_STATUS.SCORED);
        if (!scored.length) return '—';
        return `${Math.round((scored.reduce((a, m) => a + m.earned, 0) / (scored.length * q.maxMarks)) * 100)}%`;
    };

    return (
        <div className="space-y-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 text-[13px] text-gray-600">
                    <p>Type each student's mark for each question. Use <kbd className="rounded border bg-gray-50 px-1">Tab</kbd>, <kbd className="rounded border bg-gray-50 px-1">Enter</kbd> or the arrow keys to move, or paste from Excel.</p>
                    <p className="text-[12px] text-gray-500">
                        <span className="font-semibold">Blank</span> = not marked yet (it is <em>not</em> counted as zero) · <span className="font-semibold">A</span> = absent · <span className="font-semibold">E</span> = exempt
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {dirty && <span className="text-[12px] font-semibold text-amber-700">Unsaved changes</span>}
                    <button onClick={() => onSave(parsed.marks)} disabled={!dirty || parsed.errorCount > 0 || saving}
                        className="h-9 rounded-lg bg-blue-600 px-4 text-[13px] font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                        {saving ? 'Saving…' : 'Save marks'}
                    </button>
                </div>
            </div>
            {parsed.errorCount > 0 && (
                <p role="alert" className="text-[12px] font-medium text-red-600">
                    {parsed.errorCount} mark{parsed.errorCount === 1 ? ' needs' : 's need'} fixing before you can save. Hover a red cell to see why.
                </p>
            )}

            <div {...grid.containerProps} className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                    <thead>
                        <tr className="bg-gray-50 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                            <th scope="col" className="sticky left-0 z-10 min-w-[11rem] bg-gray-50 px-3 py-2.5 text-left">Student</th>
                            {questions.map((q) => (
                                <th key={q.id} scope="col" className="w-20 px-1 py-2.5 text-center">
                                    {q.label}<span className="block font-normal normal-case text-gray-400">/ {q.maxMarks}</span>
                                </th>
                            ))}
                            <th scope="col" className="px-3 py-2.5 text-right">Marked total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {students.map((s, ri) => {
                            const t = rowTotal(s.id);
                            return (
                                <tr key={s.id} className="hover:bg-gray-50/60">
                                    <th scope="row" className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-1.5 text-left text-[13px] font-semibold text-gray-800">{s.fullName}</th>
                                    {questions.map((q, ci) => {
                                        const err = parsed.errors[s.id]?.[q.id];
                                        return (
                                            <td key={q.id} className="px-1 py-1">
                                                <input
                                                    {...grid.cellProps(ri, ci)}
                                                    value={draft[s.id]?.[q.id] ?? ''}
                                                    onChange={(e) => setCell(s.id, q.id, e.target.value)}
                                                    inputMode="decimal"
                                                    autoComplete="off"
                                                    aria-label={`${s.fullName}, ${q.label}, out of ${q.maxMarks}`}
                                                    aria-invalid={err ? 'true' : undefined}
                                                    title={err || undefined}
                                                    className={`${gridCellClass} tabular-nums ${err ? '!border-red-300 bg-red-50 text-red-700' : ''}`}
                                                />
                                            </td>
                                        );
                                    })}
                                    <td className="px-3 py-1.5 text-right text-[13px] tabular-nums text-gray-600">{t ? `${t.earned} / ${t.avail}` : '—'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="border-t border-gray-200 bg-gray-50/70 text-[12px] text-gray-500">
                            <th scope="row" className="sticky left-0 bg-gray-50 px-3 py-2 text-left font-semibold">Class average</th>
                            {questions.map((q) => <td key={q.id} className="px-1 py-2 text-center tabular-nums">{colAverage(q)}</td>)}
                            <td />
                        </tr>
                    </tfoot>
                </table>
            </div>
            <p className="text-[12px] text-gray-400">{notMarked} cell{notMarked === 1 ? '' : 's'} not marked yet. The marked total only adds the questions that have a mark.</p>
        </div>
    );
}
