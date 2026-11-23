import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import TeacherLayout from '../../TeacherDashboard/components/layout/TeacherLayout.jsx';
import { StatusChip, WorkbenchTable } from '../../../../components/patterns';
import { formatSchoolDate } from '../../../../utils/schoolLocale.js';
import { listBrainAssessments } from '../services/brainAPIs.js';
import { BrainTopBar } from '../components/BrainShared.jsx';
import BrainHeader, { BRAIN_TEACHER_ROUTES } from './BrainHeader.jsx';

const SOURCE_LABEL = { manual: 'Entered by hand', import: 'Imported report' };

export default function BrainAssessmentsPage() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const { assessments } = await listBrainAssessments();
            setRows(assessments);
        } catch (e) {
            setError(e?.message || 'We could not load your assessments.');
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const columns = useMemo(() => [
        {
            id: 'title', header: 'Assessment', accessor: (r) => r.title, sortable: true, hideable: false,
            render: (r) => (
                <div>
                    <p className="font-semibold text-gray-900">{r.title}</p>
                    <p className="text-[12px] text-gray-400">{r.className} · {r.subjectName}</p>
                </div>
            ),
        },
        { id: 'date', header: 'Date', accessor: (r) => r.date, sortable: true, render: (r) => formatSchoolDate(r.date) },
        {
            id: 'mapping', header: 'Topic mapping', accessor: (r) => r.mappingStatus, sortable: true,
            render: (r) => (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <StatusChip status={r.mappingStatus} />
                    <span className="text-[12px] text-gray-400 tabular-nums">{r.questionsMapped}/{r.questionCount} questions</span>
                </div>
            ),
        },
        {
            id: 'marks', header: 'Marks', accessor: (r) => r.studentsMarked, sortable: true,
            render: (r) => r.mappingStatus !== 'approved'
                ? <span className="text-[12px] text-gray-400">Approve topics first</span>
                : (
                    <div>
                        <span className="tabular-nums">{r.studentsMarked}/{r.studentCount} students</span>
                        {r.marksSource && <p className="text-[11px] text-gray-400">{SOURCE_LABEL[r.marksSource]}</p>}
                    </div>
                ),
        },
        { id: 'total', header: 'Total marks', accessor: (r) => r.totalMarks, sortable: true, align: 'right' },
    ], []);

    const filters = useMemo(() => [
        {
            id: 'mapping', label: 'Topic mapping', getValue: (r) => r.mappingStatus,
            options: [
                { value: 'draft', label: 'Draft' },
                { value: 'awaiting_approval', label: 'Awaiting approval' },
                { value: 'approved', label: 'Approved' },
            ],
        },
    ], []);

    return (
        <TeacherLayout>
            <div className="brain-ui mx-auto max-w-6xl space-y-4">
                <BrainHeader subtitle="Link each test question to a topic, add the marks, and see where your class needs help." />
                <BrainTopBar />
                <WorkbenchTable
                    title="Brain assessments"
                    storageKey="teacher-brain-assessments"
                    loading={loading}
                    error={error}
                    onRetry={load}
                    rows={rows}
                    columns={columns}
                    filters={filters}
                    searchPlaceholder="Search assessments…"
                    searchKeys={['title', 'className', 'subjectName']}
                    onRowClick={(r) => navigate(BRAIN_TEACHER_ROUTES.assessment(r.id))}
                    emptyState={{
                        icon: FileQuestion,
                        title: 'No assessments yet',
                        description: 'When a test or exam paper is added, you will link each question to a topic here. Marks only count toward Student Brain after you approve those topics.',
                    }}
                />
            </div>
        </TeacherLayout>
    );
}
