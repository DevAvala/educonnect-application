import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Lock, Pencil, Plus, Sparkles, X } from 'lucide-react';
import { Drawer, Field, StatusChip, inputClass, pushToast } from '../../../../components/patterns';
import { mappingProblems, validateTags } from '../brainMath.js';
import { nodePath } from '../components/BrainShared.jsx';
import { saveQuestionTags } from '../services/brainAPIs.js';

const pct = (share) => Math.round((share ?? 1) * 100);

function TagChips({ tags, nodesById }) {
    if (!tags.length) return <span className="text-[12px] italic text-gray-400">No topic chosen yet</span>;
    return (
        <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
                <span key={t.nodeId} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[12px] font-medium text-gray-700">
                    {nodePath(nodesById[t.nodeId]) || t.nodeId}
                    {tags.length > 1 && <span className="font-semibold tabular-nums text-gray-400">{pct(t.share)}%</span>}
                </span>
            ))}
        </div>
    );
}

/** Edit the topic (or topics) one question tests. Opens in a drawer: three fields at most. */
function TopicEditorDrawer({ question, nodes, open, onClose, onSave }) {
    const [rows, setRows] = useState([]); // [{ nodeId, percent }]
    const [saving, setSaving] = useState(false);
    const [serverError, setServerError] = useState(null);

    useEffect(() => {
        if (!open || !question) return;
        const tags = question.tags.length ? question.tags : [{ nodeId: '', share: 1 }];
        setRows(tags.map((t) => ({ nodeId: t.nodeId, percent: pct(t.share) })));
        setServerError(null);
    }, [open, question]);

    const grouped = useMemo(() => {
        const g = {};
        nodes.forEach((n) => { (g[`${n.subject} · ${n.topic}`] ??= []).push(n); });
        return g;
    }, [nodes]);

    const tags = rows.filter((r) => r.nodeId).map((r) => ({ nodeId: r.nodeId, share: Number(r.percent) / 100 }));
    const check = rows.some((r) => !r.nodeId) ? { ok: false, error: 'Choose a topic for every row' } : validateTags(tags);
    const total = rows.reduce((s, r) => s + (Number(r.percent) || 0), 0);

    const update = (i, patch) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
    const splitEvenly = () => setRows((rs) => rs.map((r, _, all) => ({ ...r, percent: Math.floor(100 / all.length) + (r === all[0] ? 100 - Math.floor(100 / all.length) * all.length : 0) })));

    const save = async () => {
        setSaving(true); setServerError(null);
        try {
            await onSave(question.id, tags.length === 1 ? [{ nodeId: tags[0].nodeId }] : tags);
            onClose();
        } catch (e) {
            setServerError(e?.message || 'Could not save topics.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Drawer
            open={open} onClose={onClose}
            title={`Topics for ${question?.label ?? ''}`}
            subtitle={question ? `${question.maxMarks} marks` : ''}
            footer={(
                <>
                    <button onClick={onClose} className="h-10 flex-1 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button onClick={save} disabled={!check.ok || saving}
                        className="h-10 flex-1 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                        {saving ? 'Saving…' : 'Save topics'}
                    </button>
                </>
            )}
        >
            {question && <p className="rounded-lg bg-gray-50 p-3 text-[13px] text-gray-700">{question.text}</p>}
            <p className="text-[12px] text-gray-500">
                Pick the topic this question tests. If it tests more than one, add each topic and say how its marks are shared, so no mark is counted twice.
            </p>

            <div className="space-y-3">
                {rows.map((r, i) => (
                    <div key={i} className="flex items-end gap-2">
                        <div className="flex-1">
                            <Field label={rows.length > 1 ? `Topic ${i + 1}` : 'Topic'} htmlFor={`topic-${i}`}>
                                <select id={`topic-${i}`} value={r.nodeId} onChange={(e) => update(i, { nodeId: e.target.value })} className={inputClass(false)}>
                                    <option value="">Choose a topic…</option>
                                    {Object.entries(grouped).map(([group, list]) => (
                                        <optgroup key={group} label={group}>
                                            {list.map((n) => <option key={n.id} value={n.id}>{n.subtopic}</option>)}
                                        </optgroup>
                                    ))}
                                </select>
                            </Field>
                        </div>
                        {rows.length > 1 && (
                            <>
                                <div className="w-24">
                                    <Field label="Share" htmlFor={`share-${i}`}>
                                        <div className="relative">
                                            <input id={`share-${i}`} type="number" min="1" max="100" inputMode="numeric" value={r.percent}
                                                onChange={(e) => update(i, { percent: e.target.value })} className={`${inputClass(false)} pr-7 tabular-nums`} />
                                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
                                        </div>
                                    </Field>
                                </div>
                                <button onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} aria-label={`Remove topic ${i + 1}`}
                                    className="mb-1 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><X size={16} /></button>
                            </>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between">
                <button onClick={() => setRows((rs) => [...rs, { nodeId: '', percent: 0 }])}
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue-700 hover:text-blue-800">
                    <Plus size={14} /> This question tests another topic
                </button>
                {rows.length > 1 && (
                    <button onClick={splitEvenly} className="text-[12px] font-semibold text-gray-500 hover:text-gray-800">Split evenly</button>
                )}
            </div>

            {rows.length > 1 && (
                <p className={`text-[12px] font-semibold tabular-nums ${total === 100 ? 'text-green-700' : 'text-amber-700'}`}>Shares total {total}%</p>
            )}
            {!check.ok && rows.some((r) => r.nodeId) && <p role="alert" className="text-[12px] font-medium text-amber-700">{check.error}</p>}
            {serverError && <p role="alert" className="text-[12px] font-medium text-red-600">{serverError}</p>}
        </Drawer>
    );
}

export default function QuestionMappingTab({ assessment, nodes, onChange, onSuggest, suggesting, showProblems }) {
    const [editing, setEditing] = useState(null);
    const nodesById = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);
    const locked = assessment.mappingStatus === 'approved';
    const problems = useMemo(() => mappingProblems(assessment.questions), [assessment.questions]);
    const problemById = Object.fromEntries(problems.map((p) => [p.questionId, p.error]));
    const untagged = assessment.questions.filter((q) => !q.tags.length).length;
    const suggested = assessment.questions.filter((q) => q.suggested).length;

    const saveTags = async (questionId, tags) => {
        const { assessment: next } = await saveQuestionTags(assessment.id, questionId, tags);
        onChange(next);
        pushToast({ message: 'Topics saved' });
    };

    return (
        <div className="space-y-4 p-4 sm:p-5">
            {locked ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-green-200 bg-green-50 px-3.5 py-2.5 text-[13px] text-green-800">
                    <Lock size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <p>Topics are approved and locked. Marks for this assessment now count toward each student's Brain. To change a topic, reopen the mapping from the menu and give a reason.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    <p className="text-[13px] text-gray-600">
                        Link each question to the topic it tests. Marks only count toward Student Brain after you approve the topics.
                    </p>
                    {suggested > 0 && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-900">
                            <Sparkles size={15} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
                            <p><span className="font-semibold">{suggested} question{suggested === 1 ? ' has' : 's have'} suggested topics.</span> They are only suggestions. Check each one and change it if it is wrong before you approve.</p>
                        </div>
                    )}
                    {showProblems && problems.length > 0 && (
                        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-800">
                            <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                            <p>Cannot approve yet. {problems.map((p) => `${p.label}: ${p.error}`).join(' · ')}</p>
                        </div>
                    )}
                    {untagged > 0 && (
                        <button onClick={onSuggest} disabled={suggesting}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                            <Sparkles size={14} className="text-amber-500" />
                            {suggesting ? 'Suggesting…' : `Suggest topics for ${untagged} unmapped question${untagged === 1 ? '' : 's'}`}
                        </button>
                    )}
                </div>
            )}

            <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
                {assessment.questions.map((q) => (
                    <li key={q.id} className="flex flex-col gap-2 p-3.5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[13px] font-bold text-gray-900">{q.label}</span>
                                <span className="text-[12px] text-gray-400">{q.maxMarks} marks</span>
                                {q.suggested && <StatusChip tone="amber" size="xs" dot={false}>Suggested · needs review</StatusChip>}
                            </div>
                            <p className="text-[13px] text-gray-600">{q.text}</p>
                            <TagChips tags={q.tags} nodesById={nodesById} />
                            {showProblems && problemById[q.id] && !locked && (
                                <p className="text-[12px] font-medium text-red-600">{problemById[q.id]}</p>
                            )}
                        </div>
                        {!locked && (
                            <button onClick={() => setEditing(q)}
                                className="inline-flex h-8 shrink-0 items-center gap-1.5 self-start rounded-lg border border-gray-200 px-3 text-[12px] font-semibold text-gray-700 hover:bg-gray-50">
                                <Pencil size={12} /> {q.tags.length ? 'Edit topics' : 'Choose topic'}
                            </button>
                        )}
                    </li>
                ))}
            </ul>

            <TopicEditorDrawer question={editing} nodes={nodes} open={!!editing} onClose={() => setEditing(null)} onSave={saveTags} />
        </div>
    );
}
