import React from 'react';
import { Users, Video, Target, Plus, ChevronRight, Loader2, AlertCircle, UserPlus, Clock, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTherapistDashboardStats } from '../../../api/dashboard';
import { usePatients } from '../../../api/patient';
import { useInvitations } from '../../../api/invitation';
import { Screen, InvitationStatus } from '../../../types';

interface TherapistDashboardProps {
  onNavigate?: (screen: Screen) => void;
}

export default function TherapistDashboard({ onNavigate }: TherapistDashboardProps) {
  const { data: stats, isLoading: statsLoading, error: statsError } = useTherapistDashboardStats();
  const { data: patientsData, isLoading: patientsLoading } = usePatients({ limit: 5 }); // Limit reduced to 5
  const { data: invitationsData } = useInvitations();

  const patients = patientsData?.patients || [];
  const invitations = (invitationsData || []).slice(0, 5);

  // Loading state
  if (statsLoading || patientsLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  // Error state
  if (statsError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
          <p className="text-zinc-500 text-xs font-mono">Failed to load dashboard</p>
        </div>
      </div>
    );
  }

  const weeklySessions = stats?.weeklySessions || [];
  const progressTrend = stats?.progressTrend || [];

  return (
    <div className="min-h-screen bg-white font-mono">
      {/* Header */}
      <div className="border-b border-zinc-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-medium text-zinc-900">Dashboard</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onNavigate?.(Screen.PATIENT_CREATE)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded hover:bg-zinc-800 transition-colors"
            >
              <Plus size={12} />
              Patient
            </button>
            <button
              onClick={() => onNavigate?.(Screen.CAREGIVER_INVITATIONS)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 text-zinc-700 text-xs font-medium rounded hover:bg-zinc-50 transition-colors"
            >
              <UserPlus size={12} />
              Invite
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-5">
        {/* Stats Row */}
        <div className="grid grid-cols-6 gap-3 mb-5">
          <StatCard label="Patients" value={stats?.totalPatients || 0} sub={`${stats?.activePatients || 0} active`} onClick={() => onNavigate?.(Screen.PATIENT_LIST)} />
          <StatCard label="Goals" value={stats?.totalGoals || 0} sub={`${stats?.achievedGoals || 0} achieved`} onClick={() => onNavigate?.(Screen.THERAPY_GOALS)} />
          <StatCard label="Sessions" value={stats?.totalSessions || 0} sub={`${stats?.pendingSessions || 0} pending`} onClick={() => onNavigate?.(Screen.VIDEO_LIBRARY)} />
          <StatCard label="Progress" value={`${stats?.avgProgress || 0}%`} sub="avg score" />
          <StatCard label="Reviews" value={stats?.pendingReviews || 0} sub="pending" onClick={() => onNavigate?.(Screen.VIDEO_LIBRARY)} />
          <StatCard label="Rate" value={`${stats?.goalAchievementRate || 0}%`} sub="achievement" onClick={() => onNavigate?.(Screen.THERAPY_GOALS)} />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          {/* Sessions Chart */}
          <div className="border border-zinc-200 rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-700">Weekly Sessions</span>
              <span className="text-[10px] text-zinc-400">Last 7 days</span>
            </div>
            <div className="h-32">
              {weeklySessions.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklySessions}>
                    <defs>
                      <linearGradient id="sessionGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#18181b" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#a1a1aa', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ fontSize: 11, border: '1px solid #e4e4e7', borderRadius: 4, boxShadow: 'none', fontFamily: 'monospace' }}
                      labelStyle={{ fontFamily: 'monospace' }}
                    />
                    <Area type="monotone" dataKey="sessions" stroke="#18181b" fill="url(#sessionGradient)" strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ChartSkeleton />
              )}
            </div>
          </div>

          {/* Progress Trend Chart */}
          <div className="border border-zinc-200 rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-700">Progress Trend</span>
              <span className="text-[10px] text-zinc-400">Last 4 weeks</span>
            </div>
            <div className="h-32">
              {progressTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={progressTrend}>
                    <defs>
                      <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#a1a1aa', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ fontSize: 11, border: '1px solid #e4e4e7', borderRadius: 4, boxShadow: 'none', fontFamily: 'monospace' }}
                      formatter={(value: any) => [`${value}%`, 'Progress']}
                      labelStyle={{ fontFamily: 'monospace' }}
                    />
                    <Area type="monotone" dataKey="progress" stroke="#10b981" fill="url(#progressGradient)" strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ChartSkeleton />
              )}
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* Patients List */}
          <div className="col-span-2 border border-zinc-200 rounded">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
              <span className="text-xs font-medium text-zinc-700">Recent Patients</span>
              <button
                onClick={() => onNavigate?.(Screen.PATIENT_LIST)}
                className="text-[10px] text-zinc-400 hover:text-zinc-600 flex items-center gap-0.5"
              >
                View all <ChevronRight size={10} />
              </button>
            </div>

            {patients.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Users className="w-8 h-8 text-zinc-200 mx-auto mb-2" />
                <p className="text-xs text-zinc-400">No patients</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {patients.map((patient: any) => {
                  // Check if caregiver is inactive
                  const caregiverInactive = patient.caregiverStatus === 'suspended' ||
                    patient.caregiverStatus === 'inactive' ||
                    patient.caregiverAccountStatus === 'suspended';

                  return (
                    <div
                      key={patient.id || patient._id}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-50 cursor-pointer transition-colors"
                      onClick={() => onNavigate?.(Screen.PATIENT_LIST)}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded bg-zinc-100 flex items-center justify-center text-[10px] font-medium text-zinc-600">
                          {patient.fullName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-zinc-900">{patient.fullName}</span>
                            {caregiverInactive && (
                              <span
                                className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-red-50 border border-red-200 rounded text-[9px] text-red-600"
                                title="Caregiver is inactive - patient status affected"
                              >
                                <AlertTriangle size={8} />
                                Inactive
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-400">{patient.mrn}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${caregiverInactive
                          ? 'bg-red-50 text-red-600 border border-red-200'
                          : patient.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                            : 'bg-zinc-100 text-zinc-500'
                          }`}>
                          {caregiverInactive ? 'Inactive' : patient.status || 'Active'}
                        </span>
                        <span className="text-[10px] text-zinc-400 w-8 text-right">
                          {patient.progressScore || 0}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Invitations */}
            <div className="border border-zinc-200 rounded">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-100">
                <span className="text-xs font-medium text-zinc-700">Invitations</span>
                <button
                  onClick={() => onNavigate?.(Screen.CAREGIVER_INVITATIONS)}
                  className="text-[10px] text-zinc-400 hover:text-zinc-600"
                >
                  View all
                </button>
              </div>
              {invitations.length === 0 ? (
                <div className="px-3 py-4 text-center">
                  <span className="text-[10px] text-zinc-400">No invitations</span>
                </div>
              ) : (
                <div className="divide-y divide-zinc-50">
                  {invitations.map((inv: any) => (
                    <div key={inv.id} className="px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-700 truncate">{inv.caregiverName}</span>
                        <InvitationBadge inv={inv} />
                      </div>
                      <span className="text-[10px] text-zinc-400 truncate block">{inv.caregiverEmail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="border border-zinc-200 rounded p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Target size={12} className="text-zinc-400" />
                  <span className="text-xs font-medium text-zinc-700">Goals Overview</span>
                </div>
                <button
                  onClick={() => onNavigate?.(Screen.THERAPY_GOALS)}
                  className="text-[10px] text-zinc-400 hover:text-zinc-600"
                >
                  View all
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-[10px] text-zinc-500">Active</span>
                  <span className="text-xs text-zinc-900">{stats?.activeGoals || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] text-zinc-500">Achieved</span>
                  <span className="text-xs text-emerald-600">{stats?.achievedGoals || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] text-zinc-500">Total</span>
                  <span className="text-xs text-zinc-400">{stats?.totalGoals || 0}</span>
                </div>
              </div>
            </div>

            {/* Sessions Summary */}
            <div className="border border-zinc-200 rounded p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Video size={12} className="text-zinc-400" />
                  <span className="text-xs font-medium text-zinc-700">Sessions</span>
                </div>
                <button
                  onClick={() => onNavigate?.(Screen.VIDEO_LIBRARY)}
                  className="text-[10px] text-zinc-400 hover:text-zinc-600"
                >
                  View all
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-[10px] text-zinc-500">Total</span>
                  <span className="text-xs text-zinc-900">{stats?.totalSessions || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] text-zinc-500">Pending</span>
                  <span className="text-xs text-amber-600">{stats?.pendingSessions || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value, sub, onClick }: { label: string; value: string | number; sub: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`border border-zinc-200 rounded p-3 transition-colors ${onClick ? 'cursor-pointer hover:border-zinc-400 hover:bg-zinc-50' : ''}`}
    >
      <p className="text-lg font-mono font-semibold text-zinc-900">{value}</p>
      <p className="text-[11px] text-zinc-600 mt-0.5">{label}</p>
      <p className="text-[10px] text-zinc-400">{sub}</p>
    </div>
  );
}

// Chart Skeleton Loader
function ChartSkeleton() {
  return (
    <div className="h-full flex items-end justify-between gap-1 px-2">
      {[40, 60, 35, 80, 55, 70, 45].map((h, i) => (
        <div key={i} className="flex-1 bg-zinc-100 rounded-t animate-pulse" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

// Invitation Badge
function InvitationBadge({ inv }: { inv: any }) {
  if (inv.status === InvitationStatus.ACCEPTED) {
    if (inv.caregiverAccountStatus === 'pending_verification' || !inv.isEmailVerified) {
      return <span className="px-1 py-0.5 text-[9px] font-medium bg-orange-50 text-orange-600 border border-orange-200 rounded">Waiting</span>;
    }
    return <span className="px-1 py-0.5 text-[9px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-200 rounded">Active</span>;
  }
  if (inv.status === InvitationStatus.PENDING) {
    return <span className="px-1 py-0.5 text-[9px] font-medium bg-amber-50 text-amber-600 border border-amber-200 rounded">Pending</span>;
  }
  return <span className="px-1 py-0.5 text-[9px] font-medium bg-zinc-100 text-zinc-500 rounded">{inv.status}</span>;
}
