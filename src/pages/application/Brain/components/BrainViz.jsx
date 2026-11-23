import React, { useId, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDown, Pause, Play } from 'lucide-react';
import {
    BRAINSTEM_PATH, CEREBELLUM, FOLDS, GLOW, NODE_RADIUS, TONE_COLOR, VIEW,
    cerebrumPath, dustPoints, layoutBrain,
} from '../brainViz.js';
import { BANDS, describeTrend, evidenceStrength, performanceBand, trendDirection } from '../brainMath.js';
import { BandChip, EvidenceMeter, PerformanceBar, nodePath } from './BrainShared.jsx';

/**
 * Animated student brain.
 *
 * One glowing point per topic. Colour = performance band, ring size = evidence, hollow dashed =
 * limited evidence, dim = not assessed yet. Motion is slow and calm, can be paused, and is switched
 * off for people who ask their device to reduce motion. The list of topics next to this is the
 * full-detail version of the same information, so nothing here is available only by sight.
 */

// Animations only run when the user has not asked for reduced motion and has not paused them.
const CSS = `
.bv-root.bv-moving .bv-breathe { animation: bv-breathe 7s ease-in-out infinite; }
.bv-root.bv-moving .bv-halo    { animation: bv-halo 4.2s ease-in-out infinite; }
.bv-root.bv-moving .bv-ripple  { animation: bv-ripple 3.4s ease-out infinite; }
.bv-root.bv-moving .bv-dust    { animation: bv-twinkle 5s ease-in-out infinite; }
.bv-root.bv-moving .bv-flow    { animation: bv-flow 2.8s linear infinite; }
.bv-halo, .bv-ripple, .bv-breathe, .bv-dust { transform-box: fill-box; transform-origin: center; }
.bv-ripple { opacity: 0; }
.bv-node:focus-visible .bv-focus { opacity: 1; }
.bv-node:focus { outline: none; }
@keyframes bv-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.012); } }
@keyframes bv-halo    { 0%,100% { opacity: .30; transform: scale(1); } 50% { opacity: .62; transform: scale(1.28); } }
@keyframes bv-ripple  { 0% { opacity: .55; transform: scale(1); } 100% { opacity: 0; transform: scale(2.7); } }
@keyframes bv-twinkle { 0%,100% { opacity: .15; } 50% { opacity: .65; } }
@keyframes bv-flow    { to { stroke-dashoffset: -14; } }
`;

function describeNode(node, ev) {
    if (!ev) return `${node.subtopic}. Not assessed yet.`;
    const band = performanceBand(ev);
    const strength = evidenceStrength(ev);
    return `${node.subtopic}. ${band.label}. ${ev.pct} percent of marks on assessed questions. ${strength} evidence.`;
}

function Point({ item, ev, index, selected, onSelect, motionOn, entrance }) {
    const { node, x, y } = item;
    const band = ev ? performanceBand(ev) : null;
    const strength = ev ? evidenceStrength(ev) : 'none';
    const limited = !ev || band.key === 'limited';
    const color = TONE_COLOR[band?.tone ?? 'gray'];
    const r = NODE_RADIUS[strength];
    const glow = GLOW[band?.key ?? 'none'];
    const rising = ev && band.key !== 'limited' && trendDirection(ev.series) === 'increased';
    const delay = `${(index * 0.37) % 3.5}s`;

    return (
        <motion.g
            style={{ transformOrigin: `${x}px ${y}px` }}
            initial={entrance ? { opacity: 0, scale: 0.2 } : false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 140, damping: 14, delay: 0.25 + index * 0.09 }}
        >
            <g
                className="bv-node cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={describeNode(node, ev)}
                aria-pressed={selected}
                onClick={() => onSelect(node.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(node.id); } }}
            >
                {/* Larger invisible target so a fingertip can hit a small point */}
                <circle cx={x} cy={y} r={18} fill="transparent" />

                {glow > 0 && (
                    <circle className="bv-halo" cx={x} cy={y} r={r + 7} fill={color} opacity={0.28 * glow + 0.08}
                        style={{ animationDelay: delay }} />
                )}
                {rising && motionOn && (
                    <circle className="bv-ripple" cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={1.6}
                        style={{ animationDelay: delay }} />
                )}

                {limited ? (
                    <circle cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={1.8}
                        strokeDasharray={ev ? '3 2.5' : '1.5 3'} opacity={ev ? 0.95 : 0.7} />
                ) : (
                    <>
                        <circle cx={x} cy={y} r={r} fill={color} stroke="#ffffff" strokeWidth={1.5}
                            style={glow ? { filter: `drop-shadow(0 0 ${3 + glow * 4}px ${color})` } : undefined} />
                        <circle cx={x - r * 0.28} cy={y - r * 0.3} r={r * 0.28} fill="#ffffff" opacity={0.55} />
                    </>
                )}

                {selected && <circle cx={x} cy={y} r={r + 5.5} fill="none" stroke="#002684" strokeWidth={2} />}
                <circle className="bv-focus" cx={x} cy={y} r={r + 9} fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 3" opacity={0} />
            </g>
        </motion.g>
    );
}

