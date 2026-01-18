import { createRouter, createRoute, createRootRoute, Outlet, redirect } from '@tanstack/react-router';
import { Screen } from '../types';
import MainLayout from '../components/layout/MainLayout';

// Auth Screens
import LoginScreen from '../components/screens/auth/LoginScreen';
import ForgotPasswordScreen from '../components/screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../components/screens/auth/ResetPasswordScreen';
import TherapistRegistrationScreen from '../components/screens/auth/TherapistRegistrationScreen';

// Therapist Screens
import TherapistDashboard from '../components/screens/therapist/TherapistDashboard';
import PatientListScreen from '../components/screens/therapist/PatientListScreen';
import PatientProfile from '../components/screens/therapist/PatientProfile';
import TherapyGoalsScreen from '../components/screens/therapist/TherapyGoalsScreen';
import TherapyGoalForm from '../components/screens/therapist/TherapyGoalForm';
import VideoLibraryScreen from '../components/screens/therapist/VideoLibraryScreen';
import VideoReviewInterface from '../components/screens/therapist/VideoReviewInterface';
import AddPatientScreen from '../components/screens/therapist/AddPatientScreen';
import IndividualAnalysisReport from '../components/screens/therapist/IndividualAnalysisReport';
import ConsolidatedReport from '../components/screens/therapist/ConsolidatedReport'; // Fix possible typo in path if needed, keeping original import
import TherapyRecommendations from '../components/screens/therapist/TherapyRecommendations';
import ReportGeneration from '../components/screens/therapist/ReportGeneration';
import DataExportImportScreen from '../components/screens/therapist/DataExportImportScreen';
import SettingsScreen from '../components/screens/therapist/SettingsScreen';
import CaregiverInvitationScreen from '../components/screens/therapist/CaregiverInvitationScreen';

// Caregiver Screens
import CaregiverDashboard from '../components/screens/caregiver/CaregiverDashboard';
import GuidedVideoRecording from '../components/screens/caregiver/GuidedVideoRecording';
import RecordingScheduleScreen from '../components/screens/caregiver/RecordingScheduleScreen';
import CaregiverReportsScreen from '../components/screens/caregiver/CaregiverReportsScreen';

// Admin Screens
import AdminDashboard from '../components/screens/admin/AdminDashboard';
import TherapistApplicationsScreen from '../components/screens/admin/TherapistApplicationsScreen';
import UserManagementScreen from '../components/screens/admin/UserManagementScreen';
import SystemHealthScreen from '../components/screens/admin/SystemHealthScreen';
import AuditLogScreen from '../components/screens/admin/AuditLogScreen';

// Auth check helper
const isAuthenticated = () => {
    try {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('userRole'); // Check for user data too
        return !!(token && userStr);
    } catch {
        return false;
    }
};

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

// Root route
export const rootRoute = createRootRoute({
    component: () => <Outlet />,
});

// Auth routes
export const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/login',
    component: LoginScreen,
});

export const forgotPasswordRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/forgot-password',
    component: () => <ForgotPasswordScreen onBack={() => window.history.back()} />,
});

export const resetPasswordRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/reset-password',
    component: () => <ResetPasswordScreen onLogin={() => window.location.href = '/login'} />,
});

export const therapistRegisterRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/register/therapist',
    component: TherapistRegistrationScreen,
});

// Protected layout route
export const protectedRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: 'protected',
    beforeLoad: () => {
        if (!isAuthenticated()) {
            throw redirect({ to: '/login' });
        }
    },
    component: MainLayout,
});

// Navigation handler
const handleScreenNavigation = (screen: Screen) => {
    const routes: Partial<Record<Screen, string>> = {
        [Screen.PATIENT_LIST]: '/patients',
        [Screen.PATIENT_CREATE]: '/patients/new',
        [Screen.THERAPY_GOALS]: '/therapy-goals',
        [Screen.VIDEO_LIBRARY]: '/videos',
        [Screen.CAREGIVER_INVITATIONS]: '/invitations',
        [Screen.REPORT_GENERATION]: '/reports',
        [Screen.SETTINGS]: '/settings',
    };
    const path = routes[screen];
    if (path) {
        window.location.href = path;
    } else {
        console.warn('Navigation not implemented for screen:', screen);
    }
};

// Role-aware Dashboard component
const RoleBasedDashboard = () => {
    const role = getUserRole();
    console.log('🔐 RoleBasedDashboard - Detected role:', role);

    if (role === 'ADMIN') {
        console.log('✅ Rendering AdminDashboard');
        return <AdminDashboard />;
    }
    if (role === 'CAREGIVER') {
        console.log('✅ Rendering CaregiverDashboard');
        return <CaregiverDashboard />;
    }
    console.log('✅ Rendering TherapistDashboard');
    return <TherapistDashboard onNavigate={handleScreenNavigation} />;
};

// Therapist routes
export const dashboardRoute = createRoute({
    getParentRoute: () => protectedRoute,
    path: '/dashboard',
    component: RoleBasedDashboard,
});

export const patientsRoute = createRoute({
    getParentRoute: () => protectedRoute,
    path: '/patients',
    component: () => <PatientListScreen onNavigate={handleScreenNavigation} />,
});

export const patientCreateRoute = createRoute({
    getParentRoute: () => protectedRoute,
    path: '/patients/new',
    component: () => <AddPatientScreen onBack={() => window.history.back()} onSuccess={() => window.location.href = '/patients'} />,
});

export const patientProfileRoute = createRoute({
    getParentRoute: () => protectedRoute,
    path: '/patients/$patientId',
    component: PatientProfile,
});

