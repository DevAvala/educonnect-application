import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Brain, ChevronDown, Sprout } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';
import ParentLayout from '../../ParentDashboard/components/layout/ParentLayout.jsx';
import { EmptyState, Shimmer } from '../../../../components/patterns';
import { getParentDashboard } from '../../../auth/authAPIs.js';
import { formatSchoolDate } from '../../../../utils/schoolLocale.js';
import { getChildBrain } from '../services/brainAPIs.js';
import { describeTrend, performanceBand, summariseChild, trendDirection } from '../brainMath.js';
import BrainViz from '../components/BrainViz.jsx';
import { BandChip, DemoDataBanner, EvidenceCaveat, EvidenceLegend, EvidenceMeter, PerformanceBar } from '../components/BrainShared.jsx';

const SPARK_COLOR = { green: '#16a34a', blue: '#3b82f6', amber: '#f59e0b', gray: '#9ca3af' };

function Spark({ series, tone }) {
    if (series.length < 2) return null;
    return (
        <div className="h-10 w-24 shrink-0" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 6, right: 4, bottom: 6, left: 4 }}>
                    <YAxis hide domain={[0, 100]} />
                    <Line type="monotone" dataKey="pct" stroke={SPARK_COLOR[tone]} strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

function TopicCard({ node, ev, flash }) {
    const [open, setOpen] = useState(false);
    const band = performanceBand(ev);
    const trend = trendDirection(ev.series);
    return (
        <li id={`topic-${node.id}`} className={`scroll-mt-20 rounded-xl border bg-white p-3.5 transition-shadow duration-500 ${flash ? 'border-blue-300 shadow-[0_0_0_3px_rgba(59,130,246,0.25)]' : 'border-gray-200'}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <h4 className="text-[14px] font-semibold text-gray-900">{node.subtopic}</h4>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <BandChip node={ev} />
                        <EvidenceMeter node={ev} />
                    </div>
                </div>
                <Spark series={ev.series} tone={band.tone} />
            </div>
            <PerformanceBar node={ev} className="mt-3" />
            {trend !== 'single' && band.key !== 'limited' && (
                <p className="mt-2 text-[12px] text-gray-500">{describeTrend(node.subtopic, ev.series)}</p>
            )}
            {band.key === 'limited' && (
                <p className="mt-2 text-[12px] text-gray-500">Only {ev.questions} question{ev.questions === 1 ? '' : 's'} so far, so we are not drawing a conclusion yet.</p>
            )}
            <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
                className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-blue-700 hover:text-blue-800">
                See the assessments behind this
                <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="mt-2 overflow-x-auto rounded-lg border border-gray-100">
                    <table className="w-full min-w-[320px] text-[12px]">
                        <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                            <tr><th className="px-3 py-1.5 text-left">Assessment</th><th className="px-3 py-1.5 text-left">Date</th><th className="px-3 py-1.5 text-right">Questions</th><th className="px-3 py-1.5 text-right">Marks</th><th className="px-3 py-1.5 text-right">Score</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {ev.series.map((s) => (
                                <tr key={s.assessmentId}>
                                    <td className="px-3 py-1.5 font-medium text-gray-700">{s.title}</td>
                                    <td className="px-3 py-1.5 text-gray-500">{formatSchoolDate(s.date)}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{s.questions}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{s.earned} / {s.available}</td>
                                    <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{s.pct}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <p className="border-t border-gray-100 bg-gray-50/60 px-3 py-1.5 text-[11px] text-gray-400">
                        Each test asks different questions, so scores are a guide, not an exact like-for-like comparison. Last assessed {formatSchoolDate(ev.lastAssessed)}.
                    </p>
                </div>
            )}
        </li>
    );
}

function GrowthTimeline({ nodes, evidence, assessments }) {
    const rows = nodes.filter((n) => evidence[n.id]);
    if (!rows.length || assessments.length < 2) return null;
    return (
        <section aria-labelledby="timeline-h" className="space-y-2">
            <h3 id="timeline-h" className="text-[15px] font-bold text-gray-900">Progress across tests</h3>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full min-w-[420px] text-[13px]">
                    <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                        <tr>
                            <th scope="col" className="px-3 py-2 text-left">Topic</th>
                            {assessments.map((a) => <th key={a.id} scope="col" className="px-3 py-2 text-right">{a.title.replace(/^Mathematics /, '')}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {rows.map((n) => (
                            <tr key={n.id}>
                                <th scope="row" className="px-3 py-2 text-left font-medium text-gray-800">{n.subtopic}</th>
                                {assessments.map((a) => {
                                    const point = evidence[n.id].series.find((s) => s.assessmentId === a.id);
                                    return <td key={a.id} className="px-3 py-2 text-right tabular-nums text-gray-600">{point ? `${point.pct}%` : '—'}</td>;
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-[12px] text-gray-400">A dash means that topic was not on the test, or the student did not take it. It does not mean zero.</p>
        </section>
    );
}

export default function ChildBrainPage() {
    const [params, setParams] = useSearchParams();
    const [children, setChildren] = useState(null);
    const [childrenError, setChildrenError] = useState(null);
    const [brain, setBrain] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [flashId, setFlashId] = useState(null);

    const jumpToTopic = (id) => {
        document.getElementById(`topic-${id}`)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
        setFlashId(id);
        setTimeout(() => setFlashId(null), 1800);
    };

    useEffect(() => {
        let alive = true;
        getParentDashboard()
            .then((res) => { if (alive) setChildren(res?.data?.children ?? []); })
            .catch((e) => { if (alive) setChildrenError(e?.response?.data?.message || 'We could not load your children.'); });
        return () => { alive = false; };
    }, []);

    const childId = params.get('child') ?? children?.[0]?.id;
    const child = children?.find((c) => String(c.id) === String(childId));

    // A different child has different topics, so clear any selected point.
    useEffect(() => { setSelectedId(null); }, [childId]);

    const load = useCallback(async () => {
        if (!childId) return;
        setLoading(true); setError(null);
        try { setBrain(await getChildBrain(childId)); }
        catch (e) { setError(e?.message || 'We could not load this learning map.'); }
        finally { setLoading(false); }
    }, [childId]);
    useEffect(() => { if (children) { if (children.length) load(); else setLoading(false); } }, [children, load]);

    const nodes = useMemo(() => brain?.nodes ?? [], [brain]);
    const evidence = useMemo(() => brain?.evidence ?? {}, [brain]);
    const firstName = child?.fullName?.split(/\s+/)[0] ?? 'Your child';
    const summary = useMemo(() => summariseChild(nodes, evidence, firstName), [nodes, evidence, firstName]);
    const assessments = useMemo(() => {
        const map = new Map();
        Object.values(evidence).forEach((e) => e.series.forEach((s) => map.set(s.assessmentId, { id: s.assessmentId, title: s.title, date: s.date })));
        return [...map.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
    }, [evidence]);
    const grouped = useMemo(() => {
        const g = {};
        nodes.filter((n) => evidence[n.id]).forEach((n) => { (g[`${n.subject}|${n.topic}`] ??= { subject: n.subject, topic: n.topic, items: [] }).items.push(n); });
        return Object.values(g);
    }, [nodes, evidence]);

    return (
        <ParentLayout>
            <div className="mx-auto max-w-3xl space-y-4">
                <div>
                    <h1 className="flex items-center gap-2.5 text-2xl font-bold text-gray-900">
                        <Brain size={24} className="text-[#002684]" aria-hidden="true" /> {child ? `${firstName}'s learning map` : 'Learning map'}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">Topic by topic, where your child is doing well and where a little extra practice could help.</p>
                </div>

                <DemoDataBanner />

                {children && children.length > 1 && (
                    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Choose a child">
                        {children.map((c) => (
                            <button key={c.id} role="tab" aria-selected={String(c.id) === String(childId)}
                                onClick={() => setParams({ child: c.id })}
                                className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${String(c.id) === String(childId) ? 'border-[#002684] bg-[#002684] text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>
                                {c.fullName}
                            </button>
                        ))}
                    </div>
                )}

                {childrenError && <EmptyState variant="error" title="We could not load your children" description={childrenError} onRetry={() => window.location.reload()} />}
                {children && children.length === 0 && (
                    <EmptyState icon={Sprout} title="No children linked yet" description="Once your school links your child to your account, their learning map will appear here." />
                )}

                {loading && children?.length > 0 && (
                    <div className="space-y-3" aria-busy="true" aria-label="Loading learning map">
                        <Shimmer className="h-24 w-full rounded-xl" /><Shimmer className="h-32 w-full rounded-xl" /><Shimmer className="h-32 w-full rounded-xl" />
                    </div>
                )}
                {error && <EmptyState variant="error" title="We could not load this learning map" description={error} onRetry={load} />}

                {!loading && !error && brain && (
                    <>
                        <EvidenceCaveat audience="parent" />

                        {grouped.length === 0 ? (
                            <EmptyState icon={Sprout} title="Nothing to show yet"
                                description="The learning map fills in as tests are marked question by question. Once your child's teachers have recorded marks for a test, you will see topics here." />
                        ) : (
                            <>
                                {summary.length > 0 && (
                                    <section aria-labelledby="summary-h" className="rounded-2xl border border-blue-100 bg-white p-4">
                                        <h2 id="summary-h" className="text-[15px] font-bold text-gray-900">In plain words</h2>
                                        <div className="mt-2 space-y-1.5 text-[14px] leading-relaxed text-gray-700">
                                            {summary.map((line) => <p key={line}>{line}</p>)}
                                        </div>
                                        <p className="mt-2 text-[11px] text-gray-400">Written from the marks below, based on {brain.assessmentCount} school test{brain.assessmentCount === 1 ? '' : 's'}.</p>
                                    </section>
                                )}

                                <BrainViz nodes={nodes} evidence={evidence} selectedId={selectedId}
                                    onSelect={(id) => setSelectedId((cur) => (cur === id ? null : id))} onJump={jumpToTopic} />

                                <EvidenceLegend />

                                {grouped.map((g) => (
                                    <section key={`${g.subject}|${g.topic}`} className="space-y-2">
                                        <h3 className="text-[12px] font-bold uppercase tracking-wider text-gray-400">{g.subject} · {g.topic}</h3>
                                        <ul className="space-y-2.5">
                                            {g.items.map((n) => <TopicCard key={n.id} node={n} ev={evidence[n.id]} flash={flashId === n.id} />)}
                                        </ul>
                                    </section>
                                ))}

                                <GrowthTimeline nodes={nodes} evidence={evidence} assessments={assessments} />
                            </>
                        )}
                    </>
                )}
            </div>
        </ParentLayout>
    );
}
