import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { animate, motion, useReducedMotion } from 'framer-motion';
import { ArrowDown, Pause, Play, RotateCcw, Users, ZoomOut } from 'lucide-react';
import {
    BRAINSTEM_PATH, CEREBELLUM, FOLDS, GLOW, NODE_RADIUS, TONE_COLOR, VIEW,
    cameraFor, cerebrumPath, dustPoints, layoutBrain, placeLabel, viewBoxFor,
} from '../brainViz.js';
import { bandChanges, describeTrend, evidenceStrength, evidenceUpTo, performanceBand, trendDirection } from '../brainMath.js';
import { formatSchoolDate } from '../../../../utils/schoolLocale.js';
import { BandChip, EvidenceMeter, PerformanceBar, nodePath } from './BrainShared.jsx';

/**
 * The animated, interactive brain. One glowing point per topic.
 *
 *   colour = performance band (never red)   size = how much evidence   hollow dashed = limited evidence
 *   dim dotted = not assessed yet           ripple outward = marks have gone up
 *
 * Things you can do: hover or focus a point for a tooltip, click it for detail, click a topic name to zoom the
 * camera in on that group, click a legend entry to highlight one band, press play to watch the brain change
 * test by test, and move the mouse over it to tilt it. It works for one student (`evidence`) or for a whole
 * class (`getEvidence`, where each point carries `classMeta`). Motion is calm, can be paused, and is off for
 * people who ask their device to reduce motion. The topic list beside it is the full-detail version.
 */

const FILTERS = [
    { key: 'good',       label: 'Doing well',             tone: 'green', bands: ['strong', 'well'] },
    { key: 'developing', label: 'Developing',             tone: 'blue',  bands: ['developing'] },
    { key: 'needs',      label: 'Needs focused practice', tone: 'amber', bands: ['needs_practice'] },
    { key: 'limited',    label: 'Limited evidence',       tone: 'gray',  bands: ['limited'] },
];
const ZOOM = 2.1;
const STEP_MS = 1900;

const CSS = `
.bv-root.bv-moving .bv-breathe { animation: bv-breathe 7s ease-in-out infinite; }
.bv-root.bv-moving .bv-halo    { animation: bv-halo 4.2s ease-in-out infinite; }
.bv-root.bv-moving .bv-ripple  { animation: bv-ripple 3.4s ease-out infinite; }
.bv-root.bv-moving .bv-dust    { animation: bv-twinkle 5s ease-in-out infinite; }
.bv-root.bv-moving .bv-flow    { animation: bv-flow 2.8s linear infinite; }
.bv-root.bv-moving .bv-pop     { animation: bv-pop .55s cubic-bezier(.2,1.4,.4,1); }
.bv-root.bv-moving .bv-select  { animation: bv-select .9s ease-out; }
.bv-halo, .bv-ripple, .bv-breathe, .bv-dust, .bv-pop, .bv-select { transform-box: fill-box; transform-origin: center; }
.bv-ripple, .bv-select { opacity: 0; }
.bv-node:focus-visible .bv-focus, .bv-label:focus-visible .bv-focus { opacity: 1; }
.bv-node:focus, .bv-label:focus { outline: none; }
.bv-stage { transition: transform .18s ease-out; will-change: transform; }
@keyframes bv-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.012); } }
@keyframes bv-halo    { 0%,100% { opacity: .30; transform: scale(1); } 50% { opacity: .62; transform: scale(1.28); } }
@keyframes bv-ripple  { 0% { opacity: .55; transform: scale(1); } 100% { opacity: 0; transform: scale(2.7); } }
@keyframes bv-twinkle { 0%,100% { opacity: .15; } 50% { opacity: .65; } }
@keyframes bv-flow    { to { stroke-dashoffset: -14; } }
@keyframes bv-pop     { 0% { transform: scale(.3); } 100% { transform: scale(1); } }
@keyframes bv-select  { 0% { opacity: .85; transform: scale(1); } 100% { opacity: 0; transform: scale(3.2); } }
`;

const shortTitle = (t) => String(t).replace(/^[A-Za-z]+ (?=Test|Exam|Quiz)/, '');

