import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, GraduationCap, Users } from 'lucide-react';
import { Images } from '../../components/images.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';

/** Replaces the sign-in page in demo builds only (see src/utils/demoMode.js). */
export default function DemoEntryPage() {
    const { demoLogin } = useAuth();
    const navigate = useNavigate();

    const enter = (role) => {
        demoLogin?.(role);
        navigate(`/dashboard/${role}/brain`, { replace: true });
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md space-y-6 text-center">
                <img src={Images.main_logo} alt="EduConnect" className="mx-auto h-12 w-auto" />
                <div>
                    <h1 className="flex items-center justify-center gap-2 text-2xl font-bold text-gray-900">
                        <Brain size={24} className="text-[#002684]" aria-hidden="true" /> Student Brain
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">Preview with demo data. Pick a view to explore.</p>
                </div>
                <div className="space-y-3">
                    <button onClick={() => enter('teacher')}
                        className="flex w-full items-center gap-3.5 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:shadow">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><GraduationCap size={22} /></span>
                        <span><span className="block font-semibold text-gray-900">Teacher view</span><span className="block text-[13px] text-gray-500">Every student's brain, who could use support, marks and topics</span></span>
                    </button>
                    <button onClick={() => enter('parent')}
                        className="flex w-full items-center gap-3.5 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:shadow">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Users size={22} /></span>
                        <span><span className="block font-semibold text-gray-900">Parent view</span><span className="block text-[13px] text-gray-500">A child's learning map and animated brain</span></span>
                    </button>
                </div>
                <p className="text-[12px] text-gray-400">Every student, mark and topic here is invented. Nothing is real or saved.</p>
            </div>
        </main>
    );
}
