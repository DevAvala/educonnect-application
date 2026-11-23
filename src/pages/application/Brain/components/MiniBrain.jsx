import React, { useMemo } from 'react';
import { NODE_RADIUS, TONE_COLOR, VIEW, cerebrumPath, layoutBrain } from '../brainViz.js';
import { brainSummary, evidenceStrength, performanceBand } from '../brainMath.js';

// The outline never changes, so build it once for every row in a long list.
const OUTLINE = cerebrumPath(120);

function describe(summary) {
    if (!summary.assessed) return 'No topics assessed yet';
    const parts = [];
    if (summary.strong + summary.well) parts.push(`${summary.strong + summary.well} doing well`);
    if (summary.developing) parts.push(`${summary.developing} developing`);
    if (summary.needs_practice) parts.push(`${summary.needs_practice} need${summary.needs_practice === 1 ? 's' : ''} focused practice`);
    if (summary.limited) parts.push(`${summary.limited} with limited evidence`);
    return parts.join(', ');
}

/**
 * A small, still picture of one student's brain for lists. No animation and no glow filters, so a
 * class of forty stays light on a cheap phone. `highlight` rings one topic (the one being filtered).
 */
export default function MiniBrain({ nodes, evidence, highlightId = null, width = 92 }) {
    const { items } = useMemo(() => layoutBrain(nodes), [nodes]);
    const summary = useMemo(() => brainSummary(nodes, evidence), [nodes, evidence]);

    return (
        <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h - 40}`} width={width} height={(width * (VIEW.h - 40)) / VIEW.w}
            role="img" aria-label={`Brain overview: ${describe(summary)}`} className="shrink-0">
            <path d={OUTLINE} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={6} strokeLinejoin="round" />
            {items.map((it) => {
                const ev = evidence[it.id];
                const band = ev ? performanceBand(ev) : null;
                const limited = !ev || band.key === 'limited';
                const color = TONE_COLOR[band?.tone ?? 'gray'];
                const r = NODE_RADIUS[ev ? evidenceStrength(ev) : 'none'] * 1.7;
                return (
                    <g key={it.id}>
                        {limited
                            ? <circle cx={it.x} cy={it.y} r={r} fill="none" stroke={color} strokeWidth={5} strokeDasharray="9 7" />
                            : <circle cx={it.x} cy={it.y} r={r} fill={color} />}
                        {highlightId === it.id && <circle cx={it.x} cy={it.y} r={r + 13} fill="none" stroke="#002684" strokeWidth={6} />}
                    </g>
                );
            })}
        </svg>
    );
}
