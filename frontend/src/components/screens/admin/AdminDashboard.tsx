import React, { useState } from 'react';
import {
  Shield, Activity, Server, Database, Users, RefreshCw,
  Cpu, HardDrive, Globe, Terminal, Clock, ChevronRight, TrendingUp,
  UserPlus, FileCheck, Eye, Loader2
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useAdminDashboardStats, useAuditLogs, useUserGrowthStats } from '../../../api/admin';

// Stat Card Component
const StatCard = ({ label, value, subValue, icon: Icon, trend, isLoading }: {
  label: string;
  value: string | number;
  subValue?: string;
  icon: any;
  trend?: { value: number; positive: boolean };
  isLoading?: boolean;
}) => (
  <div className="bg-white border-2 border-zinc-200 p-6">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-zinc-100 border border-zinc-200">
        <Icon size={20} className="text-zinc-600" />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-mono ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
          <TrendingUp size={12} className={!trend.positive ? 'rotate-180' : ''} />
          {trend.value}%
        </div>
      )}
    </div>
    {isLoading ? (
      <div className="h-8 flex items-center">
        <Loader2 size={20} className="animate-spin text-zinc-400" />
      </div>
    ) : (
      <div className="font-mono text-3xl font-bold text-black tracking-tight">{value}</div>
    )}
    <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">{label}</div>
    {subValue && <div className="text-xs text-zinc-400 font-mono mt-2">{subValue}</div>}
  </div>
);

// System Status Item
const SystemStatusItem = ({ label, status, value, icon: Icon }: {
  label: string;
  status: 'healthy' | 'warning' | 'error';
  value: string;
  icon: any;
}) => {
  const statusColors = {
    healthy: 'bg-green-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className="p-1.5 bg-zinc-100">
          <Icon size={14} className="text-zinc-600" />
        </div>
        <span className="text-sm font-mono text-zinc-700 uppercase">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-mono text-zinc-900 font-medium">{value}</span>
        <div className={`w-2 h-2 rounded-full ${statusColors[status]} animate-pulse`} />
      </div>
    </div>
  );
};

// Recent Activity Item
const ActivityItem = ({ action, user, time, type }: {
  action: string;
  user: string;
  time: string;
  type: 'login' | 'registration' | 'approval' | 'system';
}) => {
  const typeIcons = {
    login: Eye,
    registration: UserPlus,
    approval: FileCheck,
    system: Terminal,
  };
  const Icon = typeIcons[type];

  return (
    <div className="flex items-start gap-3 py-3 border-b border-zinc-100 last:border-0">
      <div className="p-1.5 bg-zinc-900 mt-0.5">
        <Icon size={12} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-zinc-900 font-medium truncate">{action}</div>
        <div className="text-xs text-zinc-500 font-mono">{user}</div>
      </div>
      <div className="text-xs text-zinc-400 font-mono whitespace-nowrap">{time}</div>
    </div>
  );
};

// Helper to format time ago
const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

// Map audit action to activity type
const mapActionToType = (action: string): 'login' | 'registration' | 'approval' | 'system' => {
  if (action.toLowerCase().includes('login')) return 'login';
  if (action.toLowerCase().includes('register') || action.toLowerCase().includes('created') || action.toLowerCase().includes('new')) return 'registration';
  if (action.toLowerCase().includes('approv') || action.toLowerCase().includes('reject')) return 'approval';
  return 'system';
};

