import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  LayoutDashboard, Users, FileText, Video, Sparkles, Settings, LogOut, Menu, Activity, 
  FileBarChart, Camera, Calendar, ShieldAlert, Database, ChevronRight, Server
} from 'lucide-react';
import { Screen, UserRole } from './types';

// Auth Screens
import LoginScreen from './components/screens/auth/LoginScreen';
import ForgotPasswordScreen from './components/screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from './components/screens/auth/ResetPasswordScreen';

// Therapist Screens
import TherapistDashboard from './components/screens/therapist/TherapistDashboard';
import PatientListScreen from './components/screens/therapist/PatientListScreen';
import PatientProfile from './components/screens/therapist/PatientProfile';
import TherapyGoalsScreen from './components/screens/therapist/TherapyGoalsScreen';
import TherapyGoalForm from './components/screens/therapist/TherapyGoalForm';
import VideoLibraryScreen from './components/screens/therapist/VideoLibraryScreen';
import VideoReviewInterface from './components/screens/therapist/VideoReviewInterface';
import IndividualAnalysisReport from './components/screens/therapist/IndividualAnalysisReport';
import ConsolidatedReport from './components/screens/therapist/ConsolidatedReport';
import TherapyRecommendations from './components/screens/therapist/TherapyRecommendations';
import ReportGeneration from './components/screens/therapist/ReportGeneration';
import DataExportImportScreen from './components/screens/therapist/DataExportImportScreen';
import SettingsScreen from './components/screens/therapist/SettingsScreen';

// Caregiver Screens
import CaregiverDashboard from './components/screens/caregiver/CaregiverDashboard';
import GuidedVideoRecording from './components/screens/caregiver/GuidedVideoRecording';
import RecordingScheduleScreen from './components/screens/caregiver/RecordingScheduleScreen';
import CaregiverReportsScreen from './components/screens/caregiver/CaregiverReportsScreen';

// Admin Screens
import SystemHealthScreen from './components/screens/admin/SystemHealthScreen';
import AuditLogScreen from './components/screens/admin/AuditLogScreen';

// Shared
import ConsentManagement from './components/screens/shared/ConsentManagement';
import ErrorScreen from './components/screens/shared/ErrorScreen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 5 * 60 * 1000 },
  },
});

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.LOGIN);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  const handleLogin = (role: UserRole) => {
    setUserRole(role);
    if (role === UserRole.THERAPIST) setCurrentScreen(Screen.DASHBOARD);
    else if (role === UserRole.CAREGIVER) setCurrentScreen(Screen.CAREGIVER_DASHBOARD);
    else if (role === UserRole.ADMIN) setCurrentScreen(Screen.SYSTEM_HEALTH);
  };

  const renderAuthScreen = () => {
    switch(currentScreen) {
      case Screen.FORGOT_PASSWORD:
        return <ForgotPasswordScreen onBack={() => setCurrentScreen(Screen.LOGIN)} />;
      case Screen.RESET_PASSWORD:
        return <ResetPasswordScreen onLogin={() => setCurrentScreen(Screen.LOGIN)} />;
      default:
        return <LoginScreen onLogin={handleLogin} onForgotPassword={() => setCurrentScreen(Screen.FORGOT_PASSWORD)} />;
    }
  };

  if (!userRole || [Screen.LOGIN, Screen.FORGOT_PASSWORD, Screen.RESET_PASSWORD].includes(currentScreen)) {
    return <QueryClientProvider client={queryClient}>{renderAuthScreen()}</QueryClientProvider>;
  }

  // Full Screen Overrides
  if (currentScreen === Screen.VIDEO_RECORDING) {
    return <GuidedVideoRecording onClose={() => setCurrentScreen(Screen.CAREGIVER_DASHBOARD)} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <MainLayout 
        role={userRole} 
        currentScreen={currentScreen} 
        onNavigate={setCurrentScreen} 
        onLogout={() => { setUserRole(null); setCurrentScreen(Screen.LOGIN); }}
      />
    </QueryClientProvider>
  );
}

