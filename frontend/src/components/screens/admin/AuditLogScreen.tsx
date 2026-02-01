import React, { useState } from 'react';
import { useAuditLogs } from '../../../api/admin';
import {
  Shield, Filter, Download, Search, Calendar, RefreshCw,
  Terminal, Eye, User, FileText, Settings, Lock, ChevronLeft, ChevronRight
} from 'lucide-react';

const ACTION_ICONS: Record<string, any> = {
  LOGIN: Eye,
  LOGOUT: Lock,
  CREATE: FileText,
  UPDATE: Settings,
  DELETE: Shield,
  VIEW: Eye,
  DEFAULT: Terminal,
};

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  Success: { color: 'text-green-700', bg: 'bg-green-100 border-green-200' },
  Failed: { color: 'text-red-700', bg: 'bg-red-100 border-red-200' },
  Warning: { color: 'text-amber-700', bg: 'bg-amber-100 border-amber-200' },
};

export default function AuditLogScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateRange, setDateRange] = useState('24h');
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useAuditLogs(page);
  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 50);

  const filteredLogs = logs.filter((log: any) => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    const user = log.userName || log.userId || '';
    if (searchQuery && !user.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleExport = () => {
    const csvContent = [
      ['Timestamp', 'User', 'Role', 'Action', 'Resource', 'Status', 'IP Address'].join(','),
      ...filteredLogs.map((log: any) =>
        [
          new Date(log.createdAt).toLocaleString(),
          log.userName || log.userId,
          'ADMIN',
          log.action,
          log.details,
          'Success',
          log.ipAddress || '-'
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-mono">
      {/* Header */}
      <div className="bg-black text-white px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 border border-white/20">
              <Shield size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight uppercase">AUDIT_LOG</h1>
              <p className="text-xs text-zinc-400 uppercase tracking-wider mt-0.5">
                HIPAA COMPLIANCE SECURITY TRAIL
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 text-white text-xs uppercase tracking-wider hover:bg-white/20 transition-colors"
            >
              <RefreshCw size={14} />
              REFRESH
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black text-xs uppercase tracking-wider hover:bg-zinc-100 transition-colors"
            >
              <Download size={14} />
              EXPORT_CSV
            </button>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Filters */}
        <div className="bg-white border-2 border-zinc-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="SEARCH_USER..."
                className="w-full pl-10 pr-4 py-2.5 border-2 border-zinc-200 bg-zinc-50 text-sm font-mono placeholder-zinc-400 focus:outline-none focus:border-black transition-colors"
              />
            </div>

            {/* Action Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 uppercase">ACTION:</span>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-3 py-2.5 border-2 border-zinc-200 bg-white text-sm font-mono focus:outline-none focus:border-black"
              >
                <option value="all">ALL</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGOUT">LOGOUT</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="VIEW">VIEW</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 uppercase">RANGE:</span>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2.5 border-2 border-zinc-200 bg-white text-sm font-mono focus:outline-none focus:border-black"
              >
                <option value="1h">LAST_HOUR</option>
                <option value="24h">LAST_24H</option>
                <option value="7d">LAST_7_DAYS</option>
                <option value="30d">LAST_30_DAYS</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border-2 border-zinc-200 px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-zinc-500 uppercase">TOTAL_EVENTS</span>
            <span className="font-bold text-lg">{filteredLogs.length}</span>
          </div>
          <div className="bg-white border-2 border-zinc-200 px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-zinc-500 uppercase">SUCCESS</span>
            <span className="font-bold text-lg text-green-600">
              {filteredLogs.length}
            </span>
          </div>
          <div className="bg-white border-2 border-zinc-200 px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-zinc-500 uppercase">FAILED</span>
            <span className="font-bold text-lg text-red-600">
              {filteredLogs.filter((l: any) => l.status === 'Failed').length}
            </span>
          </div>
          <div className="bg-white border-2 border-zinc-200 px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-zinc-500 uppercase">UNIQUE_USERS</span>
            <span className="font-bold text-lg">
              {new Set(filteredLogs.map((l: any) => l.userId)).size}
            </span>
          </div>
        </div>

        {/* Log Table */}
        <div className="bg-white border-2 border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 text-xs text-zinc-600 uppercase tracking-wider border-b-2 border-zinc-200">
              <tr>
                <th className="px-4 py-3 text-left">TIMESTAMP</th>
                <th className="px-4 py-3 text-left">USER</th>
                <th className="px-4 py-3 text-left">ROLE</th>
                <th className="px-4 py-3 text-left">ACTION</th>
                <th className="px-4 py-3 text-left">RESOURCE</th>
                <th className="px-4 py-3 text-left">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                    LOADING_LOGS...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                    NO_LOGS_FOUND
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log: any, index: number) => {
                  const ActionIcon = ACTION_ICONS[log.action] || ACTION_ICONS.DEFAULT;
                  const statusConfig = STATUS_CONFIG[log.status] || STATUS_CONFIG.Success;

                  return (
                    <tr
                      key={log._id || log.id || index}
                      className="border-b border-zinc-100 hover:bg-zinc-50"
                    >
                      <td className="px-4 py-3 text-zinc-500 font-mono text-xs">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-600">
                            {(log.userName || 'A').charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-zinc-900">{log.userName || log.userId}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase border border-zinc-200">
                          {log.role || 'ADMIN'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ActionIcon size={14} className="text-zinc-500" />
                          <span className="text-blue-600 font-medium">{log.action}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 font-mono text-xs">
                        {log.details}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-[10px] font-bold uppercase border ${statusConfig.bg} ${statusConfig.color}`}>
                          {log.status || 'Success'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-4 py-3 bg-zinc-50 border-t-2 border-zinc-200 flex items-center justify-between">
            <div className="text-xs text-zinc-500 uppercase">
              SHOWING {filteredLogs.length} EVENTS
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border-2 border-zinc-200 hover:bg-zinc-100 disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-4 py-2 border-2 border-zinc-200 bg-white text-xs font-bold">
                PAGE {page} OF {totalPages || 1}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages || 1, p + 1))}
                disabled={page >= (totalPages || 1)}
                className="p-2 border-2 border-zinc-200 hover:bg-zinc-100 disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 bg-black text-white px-4 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-6">
            <span className="text-zinc-500">RETENTION:</span>
            <span>90_DAYS</span>
            <span className="text-zinc-500">COMPLIANCE:</span>
            <span className="text-green-400">HIPAA_ENABLED</span>
          </div>
          <div className="flex items-center gap-2">
            <Terminal size={12} className="text-zinc-500" />
            <span className="text-zinc-400">AUDIT_LOGGING_ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