export default function AdminDashboard() {
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Fetch real dashboard stats from API
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useAdminDashboardStats();

  // Fetch recent audit logs for activity feed
  const { data: auditData, isLoading: auditLoading, refetch: refetchAudit } = useAuditLogs(1, 5);

  // Fetch user growth stats for Area Chart
  const { data: growthData, isLoading: growthLoading, refetch: refetchGrowth } = useUserGrowthStats();

  const isRefreshing = statsLoading || auditLoading || growthLoading;

  const handleRefresh = () => {
    refetchStats();
    refetchAudit();
    refetchGrowth();
    setLastUpdated(new Date());
  };

  // Build registration chart data from stats (User Distribution)
  const registrationData = [
    { role: 'Therapists', count: stats?.totalTherapists || 0 },
    { role: 'Caregivers', count: stats?.totalCaregivers || 0 },
    { role: 'Patients', count: stats?.totalPatients || 0 },
    { role: 'Admins', count: (stats?.totalUsers || 0) - (stats?.totalTherapists || 0) - (stats?.totalCaregivers || 0) - (stats?.totalPatients || 0) }, // Approximate
  ].filter(d => d.count > 0);

  return (
    <div className="min-h-screen bg-zinc-50 font-mono">
      {/* Header */}
      <div className="bg-zinc-900 text-white px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 border border-white/20">
                <Shield size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight uppercase">Dashboard</h1>
                <p className="text-xs text-zinc-400 uppercase tracking-wider mt-0.5">
                  NeuroCare System Control Center
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-zinc-400">
              <span className="text-zinc-500">LAST UPDATE:</span>{' '}
              <span className="text-white font-medium">
                {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 text-white text-xs uppercase tracking-wider hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Stats Grid - Using real API data */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Users"
            value={stats?.totalUsers?.toLocaleString() || '0'}
            subValue={`${stats?.activeTherapists || 0} active therapists`}
            icon={Users}
            isLoading={statsLoading}
          />
          <StatCard
            label="Active Therapists"
            value={stats?.activeTherapists || 0}
            subValue={`${stats?.pendingApplications || 0} pending approval`}
            icon={Shield}
            isLoading={statsLoading}
          />
          <StatCard
            label="Total Caregivers"
            value={stats?.totalCaregivers || 0}
            subValue={`${stats?.activeCaregivers || 0} active`}
            icon={Activity}
            isLoading={statsLoading}
          />
          <StatCard
            label="Total Patients"
            value={stats?.totalPatients || 0}
            subValue="Managed Records"
            icon={Users}
            isLoading={statsLoading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* User Distribution Chart (Bar) */}
          <div className="lg:col-span-2 bg-white border-2 border-zinc-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-black uppercase tracking-wider">User Distribution</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Current breakdown by role</p>
              </div>
            </div>
            {statsLoading ? (
              <div className="h-[240px] flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-zinc-400" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={registrationData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                  <XAxis dataKey="role" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={{ stroke: '#e4e4e7' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#71717a' }} axisLine={{ stroke: '#e4e4e7' }} />
                  <Tooltip
                    contentStyle={{
                      background: '#18181b',
                      border: 'none',
                      borderRadius: 0,
                      fontSize: 11,
                      fontFamily: 'monospace',
                    }}
                    labelStyle={{ color: '#a1a1aa' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="count" fill="#18181b" radius={0} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* System Status */}
          <div className="bg-white border-2 border-zinc-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-black uppercase tracking-wider">System Status</h3>
              <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                All Operational
              </div>
            </div>
            <div className="space-y-1">
              <SystemStatusItem label="API Server" status="healthy" value="99.98%" icon={Server} />
              <SystemStatusItem label="Database" status="healthy" value="12ms" icon={Database} />
              <SystemStatusItem label="AI Engine" status="healthy" value="Online" icon={Cpu} />
              <SystemStatusItem label="Storage" status="warning" value="72%" icon={HardDrive} />
              <SystemStatusItem label="CDN" status="healthy" value="45ms" icon={Globe} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Growth Chart (Area) - NEW */}
          <div className="lg:col-span-2 bg-white border-2 border-zinc-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-black uppercase tracking-wider">User Growth</h3>
                <p className="text-xs text-zinc-500 mt-0.5">New users over the last 6 months</p>
              </div>
            </div>
            {growthLoading ? (
              <div className="h-[240px] flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-zinc-400" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#18181b" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={{ stroke: '#e4e4e7' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#71717a' }} axisLine={{ stroke: '#e4e4e7' }} />
                  <Tooltip
                    contentStyle={{
                      background: '#18181b',
                      border: 'none',
                      borderRadius: 0,
                      fontSize: 11,
                      fontFamily: 'monospace',
                    }}
                    labelStyle={{ color: '#a1a1aa' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="users" stroke="#18181b" fillOpacity={1} fill="url(#colorUsers)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white border-2 border-zinc-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-black uppercase tracking-wider">Recent Activity</h3>
              <button className="text-xs text-zinc-500 hover:text-black uppercase tracking-wider flex items-center gap-1">
                View All <ChevronRight size={12} />
              </button>
            </div>
            <div className="space-y-1">
              {auditLoading ? (
                <div className="py-8 flex justify-center">
                  <Loader2 size={20} className="animate-spin text-zinc-400" />
                </div>
              ) : auditData?.logs && auditData.logs.length > 0 ? (
                auditData.logs.slice(0, 5).map((log) => (
                  <ActivityItem
                    key={log.id}
                    action={log.action}
                    user={log.userName || log.userId}
                    time={formatTimeAgo(log.createdAt)}
                    type={mapActionToType(log.action)}
                  />
                ))
              ) : (
                <div className="py-8 text-center text-xs text-zinc-400 uppercase">
                  No recent activity
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 bg-white border-2 border-zinc-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-black uppercase tracking-wider">Platform Overview</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Total counts from database</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-zinc-50 border border-zinc-200">
              <div className="text-2xl font-bold font-mono">{stats?.totalApplications || 0}</div>
              <div className="text-xs text-zinc-500 uppercase mt-1">Total Applications</div>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200">
              <div className="text-2xl font-bold font-mono text-amber-700">{stats?.pendingApplications || 0}</div>
              <div className="text-xs text-amber-600 uppercase mt-1">Pending Review</div>
            </div>
            <div className="p-4 bg-green-50 border border-green-200">
              <div className="text-2xl font-bold font-mono text-green-700">{stats?.activeTherapists || 0}</div>
              <div className="text-xs text-green-600 uppercase mt-1">Active Therapists</div>
            </div>
            <div className="p-4 bg-red-50 border border-red-200">
              <div className="text-2xl font-bold font-mono text-red-700">{stats?.rejectedApplications || 0}</div>
              <div className="text-xs text-red-600 uppercase mt-1">Rejected</div>
            </div>
          </div>
        </div>

        {/* Footer Status Bar */}
        <div className="mt-8 bg-zinc-900 text-white px-4 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-6">
            <span className="text-zinc-500">ENV:</span>
            <span className="text-green-400">PRODUCTION</span>
            <span className="text-zinc-500">VERSION:</span>
            <span>v2.4.1</span>
            <span className="text-zinc-500">UPTIME:</span>
            <span>CONNECTED</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-zinc-400">ALL SYSTEMS OPERATIONAL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
