/**
 * Demo mode: run the app with NO backend and NO real sign-in, for presentations.
 *
 * Off by default. It is only on when the app is built or started with VITE_BRAIN_DEMO=true
 * (use `npm run dev:demo` / `npm run build:demo`, which read `.env.demo`). A normal build never
 * enables it. In demo mode:
 *   - the sign-in page is replaced by a "open as teacher / parent" page,
 *   - every API call is answered here, in the browser, and nothing is sent anywhere,
 *   - Student Brain already runs on invented data, so every screen is fake from end to end.
 */

export const DEMO_MODE = import.meta.env.VITE_BRAIN_DEMO === 'true';

const ROLE_KEY = 'ec_demo_role';

export const getDemoRole = () => {
    try { return sessionStorage.getItem(ROLE_KEY); } catch { return null; }
};
export const setDemoRole = (role) => {
    try { if (role) sessionStorage.setItem(ROLE_KEY, role); else sessionStorage.removeItem(ROLE_KEY); } catch { /* storage unavailable */ }
};

const person = (role, firstName, lastName) => ({
    id: `demo-${role}`, role, firstName, lastName,
    fullName: `${firstName} ${lastName}`, name: `${firstName} ${lastName}`,
    email: 'demo@example.com', schoolName: 'Demo Academy', schoolId: 'DEMO001',
});

export const DEMO_USERS = {
    teacher: person('teacher', 'Kenechukwu', 'Ajufo'),
    parent: person('parent', 'Ifeoma', 'Bello'),
};

// Ids match the demo students in Student Brain's mock store so each child shows a real story.
const DEMO_CHILDREN = [
    { id: 'std_007', studentId: 'std_007', fullName: 'David Bello', classDisplay: 'JSS 2' },
    { id: 'std_001', studentId: 'std_001', fullName: 'Adaeze Bello', classDisplay: 'JSS 2' },
];

/** An axios adapter that answers every request locally. Nothing leaves the browser. */
export function demoAdapter(config) {
    const url = String(config.url ?? '');
    let data = { success: true, data: {} };
    if (url.includes('/dashboard')) {
        data = {
            success: true,
            data: {
                school: { currentAcademicYear: { name: '2026/2027' }, currentAcademicTerm: { name: 'First Term' } },
                children: DEMO_CHILDREN,
            },
        };
    } else if (url.includes('/settings/public')) {
        data = { success: true, data: { locale: { currency: 'NGN', timezone: 'Africa/Lagos', dateFormat: 'DD/MM/YYYY' } } };
    } else if (url.includes('policy')) {
        data = { success: true, data: { granted: false } };
    }
    return Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config, request: {} });
}
