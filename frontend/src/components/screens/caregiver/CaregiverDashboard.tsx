import React, { useState } from 'react';
import {
  Video, Calendar, CheckCircle, Clock,
  AlertCircle, Plus, TrendingUp, Settings,
  X, Loader2, Camera, ArrowRight, User
} from 'lucide-react';
import { useCaregiverPatients } from '../../../api/caregiver';
import { useCaregiverDashboardStats } from '../../../api/dashboard';
import { useCaregiverSchedule, ScheduleEntry } from '../../../api/schedule';
import VideoProgressTracker from './VideoProgressTracker';
import GuidedVideoRecording from './GuidedVideoRecording';
import { useNavigate } from '@tanstack/react-router';

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function CaregiverDashboard() {
  const navigate = useNavigate();
  const { data: patientsData, isLoading: patientsLoading, error: patientsError } = useCaregiverPatients();
  const { data: stats, isLoading: statsLoading } = useCaregiverDashboardStats();

  const today = new Date();
  const currentMonthKey = getMonthKey(today);
  const { data: scheduleData, isLoading: scheduleLoading } = useCaregiverSchedule(currentMonthKey);

  const linkedPatients = patientsData?.patients || [];
  const isLoading = patientsLoading || statsLoading || scheduleLoading;
  const error = patientsError;

  const [showLogModal, setShowLogModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showVideoRecording, setShowVideoRecording] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const primaryPatient = linkedPatients.find(p => p.id === selectedPatientId) || (linkedPatients.length > 0 ? linkedPatients[0] : null);
  const patientId = primaryPatient?.id || primaryPatient?._id || '';

  // Get today's actual schedule sessions
  const todaysSessions = (() => {
    if (!scheduleData || !Array.isArray(scheduleData)) return [];
    return scheduleData.filter((e: ScheduleEntry) => {
      const entryDate = new Date(e.scheduledDate);
      return entryDate.toDateString() === today.toDateString();
    });
  })();

  const getPatientId = (entry: ScheduleEntry): string => {
    const patient = linkedPatients.find(
      (p: any) => (p._id || p.id) === entry.patientId || p.fullName === entry.patientName,
    );
    return patient?.id || patient?._id || entry.patientId || "";
  };

  if (showVideoRecording) {
    return <GuidedVideoRecording onClose={() => setShowVideoRecording(false)} patientId={patientId} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-mono">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-900" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Loading System Nodes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8 font-mono">
        <div className="border border-zinc-200 p-8 max-w-md w-full bg-zinc-50 relative">
          <div className="absolute top-0 right-0 p-2"><div className="w-2 h-2 border-t border-r border-zinc-300"></div></div>
          <AlertCircle className="w-8 h-8 text-zinc-900 mb-4" />
          <h2 className="text-xl font-black uppercase mb-2 tracking-tight">System Error Detected</h2>
          <p className="text-xs text-zinc-500 font-bold mb-6 tracking-wide leading-relaxed uppercase">
            {error instanceof Error ? error.message : 'Unknown kernel exception occurred.'}
          </p>
          <button onClick={() => window.location.reload()} className="w-full py-3 bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all">
            Reboot Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-mono selection:bg-zinc-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header Section */}
        <header className="mb-12 border-b border-zinc-100 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-zinc-900 flex items-center justify-center text-white font-bold text-xl border border-zinc-900">
                {primaryPatient?.fullName?.split(' ').map((n: string) => n[0]).join('') || 'PT'}
              </div>
              {/* <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Caregiver Terminal V1.0</p> */}
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase leading-none">
              {primaryPatient?.fullName || 'Patient'} PORTAL
            </h1>
            <p className="mt-2 text-zinc-400 text-xs font-bold uppercase tracking-widest">
              Clinical monitoring & therapy support active
            </p>
          </div>

          {/* <div className="flex gap-4">
            <button className="w-10 h-10 border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition-colors text-zinc-400 hover:text-zinc-900">
              <Settings size={18} />
            </button>
            <button className="w-10 h-10 border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition-colors text-zinc-400 hover:text-zinc-900">
              <AlertCircle size={18} />
            </button>
          </div> */}
        </header>

        {/* Global CTA */}
        <div className="mb-12 group cursor-pointer" onClick={() => setShowVideoRecording(true)}>
          <div className="border-4 border-zinc-900 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:bg-zinc-900 hover:text-white relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-4 mb-2">
                <Camera size={28} /> Start Session Recording
              </h2>
              <p className="text-[10px] uppercase font-bold tracking-[0.1em] opacity-70">
                Record guided activity videos for clinical analysis | 11 Actions available
              </p>
            </div>
            <div className="relative z-10 flex items-center gap-4">
              <span className="text-xs font-black uppercase tracking-widest hidden md:block">Initialize Camera</span>
              <div className="w-12 h-12 rounded-full border-2 border-current flex items-center justify-center group-hover:translate-x-2 transition-transform">
                <ArrowRight size={20} />
              </div>
            </div>
            {/* Background pattern */}
            <div className="absolute right-0 top-0 h-full w-1/3 opacity-[0.03] pointer-events-none group-hover:opacity-[0.1] transition-opacity">
              <Video size={120} className="-rotate-12 translate-x-1/2 translate-y-1/2" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

          {/* Left Column: Progress & Video */}
          <div className="lg:col-span-8 space-y-12">

            {/* Real Video Progress Tracker */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                  <TrendingUp size={14} /> Activity Compliance
                </h3>
              </div>
              <VideoProgressTracker
                patientId={patientId}
                onRecordAction={() => setShowVideoRecording(true)}
              />
            </section>

            {/* Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="border border-zinc-200 p-8 flex flex-col justify-between bg-zinc-50/50">
                <h4 className="text-[10px] font-black uppercase text-zinc-400 mb-6 tracking-widest">Therapy Compliance Score</h4>
                <div>
                  <div className="text-6xl font-black tracking-tighter mb-2">{stats?.avgProgress || 0}<span className="text-2xl text-zinc-300">%</span></div>
                  <div className="w-full h-1 bg-zinc-200 mt-4 overflow-hidden">
                    <div className="h-full bg-zinc-900" style={{ width: `${stats?.avgProgress || 0}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="border border-zinc-200 p-8 space-y-4">
                <h4 className="text-[10px] font-black uppercase text-zinc-400 mb-2 tracking-widest">Active Metrics</h4>
                <div className="space-y-4">
                  <div className="flex justify-between border-b border-zinc-100 pb-2">
                    <span className="text-[10px] font-bold uppercase text-zinc-500">Scheduled Sessions</span>
                    <span className="text-xs font-black uppercase">{stats?.scheduledSessions || 0} Pending</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-100 pb-2">
                    <span className="text-[10px] font-bold uppercase text-zinc-500">Completed Reports</span>
                    <span className="text-xs font-black uppercase">{stats?.completedReports || 0} Ready</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-100 pb-2">
                    <span className="text-[10px] font-bold uppercase text-zinc-500">Total Uploads</span>
                    <span className="text-xs font-black uppercase">{stats?.uploadedVideos || 0} Videos</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Schedule & Quick Actions */}
          <div className="lg:col-span-4 space-y-12">

            {/* Schedule Section */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                  <Calendar size={14} /> Daily Logs
                </h3>
                <span className="text-[10px] font-bold text-zinc-300">{new Date().toLocaleDateString()}</span>
              </div>

              <div className="space-y-4">
                {todaysSessions.length === 0 ? (
                  <div className="text-center p-6 border border-zinc-100 text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
                    No sessions scheduled for today
                  </div>
                ) : (
                  todaysSessions.map((session: ScheduleEntry) => (
                    <div
                      key={session._id}
                      onClick={() => {
                        if (session.status === 'pending') {
                          navigate({ to: '/caregiver/record', search: { actionType: session.actionType, scheduleEntryId: session._id, patientId: getPatientId(session) } })
                        }
                      }}
                      className="border border-zinc-100 p-4 hover:border-zinc-300 transition-all group relative cursor-pointer"
                    >
                      <div className="absolute top-0 right-0 p-1"><div className="w-1 h-1 bg-zinc-200 group-hover:bg-zinc-900 transition-colors"></div></div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-black uppercase tracking-tight">{session.timeSlot || 'Any Time'}</span>
                        <div className={`text-[8px] font-bold px-2 py-0.5 border ${session.status === 'completed' ? 'bg-zinc-900 text-white border-zinc-900' :
                          session.status === 'pending' ? 'bg-zinc-50 text-zinc-900 border-zinc-200' :
                            'text-zinc-300 border-zinc-100'
                          }`}>
                          {session.status.toUpperCase()}
                        </div>
                      </div>
                      <p className="text-[10px] font-bold text-zinc-600 block mb-1 uppercase tracking-tight">{session.actionType.replace('_', ' ')}</p>
                      <p className="text-[8px] text-zinc-300 font-bold uppercase tracking-widest">Assigned to: {session.patientName}</p>
                    </div>
                  ))
                )}
              </div>

              <button onClick={() => navigate({ to: '/caregiver/schedule' })} className="w-full mt-6 py-4 border border-zinc-200 hover:bg-zinc-50 text-[10px] font-black uppercase tracking-widest transition-all">
                View Full Calendar
              </button>
            </section>

            {/* Quick Actions Card */}
            <section className="bg-zinc-50 p-8 border border-zinc-200 relative overflow-hidden">
              <div className="absolute top-0 left-0 p-2"><div className="w-2 h-2 border-t border-l border-zinc-300"></div></div>
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-900 mb-6 flex items-center gap-2">
                QUICK SYBSYTEMS
              </h3>
              <div className="space-y-3">
                <button onClick={() => navigate({ to: '/caregiver/tasks' })} className="w-full p-4 border border-zinc-200 bg-white hover:bg-zinc-900 hover:text-white transition-all flex items-center justify-between group">
                  <span className="text-[10px] font-bold uppercase">My Tasks</span>
                  <CheckCircle size={14} className="opacity-40 group-hover:opacity-100" />
                </button>
                <button onClick={() => setShowVideoRecording(true)} className="w-full p-4 border border-zinc-200 bg-white hover:bg-zinc-900 hover:text-white transition-all flex items-center justify-between group">
                  <span className="text-[10px] font-bold uppercase">Video Recorder</span>
                  <Video size={14} className="opacity-40 group-hover:opacity-100" />
                </button>
                <button onClick={() => navigate({ to: '/caregiver/reports' })} className="w-full p-4 border border-zinc-200 bg-white hover:bg-zinc-900 hover:text-white transition-all flex items-center justify-between group">
                  <span className="text-[10px] font-bold uppercase">Analytics Report</span>
                  <TrendingUp size={14} className="opacity-40 group-hover:opacity-100" />
                </button>
                <button onClick={() => navigate({ to: '/caregiver/schedule' })} className="w-full p-4 border border-zinc-200 bg-white hover:bg-zinc-900 hover:text-white transition-all flex items-center justify-between group">
                  <span className="text-[10px] font-bold uppercase">Care Schedule</span>
                  <Calendar size={14} className="opacity-40 group-hover:opacity-100" />
                </button>
              </div>
            </section>

          </div>
        </div>

        {/* System Footer */}
        <footer className="mt-24 border-t border-zinc-100 pt-8 text-center">
          <div className="flex justify-center gap-12 mb-4">
            <div className="text-center">
              <p className="text-[8px] font-black text-zinc-300 uppercase tracking-widest mb-1">Station ID</p>
              <p className="text-[10px] font-bold uppercase">ABTS-NODE-04</p>
            </div>
            <div className="text-center">
              <p className="text-[8px] font-black text-zinc-300 uppercase tracking-widest mb-1">Secure Key</p>
              <p className="text-[10px] font-bold uppercase">CR-X299-RSA</p>
            </div>
            <div className="text-center">
              <p className="text-[8px] font-black text-zinc-300 uppercase tracking-widest mb-1">Link Status</p>
              <p className="text-[10px] font-bold uppercase text-emerald-500">Active Sync</p>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}
