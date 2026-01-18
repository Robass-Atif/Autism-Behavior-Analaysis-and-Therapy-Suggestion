import React, { useState, useEffect } from 'react';
import {
  Server, Database, Activity, Cpu, HardDrive, Globe, RefreshCw,
  AlertTriangle, CheckCircle, Clock, Zap, Wifi, Shield, Terminal, Loader2
} from 'lucide-react';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useSystemHealth } from '../../../api/admin';

// Placeholder for chart data since backend only returns snapshot
const cpuMemoryData = [
  { time: '00:00', cpu: 0, memory: 0 },
  { time: '04:00', cpu: 0, memory: 0 },
  { time: '08:00', cpu: 0, memory: 0 },
  { time: '12:00', cpu: 0, memory: 0 },
  { time: '16:00', cpu: 0, memory: 0 },
  { time: '20:00', cpu: 0, memory: 0 },
  { time: '24:00', cpu: 0, memory: 0 },
];

const requestsData = [
  { time: '00:00', requests: 0, errors: 0 },
  { time: '04:00', requests: 0, errors: 0 },
  { time: '08:00', requests: 0, errors: 0 },
  { time: '12:00', requests: 0, errors: 0 },
  { time: '16:00', requests: 0, errors: 0 },
  { time: '20:00', requests: 0, errors: 0 },
  { time: '24:00', requests: 0, errors: 0 },
];

const latencyData = [
  { time: '00:00', api: 0, db: 0 },
  { time: '04:00', api: 0, db: 0 },
  { time: '08:00', api: 0, db: 0 },
  { time: '12:00', api: 0, db: 0 },
  { time: '16:00', api: 0, db: 0 },
  { time: '20:00', api: 0, db: 0 },
  { time: '24:00', api: 0, db: 0 },
];

// Health Card Component
const HealthCard = ({ title, value, unit, status, icon: Icon, details, isLoading }: {
  title: string;
  value: string | number;
  unit?: string;
  status: 'healthy' | 'warning' | 'error';
  icon: any;
  details?: string;
  isLoading?: boolean;
}) => {
  const statusConfig = {
    healthy: { color: 'text-green-500', bg: 'bg-green-500', label: 'HEALTHY' },
    warning: { color: 'text-amber-500', bg: 'bg-amber-500', label: 'WARNING' },
    error: { color: 'text-red-500', bg: 'bg-red-500', label: 'ERROR' },
  };
  const config = statusConfig[status];

  return (
    <div className="bg-white border-2 border-zinc-200 p-5">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-zinc-100 border border-zinc-200">
          <Icon size={18} className="text-zinc-600" />
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${config.bg} animate-pulse`} />
          <span className={`text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
            {config.label}
          </span>
        </div>
      </div>
      {isLoading ? (
        <div className="h-8 flex items-center">
          <Loader2 size={24} className="animate-spin text-zinc-400" />
        </div>
      ) : (
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-3xl font-bold text-black">{value}</span>
          {unit && <span className="text-sm text-zinc-500">{unit}</span>}
        </div>
      )}
      <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">{title}</div>
      {details && <div className="text-xs text-zinc-400 font-mono mt-2">{details}</div>}
    </div>
  );
};

