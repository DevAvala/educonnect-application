import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Brain, Sprout } from 'lucide-react';
import ParentLayout from '../../ParentDashboard/components/layout/ParentLayout.jsx';
import { EmptyState, Shimmer } from '../../../../components/patterns';
import { getParentDashboard } from '../../../auth/authAPIs.js';
import { getChildBrain } from '../services/brainAPIs.js';
import { summariseChild } from '../brainMath.js';
import BrainViz from '../components/BrainViz.jsx';
import { BrainTopBar, EvidenceCaveat, EvidenceLegend } from '../components/BrainShared.jsx';
import { GrowthTimeline, TopicCard } from '../components/TopicEvidence.jsx';

export default function ChildBrainPage() {
    const [params, setParams] = useSearchParams();
    const [children, setChildren] = useState(null);
    const [childrenError, setChildrenError] = useState(null);
    const [brain, setBrain] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [flashId, setFlashId] = useState(null);
    const [hoverId, setHoverId] = useState(null);

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
            <div className="brain-ui mx-auto max-w-3xl space-y-4">
                <div>
                    <h1 className="flex items-center gap-2.5 text-2xl font-bold text-gray-900">
                        <Brain size={24} className="text-[#002684]" aria-hidden="true" /> {child ? `${firstName}'s learning map` : 'Learning map'}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">Topic by topic, where your child is doing well and where a little extra practice could help.</p>
                </div>

                <BrainTopBar />

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

                                <BrainViz nodes={nodes} evidence={evidence} assessments={assessments} selectedId={selectedId}
                                    onSelect={(id) => setSelectedId((cur) => (cur === id ? null : id))} onJump={jumpToTopic}
                                    hoverId={hoverId} onHover={setHoverId} />

                                <EvidenceLegend />

                                {grouped.map((g) => (
                                    <section key={`${g.subject}|${g.topic}`} className="space-y-2">
                                        <h3 className="text-[12px] font-bold uppercase tracking-wider text-gray-400">{g.subject} · {g.topic}</h3>
                                        <ul className="space-y-2.5">
                                            {g.items.map((n) => <TopicCard key={n.id} node={n} ev={evidence[n.id]} flash={flashId === n.id} hovered={hoverId === n.id} onHover={setHoverId} />)}
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
