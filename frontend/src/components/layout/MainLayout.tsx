import { useState } from "react";
import {
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  FileText,
  Video,
  Sparkles,
  Settings,
  LogOut,
  Menu,
  Activity,
  FileBarChart,
  Camera,
  Calendar,
  ShieldAlert,
  Database,
  ChevronRight,
  Server,
  UserCheck,
  Brain,
  ClipboardCheck,
  TrendingUp,
  Search,
} from "lucide-react";
import { UserRole } from "../../types";
import { useTherapistDashboardStats } from "../../api/dashboard";

export default function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();

  // Helper to get role (in a real app, use a proper AuthContext)
  const getUserRole = () => {
    try {
      const userStr = localStorage.getItem("userRole");
      if (userStr) {
        const user = JSON.parse(userStr);
        return user?.role?.toUpperCase();
      }
    } catch {}
    return null;
  };

  const userRole = getUserRole();
  const normalizedRole = userRole;

  const router = useRouterState();
  const pathname = router.location.pathname;

  const { data: therapistStats } = useTherapistDashboardStats();
  const pendingCount = therapistStats?.pendingReviews || 0;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    document.cookie =
      "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie =
      "user_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    navigate({ to: "/login" });
  };

  return (
    <div className="flex h-screen bg-white font-sans text-gray-900">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-30 w-56 bg-white border-r border-gray-200 transform transition-transform duration-300 flex flex-col ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        <div className="h-14 flex items-center px-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="bg-gray-900 text-white p-1.5 rounded-lg">
              <Activity className="h-4 w-4" />
            </div>
            <span className="font-bold text-sm tracking-tight text-zinc-900">
              NEUROCARE
            </span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
          {normalizedRole === UserRole.THERAPIST && (
            <>
              <NavSection title="Overview" />
              <NavItem
                to="/dashboard"
                icon={<LayoutDashboard size={16} />}
                label="Dashboard"
              />
              <NavItem
                to="/patients"
                icon={<Users size={16} />}
                label="Patient Roster"
              />
              <NavItem
                to="/invitations"
                icon={<UserCheck size={16} />}
                label="Caregiver Invites"
              />

              <NavSection title="Diagnostics" />
              <NavItem
                to="/pending-review"
                icon={<ClipboardCheck size={16} />}
                label="Review Queue"
                badge={pendingCount > 0 ? pendingCount : undefined}
              />
              <NavItem
                to="/videos"
                icon={<Video size={16} />}
                label="Video Library"
              />
              <NavItem
                to="/recommendations"
                icon={<Brain size={16} />}
                label="AI Insights"
                forceActive={
                  pathname.includes("/longitudinal") ||
                  pathname.includes("/recommendations")
                }
              />

              <NavSection title="Clinical" />
              <NavItem
                to="/therapy-goals"
                icon={<Sparkles size={16} />}
                label="Intervention Goals"
              />
              <NavItem
                to="/reports"
                icon={<FileBarChart size={16} />}
                label="Outcome Reports"
              />

              <NavSection title="Management" />
              <NavItem
                to="/data-export"
                icon={<Database size={16} />}
                label="Data Sync"
              />
              <NavItem
                to="/settings"
                icon={<Settings size={16} />}
                label="Settings"
              />
            </>
          )}
          {normalizedRole === UserRole.CAREGIVER && (
            <>
              <NavSection title="Portal" />
              <NavItem
                to="/caregiver"
                icon={<LayoutDashboard size={16} />}
                label="Dashboard"
              />
              <NavItem
                to="/caregiver/record"
                icon={<Camera size={16} />}
                label="Video Capture"
              />
              <NavItem
                to="/caregiver/schedule"
                icon={<Calendar size={16} />}
                label="Care Schedule"
              />
              <NavItem
                to="/caregiver/reports"
                icon={<FileBarChart size={16} />}
                label="Clinical Reports"
              />
            </>
          )}
          {normalizedRole === UserRole.ADMIN && (
            <>
              <NavSection title="Core Admin" />
              <NavItem
                to="/admin"
                icon={<Activity size={16} />}
                label="System Overview"
              />
              <NavItem
                to="/admin/applications"
                icon={<UserCheck size={16} />}
                label="Therapist Apps"
              />
              <NavItem
                to="/admin/users"
                icon={<Users size={16} />}
                label="User Registry"
              />
              <NavSection title="Security & Health" />
              <NavItem
                to="/admin/audit"
                icon={<ShieldAlert size={16} />}
                label="Audit Logs"
              />
              <NavItem
                to="/admin/health"
                icon={<Server size={16} />}
                label="Node Status"
              />
            </>
          )}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <UserProfile />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-2 py-1.5 mt-1.5 text-[11px] font-medium text-gray-500 hover:text-red-600 transition-colors uppercase tracking-wider"
          >
            <LogOut size={12} /> Log Out System
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:hidden">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            <Menu size={18} />
          </button>
          <span className="font-bold text-sm tracking-tight text-zinc-900 uppercase">
            NeuroCare
          </span>
          <div className="w-8" />
        </header>
        <div className="flex-1 overflow-auto bg-gray-50/30">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

const NavSection = ({ title }: { title: string }) => (
  <div className="px-3 mt-5 mb-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
    {title}
  </div>
);

const NavItem = ({
  icon,
  label,
  to,
  badge,
  forceActive,
}: {
  icon: any;
  label: string;
  to: string;
  badge?: number | string;
  forceActive?: boolean;
}) => (
  <Link
    to={to}
    activeOptions={{ exact: true }}
    className="w-full flex items-center justify-between px-3 py-2.5 text-xs rounded-md transition-all duration-200"
  >
    {({ isActive }) => {
      const isReallyActive = forceActive ?? isActive;
      return (
        <div
          className={`w-full flex items-center justify-between transition-all duration-200 ${isReallyActive ? "bg-zinc-900 text-white font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 border border-transparent"} px-3 py-2.5 text-xs rounded-md -m-3`}
        >
          <div className="flex items-center gap-3">
            <span className={isReallyActive ? "text-white" : "text-zinc-400"}>
              {icon}
            </span>
            <span className="uppercase tracking-wider">{label}</span>
          </div>
          {badge ? (
            <span
              className={`${isReallyActive ? "bg-white text-zinc-900" : "bg-red-500 text-white"} px-1.5 py-0.5 rounded text-[9px] font-black min-w-[18px] text-center shadow-sm`}
            >
              {badge}
            </span>
          ) : (
            isReallyActive && (
              <ChevronRight size={12} className="text-zinc-400" />
            )
          )}
        </div>
      );
    }}
  </Link>
);

const UserProfile = () => {
  const userStr = localStorage.getItem("userRole");
  let userName = "User";
  let roleString = "USER";

  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      userName = user?.fullName || user?.name || "User";
      roleString = user?.role?.toUpperCase() || "USER";
    } catch {}
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-zinc-50 border border-zinc-100 shadow-sm">
      <div className="w-8 h-8 rounded bg-zinc-900 flex items-center justify-center text-[10px] font-black text-white border-2 border-zinc-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
        {userName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black text-zinc-900 truncate uppercase tracking-tight">
          {userName}
        </p>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
            {roleString}
          </p>
        </div>
      </div>
    </div>
  );
};