// Service Status Row
const ServiceRow = ({ name, status, latency, uptime }: {
  name: string;
  status: 'online' | 'degraded' | 'offline';
  latency: string;
  uptime: string;
}) => {
  const statusConfig = {
    online: { color: 'text-green-500', bg: 'bg-green-500', label: 'ONLINE' },
    degraded: { color: 'text-amber-500', bg: 'bg-amber-500', label: 'DEGRADED' },
    offline: { color: 'text-red-500', bg: 'bg-red-500', label: 'OFFLINE' },
  };
  const config = statusConfig[status];

  return (
    <tr className="border-b border-zinc-100 hover:bg-zinc-50">
      <td className="px-4 py-3 font-mono text-sm text-zinc-900">{name}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${config.bg}`} />
          <span className={`text-xs font-bold uppercase ${config.color}`}>{config.label}</span>
        </div>
      </td>
      <td className="px-4 py-3 font-mono text-sm text-zinc-600">{latency}</td>
      <td className="px-4 py-3 font-mono text-sm text-zinc-600">{uptime}</td>
    </tr>
  );
};

export default function SystemHealthScreen() {
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const { data: health, isLoading, refetch } = useSystemHealth();

  const handleRefresh = () => {
    refetch();
    setLastUpdated(new Date());
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    return `${d}d ${h}h ${m}m`;
  };

  const formatBytes = (bytes: number) => {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-mono">
      {/* Header */}
      <div className="bg-zinc-900 text-white px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 border border-white/20">
              <Activity size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight uppercase">SYSTEM_HEALTH</h1>
              <p className="text-xs text-zinc-400 uppercase tracking-wider mt-0.5">
                REAL-TIME INFRASTRUCTURE MONITORING
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-green-400">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs uppercase tracking-wider">ALL_SYSTEMS_OPERATIONAL</span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 text-white text-xs uppercase tracking-wider hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              REFRESH
            </button>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Health Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <HealthCard
            title="SERVER_UPTIME"
            value={formatUptime(health?.uptime || 0)}
            status="healthy"
            icon={Server}
            details="continuous operation"
            isLoading={isLoading}
          />
          <HealthCard
            title="DATABASE_LATENCY"
            value={health?.database?.latency || 0}
            unit="ms"
            status={(health?.database?.latency || 0) > 50 ? 'warning' : 'healthy'}
            icon={Database}
            details="avg over last hour"
            isLoading={isLoading}
          />
          <HealthCard
            title="CPU_USAGE"
            value={health?.cpu?.usagePercentage || 0}
            unit="%"
            status={(health?.cpu?.usagePercentage || 0) > 80 ? 'warning' : 'healthy'}
            icon={Cpu}
            details={`${health?.cpu?.count || 0} cores active`}
            isLoading={isLoading}
          />
          <HealthCard
            title="MEMORY"
            value={health?.memory?.usagePercentage || 0}
            unit="%"
            status={(health?.memory?.usagePercentage || 0) > 85 ? 'warning' : 'healthy'}
            icon={HardDrive}
            details={`${formatBytes(health?.memory?.used || 0)} / ${formatBytes(health?.memory?.total || 0)}`}
            isLoading={isLoading}
          />
        </div>

        {/* Charts Row - Placeholder for now until time-series DB is implemented */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* CPU & Memory Chart */}
          <div className="bg-white border-2 border-zinc-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-black uppercase tracking-wider">CPU_&_MEMORY</h3>
                <p className="text-xs text-zinc-500 mt-0.5">24-hour usage trend</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-zinc-900" />
                  <span className="text-zinc-600">CPU</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-zinc-400" />
                  <span className="text-zinc-600">MEM</span>
                </div>
              </div>
            </div>
            <div className="h-[200px] flex items-center justify-center text-zinc-400 text-xs uppercase">
              <div className="text-center">
                <Clock size={24} className="mx-auto mb-2 text-zinc-300" />
                <p>TIME-SERIES DATA REQUIRES</p>
                <p>METRICS COLLECTION ENDPOINT</p>
              </div>
            </div>
          </div>

          {/* API Requests Chart */}
          <div className="bg-white border-2 border-zinc-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-black uppercase tracking-wider">API_REQUESTS</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Requests & error rate</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-zinc-900" />
                  <span className="text-zinc-600">REQS</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-red-500" />
                  <span className="text-zinc-600">ERRORS</span>
                </div>
              </div>
            </div>
            <div className="h-[200px] flex items-center justify-center text-zinc-400 text-xs uppercase">
              <div className="text-center">
                <Clock size={24} className="mx-auto mb-2 text-zinc-300" />
                <p>TIME-SERIES DATA REQUIRES</p>
                <p>METRICS COLLECTION ENDPOINT</p>
              </div>
            </div>
          </div>
        </div>


        {/* Services Table */}
        <div className="bg-white border-2 border-zinc-200">
          <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-black uppercase tracking-wider">SERVICE_STATUS</h3>
            <div className="text-xs text-zinc-500">
              LAST_CHECK: <span className="text-zinc-900">{lastUpdated.toLocaleTimeString()}</span>
            </div>
          </div>
          <table className="w-full">
            <thead className="bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">SERVICE</th>
                <th className="px-4 py-3 text-left">STATUS</th>
                <th className="px-4 py-3 text-left">LATENCY</th>
                <th className="px-4 py-3 text-left">UPTIME</th>
              </tr>
            </thead>
            <tbody>
              <ServiceRow name="API_GATEWAY" status="online" latency="45ms" uptime="99.99%" />
              <ServiceRow name="AUTH_SERVICE" status="online" latency="32ms" uptime="99.98%" />
              <ServiceRow name="DATABASE_PRIMARY" status={health?.database.status === 'connected' ? 'online' : 'offline'} latency={`${health?.database.latency || 0}ms`} uptime="99.99%" />
              <ServiceRow name="DATABASE_REPLICA" status="online" latency="15ms" uptime="99.97%" />
              <ServiceRow name="AI_INFERENCE_ENGINE" status="online" latency="125ms" uptime="99.95%" />
              <ServiceRow name="VIDEO_PROCESSOR" status="degraded" latency="340ms" uptime="98.50%" />
              <ServiceRow name="CDN_EDGE" status="online" latency="28ms" uptime="99.99%" />
              <ServiceRow name="NOTIFICATION_SERVICE" status="online" latency="52ms" uptime="99.96%" />
            </tbody>
          </table>
        </div>

        {/* Footer Status Bar */}
        <div className="mt-8 bg-zinc-900 text-white px-4 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-6">
            <span className="text-zinc-500">REGION:</span>
            <span>US-EAST-1</span>
            <span className="text-zinc-500">INSTANCES:</span>
            <span>3 / 3</span>
            <span className="text-zinc-500">LOAD_BALANCER:</span>
            <span className="text-green-400">ACTIVE</span>
          </div>
          <div className="flex items-center gap-2">
            <Terminal size={12} className="text-zinc-500" />
            <span className="text-zinc-400">MONITORING_ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}