function describeNode(node, ev) {
    if (!ev) return `${node.subtopic}. Not assessed yet.`;
    const band = performanceBand(ev);
    if (ev.classMeta) {
        return `${node.subtopic}. Class average ${ev.pct} percent. ${band.label}. ${ev.classMeta.below} of ${ev.classMeta.enough} students with enough evidence could use support.`;
    }
    return `${node.subtopic}. ${band.label}. ${ev.pct} percent of marks on assessed questions. ${evidenceStrength(ev)} evidence.`;
}

function Point({ item, ev, index, selected, selTick, hovered, dim, motionOn, entrance, label, onSelect, onHover }) {
    const { node, x, y } = item;
    const band = ev ? performanceBand(ev) : null;
    const strength = ev ? evidenceStrength(ev) : 'none';
    const limited = !ev || band.key === 'limited';
    const color = TONE_COLOR[band?.tone ?? 'gray'];
    const r = NODE_RADIUS[strength];
    const glow = GLOW[band?.key ?? 'none'];
    const rising = ev && band.key !== 'limited' && trendDirection(ev.series) === 'increased';
    const delay = `${(index * 0.37) % 3.5}s`;
    const tween = motionOn ? { duration: 0.7, ease: 'easeInOut' } : { duration: 0 };

    return (
        <motion.g
            style={{ transformBox: 'view-box', transformOrigin: `${x}px ${y}px` }}
            initial={entrance ? { opacity: 0, scale: 0.2 } : false}
            animate={{ opacity: dim ? 0.18 : 1, scale: 1 }}
            transition={entrance ? { type: 'spring', stiffness: 140, damping: 14, delay: 0.25 + index * 0.09 } : tween}
        >
            <g
                className="bv-node cursor-pointer"
                role="button" tabIndex={0} aria-label={describeNode(node, ev)} aria-pressed={selected}
                onClick={() => onSelect(node.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(node.id); } }}
                onPointerEnter={(e) => { if (e.pointerType === 'mouse') onHover(node.id, e.currentTarget); }}
                onPointerLeave={(e) => { if (e.pointerType === 'mouse') onHover(null); }}
                onFocus={(e) => onHover(node.id, e.currentTarget)}
                onBlur={() => onHover(null)}
            >
                <circle cx={x} cy={y} r={19} fill="transparent" />

                {glow > 0 && (
                    <circle className="bv-halo" cx={x} cy={y} r={r + 7} fill={color} opacity={0.28 * glow + 0.08} style={{ animationDelay: delay }} />
                )}
                {rising && motionOn && (
                    <circle className="bv-ripple" cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={1.6} style={{ animationDelay: delay }} />
                )}

                {limited ? (
                    <motion.circle key="hollow" className="bv-pop" cx={x} cy={y} initial={false} animate={{ r: r * (hovered ? 1.2 : 1) }} transition={tween}
                        fill="none" stroke={color} strokeWidth={1.8} strokeDasharray={ev ? '3 2.5' : '1.5 3'} opacity={ev ? 0.95 : 0.7} />
                ) : (
                    <g key="solid" className="bv-pop">
                        <motion.circle cx={x} cy={y} initial={false} animate={{ r: r * (hovered ? 1.2 : 1), fill: color }} transition={tween}
                            stroke="#ffffff" strokeWidth={1.5} style={glow ? { filter: `drop-shadow(0 0 ${3 + glow * 4}px ${color})` } : undefined} />
                        <circle cx={x - r * 0.28} cy={y - r * 0.3} r={r * 0.28} fill="#ffffff" opacity={0.55} />
                    </g>
                )}

                {selected && <circle cx={x} cy={y} r={r + 5.5} fill="none" stroke="#002684" strokeWidth={2} />}
                {selected && <circle key={selTick} className="bv-select" cx={x} cy={y} r={r + 2} fill="none" stroke="#002684" strokeWidth={2} />}
                <circle className="bv-focus" cx={x} cy={y} r={r + 9} fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 3" opacity={0} />
            </g>

            {label && (
                <text x={label.x} y={label.y} textAnchor={label.anchor} fontSize={label.size} fontWeight={600} fill="#0f172a"
                    stroke="#f8fafc" strokeWidth={label.size * 0.32} paintOrder="stroke" strokeLinejoin="round" pointerEvents="none" aria-hidden="true">
                    {label.lines.map((ln, i) => <tspan key={i} x={label.x} dy={i ? label.lh : 0}>{ln}</tspan>)}
                </text>
            )}
        </motion.g>
    );
}

