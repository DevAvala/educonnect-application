import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';
import { formatSchoolDate } from '../../../../utils/schoolLocale.js';
import { describeTrend, performanceBand, trendDirection } from '../brainMath.js';
import { BandChip, EvidenceMeter, PerformanceBar } from './BrainShared.jsx';

/** Topic cards and the progress-across-tests table. Shared by the parent and teacher views. */

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

export function TopicCard({ node, ev, flash, hovered = false, onHover }) {
    const [open, setOpen] = useState(false);
    const band = performanceBand(ev);
    const trend = trendDirection(ev.series);
    return (
        <li id={`topic-${node.id}`} onMouseEnter={() => onHover?.(node.id)} onMouseLeave={() => onHover?.(null)}
            className={`scroll-mt-20 rounded-xl border bg-white p-3.5 transition-all duration-300 ${flash ? 'border-blue-300 shadow-[0_0_0_3px_rgba(59,130,246,0.25)]' : hovered ? 'border-blue-300 shadow-md' : 'border-gray-200'}`}>
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

export function GrowthTimeline({ nodes, evidence, assessments }) {
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
