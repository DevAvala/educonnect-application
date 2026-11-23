import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import TeacherLayout from '../../TeacherDashboard/components/layout/TeacherLayout.jsx';
import { DetailPage, EmptyState } from '../../../../components/patterns';
import { getStudentBrain } from '../services/brainAPIs.js';
import { brainSummary, summariseChild } from '../brainMath.js';
import BrainViz from '../components/BrainViz.jsx';
import { DemoDataBanner, EvidenceCaveat, EvidenceLegend } from '../components/BrainShared.jsx';
import { GrowthTimeline, TopicCard } from '../components/TopicEvidence.jsx';
import { BRAIN_TEACHER_ROUTES } from './BrainHeader.jsx';

export default function StudentBrainDetailPage() {
    const { studentId } = useParams();
    const [params] = useSearchParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedId, setSelectedId] = useState(params.get('topic') || null);
    const [flashId, setFlashId] = useState(null);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try { setData(await getStudentBrain(studentId)); }
        catch (e) { setError(e?.message || 'We could not load this student.'); }
        finally { setLoading(false); }
    }, [studentId]);
    useEffect(() => { load(); }, [load]);

    const nodes = useMemo(() => data?.nodes ?? [], [data]);
    const evidence = useMemo(() => data?.evidence ?? {}, [data]);
    const summary = useMemo(() => brainSummary(nodes, evidence), [nodes, evidence]);
    const firstName = data?.student?.fullName?.split(/\s+/)[0] ?? 'This student';
    const sentences = useMemo(() => summariseChild(nodes, evidence, firstName), [nodes, evidence, firstName]);
    const grouped = useMemo(() => {
        const g = {};
        nodes.filter((n) => evidence[n.id]).forEach((n) => { (g[`${n.subject}|${n.topic}`] ??= { subject: n.subject, topic: n.topic, items: [] }).items.push(n); });
        return Object.values(g);
    }, [nodes, evidence]);

    const jumpToTopic = (id) => {
        document.getElementById(`topic-${id}`)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
        setFlashId(id);
        setTimeout(() => setFlashId(null), 1800);
    };

    if (error) {
        return (
            <TeacherLayout>
                <div className="mx-auto max-w-3xl"><EmptyState variant="error" title="We could not open this student" description={error} onRetry={load} /></div>
            </TeacherLayout>
        );
    }

    const student = data?.student;
    const tabs = data ? [
        {
            id: 'brain', label: 'Brain map',
            content: (
                <div className="space-y-4 p-4 sm:p-5">
                    <EvidenceCaveat audience="teacher" />
                    <BrainViz nodes={nodes} evidence={evidence} selectedId={selectedId}
                        onSelect={(id) => setSelectedId((cur) => (cur === id ? null : id))} onJump={jumpToTopic} />
                    <EvidenceLegend />
                    {grouped.length === 0 ? (
                        <EmptyState compact title="Nothing assessed yet" description="Topics appear here once this student's marks are saved against approved assessments." />
                    ) : grouped.map((g) => (
                        <section key={`${g.subject}|${g.topic}`} className="space-y-2">
                            <h3 className="text-[12px] font-bold uppercase tracking-wider text-gray-400">{g.subject} · {g.topic}</h3>
                            <ul className="space-y-2.5">
                                {g.items.map((n) => <TopicCard key={n.id} node={n} ev={evidence[n.id]} flash={flashId === n.id} />)}
                            </ul>
                        </section>
                    ))}
                </div>
            ),
        },
        {
            id: 'progress', label: 'Progress across tests',
            content: (
                <div className="p-4 sm:p-5">
                    {data.assessments.length < 2
                        ? <EmptyState compact title="Not enough tests yet" description="A progress table needs at least two approved assessments." />
                        : <GrowthTimeline nodes={nodes} evidence={evidence} assessments={data.assessments} />}
                </div>
            ),
        },
    ] : [];

    return (
        <TeacherLayout>
            <div className="mx-auto max-w-6xl space-y-4">
                <DemoDataBanner />
                <DetailPage
                    loading={loading}
                    breadcrumb={[{ label: 'Student Brain', to: BRAIN_TEACHER_ROUTES.students }, { label: student?.fullName ?? 'Student' }]}
                    avatar={{ name: student?.fullName }}
                    title={student?.fullName}
                    idLabel={student?.admissionNo}
                    subtitle={data ? `${data.className} · ${data.subjectName}` : ''}
                    stats={data ? [
                        { label: 'Topics assessed', value: `${summary.assessed} of ${nodes.length}` },
                        { label: 'Doing well', value: summary.strong + summary.well, tone: summary.strong + summary.well ? 'green' : undefined },
                        { label: 'Developing', value: summary.developing },
                        { label: 'Needs focused practice', value: summary.needs_practice, tone: summary.needs_practice ? 'amber' : undefined },
                        { label: 'Limited evidence', value: summary.limited, hint: summary.limited ? 'too early to say' : undefined },
                    ] : []}
                    tabs={tabs}
                    rail={data && (
                        <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
                            <h2 className="text-[12px] font-bold uppercase tracking-wider text-gray-400">In plain words</h2>
                            {sentences.length
                                ? <div className="space-y-1.5 text-[13.5px] leading-relaxed text-gray-700">{sentences.map((t) => <p key={t}>{t}</p>)}</div>
                                : <p className="text-[13px] text-gray-400">Nothing to summarise yet.</p>}
                            <p className="text-[11px] text-gray-400">Written from the marks, based on {data.assessments.length} approved assessment{data.assessments.length === 1 ? '' : 's'}. It describes where marks were earned, not why.</p>
                        </div>
                    )}
                />
            </div>
        </TeacherLayout>
    );
}
