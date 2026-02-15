import { useState } from 'react';
import { Link, Outlet, useNavigate } from '@tanstack/react-router';
import {
    LayoutDashboard, Users, FileText, Video, Sparkles, Settings, LogOut, Menu, Activity,
    FileBarChart, Camera, Calendar, ShieldAlert, Database, ChevronRight, Server, UserCheck
} from 'lucide-react';
import { UserRole } from '../../types';

export default function MainLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const navigate = useNavigate();

    // Helper to get role (in a real app, use a proper AuthContext)
    const getUserRole = () => {
        try {
            const userStr = localStorage.getItem('userRole');
            if (userStr) {
                const user = JSON.parse(userStr);
                return user?.role?.toUpperCase();
            }
        } catch { }
        return null;
    };

    const userRole = getUserRole();
    const normalizedRole = userRole;

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'user_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        navigate({ to: '/login' });
    };

    return (
        <div className="flex h-screen bg-white font-sans text-gray-900">
            {isSidebarOpen && <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-20 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

            <aside className={`fixed md:static inset-y-0 left-0 z-30 w-56 bg-white border-r border-gray-200 transform transition-transform duration-300 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                <div className="h-14 flex items-center px-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="bg-gray-900 text-white p-1.5 rounded"><Activity className="h-4 w-4" /></div>
                        <span className="font-semibold text-sm">NeuroCare</span>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
                    {normalizedRole === UserRole.THERAPIST && (
                        <>
                            <NavSection title="Platform" />
                            <NavItem to="/dashboard" icon={<LayoutDashboard size={16} />} label="Dashboard" />
                            <NavItem to="/patients" icon={<Users size={16} />} label="Patients" />
                            <NavItem to="/invitations" icon={<UserCheck size={16} />} label="Invitations" />
                            <NavSection title="Clinical" />
                            <NavItem to="/therapy-goals" icon={<Sparkles size={16} />} label="Goals" />
                            <NavItem to="/videos" icon={<Video size={16} />} label="Videos" />
                            <NavItem to="/recommendations" icon={<Activity size={16} />} label="AI Insights" />
                            <NavSection title="Data" />
                            <NavItem to="/reports" icon={<FileBarChart size={16} />} label="Reports" />
                            <NavItem to="/data-export" icon={<Database size={16} />} label="Export" />
                            <NavItem to="/settings" icon={<Settings size={16} />} label="Settings" />
                        </>
                    )}
                    {normalizedRole === UserRole.CAREGIVER && (
                        <>
                            <NavSection title="Caregiver" />
                            <NavItem to="/caregiver" icon={<LayoutDashboard size={16} />} label="Dashboard" />
                            <NavItem to="/caregiver/record" icon={<Camera size={16} />} label="Record" />
                            <NavItem to="/caregiver/schedule" icon={<Calendar size={16} />} label="Schedule" />
                            <NavItem to="/caregiver/reports" icon={<FileBarChart size={16} />} label="Reports" />
                        </>
                    )}
                    {normalizedRole === UserRole.ADMIN && (
                        <>
                            <NavSection title="Admin" />
                            <NavItem to="/admin" icon={<Activity size={16} />} label="Dashboard" />
                            <NavItem to="/admin/applications" icon={<UserCheck size={16} />} label="Applications" />
                            <NavItem to="/admin/users" icon={<Users size={16} />} label="Users" />
                            <NavItem to="/admin/audit" icon={<ShieldAlert size={16} />} label="Audit" />
                            <NavItem to="/admin/health" icon={<Server size={16} />} label="Health" />
                        </>
                    )}
                </nav>

                <div className="p-3 border-t border-gray-100">
                    <UserProfile />
                    <button onClick={handleLogout} className="flex items-center gap-2 w-full px-2 py-1.5 mt-1.5 text-xs text-gray-500 hover:text-red-600">
                        <LogOut size={12} /> Sign Out
                    </button>
                </div>
            </aside>

            <main className="flex-1 flex flex-col h-full overflow-hidden">
                <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:hidden">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded"><Menu size={18} /></button>
                    <span className="font-semibold text-sm">NeuroCare</span>
                    <div className="w-8" />
                </header>
                <div className="flex-1 overflow-auto bg-white">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

const NavSection = ({ title }: { title: string }) => <div className="px-2 mt-4 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{title}</div>;

const NavItem = ({ icon, label, to }: { icon: any, label: string, to: string }) => (
    <Link
        to={to}
        activeOptions={{ exact: true }}
        activeProps={{ className: 'bg-zinc-200 text-zinc-900 font-bold' }}
        inactiveProps={{ className: 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900' }}
        className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-md transition-all duration-200"
    >
        {({ isActive }) => (
            <>
                <div className="flex items-center gap-3"><span className={isActive ? 'text-zinc-900' : 'text-zinc-400'}>{icon}</span>{label}</div>
                {isActive && <ChevronRight size={12} className="text-zinc-400" />}
            </>
        )}
    </Link>
);

const UserProfile = () => {
    const userStr = localStorage.getItem('userRole');
    let userName = 'User';
    let roleString = 'USER';

    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            userName = user?.fullName || user?.name || 'User';
            roleString = user?.role?.toUpperCase() || 'USER';
        } catch { }
    }

    return (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-gray-50">
            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] font-semibold text-gray-700 border border-gray-200">{userName.charAt(0).toUpperCase()}</div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">{userName}</p>
                <p className="text-[10px] text-gray-400 capitalize">{roleString.toLowerCase()}</p>
            </div>
        </div>
    );
};
