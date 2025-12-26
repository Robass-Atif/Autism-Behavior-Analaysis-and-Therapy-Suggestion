
import React from 'react';
import { useDashboardStats } from '../../../api/clinical';
import { useRecentPatients } from '../../../api/patient';
import { 
  Users, Clock, FileText, Activity, TrendingUp, Search, MoreHorizontal, Plus, Loader2 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

const chartData = [
  { name: 'Mon', patients: 12 },
  { name: 'Tue', patients: 19 },
  { name: 'Wed', patients: 15 },
  { name: 'Thu', patients: 22 },
  { name: 'Fri', patients: 18 },
  { name: 'Sat', patients: 8 },
  { name: 'Sun', patients: 5 },
];

export default function TherapistDashboard() {
  // Data Fetching with new Hooks
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentPatients, isLoading: patientsLoading } = useRecentPatients();

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Overview</h1>
          <p className="text-slate-500 text-sm mt-1">
            Welcome back, Dr. Sarah. 
            {statsLoading ? (
              <span className="inline-block w-24 h-4 ml-2 bg-slate-200 rounded animate-pulse"></span>
            ) : (
              <span> You have <span className="font-medium text-slate-900">{stats?.pendingReviews} pending reviews</span>.</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search patients..." 
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-64 shadow-sm"
            />
          </div>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm active:transform active:scale-95">
            <Plus size={16} /> New Patient
          </button>
        </div>
      </div>

      {/* Stats Cards with Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Patients" 
          value={stats?.totalPatients} 
          trend="+4%" 
          trendUp={true} 
          icon={<Users size={20} />} 
          loading={statsLoading}
        />
        <StatCard 
          title="Pending Reviews" 
          value={stats?.pendingReviews} 
          trend="-2" 
          trendUp={false} 
          icon={<Clock size={20} />} 
          alert={true}
          loading={statsLoading}
        />
        <StatCard 
          title="Reports Generated" 
          value={stats?.reportsGenerated} 
          trend="+3" 
          trendUp={true} 
          icon={<FileText size={20} />} 
          loading={statsLoading}
        />
        <StatCard 
          title="Avg. Progress" 
          value={stats?.avgProgress ? `${stats.avgProgress}%` : ''} 
          trend="+1.2%" 
          trendUp={true} 
          icon={<Activity size={20} />} 
          loading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Patient Activity</h3>
              <p className="text-xs text-slate-500">Weekly engagement metrics</p>
            </div>
            <select className="text-sm border-none bg-slate-50 rounded-md px-2 py-1 text-slate-600 focus:ring-0 cursor-pointer hover:bg-slate-100 transition-colors">
              <option>This Week</option>
              <option>Last Week</option>
            </select>
          </div>

          <div className="h-72 w-full">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#fff', 
                      border: '1px solid #E2E8F0', 
                      borderRadius: '8px', 
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    cursor={{stroke: '#3B82F6', strokeWidth: 1}}
                  />
                  <Area type="monotone" dataKey="patients" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorPatients)" />
                </AreaChart>
              </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Patients List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900">Recent Patients</h3>
            <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal size={16} /></button>
          </div>
          
          <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
            {patientsLoading ? (
               [1, 2, 3].map(i => <PatientSkeleton key={i} />)
            ) : (
               recentPatients?.map(patient => (
                 <div key={patient.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer group">
                   <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 group-hover:bg-white group-hover:shadow-sm">
                     {patient.fullName.charAt(0)}
                   </div>
                   <div className="flex-1 min-w-0">
                     <h4 className="text-sm font-medium text-slate-900 truncate">{patient.fullName}</h4>
                     <p className="text-xs text-slate-500 truncate">{patient.status} • {patient.asdSeverity}</p>
                   </div>
                   <div className={`w-2 h-2 rounded-full ${patient.progressScore > 70 ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                 </div>
               ))
            )}
          </div>
          
          <button className="mt-4 w-full py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-colors">
            View All Patients
          </button>
        </div>
      </div>
    </div>
  );
}

const StatCard = ({ title, value, trend, trendUp, icon, alert, loading }: any) => (
  <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between h-32 relative overflow-hidden">
    {loading ? (
      <div className="animate-pulse space-y-4">
        <div className="flex justify-between">
           <div className="h-4 bg-slate-100 rounded w-24"></div>
           <div className="h-8 w-8 bg-slate-100 rounded"></div>
        </div>
        <div className="h-8 bg-slate-100 rounded w-16 mt-4"></div>
      </div>
    ) : (
      <>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-slate-500">{title}</span>
          <div className={`p-2 rounded-md ${alert ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500'}`}>
            {icon}
          </div>
        </div>
        <div className="flex items-end justify-between">
          <span className="text-2xl font-bold text-slate-900 tracking-tight">{value}</span>
          <div className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded ${
            trendUp ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
          }`}>
            {trendUp ? <TrendingUp size={12} className="mr-1" /> : <TrendingUp size={12} className="mr-1 transform rotate-180" />}
            {trend}
          </div>
        </div>
      </>
    )}
  </div>
);

const PatientSkeleton = () => (
  <div className="flex items-center gap-3 p-2">
    <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse"></div>
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-slate-100 rounded w-32 animate-pulse"></div>
      <div className="h-3 bg-slate-100 rounded w-20 animate-pulse"></div>
    </div>
  </div>
);
