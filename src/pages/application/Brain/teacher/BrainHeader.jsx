import React from 'react';
import { NavLink } from 'react-router-dom';
import { Brain } from 'lucide-react';

export const BRAIN_TEACHER_ROUTES = {
    students: '/dashboard/teacher/brain',
    student: (id) => `/dashboard/teacher/brain/students/${id}`,
    insights: '/dashboard/teacher/brain/insights',
    assessments: '/dashboard/teacher/brain/assessments',
    assessment: (id) => `/dashboard/teacher/brain/assessments/${id}`,
};

const TABS = [
    { to: BRAIN_TEACHER_ROUTES.students, label: 'Student brains', end: true },
    { to: BRAIN_TEACHER_ROUTES.insights, label: 'Class insights' },
    { to: BRAIN_TEACHER_ROUTES.assessments, label: 'Assessments', end: true },
];

/** Page title plus the three-tab switcher shared by the teacher's Student Brain screens. */
export default function BrainHeader({ subtitle }) {
    return (
        <div className="space-y-3">
            <div>
                <h1 className="flex items-center gap-2.5 text-2xl font-bold text-gray-900">
                    <Brain size={24} className="text-[#002684]" aria-hidden="true" />
                    Student Brain
                </h1>
                <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
            </div>
            <nav className="flex gap-1 border-b border-gray-200" aria-label="Student Brain sections">
                {TABS.map((t) => (
                    <NavLink
                        key={t.to}
                        to={t.to}
                        end={t.end}
                        className={({ isActive }) =>
                            `-mb-px border-b-2 px-3.5 py-2 text-sm font-semibold transition-colors ${
                                isActive ? 'border-[#002684] text-[#002684] dark:border-blue-400 dark:text-[color:var(--text-primary)]' : 'border-transparent text-gray-500 hover:text-gray-800'
                            }`}
                    >
                        {t.label}
                    </NavLink>
                ))}
            </nav>
        </div>
    );
}
