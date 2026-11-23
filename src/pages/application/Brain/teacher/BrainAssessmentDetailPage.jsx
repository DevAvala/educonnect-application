import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, ClipboardList, Undo2 } from 'lucide-react';
import TeacherLayout from '../../TeacherDashboard/components/layout/TeacherLayout.jsx';
import { ConfirmDestructiveDialog, DetailPage, EmptyState, Timeline, pushToast } from '../../../../components/patterns';
import { formatSchoolDate } from '../../../../utils/schoolLocale.js';
import {
    approveMapping, getBrainAssessment, listTopics, reopenMapping,
    requestTopicSuggestions, saveMarks,
} from '../services/brainAPIs.js';
import { mappingProblems } from '../brainMath.js';
import { DemoDataBanner } from '../components/BrainShared.jsx';
import QuestionMappingTab from './QuestionMappingTab.jsx';
import MarksTab, { draftFromMarks } from './MarksTab.jsx';
import ImportTab from './ImportTab.jsx';
import { BRAIN_TEACHER_ROUTES } from './BrainHeader.jsx';

export default function BrainAssessmentDetailPage() {
    const { assessmentId } = useParams();
    const [assessment, setAssessment] = useState(null);
    const [students, setStudents] = useState([]);
    const [marks, setMarks] = useState({});
    const [nodes, setNodes] = useState([]);
    const [draft, setDraft] = useState({});           // lifted here so unsaved marks survive a tab switch
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(null);           // 'suggest' | 'approve' | 'marks' | 'import'
    const [showProblems, setShowProblems] = useState(false);
    const [reopenOpen, setReopenOpen] = useState(false);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const [{ assessment: a, students: s, marks: m }, { nodes: n }] = await Promise.all([
                getBrainAssessment(assessmentId), listTopics(),
            ]);
            setAssessment(a); setStudents(s); setMarks(m); setNodes(n);
            setDraft(draftFromMarks(s, a.questions, m));
        } catch (e) {
            setError(e?.message || 'We could not load this assessment.');
        } finally {
            setLoading(false);
        }
    }, [assessmentId]);
    useEffect(() => { load(); }, [load]);

    const original = useMemo(
        () => (assessment ? draftFromMarks(students, assessment.questions, marks) : {}),
        [assessment, students, marks],
    );

    const run = async (key, fn, onError) => {
        setBusy(key);
        try { await fn(); } catch (e) { (onError ?? ((m) => pushToast({ type: 'error', message: m })))(e?.message || 'Something went wrong. Please try again.'); }
        finally { setBusy(null); }
    };

    const handleSuggest = () => run('suggest', async () => {
        const { assessment: next } = await requestTopicSuggestions(assessmentId);
        setAssessment(next);
        pushToast({ type: 'info', message: 'Suggestions added. Please review them.' });
    });

    const handleApprove = () => run('approve', async () => {
        if (mappingProblems(assessment.questions).length) { setShowProblems(true); return; }
        const { assessment: next } = await approveMapping(assessmentId);
        setAssessment(next); setShowProblems(false);
        pushToast({ message: 'Topics approved. You can now add marks.' });
    });

    const handleReopen = async (reason) => {
        const { assessment: next } = await reopenMapping(assessmentId, reason);
        setAssessment(next);
        pushToast({ type: 'info', message: 'Mapping reopened. Marks stop counting until it is approved again.' });
    };

    const applyMarks = (key, payload, source, message) => run(key, async () => {
        const { assessment: next, marks: saved } = await saveMarks(assessmentId, payload, source);
        setAssessment(next); setMarks(saved);
        setDraft(draftFromMarks(students, next.questions, saved));
        pushToast({ message });
    });

    const handleSaveMarks = (parsedMarks) => applyMarks('marks', parsedMarks, 'manual', 'Marks saved');

    const handleImport = (rows) => {
        const payload = {};
        rows.forEach((r) => { payload[r.studentId] = { ...(marks[r.studentId] ?? {}), ...r.marks }; });
        return applyMarks('import', payload, 'import', `Imported marks for ${rows.length} students`);
    };

    if (error) {
        return (
            <TeacherLayout>
                <div className="mx-auto max-w-3xl"><EmptyState variant="error" title="We could not open this assessment" description={error} onRetry={load} /></div>
            </TeacherLayout>
        );
    }

    const approved = assessment?.mappingStatus === 'approved';
    const mapped = assessment?.questions.filter((q) => q.tags.length).length ?? 0;
    const studentsMarked = students.filter((s) => Object.values(marks[s.id] ?? {}).some((m) => m.status === 'scored')).length;

    const primaryActions = assessment && !approved
        ? [{ id: 'approve', label: busy === 'approve' ? 'Approving…' : 'Approve topic mapping', icon: CheckCircle2, onClick: handleApprove }]
        : [];
    const overflowActions = approved
        ? [{ id: 'reopen', label: 'Reopen topic mapping', icon: Undo2, onClick: () => setReopenOpen(true) }]
        : [];

    const tabs = assessment ? [
        {
            id: 'mapping', label: 'Questions & topics', badge: `${mapped}/${assessment.questions.length}`,
            content: <QuestionMappingTab assessment={assessment} nodes={nodes} onChange={setAssessment}
                onSuggest={handleSuggest} suggesting={busy === 'suggest'} showProblems={showProblems} />,
        },
        {
            id: 'marks', label: 'Enter marks',
            content: <MarksTab assessment={assessment} students={students} draft={draft} setDraft={setDraft}
                original={original} onSave={handleSaveMarks} saving={busy === 'marks'} />,
        },
        {
            id: 'import', label: 'Import report',
            content: <ImportTab assessment={assessment} students={students} onApply={handleImport} applying={busy === 'import'} />,
        },
    ] : [];

    return (
        <TeacherLayout>
            <div className="mx-auto max-w-6xl space-y-4">
                <DemoDataBanner />
                <DetailPage
                    loading={loading}
                    breadcrumb={[{ label: 'Student Brain', to: BRAIN_TEACHER_ROUTES.assessments }, { label: assessment?.title ?? 'Assessment' }]}
                    avatar={{ icon: ClipboardList }}
                    title={assessment?.title}
                    subtitle={assessment ? `${assessment.className} · ${assessment.subjectName} · ${formatSchoolDate(assessment.date)}` : ''}
                    status={assessment?.mappingStatus}
                    primaryActions={primaryActions}
                    overflowActions={overflowActions}
                    stats={assessment ? [
                        { label: 'Questions', value: assessment.questions.length, hint: `${mapped} with a topic` },
                        { label: 'Total marks', value: assessment.questions.reduce((n, q) => n + q.maxMarks, 0) },
                        { label: 'Topic mapping', value: approved ? 'Approved' : 'Not approved', tone: approved ? 'green' : 'amber' },
                        { label: 'Marks entered', value: approved ? `${studentsMarked} of ${students.length}` : '—', hint: approved ? 'students' : 'Approve topics first' },
                    ] : []}
                    tabs={tabs}
                    rail={assessment && (
                        <div className="rounded-2xl border border-gray-200 bg-white p-4">
                            <h2 className="mb-3 text-[12px] font-bold uppercase tracking-wider text-gray-400">History</h2>
                            <Timeline items={[...(assessment.history ?? [])].reverse()} />
                        </div>
                    )}
                />
                <ConfirmDestructiveDialog
                    open={reopenOpen} onClose={() => setReopenOpen(false)}
                    verb="Reopen" noun="topic mapping" recordName={assessment?.title}
                    consequence="Marks for this assessment stop counting toward students' Brains until you approve the topics again. Your reason is saved in the history."
                    onConfirm={handleReopen}
                />
            </div>
        </TeacherLayout>
    );
}
