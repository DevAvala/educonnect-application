import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Users } from 'lucide-react';
import TeacherLayout from '../../TeacherDashboard/components/layout/TeacherLayout.jsx';
import { Avatar, WorkbenchTable } from '../../../../components/patterns';
import { listStudentBrains } from '../services/brainAPIs.js';
import { SUPPORT_LEVELS, brainSummary, classEvidence, findStudentsForSupport, topicsByNeed, trendDirection } from '../brainMath.js';
import { BandChip, BrainTopBar, EvidenceCaveat, EvidenceMeter, PerformanceBar, TopicChip } from '../components/BrainShared.jsx';
import BrainViz from '../components/BrainViz.jsx';
import MiniBrain from '../components/MiniBrain.jsx';
import BrainHeader, { BRAIN_TEACHER_ROUTES } from './BrainHeader.jsx';

const TREND_TEXT = { increased: 'Going up', decreased: 'Going down', similar: 'About the same', single: 'One test so far' };
const LEVELS = ['all', 'focus', 'focus_developing', 'limited'];

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export default function StudentBrainsPage() {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showClassBrain, setShowClassBrain] = useState(true);
    const [classSel, setClassSel] = useState(null);

    const nodeId = params.get('topic') || '';
    const level = LEVELS.includes(params.get('level')) ? params.get('level') : 'all';
    const setQuery = (next) => {
        const merged = { topic: nodeId, level, ...next };
        const out = {};
        if (merged.topic) out.topic = merged.topic;
        if (merged.level && merged.level !== 'all') out.level = merged.level;
        setParams(out, { replace: true });
    };

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try { setData(await listStudentBrains()); }
        catch (e) { setError(e?.message || 'We could not load your students.'); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const nodes = useMemo(() => data?.nodes ?? [], [data]);
    const students = useMemo(() => data?.students ?? [], [data]);
    const evidence = useMemo(() => data?.evidence ?? {}, [data]);
    const nodesById = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);
    const topic = nodeId ? nodesById[nodeId] : null;

    const result = useMemo(
        () => (data ? findStudentsForSupport({ students, evidenceByStudent: evidence, nodes, nodeId: nodeId || null, level }) : null),
        [data, students, evidence, nodes, nodeId, level],
    );
    const classGetEvidence = useCallback((allowed) => classEvidence(nodes, evidence, students, allowed), [nodes, evidence, students]);
    const pickTopic = (id) => {
        setQuery({ topic: id, level: 'focus' });
        setTimeout(() => document.getElementById('students-table')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }), 60);
    };
    const quickTopics = useMemo(() => (data ? topicsByNeed(students, evidence, nodes).slice(0, 4) : []), [data, students, evidence, nodes]);

    const rows = useMemo(() => (result?.rows ?? []).map((r) => ({
        id: r.student.id, student: r.student, matches: r.matches,
        primary: r.matches[0], summary: brainSummary(nodes, evidence[r.student.id] ?? {}),
        evidence: evidence[r.student.id] ?? {},
    })), [result, nodes, evidence]);

    const groupedTopics = useMemo(() => {
        const g = {};
        nodes.forEach((n) => { (g[`${n.subject} · ${n.topic}`] ??= []).push(n); });
        return Object.entries(g);
    }, [nodes]);

    const columns = useMemo(() => {
        const cols = [
            {
                id: 'student', header: 'Student', accessor: (r) => r.student.fullName, sortable: true, hideable: false,
                render: (r) => (
                    <div className="flex items-center gap-2.5">
                        <Avatar name={r.student.fullName} size="sm" />
                        <div>
                            <p className="font-semibold text-gray-900">{r.student.fullName}</p>
                            <p className="text-[12px] text-gray-400">{r.student.admissionNo}</p>
                        </div>
                    </div>
                ),
            },
            {
                id: 'brain', header: 'Brain', accessor: null,
                render: (r) => <MiniBrain nodes={nodes} evidence={r.evidence} highlightId={nodeId || null} />,
            },
        ];
        if (nodeId) {
            cols.push(
                {
                    id: 'topic', header: topic?.subtopic ?? 'Topic', accessor: (r) => r.primary?.ev.pct ?? -1, sortable: true,
                    render: (r) => !r.primary ? <span className="text-[13px] text-gray-400">Not assessed yet</span> : (
                        <div className="min-w-[10rem] space-y-1.5">
                            <PerformanceBar node={r.primary.ev} />
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><BandChip node={r.primary.ev} /><EvidenceMeter node={r.primary.ev} showLabel={false} /></div>
                        </div>
                    ),
                },
                {
                    id: 'trend', header: 'Over the tests', accessor: (r) => (r.primary ? trendDirection(r.primary.ev.series) : ''),
                    render: (r) => !r.primary ? null : (
                        <span className="text-[13px] text-gray-600">
                            {TREND_TEXT[trendDirection(r.primary.ev.series)]}
                            <span className="block text-[11px] text-gray-400">{plural(r.primary.ev.assessments, 'assessment')}</span>
                        </span>
                    ),
                },
            );
        } else {
            cols.push(
                {
                    id: 'support', header: level === 'limited' ? 'Topics with limited evidence' : 'Could use support in',
                    accessor: (r) => r.matches.length, sortable: true,
                    render: (r) => (
                        <div className="flex max-w-[22rem] flex-wrap gap-1.5">
                            {r.matches.length === 0 && <span className="text-[13px] text-gray-400">{r.summary.assessed ? 'Nothing flagged' : 'No topics assessed yet'}</span>}
                            {r.matches.slice(0, 3).map((m) => (
                                <TopicChip key={m.nodeId} tone={m.band.tone}>{nodesById[m.nodeId]?.subtopic}</TopicChip>
                            ))}
                            {r.matches.length > 3 && <span className="self-center text-[12px] text-gray-400">+{r.matches.length - 3} more</span>}
                        </div>
                    ),
                },
                {
                    id: 'assessed', header: 'Topics assessed', accessor: (r) => r.summary.assessed, sortable: true, align: 'right',
                    render: (r) => <span className="tabular-nums text-gray-600">{r.summary.assessed} of {nodes.length}</span>,
                },
            );
        }
        return cols;
    }, [nodes, nodesById, nodeId, topic, level]);

    const levelMeta = SUPPORT_LEVELS[level];
    const headline = !result ? '' : level === 'all'
        ? `${plural(students.length, 'student')}.${topic ? ` Sorted by lowest marks in ${topic.subtopic.toLowerCase()} first.` : ' Pick a topic, or a level above, to see who could use support.'}`
        : level === 'limited'
        ? `${plural(rows.length, 'student')} ${rows.length === 1 ? 'has' : 'have'} limited evidence${topic ? ` on ${topic.subtopic.toLowerCase()}` : ' on at least one topic'}. We cannot say how they are doing yet.`
        : rows.length === 0
            ? `Nobody in this class currently shows up as "${levelMeta.label.toLowerCase()}"${topic ? ` in ${topic.subtopic.toLowerCase()}` : ''}.`
            : `${rows.length} of ${students.length} students: ${levelMeta.label.toLowerCase()}${topic ? ` in ${topic.subtopic.toLowerCase()}` : ' in at least one topic'}.`;

    const openStudent = (r) => navigate(`${BRAIN_TEACHER_ROUTES.student(r.id)}${nodeId ? `?topic=${nodeId}` : ''}`);
    const excluded = [
        ...(result?.limited.length && level !== 'limited' ? [{ key: 'limited', names: result.limited, text: 'have limited evidence, so we cannot say yet' }] : []),
        ...(result?.notAssessed.length ? [{ key: 'none', names: result.notAssessed, text: nodeId ? 'have not been assessed on this topic' : 'have no assessed topics yet' }] : []),
    ];

    return (
        <TeacherLayout>
            <div className="brain-ui mx-auto max-w-6xl space-y-4">
                <BrainHeader subtitle="Every student's brain in one place. Pick a topic to see who could use extra support." />
                <BrainTopBar />
                {data && (
                    <p className="text-[13px] text-gray-500">
                        <span className="font-semibold text-gray-700">{data.className} · {data.subjectName}</span> — {plural(students.length, 'student')}, based on {plural(data.assessments.length, 'approved assessment')}.
                    </p>
                )}
                <EvidenceCaveat audience="teacher" />

                {/* ── The whole class as one brain ────────────────────── */}
                {data && (
                    <section aria-label="Class brain" className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[13px] text-gray-500">See the whole class at a glance, then click a topic to find who could use support.</p>
                            <button onClick={() => setShowClassBrain((v) => !v)} aria-expanded={showClassBrain}
                                className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-50">
                                {showClassBrain ? 'Hide class brain' : 'Show class brain'}
                            </button>
                        </div>
                        {showClassBrain && (
                            <BrainViz title="Class brain" intro={`Each point is a topic, coloured by how the whole class did. Based on ${students.length} students.`}
                                nodes={nodes} evidence={{}} getEvidence={classGetEvidence} assessments={data.assessments}
                                selectedId={classSel} onSelect={(id) => setClassSel((cur) => (cur === id ? null : id))} onPick={pickTopic} />
                        )}
                    </section>
                )}

                {/* ── Find students ───────────────────────────────────── */}
                <section aria-labelledby="find-h" className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
                    <h2 id="find-h" className="text-[15px] font-bold text-gray-900">Who could use support?</h2>
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="min-w-[14rem] flex-1">
                            <label htmlFor="support-topic" className="mb-1.5 block text-[12px] font-semibold text-gray-700">Topic</label>
                            <select id="support-topic" value={nodeId} onChange={(e) => setQuery({ topic: e.target.value })} disabled={!data}
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400">
                                <option value="">Any topic</option>
                                {groupedTopics.map(([group, list]) => (
                                    <optgroup key={group} label={group}>
                                        {list.map((n) => <option key={n.id} value={n.id}>{n.subtopic}</option>)}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                        <fieldset>
                            <legend className="mb-1.5 text-[12px] font-semibold text-gray-700">Show students who</legend>
                            <div className="inline-flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1" role="radiogroup">
                                {LEVELS.map((l) => (
                                    <button key={l} role="radio" aria-checked={level === l} onClick={() => setQuery({ level: l })}
                                        className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${level === l ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
                                        {SUPPORT_LEVELS[l].label}
                                    </button>
                                ))}
                            </div>
                        </fieldset>
                    </div>

                    {quickTopics.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[12px] font-semibold text-gray-500">Most common:</span>
                            {quickTopics.map(({ node, count }) => (
                                <button key={node.id} onClick={() => setQuery({ topic: node.id, level: 'focus' })} aria-pressed={nodeId === node.id}
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-semibold transition-colors ${nodeId === node.id ? 'border-[#002684] bg-[#002684] text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>
                                    {node.subtopic}
                                    <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${nodeId === node.id ? 'bg-white/20' : 'bg-amber-50 text-amber-700'}`}>{count}</span>
                                </button>
                            ))}
                            {(nodeId || level !== 'all') && (
                                <button onClick={() => setParams({}, { replace: true })} className="text-[12px] font-semibold text-blue-700 hover:text-blue-800">Clear</button>
                            )}
                        </div>
                    )}
                    <p aria-live="polite" className="text-[13.5px] font-medium text-gray-800">{headline}</p>
                </section>

                <div id="students-table" className="scroll-mt-4">
                <WorkbenchTable
                    title={topic ? `Students: ${topic.subtopic}` : 'Student brains'}
                    storageKey="teacher-student-brains"
                    loading={loading}
                    error={error}
                    onRetry={load}
                    rows={rows}
                    columns={columns}
                    searchPlaceholder="Search students…"
                    searchKeys={[(r) => r.student.fullName, (r) => r.student.admissionNo]}
                    onRowClick={openStudent}
                    emptyState={rows.length === 0 && result ? {
                        icon: CheckCircle2,
                        title: level === 'limited' ? 'Everyone has enough evidence here' : 'Nobody to flag here',
                        description: level === 'limited'
                            ? 'Every student has enough marked questions on this to say something meaningful.'
                            : 'No student shows up at this level right now. Try "Needs practice or still developing" for a wider list.',
                    } : { icon: Users, title: 'No students yet', description: 'Students appear here once their class has approved assessments with marks.' }}
                />
                </div>

                {excluded.length > 0 && (
                    <section aria-label="Not included in this list" className="rounded-2xl border border-gray-200 bg-white p-4">
                        <h3 className="text-[13px] font-bold text-gray-800">Not included above</h3>
                        <ul className="mt-1.5 space-y-1 text-[13px] text-gray-600">
                            {excluded.map((x) => (
                                <li key={x.key}>
                                    <span className="font-semibold text-gray-800">{x.names.map((s) => s.fullName).join(', ')}</span> {x.text}.
                                </li>
                            ))}
                        </ul>
                        <p className="mt-1.5 text-[12px] text-gray-400">Not having enough marks is not the same as needing support, so these students are kept out of the list rather than counted as behind.</p>
                    </section>
                )}
                <p className="text-[12px] text-gray-400">
                    Listed with the greatest need first so you can decide where to start. This is not a ranking of students. Cut-offs are provisional and will be agreed with your school.
                </p>
            </div>
        </TeacherLayout>
    );
}