export default function BrainViz({ nodes, evidence, selectedId, onSelect, onJump }) {
    const reduced = useReducedMotion();
    const [paused, setPaused] = useState(false);
    const motionOn = !reduced && !paused;
    const uid = useId().replace(/:/g, '');

    const { items, links } = useMemo(() => layoutBrain(nodes), [nodes]);
    const byId = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);
    const outline = useMemo(() => cerebrumPath(), []);
    const dust = useMemo(() => dustPoints(), []);

    const selected = selectedId ? byId[selectedId] : null;
    const selectedEv = selected ? evidence[selected.id] : null;
    const assessed = items.filter((i) => evidence[i.id]).length;

    return (
        <section aria-labelledby={`${uid}-h`} className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h2 id={`${uid}-h`} className="text-[15px] font-bold text-gray-900">Brain map</h2>
                    <p className="mt-0.5 text-[13px] text-gray-500">
                        Each glowing point is a topic. {assessed} of {items.length} have been assessed so far.
                    </p>
                </div>
                {!reduced && (
                    <button onClick={() => setPaused((p) => !p)} aria-pressed={paused}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 text-[12px] font-semibold text-gray-600 hover:bg-gray-50">
                        {paused ? <Play size={13} /> : <Pause size={13} />}{paused ? 'Play animation' : 'Pause animation'}
                    </button>
                )}
            </div>

            <div className={`bv-root mx-auto mt-2 w-full max-w-[560px] ${motionOn ? 'bv-moving' : ''}`}>
                <style>{CSS}</style>
                <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} role="group" aria-labelledby={`${uid}-h`}
                    className="h-auto w-full select-none">
                    <defs>
                        <radialGradient id={`${uid}-fill`} cx="50%" cy="42%" r="70%">
                            <stop offset="0%" stopColor="#f8fafc" />
                            <stop offset="100%" stopColor="#e2e8f0" />
                        </radialGradient>
                    </defs>

                    <g aria-hidden="true" className="bv-breathe">
                        {/* cerebellum and stem sit behind the cerebrum */}
                        <ellipse cx={CEREBELLUM.cx} cy={CEREBELLUM.cy} rx={CEREBELLUM.rx} ry={CEREBELLUM.ry}
                            fill={`url(#${uid}-fill)`} stroke="#cbd5e1" strokeWidth={2} />
                        <path d={BRAINSTEM_PATH} fill="none" stroke="#cbd5e1" strokeWidth={14} strokeLinecap="round" />
                        <path d={BRAINSTEM_PATH} fill="none" stroke="#e2e8f0" strokeWidth={9} strokeLinecap="round" />
                        <path d={outline} fill={`url(#${uid}-fill)`} stroke="#cbd5e1" strokeWidth={2.5} strokeLinejoin="round" />
                        {FOLDS.map((d) => <path key={d} d={d} fill="none" stroke="#cbd5e1" strokeWidth={1.6} strokeLinecap="round" opacity={0.8} />)}
                        {dust.map((p, i) => (
                            <circle key={i} className="bv-dust" cx={p.x} cy={p.y} r={p.r} fill="#94a3b8" opacity={0.3}
                                style={{ animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }} />
                        ))}
                    </g>

                    {/* links within a topic group, with a slow signal travelling along each */}
                    <g aria-hidden="true">
                        {links.map((l) => {
                            const a = byId[l.from]; const b = byId[l.to];
                            const both = evidence[l.from] && evidence[l.to];
                            return (
                                <line key={`${l.from}-${l.to}`} className="bv-flow" x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                                    stroke={both ? '#64748b' : '#cbd5e1'} strokeWidth={1.4} strokeLinecap="round"
                                    strokeDasharray="3 4" opacity={both ? 0.55 : 0.5} />
                            );
                        })}
                    </g>

                    {items.map((item, i) => (
                        <Point key={item.id} item={item} index={i} ev={evidence[item.id]} selected={item.id === selectedId}
                            onSelect={onSelect} motionOn={motionOn} entrance={!reduced} />
                    ))}

                    {selected && (() => {
                        const label = selected.node.subtopic;
                        const w = Math.min(190, 14 + label.length * 5.4);
                        const lx = Math.min(VIEW.w - w / 2 - 4, Math.max(w / 2 + 4, selected.x));
                        const ly = selected.y - 24 < 14 ? selected.y + 30 : selected.y - 24;
                        return (
                            <g aria-hidden="true" pointerEvents="none">
                                <rect x={lx - w / 2} y={ly - 11} width={w} height={20} rx={10} fill="#002684" />
                                <text x={lx} y={ly + 3} textAnchor="middle" fontSize={10.5} fontWeight={600} fill="#ffffff">{label}</text>
                            </g>
                        );
                    })()}
                </svg>
            </div>

            {/* Legend */}
            <ul className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[12px] text-gray-600">
                {[BANDS.strong, BANDS.developing, BANDS.needs_practice].map((b) => (
                    <li key={b.key} className="inline-flex items-center gap-1.5">
                        <i className="h-2.5 w-2.5 rounded-full" style={{ background: TONE_COLOR[b.tone], boxShadow: `0 0 6px ${TONE_COLOR[b.tone]}` }} />
                        {b.key === 'strong' ? 'Doing well' : b.label}
                    </li>
                ))}
                <li className="inline-flex items-center gap-1.5">
                    <i className="h-2.5 w-2.5 rounded-full border border-dashed border-slate-400" /> Limited evidence
                </li>
                <li className="inline-flex items-center gap-1.5">
                    <i className="h-1.5 w-1.5 rounded-full border border-dotted border-slate-400" /> Not assessed yet
                </li>
            </ul>
            <p className="mt-1.5 text-center text-[11px] text-gray-400">
                Bigger points have more evidence behind them. A pulse outward means marks have gone up. This shows results on school tests, not how clever anyone is.
            </p>

            {/* Detail for the selected point. A live region so screen readers hear it. */}
            <div aria-live="polite" className="mt-3 min-h-[3.5rem] rounded-xl bg-slate-50 p-3">
                {selected ? (
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                                <p className="text-[14px] font-semibold text-gray-900">{selected.node.subtopic}</p>
                                <p className="text-[12px] text-gray-500">{nodePath(selected.node)}</p>
                            </div>
                            {selectedEv && <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><BandChip node={selectedEv} /><EvidenceMeter node={selectedEv} /></div>}
                        </div>
                        {selectedEv ? (
                            <>
                                <PerformanceBar node={selectedEv} />
                                {performanceBand(selectedEv).key !== 'limited' && trendDirection(selectedEv.series) !== 'single' && (
                                    <p className="text-[12px] text-gray-500">{describeTrend(selected.node.subtopic, selectedEv.series)}</p>
                                )}
                                {onJump && (
                                    <button onClick={() => onJump(selected.id)}
                                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-blue-700 hover:text-blue-800">
                                        <ArrowDown size={13} /> See the assessments behind this
                                    </button>
                                )}
                            </>
                        ) : (
                            <p className="text-[12px] text-gray-500">This topic has not been on a test yet, so there is nothing to show.</p>
                        )}
                    </div>
                ) : (
                    <p className="pt-1 text-center text-[13px] text-gray-500">Tap a point to see what is behind it.</p>
                )}
            </div>
        </section>
    );
}
