import React from 'react';
import { FlaskConical, Info } from 'lucide-react';
import { StatusChip } from '../../../../components/patterns';
import { BRAIN_USE_MOCKS } from '../services/brainAPIs.js';
import { evidenceStrength, performanceBand } from '../brainMath.js';

/** Shown on every Brain page while the demo store is answering instead of the real backend. */
export function DemoDataBanner() {
    if (!BRAIN_USE_MOCKS) return null;
    return (
        <div role="note" className="flex items-start gap-2.5 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-2.5 text-[13px] text-violet-800">
            <FlaskConical size={15} className="mt-0.5 shrink-0 text-violet-500" aria-hidden="true" />
            <p><span className="font-semibold">Demo data.</span> These students, questions and marks are invented so the screens can be reviewed. Nothing here is real or saved to the school's records.</p>
        </div>
    );
}

/** The honest-data reminder every insight view carries (Brain plan §1, §2.1). */
export function EvidenceCaveat({ audience = 'teacher' }) {
    const text = audience === 'parent'
        ? 'These figures come from the marks your child earned on each question in school tests. The school does not see how your child answered, so they show where to look, not why a mark was lost.'
        : 'These figures come from question-level marks only. They show where performance was weaker or stronger, not why a mark was lost. Written answers are not available to EduConnect.';
    return (
        <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50/60 px-3.5 py-2.5 text-[13px] text-blue-900">
            <Info size={15} className="mt-0.5 shrink-0 text-blue-500" aria-hidden="true" />
            <p>{text}</p>
        </div>
    );
}

const STRENGTH = {
    limited:  { dots: 1, label: 'Limited evidence',  hint: 'Too few questions to draw a conclusion yet.' },
    moderate: { dots: 2, label: 'Moderate evidence', hint: 'Enough questions for a first indication.' },
    good:     { dots: 3, label: 'Good evidence',     hint: 'Several questions across more than one assessment.' },
};

/** Three dots — how much assessment evidence sits behind a figure. Not a performance rating. */
export function EvidenceMeter({ node, showLabel = true }) {
    const strength = evidenceStrength(node);
    const meta = STRENGTH[strength];
    const detail = `${node.questions} question${node.questions === 1 ? '' : 's'} · ${node.assessments} assessment${node.assessments === 1 ? '' : 's'}`;
    return (
        <span className="inline-flex items-center gap-1.5 text-[12px] text-gray-500" title={`${meta.hint} (${detail})`}>
            <span className="inline-flex gap-0.5" aria-hidden="true">
                {[1, 2, 3].map((i) => (
                    <span key={i} className={`h-1.5 w-1.5 rounded-full ${i <= meta.dots ? 'bg-slate-500' : 'bg-slate-200'}`} />
                ))}
            </span>
            {showLabel && <span>{meta.label}</span>}
            <span className="sr-only">{detail}</span>
        </span>
    );
}

export function BandChip({ node }) {
    const band = performanceBand(node);
    return <StatusChip tone={band.tone} size="xs" dot={false}>{band.label}</StatusChip>;
}

const BAR_TONE = { green: 'bg-green-500', blue: 'bg-blue-500', amber: 'bg-amber-500', gray: 'bg-gray-300' };

/** A percentage bar coloured by band. Thin-evidence figures are muted rather than hidden. */
export function PerformanceBar({ node, className = '' }) {
    const band = performanceBand(node);
    const muted = band.key === 'limited';
    return (
        <div className={`flex items-center gap-2.5 ${className}`}>
            <div
                className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100"
                role="img"
                aria-label={`${node.pct} percent of marks earned on assessed questions`}
            >
                <div className={`h-full rounded-full ${BAR_TONE[band.tone]} ${muted ? 'opacity-60' : ''}`} style={{ width: `${Math.min(100, node.pct)}%` }} />
            </div>
            <span className={`w-10 text-right text-[13px] font-semibold tabular-nums ${muted ? 'text-gray-400' : 'text-gray-800'}`}>
                {node.pct}%
            </span>
        </div>
    );
}

/** "Algebra › Linear equations" */
export const nodePath = (n) => (n ? `${n.topic} › ${n.subtopic}` : '');

export function EvidenceLegend() {
    return (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] text-gray-500">
            <span className="font-semibold text-gray-600">How to read this</span>
            <span className="inline-flex items-center gap-1.5"><span className="inline-flex gap-0.5"><i className="h-1.5 w-1.5 rounded-full bg-slate-500" /><i className="h-1.5 w-1.5 rounded-full bg-slate-200" /><i className="h-1.5 w-1.5 rounded-full bg-slate-200" /></span>dots show how much evidence there is</span>
            <span>bar colour shows performance on assessed questions</span>
            <span>topics with limited evidence get no label</span>
        </div>
    );
}
