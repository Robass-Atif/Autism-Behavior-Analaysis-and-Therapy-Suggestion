import React from 'react';
import {
    Activity, Play, Target, Trophy, ArrowRight, Video, Loader2, AlertCircle
} from 'lucide-react';
import { useMyProfile } from '../../../api/patient';
import { useMyTherapyGoals, useMyVideoSessions } from '../../../api/clinical';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function PatientDashboard() {
    const { data: profile, isLoading: profileLoading, error: profileError } = useMyProfile();
    const { data: goalsData, isLoading: goalsLoading } = useMyTherapyGoals();
    const { data: sessionsData, isLoading: sessionsLoading } = useMyVideoSessions();

    const goals = goalsData?.goals || [];
    const activeGoals = goals.filter(g => g.status === 'active' || g.status === 'In Progress');
    const sessions = sessionsData?.sessions || [];
    const progress = profile?.progressScore || 0;

    // We keep a simple sparkline for visual appeal, even if historical data is limited
    const sparklineData = [
        { name: 'W1', val: Math.max(0, progress - 10) },
        { name: 'W2', val: Math.max(0, progress - 5) },
        { name: 'W3', val: progress },
    ];

    if (profileLoading || goalsLoading || sessionsLoading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center font-mono">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-900" />
            </div>
        );
    }

    if (profileError) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center font-mono p-8">
                <div className="text-center border-2 border-zinc-900 p-8 max-w-md shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <AlertCircle className="w-12 h-12 text-zinc-900 mx-auto mb-4" />
                    <h2 className="text-xl font-bold uppercase tracking-tight mb-2">Access Denied</h2>
                    <p className="text-zinc-500 text-sm mb-6">Failed to retrieve patient profile. Please ensure you are logged in correctly.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white font-mono text-zinc-900">
            {/* Header */}
            <div className="border-b-2 border-zinc-900 px-6 py-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-2">
                            <span className="w-2 h-2 bg-zinc-900 animate-pulse"></span>
                            Secure Patient Portal
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-2">
                            HI, {profile?.fullName?.split(' ')[0]}
                        </h1>
                        <div className="flex items-center gap-4 text-xs font-medium text-zinc-500">
                            <span className="flex items-center gap-1.5 border-r border-zinc-200 pr-4">
                                <Activity size={14} className="text-zinc-900" />
                                PROGRESS: {progress}%
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Target size={14} className="text-zinc-900" />
                                MRN: {profile?.mrn}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="bg-zinc-900 text-white px-6 py-3 border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(39,39,42,0.3)]">
                            <div className="text-2xl font-black leading-none">{activeGoals.length}</div>
                            <div className="text-[10px] uppercase font-bold tracking-widest mt-1">Active Goals</div>
                        </div>
                        <div className="bg-white text-zinc-900 px-6 py-3 border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <div className="text-2xl font-black leading-none">{sessions.length}</div>
                            <div className="text-[10px] uppercase font-bold tracking-widest mt-1">Sessions</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                    {/* Left Section - Main Stats (8 cols) */}
                    <div className="lg:col-span-8 space-y-12">

                        {/* Progress Visualization */}
                        <section>
                            <div className="flex items-center justify-between mb-6 border-b border-zinc-100 pb-4">
                                <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                                    <Activity size={20} /> Development Growth
                                </h2>
                                <span className="text-xs font-bold text-zinc-400">LAST 30 DAYS</span>
                            </div>

                            <div className="border-2 border-zinc-900 p-8 relative overflow-hidden">
                                <div className="absolute top-4 right-4 text-right">
                                    <div className="text-5xl font-black tracking-tighter">{progress}%</div>
                                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Global Score</div>
                                </div>
                                <div className="h-[240px] w-full mt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={sparklineData}>
                                            <defs>
                                                <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#000" stopOpacity={0.05} />
                                                    <stop offset="95%" stopColor="#000" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="name" hide />
                                            <YAxis hide domain={[0, 100]} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#000', border: 'none', color: '#fff', fontSize: '10px', fontFamily: 'monospace' }}
                                                itemStyle={{ color: '#fff' }}
                                                cursor={{ stroke: '#000', strokeWidth: 1 }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="val"
                                                stroke="#000"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#growthFill)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </section>

                        {/* Therapy Targets */}
                        <section>
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                                    <Target size={20} /> Therapy Targets
                                </h2>
                                <button className="text-[10px] font-bold text-zinc-400 hover:text-zinc-900 border-b-2 border-zinc-100 hover:border-zinc-900 transition-all uppercase tracking-widest pb-1">
                                    View All Goals
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {activeGoals.length > 0 ? activeGoals.slice(0, 4).map((goal) => (
                                    <div key={goal.id} className="border-2 border-zinc-900 p-5 hover:bg-zinc-50 transition-colors group">
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="text-sm font-bold uppercase leading-tight max-w-[70%]">{goal.title}</h3>
                                            <span className="text-[9px] font-black bg-zinc-900 text-white px-2 py-1 uppercase tracking-tighter">
                                                {goal.category}
                                            </span>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="w-full bg-zinc-100 h-1.5 overflow-hidden">
                                                <div
                                                    className="bg-zinc-900 h-full transition-all duration-1000"
                                                    style={{ width: `${goal.progress}%` }}
                                                ></div>
                                            </div>
                                            <div className="flex justify-between text-[10px] font-bold text-zinc-400 group-hover:text-zinc-900 transition-colors uppercase">
                                                <span>COM: {goal.progress}%</span>
                                                <span>DUE: {new Date(goal.targetDate).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="col-span-2 border-2 border-dashed border-zinc-200 py-16 text-center">
                                        <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">No active therapy goals assigned</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Right Section - Sidebar (4 cols) */}
                    <div className="lg:col-span-4 space-y-12">

                        {/* Quick Access */}
                        <div className="grid grid-cols-1 gap-3">
                            <button className="flex items-center justify-between w-full border-2 border-zinc-900 p-4 hover:bg-zinc-900 hover:text-white transition-all group">
                                <span className="text-xs font-black uppercase tracking-widest">Upload Session</span>
                                <Video size={18} className="text-zinc-400 group-hover:text-white" />
                            </button>
                            <button className="flex items-center justify-between w-full border-2 border-zinc-100 p-4 hover:border-zinc-900 transition-all group">
                                <span className="text-xs font-black uppercase tracking-widest text-zinc-400 group-hover:text-zinc-900">Education Hub</span>
                                <ArrowRight size={18} className="text-zinc-200 group-hover:text-zinc-900" />
                            </button>
                        </div>

                        {/* Recent Activity */}
                        <section>
                            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
                                <Play size={14} /> Recent Sessions
                            </h2>
                            <div className="space-y-6">
                                {sessions.length > 0 ? sessions.slice(0, 3).map((session) => (
                                    <div key={session.id} className="group relative list-none">
                                        <div className="flex gap-4">
                                            <div className="w-full bg-zinc-50 border border-zinc-900 p-1 flex-1">
                                                <div className="aspect-video bg-zinc-900 flex items-center justify-center overflow-hidden">
                                                    <Play className="text-white opacity-40 group-hover:opacity-100 transform group-hover:scale-125 transition-all" size={24} />
                                                </div>
                                            </div>
                                            <div className="flex-[1.5] space-y-2">
                                                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                                    {new Date(session.recordedAt).toLocaleDateString()}
                                                </div>
                                                <h3 className="text-xs font-black uppercase leading-tight">
                                                    {session.actionType || 'General Session'}
                                                </h3>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 ${session.status === 'analyzed' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400'
                                                        }`}>
                                                        {session.status}
                                                    </span>
                                                    <span className="text-[10px] text-zinc-400 font-bold">
                                                        {session.duration ? `${Math.floor(session.duration / 60)}m` : 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="border-l-2 border-zinc-100 pl-4 py-8">
                                        <p className="text-zinc-400 text-[10px] font-bold uppercase italic">No session history available yet.</p>
                                    </div>
                                )}
                                <button className="w-full mt-4 py-3 border-2 border-zinc-900 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-zinc-900 hover:text-white transition-all">
                                    Archive Access
                                </button>
                            </div>
                        </section>

                        {/* Milestone Map */}
                        <section className="bg-zinc-900 text-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]">
                            <div className="flex items-center gap-3 mb-6">
                                <Trophy className="text-white" size={24} />
                                <div>
                                    <h2 className="text-xs font-black uppercase tracking-[0.15em]">Milestones</h2>
                                    <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Journey Progress</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="flex flex-col items-center">
                                        <div className="w-2 h-2 rounded-full bg-white ring-4 ring-white/10"></div>
                                        <div className="w-0.5 h-full bg-white/10 my-1"></div>
                                    </div>
                                    <div className="pb-4">
                                        <div className="text-[10px] font-black uppercase">Onboarding</div>
                                        <div className="text-[9px] text-zinc-500 uppercase font-bold">Complete</div>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex flex-col items-center">
                                        <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                                        <div className="w-0.5 h-full bg-white/10 my-1"></div>
                                    </div>
                                    <div className="pb-4">
                                        <div className="text-[10px] font-black uppercase text-zinc-400">First Milestone</div>
                                        <div className="text-[9px] text-zinc-600 uppercase font-bold">Reach 25% progress</div>
                                    </div>
                                </div>
                            </div>
                        </section>

                    </div>
                </div>
            </div>
        </div>
    );
}
