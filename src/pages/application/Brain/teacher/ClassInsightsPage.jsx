import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import TeacherLayout from '../../TeacherDashboard/components/layout/TeacherLayout.jsx';
import { StatusChip, WorkbenchTable } from '../../../../components/patterns';
import { getClassInsights } from '../services/brainAPIs.js';
import { CLASS_BELOW_PCT, MIN_EVIDENCE } from '../brainMath.js';
import { DemoDataBanner, EvidenceCaveat, nodePath } from '../components/BrainShared.jsx';
import BrainHeader, { BRAIN_TEACHER_ROUTES } from './BrainHeader.jsx';

export default function ClassInsightsPage() {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try { setData(await getClassInsights()); }
        catch (e) { setError(e?.message || 'We could not load class insights.'); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const nodesById = useMemo(() => Object.fromEntries((data?.nodes ?? []).map((n) => [n.id, n])), [data]);

    const rows = useMemo(() => (data?.rows ?? []).map((r) => {
        const node = nodesById[r.nodeId];
        return { ...r, id: r.nodeId, name: nodePath(node), subject: node?.subject };
    }), [data, nodesById]);

    const columns = useMemo(() => [
        {
            id: 'topic', header: 'Topic', accessor: (r) => r.name, sortable: true, hideable: false,
            render: (r) => <span className="font-semibold text-gray-900">{r.name}</span>,
        },
        {
            id: 'below', header: `Students at or below ${CLASS_BELOW_PCT}%`, sortable: true,
            accessor: (r) => r.pctBelow ?? -1,
            render: (r) => {
                if (r.studentsWithEvidence === 0) return <span className="text-gray-400">Not enough evidence</span>;
                const flag = r.pctBelow >= 50;
                return (
                    <div className="flex items-center gap-2">
                        <span className="font-semibold tabular-nums text-gray-900">{r.studentsBelow} of {r.studentsWithEvidence}</span>
                        <span className="text-[12px] text-gray-400 tabular-nums">({r.pctBelow}%)</span>
                        {flag && <StatusChip tone="amber" size="xs" dot={false}>Consider revisiting</StatusChip>}
                    </div>
                );
            },
        },
        {
            id: 'avg', header: 'Class average', accessor: (r) => r.classPct, sortable: true, align: 'right',
            render: (r) => <span className="tabular-nums">{r.classPct}%</span>,
        },
        {
            id: 'evidence', header: 'Evidence behind this', accessor: (r) => r.studentsWithEvidence, sortable: true,
            render: (r) => (
                <div className="text-[12px] text-gray-500">
                    <p>{r.assessments} assessment{r.assessments === 1 ? '' : 's'}</p>
                    <p className="text-gray-400">
                        {r.studentsWithEvidence} of {data?.studentCount ?? '—'} students with enough evidence
                        {r.studentsLimited > 0 && ` · ${r.studentsLimited} with limited`}
                    </p>
                </div>
            ),
        },
    ], [data?.studentCount]);

    const filters = useMemo(() => [{
        id: 'subject', label: 'Subject', getValue: (r) => r.subject,
        options: [...new Set(rows.map((r) => r.subject).filter(Boolean))].map((s) => ({ value: s, label: s })),
    }], [rows]);

    return (
        <TeacherLayout>
            <div className="mx-auto max-w-6xl space-y-4">
                <BrainHeader subtitle="See which topics many students found difficult, so you can decide what to revisit in class." />
                <DemoDataBanner />
                {data && (
                    <p className="text-[13px] text-gray-500">
                        <span className="font-semibold text-gray-700">{data.className} · {data.subjectName}</span>
                        {' '}— based on {data.assessments.length} approved assessment{data.assessments.length === 1 ? '' : 's'}
                        {' '}({data.assessments.map((a) => a.title).join(', ')}) and {data.studentCount} students.
                    </p>
                )}
                <EvidenceCaveat audience="teacher" />
                <p className="text-[13px] text-gray-500">Click a topic to see which students could use support in it.</p>
                <WorkbenchTable
                    title="Class topic insights"
                    storageKey="teacher-brain-insights"
                    loading={loading}
                    error={error}
                    onRetry={load}
                    rows={rows}
                    columns={columns}
                    filters={filters}
                    searchPlaceholder="Search topics…"
                    searchKeys={['name']}
                    onRowClick={(r) => navigate(`${BRAIN_TEACHER_ROUTES.students}?topic=${r.nodeId}&level=focus`)}
                    emptyState={{
                        icon: BarChart3,
                        title: 'No class insights yet',
                        description: `Insights appear once an assessment's topics are approved and marks are saved. A topic needs at least ${MIN_EVIDENCE.questions} marked questions per student before it is counted.`,
                    }}
                />
                <p className="text-[12px] text-gray-400">
                    Only students with enough evidence for a topic are counted as at or below {CLASS_BELOW_PCT}%. The cut-off and the evidence minimum are provisional and will be agreed with your school.
                </p>
            </div>
        </TeacherLayout>
    );
}
