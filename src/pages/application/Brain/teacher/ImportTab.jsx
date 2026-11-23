import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Lock, Upload } from 'lucide-react';
import { EmptyState, StatusChip } from '../../../../components/patterns';
import { downloadCsv, toCsv } from '../../../../utils/csv.js';
import { importIsApplicable, parseCsv, previewImport } from '../brainMath.js';

const MAX_FILE_BYTES = 1024 * 1024; // 1 MB is far more than a class mark sheet needs

export default function ImportTab({ assessment, students, onApply, applying }) {
    const inputRef = useRef(null);
    const [fileName, setFileName] = useState(null);
    const [preview, setPreview] = useState(null);
    const [fileError, setFileError] = useState(null);

    if (assessment.mappingStatus !== 'approved') {
        return (
            <div className="p-5">
                <EmptyState icon={Lock} title="Approve the topics first"
                    description="A marking report can only be imported after each question's topic is approved." />
            </div>
        );
    }

    const { questions } = assessment;

    const downloadTemplate = () => {
        const header = ['Student', ...questions.map((q) => `${q.label} (${q.maxMarks})`)];
        downloadCsv(`${assessment.title.toLowerCase().replace(/\s+/g, '-')}-marks-template.csv`,
            toCsv([header, ...students.map((s) => [s.fullName, ...questions.map(() => '')])]));
    };

    const onFile = async (file) => {
        setPreview(null); setFileError(null); setFileName(null);
        if (!file) return;
        if (!/\.csv$/i.test(file.name)) {
            setFileError('Only CSV files can be imported for now. In Excel, choose File → Save As → CSV, then upload that file. Excel and PDF reports are planned.');
            return;
        }
        if (file.size > MAX_FILE_BYTES) { setFileError('That file is larger than 1 MB, which is too big for a mark sheet.'); return; }
        try {
            const text = await file.text();
            setFileName(file.name);
            setPreview(previewImport(parseCsv(text), questions, students));
        } catch {
            setFileError('We could not read that file. Please check it and try again.');
        }
    };

    const reset = () => { setPreview(null); setFileName(null); setFileError(null); if (inputRef.current) inputRef.current.value = ''; };
    const applicable = importIsApplicable(preview);

    return (
        <div className="space-y-4 p-4 sm:p-5">
            <div className="space-y-1 text-[13px] text-gray-600">
                <p>Upload your existing marking report as a CSV. You will see exactly what will change before anything is saved, and nothing is saved until you approve it.</p>
                <p className="text-[12px] text-gray-500">The file needs a student name or admission number column, and one column per question named like <span className="font-semibold">{questions[0]?.label ?? 'Q1'}</span> or <span className="font-semibold">{questions[0]?.label ?? 'Q1'} ({questions[0]?.maxMarks ?? 10})</span>. A file we cannot match will be rejected rather than guessed.</p>
            </div>

            <div className="flex flex-wrap gap-2">
                <input ref={inputRef} id="brain-import-file" type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
                <label htmlFor="brain-import-file" className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-[13px] font-semibold text-white hover:bg-blue-700">
                    <Upload size={14} /> Choose CSV file
                </label>
                <button onClick={downloadTemplate} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50">
                    <Download size={14} /> Download template
                </button>
            </div>

            {fileError && (
                <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-800">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" /><p>{fileError}</p>
                </div>
            )}

            {!preview && !fileError && (
                <EmptyState compact icon={FileSpreadsheet} title="No file chosen"
                    description="Choose a CSV to see a preview. You can also download a template that already has your class list and question columns." />
            )}

            {preview && !preview.recognised && (
                <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] text-red-800">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <div><p className="font-semibold">We could not use {fileName}</p><p className="mt-0.5">{preview.reason}</p></div>
                </div>
            )}

            {preview?.recognised && (
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-semibold text-gray-800">{fileName}</span>
                        <StatusChip tone="green" size="xs" dot={false}>{preview.matchedQuestions.length} question columns matched</StatusChip>
                        <StatusChip tone="green" size="xs" dot={false}>{preview.rows.length} students matched</StatusChip>
                        {preview.unmatchedStudents.length > 0 && <StatusChip tone="amber" size="xs" dot={false}>{preview.unmatchedStudents.length} not recognised</StatusChip>}
                        {preview.errorCount > 0 && <StatusChip tone="red" size="xs" dot={false}>{preview.errorCount} mark problem{preview.errorCount === 1 ? '' : 's'}</StatusChip>}
                    </div>

                    {preview.maxMismatches.length > 0 && (
                        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-800">
                            <p className="font-semibold">The out-of marks in the file do not match the paper</p>
                            <ul className="mt-1 list-disc pl-5">
                                {preview.maxMismatches.map((m) => <li key={m.label}>{m.label}: file says {m.file}, the paper says {m.paper}</li>)}
                            </ul>
                        </div>
                    )}
                    {preview.unmatchedColumns.length > 0 && (
                        <p className="text-[12px] text-gray-500">Columns ignored: {preview.unmatchedColumns.map((c) => c.header || '(blank)').join(', ')}</p>
                    )}
                    {preview.unmatchedStudents.length > 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-900">
                            <p className="font-semibold">These rows do not match anyone in this class and will be skipped</p>
                            <p className="mt-0.5">{preview.unmatchedStudents.join(', ')}</p>
                            <p className="mt-1 text-[12px]">Fix the spelling in your file and upload again if they should be included.</p>
                        </div>
                    )}

                    <div className="max-h-72 overflow-auto rounded-xl border border-gray-200">
                        <table className="w-full min-w-[480px] border-collapse text-[13px]">
                            <thead className="sticky top-0 bg-gray-50 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="px-3 py-2 text-left">Student</th>
                                    {preview.matchedQuestions.map((q) => <th key={q.id} className="px-2 py-2 text-center">{q.label}</th>)}
                                    <th className="px-3 py-2 text-left">Check</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {preview.rows.map((r) => (
                                    <tr key={r.studentId} className={r.errors.length ? 'bg-red-50/50' : ''}>
                                        <td className="whitespace-nowrap px-3 py-1.5 font-semibold text-gray-800">{r.studentName}</td>
                                        {preview.matchedQuestions.map((q) => {
                                            const m = r.marks[q.id];
                                            const text = !m ? '?' : m.status === 'absent' ? 'A' : m.status === 'exempt' ? 'E' : m.status === 'scored' ? m.earned : '';
                                            return <td key={q.id} className="px-2 py-1.5 text-center tabular-nums text-gray-700">{text}</td>;
                                        })}
                                        <td className="px-3 py-1.5 text-[12px]">
                                            {r.errors.length
                                                ? <span className="font-medium text-red-600">{r.errors.join('; ')}</span>
                                                : <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 size={12} /> OK</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => onApply(preview.rows)} disabled={!applicable || applying}
                            className="h-9 rounded-lg bg-blue-600 px-4 text-[13px] font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                            {applying ? 'Saving…' : `Approve and save ${preview.rows.length} students' marks`}
                        </button>
                        <button onClick={reset} className="h-9 rounded-lg border border-gray-200 bg-white px-3.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50">Choose a different file</button>
                        {!applicable && <span className="text-[12px] text-gray-500">Fix the problems above in your file, then upload it again.</span>}
                    </div>
                </div>
            )}
        </div>
    );
}
