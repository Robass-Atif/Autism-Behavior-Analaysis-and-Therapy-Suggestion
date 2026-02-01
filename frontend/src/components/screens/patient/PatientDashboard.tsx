import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    User, Activity, Play, Calendar, Trophy, Target, Clock, ArrowRight, BookOpen, Video
} from 'lucide-react';
import { useMyProfile } from '../../../api/patient';
import { useMyTherapyGoals, useMyVideoSessions } from '../../../api/clinical';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function PatientDashboard() {
    const { data: profile, isLoading: profileLoading } = useMyProfile();
    const { data: goals, isLoading: goalsLoading } = useMyTherapyGoals();
    const { data: sessionsData, isLoading: sessionsLoading } = useMyVideoSessions();

    const activeGoals = goals?.filter(g => g.status === 'In Progress') || [];
    const completedGoals = goals?.filter(g => g.status === 'Completed') || [];
    const progress = profile?.progressScore || 0;

    // Mock progress data for chart since backend doesn't provide historical data yet
    const progressData = [
        { date: 'Week 1', score: Math.max(0, progress - 15) },
        { date: 'Week 2', score: Math.max(0, progress - 10) },
        { date: 'Week 3', score: Math.max(0, progress - 5) },
        { date: 'Week 4', score: Math.max(0, progress - 2) },
        { date: 'Current', score: progress },
    ];

    if (profileLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 animate-fade-in">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-3xl">
                            {profile?.fullName?.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">Welcome back, {profile?.fullName?.split(' ')[0]}!</h1>
                            <p className="text-slate-500 mt-2 flex items-center gap-2">
                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Patient Portal</span>
                                <span className="text-slate-400">•</span>
                                <span>MRN: {profile?.mrn}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="text-center px-6 py-2 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="text-2xl font-bold text-slate-900">{activeGoals.length}</div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider font-bold">Active Goals</div>
                        </div>
                        <div className="text-center px-6 py-2 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="text-2xl font-bold text-slate-900">{sessionsData?.total || 0}</div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider font-bold">Sessions</div>
                        </div>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Stats & Goals */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Progress Chart */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                        <Activity className="text-blue-500" /> My Progress
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-1">Tracking your development over time</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-bold text-blue-600">{progress}%</div>
                                    <div className="text-xs text-slate-400 uppercase tracking-wider">Overall Score</div>
                                </div>
                            </div>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={progressData}>
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} domain={[0, 100]} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                        />
                                        <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={4} dot={{ r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Current Goals */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <Target className="text-purple-500" /> Current Goals
                                </h2>
                                <div className="flex gap-2">
                                    <button className="text-sm font-medium text-slate-500 hover:text-purple-600 transition-colors">See All</button>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {activeGoals.length > 0 ? activeGoals.map((goal: any) => (
                                    <div key={goal.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-purple-200 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-slate-900">{goal.description}</h3>
                                            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold uppercase">{goal.category}</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                                            <div className="bg-purple-500 h-2 rounded-full transition-all duration-500" style={{ width: `${goal.progress}%` }}></div>
                                        </div>
                                        <div className="flex justify-between mt-2 text-xs text-slate-500 font-medium">
                                            <span>{goal.progress}% Completed</span>
                                            <span>Target: {new Date(goal.targetDate).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-8">
                                        <p className="text-slate-500">No active goals found.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Sessions & Actions */}
                    <div className="space-y-8">

                        {/* Quick Actions */}
                        <div className="grid grid-cols-2 gap-4">
                            <button className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group">
                                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <Target size={20} />
                                </div>
                                <span className="text-sm font-bold text-slate-700">My Goals</span>
                            </button>
                            <button className="bg-white p-4 rounded-xl border border-slate-200 hover:border-rose-500 hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group">
                                <div className="w-10 h-10 bg-rose-50 rounded-full flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                                    <Video size={20} />
                                </div>
                                <span className="text-sm font-bold text-slate-700">Sessions</span>
                            </button>
                        </div>

                        {/* Recent Video Sessions */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
                                <Play className="text-rose-500" /> Recent Sessions
                            </h2>
                            <div className="space-y-4">
                                {sessionsData?.sessions && sessionsData.sessions.length > 0 ? sessionsData.sessions.slice(0, 3).map((session: any) => (
                                    <div key={session.id} className="group cursor-pointer">
                                        <div className="relative rounded-xl overflow-hidden aspect-video bg-slate-900 mb-2">
                                            <div className="absolute inset-0 flex items-center justify-center bg-slate-800 group-hover:bg-slate-700 transition-colors">
                                                <Play className="text-white opacity-80 group-hover:opacity-100 transform group-hover:scale-110 transition-all" size={32} />
                                            </div>
                                            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded font-mono">
                                                {session.duration ? `${Math.floor(session.duration / 60)}:${(session.duration % 60).toString().padStart(2, '0')}` : '24:00'}
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-slate-900 text-sm mt-1">{new Date(session.recordedAt).toLocaleDateString()} Session</h3>
                                                <p className="text-xs text-slate-500">Therapist: {session.therapistName || 'Assigned Therapist'}</p>
                                            </div>
                                            <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded mt-1">{session.status}</span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-8">
                                        <p className="text-slate-500 italic">No recorded sessions yet.</p>
                                    </div>
                                )}
                                <button className="w-full py-3 mt-2 border-2 border-slate-100 rounded-xl text-slate-600 font-bold text-sm hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2">
                                    View All Sessions <ArrowRight size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Milestones Card */}
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 shadow-xl text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <Trophy size={120} />
                            </div>
                            <h2 className="text-xl font-bold flex items-center gap-2 mb-2 relative z-10">
                                <Trophy className="text-yellow-300" /> Key Milestones
                            </h2>
                            <p className="text-blue-100 text-sm mb-6 relative z-10">Recent achievements in your journey.</p>

                            <div className="space-y-3 relative z-10">
                                <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
                                    <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center text-green-300 shrink-0">
                                        <CheckMark />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold">Profile Created</div>
                                        <div className="text-[10px] text-blue-200">System Access Granted</div>
                                    </div>
                                </div>
                                {activeGoals.length > 0 && (
                                    <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
                                        <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-300 shrink-0">
                                            <Activity size={14} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold">Goals Assigned</div>
                                            <div className="text-[10px] text-blue-200">{activeGoals.length} Active Targets</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

const CheckMark = () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
