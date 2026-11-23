/**
 * brainViz.js — pure layout and shape helpers for the animated brain.
 *
 * No React and no imports, so it can be unit tested with `node --test`.
 *
 * What the picture means (Brain plan §1, §3; master plan §5.2):
 *   - one glowing point = one topic
 *   - colour = performance band on assessed questions (never red)
 *   - ring size = how much evidence there is
 *   - hollow dashed point = limited evidence, no label
 *   - dim tiny point = not assessed yet
 * Lines join points of the SAME topic group only. We do not draw links between topics, because
 * prerequisites are not decided yet and a link would imply a relationship we cannot back up.
 * The small drifting dots and the fold lines are decoration and are hidden from screen readers.
 */

export const VIEW = Object.freeze({ w: 400, h: 320 });

// Anchor positions for topic groups, kept inside the cerebrum outline.
// Ordered so the first few groups spread across the whole brain instead of crowding one corner.
const SLOTS = [
    [112, 112], [288, 176], [205, 86], [100, 192],
    [292, 112], [195, 160], [150, 214], [240, 206],
];

function slot(i) {
    if (i < SLOTS.length) return SLOTS[i];
    // More groups than fixed slots: spiral outward inside the outline.
    const k = i - SLOTS.length + 1;
    const angle = k * 2.399963; // golden angle
    const r = Math.sqrt(k / (k + 6));
    return [195 + Math.cos(angle) * r * 130, 150 + Math.sin(angle) * r * 78];
}

function offsets(n) {
    if (n === 1) return [[0, 0]];
    if (n === 2) return [[-16, -7], [16, 7]];
    const radius = n === 3 ? 22 : Math.min(34, 18 + n * 3);
    return Array.from({ length: n }, (_, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        return [Math.cos(a) * radius, Math.sin(a) * radius];
    });
}

const groupKey = (n) => `${n.subject}|${n.topic}`;

/**
 * Place every topic node. Groups (subject + topic) cluster together, in a stable order so the
 * picture never reshuffles between visits.
 *
 * @param nodes  [{ id, subject, topic, subtopic }]
 * @returns { items: [{ id, x, y, groupKey, groupIndex, node }], links: [{ from, to, groupKey }],
 *            groups: [{ key, subject, topic, x, y, r, ids }] }  (groups drive labels and zooming)
 */
export function layoutBrain(nodes) {
    const sorted = [...nodes].sort((a, b) =>
        groupKey(a).localeCompare(groupKey(b)) || a.subtopic.localeCompare(b.subtopic));

    const groups = [];
    const byKey = new Map();
    for (const n of sorted) {
        const k = groupKey(n);
        if (!byKey.has(k)) { byKey.set(k, []); groups.push(k); }
        byKey.get(k).push(n);
    }

    const items = []; const links = []; const groupInfo = [];
    groups.forEach((k, groupIndex) => {
        const members = byKey.get(k);
        const [ax, ay] = slot(groupIndex);
        const offs = offsets(members.length);
        members.forEach((node, i) => {
            items.push({ id: node.id, x: ax + offs[i][0], y: ay + offs[i][1], groupKey: k, groupIndex, node });
        });
        const reach = Math.max(0, ...offs.map(([dx, dy]) => Math.hypot(dx, dy)));
        groupInfo.push({
            key: k, subject: members[0].subject, topic: members[0].topic, x: ax, y: ay,
            r: reach + 12, ids: members.map((m) => m.id),
        });
        if (members.length >= 2) {
            for (let i = 0; i < members.length - 1; i += 1) links.push({ from: members[i].id, to: members[i + 1].id, groupKey: k });
            if (members.length >= 3) links.push({ from: members[members.length - 1].id, to: members[0].id, groupKey: k });
        }
    });
    return { items, links, groups: groupInfo };
}

/** Radius of a point by evidence strength; 'none' = not assessed yet. */
export const NODE_RADIUS = Object.freeze({ none: 4, limited: 5.5, moderate: 7.5, good: 10 });

/** Hex colours per band tone. Tones come from brainMath BANDS (green | blue | amber | gray). */
export const TONE_COLOR = Object.freeze({
    green: '#16a34a',
    blue: '#3b82f6',
    amber: '#f59e0b',
    gray: '#94a3b8',
});

/** Strong results glow brightest; limited evidence does not glow at all. */
export const GLOW = Object.freeze({ strong: 1, well: 0.75, developing: 0.6, needs_practice: 0.6, limited: 0, none: 0 });

// ─── Shape ───────────────────────────────────────────────────────────────────

const CEREBRUM = { cx: 195, cy: 150, rx: 165, ry: 112, bottomFlatten: 0.82 };