const MainLayout = ({ role, currentScreen, onNavigate, onLogout }: any) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const navigate = (screen: Screen) => {
    onNavigate(screen);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-20 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg"><Activity className="h-5 w-5" /></div>
            <span className="font-bold text-lg tracking-tight text-slate-900">NeuroCare</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-0.5 custom-scrollbar">
          {role === UserRole.THERAPIST && (
            <>
              <NavSection title="Platform" />
              <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" active={currentScreen === Screen.DASHBOARD} onClick={() => navigate(Screen.DASHBOARD)} />
              <NavItem icon={<Users size={18} />} label="Patients" active={currentScreen === Screen.PATIENT_LIST || currentScreen === Screen.PATIENT_PROFILE} onClick={() => navigate(Screen.PATIENT_LIST)} />
              <NavItem icon={<FileText size={18} />} label="Consent Mgmt" active={currentScreen === Screen.CONSENT_MANAGEMENT} onClick={() => navigate(Screen.CONSENT_MANAGEMENT)} />
              
              <NavSection title="Clinical Tools" />
              <NavItem icon={<Sparkles size={18} />} label="Therapy Goals" active={currentScreen === Screen.THERAPY_GOALS || currentScreen === Screen.THERAPY_GOAL_FORM} onClick={() => navigate(Screen.THERAPY_GOALS)} />
              <NavItem icon={<Video size={18} />} label="Video Library" active={currentScreen === Screen.VIDEO_LIBRARY || currentScreen === Screen.VIDEO_REVIEW} onClick={() => navigate(Screen.VIDEO_LIBRARY)} />
              <NavItem icon={<Activity size={18} />} label="AI Recommendations" active={currentScreen === Screen.RECOMMENDATIONS} onClick={() => navigate(Screen.RECOMMENDATIONS)} />
              
              <NavSection title="Reporting & Data" />
              <NavItem icon={<FileBarChart size={18} />} label="Reports" active={currentScreen === Screen.REPORT_GENERATION || currentScreen === Screen.INDIVIDUAL_REPORT} onClick={() => navigate(Screen.REPORT_GENERATION)} />
              <NavItem icon={<Database size={18} />} label="Data Export" active={currentScreen === Screen.DATA_EXPORT} onClick={() => navigate(Screen.DATA_EXPORT)} />
              <NavItem icon={<Settings size={18} />} label="Settings" active={currentScreen === Screen.SETTINGS} onClick={() => navigate(Screen.SETTINGS)} />
            </>
          )}

          {role === UserRole.CAREGIVER && (
            <>
              <NavSection title="Caregiver Portal" />
              <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" active={currentScreen === Screen.CAREGIVER_DASHBOARD} onClick={() => navigate(Screen.CAREGIVER_DASHBOARD)} />
              <NavItem icon={<Camera size={18} />} label="Record Video" active={currentScreen === Screen.VIDEO_RECORDING} onClick={() => navigate(Screen.VIDEO_RECORDING)} />
              <NavItem icon={<Calendar size={18} />} label="Schedule" active={currentScreen === Screen.RECORDING_SCHEDULE} onClick={() => navigate(Screen.RECORDING_SCHEDULE)} />
              <NavItem icon={<FileBarChart size={18} />} label="My Reports" active={currentScreen === Screen.CAREGIVER_REPORTS} onClick={() => navigate(Screen.CAREGIVER_REPORTS)} />
              <NavItem icon={<FileText size={18} />} label="My Consent" active={currentScreen === Screen.CONSENT_MANAGEMENT} onClick={() => navigate(Screen.CONSENT_MANAGEMENT)} />
            </>
          )}

          {role === UserRole.ADMIN && (
            <>
              <NavSection title="System Admin" />
              <NavItem icon={<Activity size={18} />} label="System Health" active={currentScreen === Screen.SYSTEM_HEALTH} onClick={() => navigate(Screen.SYSTEM_HEALTH)} />
              <NavItem icon={<ShieldAlert size={18} />} label="Audit Logs" active={currentScreen === Screen.AUDIT_LOG} onClick={() => navigate(Screen.AUDIT_LOG)} />
              <NavItem icon={<Database size={18} />} label="Backups" active={false} onClick={() => {}} />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100">
           <UserProfile role={role} />
           <button onClick={onLogout} className="flex items-center gap-2 w-full px-2 py-2 mt-2 text-xs font-medium text-slate-500 hover:text-red-600 transition-colors">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 md:hidden z-10 sticky top-0">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-md"><Menu size={20} /></button>
          <span className="font-semibold text-slate-900">NeuroCare</span>
          <div className="w-8" />
        </header>

        <div className="flex-1 overflow-auto bg-slate-50/50">
          <ScreenRouter screen={currentScreen} 
            onNavigate={navigate}
          />
        </div>
      </main>
    </div>
  );
};

const ScreenRouter = ({ screen, onNavigate }: { screen: Screen, onNavigate: (s: Screen) => void }) => {
  switch (screen) {
    // Therapist
    case Screen.DASHBOARD: return <TherapistDashboard />;
    case Screen.PATIENT_LIST: return <PatientListScreen />;
    case Screen.PATIENT_PROFILE: return <PatientProfile />;
    case Screen.THERAPY_GOALS: return <TherapyGoalsScreen onNavigate={onNavigate} />;
    case Screen.THERAPY_GOAL_FORM: return <TherapyGoalForm onBack={() => onNavigate(Screen.THERAPY_GOALS)} />;
    case Screen.VIDEO_LIBRARY: return <VideoLibraryScreen />;
    case Screen.VIDEO_REVIEW: return <VideoReviewInterface />;
    case Screen.INDIVIDUAL_REPORT: return <IndividualAnalysisReport />;
    case Screen.CONSOLIDATED_REPORT: return <ConsolidatedReport />;
    case Screen.RECOMMENDATIONS: return <TherapyRecommendations />;
    case Screen.REPORT_GENERATION: return <ReportGeneration />;
    case Screen.DATA_EXPORT: return <DataExportImportScreen />;
    case Screen.SETTINGS: return <SettingsScreen />;
    // Caregiver
    case Screen.CAREGIVER_DASHBOARD: return <CaregiverDashboard />;
    case Screen.RECORDING_SCHEDULE: return <RecordingScheduleScreen />;
    case Screen.CAREGIVER_REPORTS: return <CaregiverReportsScreen />;
    // Admin
    case Screen.SYSTEM_HEALTH: return <SystemHealthScreen />;
    case Screen.AUDIT_LOG: return <AuditLogScreen />;
    // Shared
    case Screen.CONSENT_MANAGEMENT: return <ConsentManagement />;
    case Screen.ERROR: return <ErrorScreen resetErrorBoundary={() => onNavigate(Screen.DASHBOARD)} />;
    default: return <TherapistDashboard />;
  }
};

const NavSection = ({ title }: { title: string }) => <div className="px-3 mt-6 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</div>;
const NavItem = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-all duration-200 mb-0.5 group ${active ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
    <div className="flex items-center gap-3"><span className={`${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}>{icon}</span>{label}</div>
    {active && <ChevronRight size={14} className="text-slate-400" />}
  </button>
);
const UserProfile = ({ role }: { role: UserRole }) => (
  <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-slate-50 border border-slate-100">
    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold text-blue-600 border border-slate-200 shadow-sm">{role.charAt(0)}</div>
    <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-900 truncate">{role === UserRole.THERAPIST ? 'Dr. Sarah' : role === UserRole.ADMIN ? 'Admin' : 'Jane Doe'}</p><p className="text-xs text-slate-500 truncate">{role}</p></div>
  </div>
);