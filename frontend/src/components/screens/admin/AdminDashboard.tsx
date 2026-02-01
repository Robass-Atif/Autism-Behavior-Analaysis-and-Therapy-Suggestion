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
import { useAdminDashboardStats, useAuditLogs, useUserGrowthStats, useSystemHealth } from '../../../api/admin';
import { useNavigate } from '@tanstack/react-router';

// Stat Card Component
const StatCard = ({ label, value, subValue, icon: Icon, trend, isLoading }: {
  label: string;
  value: string | number;
  subValue?: string;
  icon: any;
  trend?: { value: number; positive: boolean };
  isLoading?: boolean;
}) => (
  <div className="bg-white p-6 border-2 border-zinc-200">
    <div className="flex justify-between items-start mb-4">
      <div className="bg-zinc-100 p-2 border border-zinc-200">
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
      <div className="flex items-center h-8">
        <Loader2 size={20} className="text-zinc-400 animate-spin" />
      </div>
    ) : (
      <div className="font-mono font-bold text-black text-3xl tracking-tight">{value}</div>
    )}
    <div className="mt-1 text-zinc-500 text-xs uppercase tracking-wider">{label}</div>
    {subValue && <div className="mt-2 font-mono text-zinc-400 text-xs">{subValue}</div>}
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
    <div className="flex justify-between items-center py-3 border-zinc-100 last:border-0 border-b">
      <div className="flex items-center gap-3">
        <div className="bg-zinc-100 p-1.5">
          <Icon size={14} className="text-zinc-600" />
        </div>
        <span className="font-mono text-zinc-700 text-sm uppercase">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono font-medium text-zinc-900 text-sm">{value}</span>
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
    <div className="flex items-start gap-3 py-3 border-zinc-100 last:border-0 border-b">
      <div className="bg-zinc-900 mt-0.5 p-1.5">
        <Icon size={12} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-zinc-900 text-sm truncate">{action}</div>
        <div className="font-mono text-zinc-500 text-xs">{user}</div>
      </div>
      <div className="font-mono text-zinc-400 text-xs whitespace-nowrap">{time}</div>
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
  const navigate = useNavigate();

  // Fetch real dashboard stats from API
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useAdminDashboardStats();

  // Fetch recent audit logs for activity feed
  const { data: auditData, isLoading: auditLoading, refetch: refetchAudit } = useAuditLogs(1, 5);

  // Fetch user growth stats for Area Chart
  const { data: growthData, isLoading: growthLoading, refetch: refetchGrowth } = useUserGrowthStats();

  // Fetch real system health data
  const { data: healthData, isLoading: healthLoading, refetch: refetchHealth } = useSystemHealth();

  const isRefreshing = statsLoading || auditLoading || growthLoading || healthLoading;

  const handleRefresh = () => {
    refetchStats();
    refetchAudit();
    refetchGrowth();
    refetchHealth();
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
    <div className="bg-zinc-50 min-h-screen font-mono">
      {/* Header */}
      <div className="bg-zinc-900 px-8 py-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 border border-white/20">
                <Shield size={20} />
              </div>
              <div>
                <h1 className="font-bold text-xl uppercase tracking-tight">Dashboard</h1>
                <p className="mt-0.5 text-zinc-400 text-xs uppercase tracking-wider">
                  NeuroCare System Control Center
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-zinc-400 text-xs">
              <span className="text-zinc-500">LAST UPDATE:</span>{' '}
              <span className="font-medium text-white">
                {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 px-4 py-2 border border-white/20 text-white text-xs uppercase tracking-wider transition-colors"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Stats Grid - Using real API data */}
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-8">
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

        <div className="gap-6 grid grid-cols-1 lg:grid-cols-3 mb-8">
          {/* User Distribution Chart (Bar) */}
          <div className="lg:col-span-2 bg-white p-6 border-2 border-zinc-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-black text-sm uppercase tracking-wider">User Distribution</h3>
                <p className="mt-0.5 text-zinc-500 text-xs">Current breakdown by role</p>
              </div>
            </div>
            {statsLoading ? (
              <div className="flex justify-center items-center h-[240px]">
                <Loader2 size={24} className="text-zinc-400 animate-spin" />
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

          {/* System Status - Integrated with API */}
          <div className="bg-white p-6 border-2 border-zinc-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-black text-sm uppercase tracking-wider">System Status</h3>
              <div className={`flex items-center gap-1.5 font-medium text-xs ${healthData?.database.status === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                <div className={`${healthData?.database.status === 'connected' ? 'bg-green-500' : 'bg-red-500'} rounded-full w-2 h-2 animate-pulse`} />
                {healthData?.database.status === 'connected' ? 'All Operational' : 'Issues Detected'}
              </div>
            </div>
            {healthLoading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 size={24} className="text-zinc-400 animate-spin" />
              </div>
            ) : (
              <div className="space-y-1">
                <SystemStatusItem
                  label="API Server"
                  status="healthy"
                  value="Online"
                  icon={Server}
                />
                <SystemStatusItem
                  label="Database"
                  status={healthData?.database.status === 'connected' ? 'healthy' : 'error'}
                  value={`${healthData?.database.latency || 0}ms`}
                  icon={Database}
                />
                <SystemStatusItem
                  label="Memory"
                  status={healthData && healthData.memory.usagePercentage > 85 ? 'warning' : 'healthy'}
                  value={`${healthData?.memory.usagePercentage || 0}%`}
                  icon={Cpu}
                />
                <SystemStatusItem
                  label="CPU Load"
                  status={healthData && healthData.cpu.usagePercentage > 70 ? 'warning' : 'healthy'}
                  value={`${healthData?.cpu.usagePercentage || 0}%`}
                  icon={HardDrive}
                />
                <SystemStatusItem
                  label="Uptime"
                  status="healthy"
                  value={`${Math.floor((healthData?.uptime || 0) / 3600)}h ${Math.floor(((healthData?.uptime || 0) % 3600) / 60)}m`}
                  icon={Clock}
                />
              </div>
            )}
          </div>
        </div>

        <div className="gap-6 grid grid-cols-1 lg:grid-cols-3">
          {/* User Growth Chart (Area) - NEW */}
          <div className="lg:col-span-2 bg-white p-6 border-2 border-zinc-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-black text-sm uppercase tracking-wider">User Growth</h3>
                <p className="mt-0.5 text-zinc-500 text-xs">New users over the last 6 months</p>
              </div>
            </div>
            {growthLoading ? (
              <div className="flex justify-center items-center h-[240px]">
                <Loader2 size={24} className="text-zinc-400 animate-spin" />
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
          <div className="bg-white p-6 border-2 border-zinc-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-black text-sm uppercase tracking-wider">Recent Activity</h3>
              <button className="flex items-center gap-1 text-zinc-500 hover:text-black text-xs uppercase tracking-wider"
                onClick={() => navigate({ to: '/admin/audit' })}>
                View All <ChevronRight size={12} />
              </button>
            </div>
            <div className="space-y-1">
              {auditLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={20} className="text-zinc-400 animate-spin" />
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
                <div className="py-8 text-zinc-400 text-xs text-center uppercase">
                  No recent activity
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="bg-white mt-6 p-6 border-2 border-zinc-200">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-black text-sm uppercase tracking-wider">Platform Overview</h3>
              <p className="mt-0.5 text-zinc-500 text-xs">Total counts from database</p>
            </div>
          </div>
          <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
            <div className="bg-zinc-50 p-4 border border-zinc-200">
              <div className="font-mono font-bold text-2xl">{stats?.totalApplications || 0}</div>
              <div className="mt-1 text-zinc-500 text-xs uppercase">Total Applications</div>
            </div>
            <div className="bg-amber-50 p-4 border border-amber-200">
              <div className="font-mono font-bold text-amber-700 text-2xl">{stats?.pendingApplications || 0}</div>
              <div className="mt-1 text-amber-600 text-xs uppercase">Pending Review</div>
            </div>
            <div className="bg-green-50 p-4 border border-green-200">
              <div className="font-mono font-bold text-green-700 text-2xl">{stats?.activeTherapists || 0}</div>
              <div className="mt-1 text-green-600 text-xs uppercase">Active Therapists</div>
            </div>
            <div className="bg-red-50 p-4 border border-red-200">
              <div className="font-mono font-bold text-red-700 text-2xl">{stats?.rejectedApplications || 0}</div>
              <div className="mt-1 text-red-600 text-xs uppercase">Rejected</div>
            </div>
          </div>
        </div>

        {/* Footer Status Bar */}
        <div className="flex justify-between items-center bg-zinc-900 mt-8 px-4 py-3 text-white text-xs">
          <div className="flex items-center gap-6">
            <span className="text-zinc-500">ENV:</span>
            <span className="text-green-400">PRODUCTION</span>
            <span className="text-zinc-500">VERSION:</span>
            <span>v2.4.1</span>
            <span className="text-zinc-500">UPTIME:</span>
            <span>CONNECTED</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-green-500 rounded-full w-2 h-2 animate-pulse" />
            <span className="text-zinc-400">ALL SYSTEMS OPERATIONAL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