export const therapyGoalsRoute = createRoute({
    getParentRoute: () => protectedRoute,
    path: '/therapy-goals',
    component: () => <TherapyGoalsScreen onNavigate={handleScreenNavigation} />,
});

export const therapyGoalFormRoute = createRoute({
    getParentRoute: () => protectedRoute,
    path: '/therapy-goals/new',
    component: () => <TherapyGoalForm onBack={() => window.history.back()} />,
});

export const caregiverInvitationsRoute = createRoute({
    getParentRoute: () => protectedRoute,
    path: '/invitations',
    component: CaregiverInvitationScreen,
});

export const videoLibraryRoute = createRoute({
    getParentRoute: () => protectedRoute,
    path: '/videos',
    component: VideoLibraryScreen,
});

export const videoReviewRoute = createRoute({
    getParentRoute: () => protectedRoute,
    path: '/videos/$videoId',
    component: VideoReviewInterface,
});

export const recommendationsRoute = createRoute({
    getParentRoute: () => protectedRoute,
    path: '/recommendations',
    component: TherapyRecommendations,
});

export const reportsRoute = createRoute({
    getParentRoute: () => protectedRoute,
    path: '/reports',
    component: ReportGeneration,
});

export const individualReportRoute = createRoute({
    getParentRoute: () => protectedRoute,
    path: '/reports/$patientId',
    component: IndividualAnalysisReport,
});

export const dataExportRoute = createRoute({
    getParentRoute: () => protectedRoute,
    path: '/data-export',
    component: DataExportImportScreen,
});

export const settingsRoute = createRoute({
    getParentRoute: () => protectedRoute,
    path: '/settings',
    component: SettingsScreen,
});

// Caregiver routes
export const caregiverDashboardRoute = createRoute({
    getParentRoute: () => protectedRoute,
    path: '/caregiver',
    component: CaregiverDashboard,
});

export const videoRecordingRoute = createRoute({
    getParentRoute: () => protectedRoute,
    path: '/caregiver/record',
    component: () => <GuidedVideoRecording onClose={() => window.history.back()} patientId="" />,
});

export const recordingScheduleRoute = createRoute({
    getParentRoute: () => protectedRoute,
    path: '/caregiver/schedule',
    component: RecordingScheduleScreen,
});

export const caregiverReportsRoute = createRoute({
    getParentRoute: () => protectedRoute,
    path: '/caregiver/reports',
    component: CaregiverReportsScreen,
});

// Admin routes
export const adminDashboardRoute = createRoute({
    getParentRoute: () => protectedRoute,
    path: '/admin',
    beforeLoad: () => {
        if (getUserRole() !== 'ADMIN') {
            throw redirect({ to: '/dashboard' });
        }
    },
    component: AdminDashboard,
});

export const therapistApplicationsRoute = createRoute({
    getParentRoute: () => protectedRoute,
    path: '/admin/applications',
    beforeLoad: () => {
        if (getUserRole() !== 'ADMIN') {
            throw redirect({ to: '/dashboard' });
        }
    },
    component: () => <TherapistApplicationsScreen onBack={() => window.history.back()} />,
});

export const userManagementRoute = createRoute({
    getParentRoute: () => protectedRoute,
    path: '/admin/users',
    beforeLoad: () => {
        if (getUserRole() !== 'ADMIN') {
            throw redirect({ to: '/dashboard' });
        }
    },
    component: UserManagementScreen,
});

export const systemHealthRoute = createRoute({
    getParentRoute: () => protectedRoute,
    path: '/admin/health',
    beforeLoad: () => {
        if (getUserRole() !== 'ADMIN') {
            throw redirect({ to: '/dashboard' });
        }
    },
    component: SystemHealthScreen,
});

export const auditLogRoute = createRoute({
    getParentRoute: () => protectedRoute,
    path: '/admin/audit',
    beforeLoad: () => {
        if (getUserRole() !== 'ADMIN') {
            throw redirect({ to: '/dashboard' });
        }
    },
    component: AuditLogScreen,
});

// Index redirect
export const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    beforeLoad: () => {
        if (!isAuthenticated()) {
            throw redirect({ to: '/login' });
        }
        const role = getUserRole();
        if (role === 'ADMIN') {
            throw redirect({ to: '/admin' });
        } else if (role === 'CAREGIVER') {
            throw redirect({ to: '/caregiver' });
        } else {
            throw redirect({ to: '/dashboard' });
        }
    },
});

// Route tree
const routeTree = rootRoute.addChildren([
    indexRoute,
    loginRoute,
    forgotPasswordRoute,
    resetPasswordRoute,
    therapistRegisterRoute,
    protectedRoute.addChildren([
        dashboardRoute,
        patientsRoute,
        patientCreateRoute,
        patientProfileRoute,
        therapyGoalsRoute,
        therapyGoalFormRoute,
        caregiverInvitationsRoute,
        videoLibraryRoute,
        videoReviewRoute,
        recommendationsRoute,
        reportsRoute,
        individualReportRoute,
        dataExportRoute,
        settingsRoute,
        caregiverDashboardRoute,
        videoRecordingRoute,
        recordingScheduleRoute,
        caregiverReportsRoute,
        adminDashboardRoute,
        therapistApplicationsRoute,
        userManagementRoute,
        systemHealthRoute,
        auditLogRoute,
    ]),
]);

// Create router
export const router = createRouter({
    routeTree,
    defaultPreload: 'intent',
});

// Type declaration for router
declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}
