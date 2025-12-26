
import React from 'react';
import { useAuditLogs } from '../../../api/admin';
import { Shield, Filter, Download } from 'lucide-react';

export default function AuditLogScreen() {
  const { data: logs, isLoading } = useAuditLogs();

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="text-slate-400" /> Security Audit Log
          </h1>
          <p className="text-slate-500 text-sm mt-1">HIPAA Compliance Trail. All system access is logged.</p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex gap-4">
           <div className="flex-1 text-sm text-slate-500 flex items-center">Showing last 24 hours</div>
           <button className="text-slate-600 hover:text-blue-600"><Filter size={18} /></button>
        </div>
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 font-medium text-slate-500">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Resource</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
             {isLoading ? <tr><td colSpan={6} className="p-4 text-center">Loading logs...</td></tr> : logs?.map((log) => (
               <tr key={log.id} className="hover:bg-slate-50 font-mono">
                 <td className="px-4 py-3 text-slate-500">{log.timestamp}</td>
                 <td className="px-4 py-3 font-medium text-slate-900">{log.user}</td>
                 <td className="px-4 py-3 text-slate-500">{log.role}</td>
                 <td className="px-4 py-3 text-blue-600">{log.action}</td>
                 <td className="px-4 py-3 text-slate-500">{log.resource}</td>
                 <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${log.status === 'Success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{log.status}</span></td>
               </tr>
             ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
