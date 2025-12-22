import React from 'react';
import { Server, Database, Activity, Cpu, HardDrive } from 'lucide-react';

export default function SystemHealthScreen() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">System Health</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <HealthCard title="Server Uptime" value="99.98%" status="healthy" icon={<Server size={20} />} />
        <HealthCard title="Database Latency" value="12ms" status="healthy" icon={<Database size={20} />} />
        <HealthCard title="AI Inference" value="Online" status="healthy" icon={<Cpu size={20} />} />
        <HealthCard title="Storage" value="45% Used" status="warning" icon={<HardDrive size={20} />} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-bold text-slate-900 mb-4">Real-time Metrics</h3>
        <div className="h-64 flex items-center justify-center bg-slate-50 rounded border border-dashed border-slate-300 text-slate-400">
           System Performance Graph Placeholder (Recharts)
        </div>
      </div>
    </div>
  );
}

const HealthCard = ({ title, value, status, icon }: any) => (
  <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2 rounded-lg ${status === 'healthy' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>{icon}</div>
      <div className={`w-3 h-3 rounded-full ${status === 'healthy' ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`}></div>
    </div>
    <div className="text-2xl font-bold text-slate-900">{value}</div>
    <div className="text-sm text-slate-500">{title}</div>
  </div>
);