export default function BrainViz({
    nodes, evidence, getEvidence, assessments = [], selectedId, onSelect, onJump, onPick,
    hoverId = null, onHover, title = 'Brain map', intro,
}) {
    const reduced = useReducedMotion();
    const uid = useId().replace(/:/g, '');
    const wrapRef = useRef(null);
    const stageRef = useRef(null);
    const svgRef = useRef(null);
    const camRef = useRef(cameraFor(null));

    const [paused, setPaused] = useState(false);
    const [filter, setFilter] = useState(null);       // a FILTERS key, or null
    const [zoomKey, setZoomKey] = useState(null);     // a group key, or null
    const [step, setStep] = useState(null);           // null = now; otherwise an index into `steps`
    const [playing, setPlaying] = useState(false);
    const [tip, setTip] = useState(null);             // { id, left, top }
    const [selTick, setSelTick] = useState(0);
    const motionOn = !reduced && !paused;

    const { items, links, groups } = useMemo(() => layoutBrain(nodes), [nodes]);
    const byId = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);
    const groupOf = useMemo(() => Object.fromEntries(groups.map((g) => [g.key, g])), [groups]);
    const outline = useMemo(() => cerebrumPath(), []);
    const dust = useMemo(() => dustPoints(), []);

    // ── Time: replay across the tests ─────────────────────────────────────
    const steps = useMemo(() => [...assessments].sort((a, b) => String(a.date).localeCompare(String(b.date))), [assessments]);
    const last = steps.length - 1;
    const at = step === null ? last : Math.min(step, last);
    const evAt = (index) => {
        const live = getEvidence ?? ((allowed) => (allowed ? evidenceUpTo(evidence, allowed) : evidence));
        return index >= last ? live(null) : live(new Set(steps.slice(0, index + 1).map((a) => a.id)));
    };
    const ev = useMemo(() => evAt(at), [at, evidence, getEvidence, steps]); // eslint-disable-line react-hooks/exhaustive-deps
    const prevEv = useMemo(() => (at > 0 ? evAt(at - 1) : null), [at, evidence, getEvidence, steps]); // eslint-disable-line react-hooks/exhaustive-deps
    const changes = useMemo(() => (prevEv ? bandChanges(prevEv, ev, nodes) : []), [prevEv, ev, nodes]);

    useEffect(() => {
        if (!playing) return undefined;
        if (at >= last) { setPlaying(false); return undefined; }
        const t = setTimeout(() => setStep(at + 1), STEP_MS);
        return () => clearTimeout(t);
    }, [playing, at, last]);

    const togglePlay = () => {
        if (playing) { setPlaying(false); return; }
        if (at >= last) setStep(0);
        setPlaying(true);
    };

    // ── Camera, filter, hover ─────────────────────────────────────────────
    const zoomGroup = zoomKey ? groupOf[zoomKey] : null;
    const scale = zoomGroup ? ZOOM : 1;

    // The camera is the SVG's viewBox, tweened by hand: no transform-origin to get wrong.
    useEffect(() => {
        const from = { ...camRef.current };
        const to = cameraFor(zoomGroup, ZOOM);
        const apply = (c) => { camRef.current = c; svgRef.current?.setAttribute('viewBox', viewBoxFor(c)); };
        if (!motionOn && !zoomGroup && from.s === 1) { apply(to); return undefined; }
        const controls = animate(0, 1, {
            duration: reduced ? 0 : 0.95, ease: [0.22, 1, 0.36, 1],
            onUpdate: (t) => apply({ cx: from.cx + (to.cx - from.cx) * t, cy: from.cy + (to.cy - from.cy) * t, s: from.s + (to.s - from.s) * t }),
            onComplete: () => apply(to),
        });
        return () => controls.stop();
    }, [zoomKey]); // eslint-disable-line react-hooks/exhaustive-deps

    const matches = (e) => {
        if (!filter) return true;
        if (!e) return false;
        return FILTERS.find((f) => f.key === filter).bands.includes(performanceBand(e).key);
    };

    const counts = useMemo(() => {
        const c = Object.fromEntries(FILTERS.map((f) => [f.key, 0]));
        let notAssessed = 0;
        items.forEach((i) => {
            const e = ev[i.id];
            if (!e) { notAssessed += 1; return; }
            const key = performanceBand(e).key;
            FILTERS.forEach((f) => { if (f.bands.includes(key)) c[f.key] += 1; });
        });
        return { ...c, notAssessed };
    }, [items, ev]);

    const hover = (id, el) => {
        if (onHover) onHover(id);
        if (!id) { setTip(null); return; }
        if (!el || !wrapRef.current) return;
        const box = el.getBoundingClientRect();
        const wrap = wrapRef.current.getBoundingClientRect();
        setTip({ id, left: box.left - wrap.left + box.width / 2, top: box.top - wrap.top });
    };

    const select = (id) => { setSelTick((n) => n + 1); onSelect(id); };

    const onMove = (e) => {
        if (e.pointerType !== 'mouse' || reduced || !stageRef.current) return;
        const r = e.currentTarget.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5; const py = (e.clientY - r.top) / r.height - 0.5;
        stageRef.current.style.transform = `perspective(900px) rotateX(${(-py * 7).toFixed(2)}deg) rotateY(${(px * 9).toFixed(2)}deg)`;
    };
    const onLeave = () => { if (stageRef.current) stageRef.current.style.transform = ''; };

    const onKeyDown = (e) => {
        if (e.key !== 'Escape') return;
        if (zoomKey) setZoomKey(null); else if (filter) setFilter(null); else if (selectedId) onSelect(selectedId);
    };

    const selected = selectedId ? byId[selectedId] : null;
    const selectedEv = selected ? ev[selected.id] : null;
    const tipNode = tip ? byId[tip.id]?.node : null;
    const tipEv = tip ? ev[tip.id] : null;
    const assessed = items.length - counts.notAssessed;
    const stepAssessment = steps[at];

    const labelFor = (item) => {
        if (!zoomGroup || item.groupKey !== zoomKey) return null;
        const cam = cameraFor(zoomGroup, ZOOM);
        const w = VIEW.w / ZOOM; const h = VIEW.h / ZOOM;
        const e = ev[item.id];
        return placeLabel({
            x: item.x, y: item.y, group: zoomGroup, r: NODE_RADIUS[e ? evidenceStrength(e) : 'none'],
            text: `${item.node.subtopic}${e ? ` · ${e.pct}%` : ''}`, size: 13 / ZOOM,
            win: { x: cam.cx - w / 2, y: cam.cy - h / 2, w, h },
        });
    };

    return (
        <section aria-labelledby={`${uid}-h`} className="rounded-2xl border border-gray-200 bg-white p-4" onKeyDown={onKeyDown}>
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h2 id={`${uid}-h`} className="text-[15px] font-bold text-gray-900">{title}</h2>
                    <p className="mt-0.5 text-[13px] text-gray-500">{intro ?? `Each glowing point is a topic. ${assessed} of ${items.length} have been assessed${at < last ? ' by this point' : ' so far'}.`}</p>
                </div>
                {!reduced && (
                    <button onClick={() => setPaused((p) => !p)} aria-pressed={paused}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 text-[12px] font-semibold text-gray-600 hover:bg-gray-50">
                        {paused ? <Play size={13} /> : <Pause size={13} />}{paused ? 'Play animation' : 'Pause animation'}
                    </button>
                )}
            </div>

            {/* Zoom into a topic group */}
            {groups.length > 1 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Zoom to a topic">
                    <span className="text-[12.5px] font-semibold text-gray-500">Zoom in:</span>
                    {groups.map((g) => (
                        <button key={g.key} onClick={() => setZoomKey((z) => (z === g.key ? null : g.key))} aria-pressed={zoomKey === g.key}
                            className={`rounded-full border px-3 py-1 text-[12.5px] font-semibold transition-colors ${zoomKey === g.key ? 'border-[#002684] bg-[#002684] text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>
                            {g.topic} <span className={zoomKey === g.key ? 'text-white/70' : 'text-gray-400'}>{g.ids.length}</span>
                        </button>
                    ))}
                    {zoomKey && (
                        <button onClick={() => setZoomKey(null)} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-blue-700 hover:text-blue-800">
                            <ZoomOut size={14} /> Whole brain
                        </button>
                    )}
                </div>
            )}

            <div ref={wrapRef} className={`bv-root relative mx-auto mt-2 w-full max-w-[600px] ${motionOn ? 'bv-moving' : ''}`}
                onPointerMove={onMove} onPointerLeave={onLeave}>
                <style>{CSS}</style>
                <div ref={stageRef} className="bv-stage">
                    <svg ref={svgRef} viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} role="group" aria-labelledby={`${uid}-h`} className="h-auto w-full select-none overflow-hidden rounded-xl">
                        <defs>
                            <radialGradient id={`${uid}-fill`} cx="50%" cy="42%" r="70%">
                                <stop offset="0%" stopColor="#f8fafc" /><stop offset="100%" stopColor="#e2e8f0" />
                            </radialGradient>
                        </defs>

                        <g>
                            <g aria-hidden="true" className="bv-breathe">
                                <ellipse cx={CEREBELLUM.cx} cy={CEREBELLUM.cy} rx={CEREBELLUM.rx} ry={CEREBELLUM.ry} fill={`url(#${uid}-fill)`} stroke="#cbd5e1" strokeWidth={2} />
                                <path d={BRAINSTEM_PATH} fill="none" stroke="#cbd5e1" strokeWidth={14} strokeLinecap="round" />
                                <path d={BRAINSTEM_PATH} fill="none" stroke="#e2e8f0" strokeWidth={9} strokeLinecap="round" />
                                <path d={outline} fill={`url(#${uid}-fill)`} stroke="#cbd5e1" strokeWidth={2.5} strokeLinejoin="round" />
                                {FOLDS.map((d) => <path key={d} d={d} fill="none" stroke="#cbd5e1" strokeWidth={1.6} strokeLinecap="round" opacity={0.8} />)}
                                {dust.map((p, i) => (
                                    <circle key={i} className="bv-dust" cx={p.x} cy={p.y} r={p.r} fill="#94a3b8" opacity={0.3}
                                        style={{ animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }} />
                                ))}
                            </g>

                            <g aria-hidden="true">
                                {links.map((l) => {
                                    const a = byId[l.from]; const b = byId[l.to];
                                    const both = ev[l.from] && ev[l.to];
                                    return (
                                        <line key={`${l.from}-${l.to}`} className="bv-flow" x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                                            stroke={both ? '#64748b' : '#cbd5e1'} strokeWidth={1.4} strokeLinecap="round" strokeDasharray="3 4" opacity={both ? 0.55 : 0.5} />
                                    );
                                })}
                            </g>

                            {items.map((item, i) => (
                                <Point key={item.id} item={item} index={i} ev={ev[item.id]} selected={item.id === selectedId} selTick={selTick}
                                    hovered={hoverId === item.id || tip?.id === item.id} dim={!matches(ev[item.id])}
                                    motionOn={motionOn} entrance={!reduced} label={labelFor(item)} onSelect={select} onHover={hover} />
                            ))}

                            {/* topic names: click one to zoom in */}
                            {groups.map((g) => {
                                // the name pill of a selected point would cover its group label, so hide that label then
                                if (zoomKey === g.key || (!zoomGroup && selected?.groupKey === g.key)) return null;
                                const size = 13 / scale;
                                const cy = Math.max(size + 6, g.y - g.r - 5);
                                return (
                                    <g key={g.key} className="bv-label cursor-pointer" role="button" tabIndex={0} aria-label={`Zoom in on ${g.topic}`}
                                        onClick={() => setZoomKey(g.key)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setZoomKey(g.key); } }}>
                                        <text x={g.x} y={cy} textAnchor="middle" fontSize={size} fontWeight={700} fill="#334155" stroke="#f8fafc" strokeWidth={size * 0.3} paintOrder="stroke" strokeLinejoin="round">
                                            {g.topic}
                                        </text>
                                        <rect className="bv-focus" x={g.x - 46} y={cy - size - 2} width={92} height={size + 8} rx={6} fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 3" opacity={0} />
                                    </g>
                                );
                            })}

                            {selected && !zoomGroup && (() => {
                                const label = selected.node.subtopic;
                                const w = Math.min(200, 16 + label.length * 5.8);
                                const lx = Math.min(VIEW.w - w / 2 - 4, Math.max(w / 2 + 4, selected.x));
                                const ly = selected.y - 26 < 14 ? selected.y + 32 : selected.y - 26;
                                return (
                                    <g aria-hidden="true" pointerEvents="none">
                                        <rect x={lx - w / 2} y={ly - 12} width={w} height={22} rx={11} fill="#002684" />
                                        <text x={lx} y={ly + 3} textAnchor="middle" fontSize={11.5} fontWeight={600} fill="#ffffff">{label}</text>
                                    </g>
                                );
                            })()}
                        </g>
                    </svg>
                </div>

                {/* hover tooltip: real HTML so the text is crisp and large */}
                {tip && tipNode && (
                    <div role="presentation" className="pointer-events-none absolute z-10 w-max max-w-[16rem] -translate-x-1/2 -translate-y-full rounded-xl bg-gray-900 px-3 py-2 text-white shadow-xl"
                        style={{ left: Math.min(Math.max(tip.left, 90), (wrapRef.current?.clientWidth ?? 600) - 90), top: Math.max(tip.top - 10, 60) }}>
                        <p className="text-[13px] font-semibold leading-tight">{tipNode.subtopic}</p>
                        {tipEv ? (
                            <p className="mt-0.5 text-[12px] leading-snug text-gray-300">
                                {tipEv.classMeta
                                    ? (tipEv.classMeta.enough === 0
                                        ? `${tipEv.pct}% class average · not enough evidence per student yet`
                                        : `${tipEv.pct}% class average · ${tipEv.classMeta.below} of ${tipEv.classMeta.enough} could use support`)
                                    : `${tipEv.pct}% · ${performanceBand(tipEv).label}`}
                            </p>
                        ) : <p className="mt-0.5 text-[12px] text-gray-300">Not assessed yet</p>}
                    </div>
                )}
            </div>

            {/* Interactive legend: click to highlight one band */}
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5" role="group" aria-label="Highlight by result">
                {FILTERS.map((f) => (
                    <button key={f.key} onClick={() => setFilter((cur) => (cur === f.key ? null : f.key))} aria-pressed={filter === f.key}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-semibold transition-colors ${filter === f.key ? 'border-[#002684] bg-[#002684]/5 text-gray-900' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>
                        {f.tone === 'gray'
                            ? <i className="h-2.5 w-2.5 rounded-full border border-dashed border-slate-400" />
                            : <i className="h-2.5 w-2.5 rounded-full" style={{ background: TONE_COLOR[f.tone], boxShadow: `0 0 6px ${TONE_COLOR[f.tone]}` }} />}
                        {f.label}
                        <span className="rounded-full bg-gray-100 px-1.5 text-[11.5px] tabular-nums text-gray-600">{counts[f.key]}</span>
                    </button>
                ))}
                <span className="inline-flex items-center gap-1.5 px-1 text-[12.5px] text-gray-500">
                    <i className="h-1.5 w-1.5 rounded-full border border-dotted border-slate-400" /> Not assessed yet {counts.notAssessed}
                </span>
                {filter && <button onClick={() => setFilter(null)} className="text-[12.5px] font-semibold text-blue-700 hover:text-blue-800">Show all</button>}
            </div>
            <p className="mt-1.5 text-center text-[12px] text-gray-400">
                Bigger points have more evidence. A pulse outward means marks have gone up. This shows results on school tests, not how clever anyone is.
            </p>

            {/* Watch it change across the tests */}
            {steps.length >= 2 && (
                <div className="mt-3 rounded-xl border border-gray-100 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <button onClick={togglePlay} aria-label={playing ? 'Pause the replay' : at >= last ? 'Replay from the first test' : 'Play the replay'}
                            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[#002684] px-4 text-[13px] font-semibold text-white hover:bg-[#001d66]">
                            {playing ? <Pause size={15} /> : at >= last && step !== null ? <RotateCcw size={15} /> : <Play size={15} />}
                            {playing ? 'Pause' : 'Watch it change'}
                        </button>
                        <div className="min-w-[11rem] flex-1 basis-44">
                            <input type="range" min={0} max={last} step={1} value={at} aria-label="Choose a test to see the brain after it"
                                aria-valuetext={`After ${stepAssessment?.title}`}
                                onChange={(e) => { setPlaying(false); setStep(Number(e.target.value)); }}
                                className="h-2 w-full cursor-pointer accent-[#002684]" />
                            <div className="mt-1 flex flex-wrap justify-between gap-x-2 text-[12px] text-gray-500">
                                {steps.map((a, i) => (
                                    <button key={a.id} onClick={() => { setPlaying(false); setStep(i); }}
                                        className={`rounded px-1 font-semibold ${i === at ? 'text-[#002684]' : 'hover:text-gray-800'}`}>{shortTitle(a.title)}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <p aria-live="polite" className="mt-2 text-[13px] text-gray-700">
                        <span className="font-semibold">{at >= last && step === null ? 'Now' : `After ${stepAssessment?.title}`}</span>
                        {stepAssessment?.date ? <span className="text-gray-400"> · {formatSchoolDate(stepAssessment.date)}</span> : null}
                        {at > 0 && (changes.length
                            ? <>: {changes.slice(0, 3).map((c, i) => {
                                const n = byId[c.nodeId]?.node;
                                return <span key={c.nodeId}>{i ? '; ' : ' '}<span className="font-semibold">{n?.subtopic}</span> {c.from === 'Not assessed yet' ? `first assessed as ${c.to.toLowerCase()}` : `moved from ${c.from.toLowerCase()} to ${c.to.toLowerCase()}`}</span>;
                            })}{changes.length > 3 ? ` and ${changes.length - 3} more` : ''}.</>
                            : <span className="text-gray-500"> no topic changed band.</span>)}
                    </p>
                </div>
            )}

            {/* Detail for the selected point. A live region so screen readers hear it. */}
            <div aria-live="polite" className="mt-3 min-h-[3.5rem] rounded-xl bg-slate-50 p-3">
                {selected ? (
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                                <p className="text-[14px] font-semibold text-gray-900">{selected.node.subtopic}</p>
                                <p className="text-[12px] text-gray-500">{nodePath(selected.node)}</p>
                            </div>
                            {selectedEv && (
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <BandChip node={selectedEv} />
                                    {selectedEv.classMeta
                                        ? <span className="text-[12px] text-gray-500">class average</span>
                                        : <EvidenceMeter node={selectedEv} />}
                                </div>
                            )}
                        </div>
                        {selectedEv ? (
                            <>
                                <PerformanceBar node={selectedEv} />
                                {selectedEv.classMeta ? (
                                    <>
                                        {selectedEv.classMeta.enough === 0 ? (
                                            <p className="text-[13px] text-gray-700">No student has enough marked questions on this topic yet, so we cannot say who could use support. The class average is shown for interest only.</p>
                                        ) : (
                                            <p className="text-[13px] text-gray-700">
                                                <span className="font-semibold">{selectedEv.classMeta.below} of {selectedEv.classMeta.enough}</span> students with enough evidence could use support here
                                                {selectedEv.classMeta.enough < selectedEv.classMeta.total ? ` (${selectedEv.classMeta.total - selectedEv.classMeta.enough} others do not have enough evidence yet)` : ''}.
                                            </p>
                                        )}
                                        {onPick && selectedEv.classMeta.enough > 0 && (
                                            <button onClick={() => onPick(selected.id)}
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#002684] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[#001d66]">
                                                <Users size={14} /> See who could use support in this topic
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {performanceBand(selectedEv).key !== 'limited' && trendDirection(selectedEv.series) !== 'single' && (
                                            <p className="text-[12px] text-gray-500">{describeTrend(selected.node.subtopic, selectedEv.series)}</p>
                                        )}
                                        {onJump && (
                                            <button onClick={() => onJump(selected.id)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-blue-700 hover:text-blue-800">
                                                <ArrowDown size={13} /> See the assessments behind this
                                            </button>
                                        )}
                                    </>
                                )}
                            </>
                        ) : (
                            <p className="text-[12px] text-gray-500">{at < last ? 'This topic had not been on a test by this point.' : 'This topic has not been on a test yet, so there is nothing to show.'}</p>
                        )}
                    </div>
                ) : (
                    <p className="pt-1 text-center text-[13px] text-gray-500">Tap or hover a point to see what is behind it. Click a topic name to zoom in.</p>
                )}
            </div>
        </section>
    );
}