/** A bumpy egg-shaped outline (gyri) as an SVG path. Deterministic. */
export function cerebrumPath(steps = 200) {
    const { cx, cy, rx, ry, bottomFlatten } = CEREBRUM;
    let d = '';
    for (let i = 0; i < steps; i += 1) {
        const t = (i / steps) * Math.PI * 2;
        const bump = 1 + 0.034 * Math.sin(t * 10) + 0.02 * Math.sin(t * 23 + 1);
        const sin = Math.sin(t);
        const y = cy + ry * (sin > 0 ? bottomFlatten : 1) * sin * bump;
        const x = cx + rx * Math.cos(t) * bump;
        d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)} `;
    }
    return `${d}Z`;
}

export const CEREBELLUM = Object.freeze({ cx: 288, cy: 236, rx: 62, ry: 30 });
export const BRAINSTEM_PATH = 'M214 236 C 222 262, 236 282, 246 304';

/** Folds (sulci): decorative squiggles. */
export const FOLDS = Object.freeze([
    'M70 120 C 95 95, 125 100, 140 125 S 175 140, 195 118',
    'M160 62 C 175 85, 165 105, 190 120',
    'M230 70 C 245 90, 265 85, 280 105 S 300 130, 330 118',
    'M60 178 C 85 162, 105 177, 130 167 S 160 152, 175 172',
    'M215 152 C 235 137, 255 152, 275 142 S 315 152, 335 172',
    'M100 217 C 125 202, 145 217, 170 207',
    'M200 196 C 225 216, 250 201, 270 216 S 305 216, 320 196',
    'M120 82 C 140 72, 150 87, 165 80',
    'M305 78 C 320 88, 330 98, 340 93',
]);

/** Small seeded random generator so decoration is identical on every render. */
export function seededRandom(seed) {
    let a = seed >>> 0;
    return () => {
        a += 0x6d2b79f5;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Faint drifting dots inside the brain. Decoration only. */
export function dustPoints(count = 44, seed = 7) {
    const rand = seededRandom(seed);
    const pts = [];
    while (pts.length < count) {
        const x = 195 + (rand() * 2 - 1) * 150;
        const y = 150 + (rand() * 2 - 1) * 96;
        const nx = (x - 195) / 150; const ny = (y - 150) / 96;
        if (nx * nx + ny * ny <= 1) pts.push({ x, y, r: 0.8 + rand() * 1.4, delay: rand() * 6, dur: 3 + rand() * 4 });
    }
    return pts;
}

/** True if a point sits inside the cerebrum (used by tests to keep every topic in the brain). */
export function insideCerebrum(x, y) {
    const { cx, cy, rx, ry, bottomFlatten } = CEREBRUM;
    const dy = y - cy;
    const yr = dy > 0 ? ry * bottomFlatten : ry;
    const nx = (x - cx) / rx; const ny = dy / yr;
    return nx * nx + ny * ny <= 1;
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/**
 * Where the camera looks: a centre and a zoom, for the SVG viewBox. Centred on the group but never
 * panned past the edge of the picture, so zooming into a group near a corner still fills the frame.
 */
export function cameraFor(group, scale = 2.1) {
    if (!group) return { cx: VIEW.w / 2, cy: VIEW.h / 2, s: 1 };
    const w = VIEW.w / scale; const h = VIEW.h / scale;
    return { cx: clamp(group.x, w / 2, VIEW.w - w / 2), cy: clamp(group.y, h / 2, VIEW.h - h / 2), s: scale };
}

/** Move a point from one viewport fraction to another while changing the camera zoom. */
export function moveBrainCamera(camera, start, end, zoom = camera.s) {
    const s = clamp(zoom, 1, 4);
    const w = VIEW.w / s;
    const h = VIEW.h / s;
    const cx = camera.cx + (start.x - 0.5) * VIEW.w / camera.s - (end.x - 0.5) * w;
    const cy = camera.cy + (start.y - 0.5) * VIEW.h / camera.s - (end.y - 0.5) * h;
    return {
        cx: clamp(cx, w * 0.3, VIEW.w - w * 0.3),
        cy: clamp(cy, h * 0.4, VIEW.h - h * 0.4),
        s,
    };
}

/** The viewBox string for a camera. */
export function viewBoxFor({ cx, cy, s }) {
    const w = VIEW.w / s; const h = VIEW.h / s;
    return `${(cx - w / 2).toFixed(2)} ${(cy - h / 2).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`;
}

// ─── Labels when zoomed in ───────────────────────────────────────────────────

/** Break a label onto lines of at most `max` characters, on spaces. */
export function wrapLabel(text, max = 24) {
    const lines = []; let cur = '';
    for (const word of String(text).split(' ')) {
        if (cur && `${cur} ${word}`.length > max) { lines.push(cur); cur = word; } else cur = cur ? `${cur} ${word}` : word;
    }
    if (cur) lines.push(cur);
    return lines;
}

/** Rough width of a semi-bold label in view units. */
export const labelWidth = (lines, size) => Math.max(...lines.map((l) => l.length)) * size * 0.56;

/**
 * Where to put the name beside a point when zoomed in: pushed outwards from the group's centre, wrapped,
 * and nudged so the whole block stays inside the visible window `win` = { x, y, w, h }.
 */
export function placeLabel({ x, y, group, r, text, size, win, maxChars = 24 }) {
    const lines = wrapLabel(text, maxChars);
    const lh = size * 1.15;
    const w = labelWidth(lines, size);
    const h = lines.length * lh;
    let dx = x - group.x; let dy = y - group.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) { dx = 0; dy = 1; } else { dx /= len; dy /= len; }
    const gap = r + 9; // clear of the point's glow
    let tx; let ty; let anchor;
    if (Math.abs(dx) > 0.35) {
        anchor = dx > 0 ? 'start' : 'end';
        tx = x + Math.sign(dx) * gap; ty = y - h / 2 + size * 0.8;
    } else {
        anchor = 'middle'; tx = x;
        ty = dy > 0 ? y + gap + size * 0.8 : y - gap - h + size * 0.8;
    }
    const left = anchor === 'start' ? tx : anchor === 'end' ? tx - w : tx - w / 2;
    const top = ty - size * 0.8;
    const m = 3;
    let sx = 0; let sy = 0;
    if (left < win.x + m) sx = win.x + m - left; else if (left + w > win.x + win.w - m) sx = win.x + win.w - m - (left + w);
    if (top < win.y + m) sy = win.y + m - top; else if (top + h > win.y + win.h - m) sy = win.y + win.h - m - (top + h);
    return { lines, x: tx + sx, y: ty + sy, anchor, size, lh, w, h };
}
