import React, { useState } from 'react';
import {
  Video, Calendar, CheckCircle, Clock,
  AlertCircle, Plus, TrendingUp, Settings,
  X, Loader2, Camera, ArrowRight, User
} from 'lucide-react';
import { useCaregiverPatients } from '../../../api/caregiver';
import { useCaregiverDashboardStats } from '../../../api/dashboard';
import VideoProgressTracker from './VideoProgressTracker';
import GuidedVideoRecording from './GuidedVideoRecording';

const mockChildSessions = [
  { id: 1, time: '09:00', type: 'Behavioral_Therapy', status: 'completed', duration: '45m' },
  { id: 2, time: '14:00', type: 'Speech_Therapy', status: 'active', duration: '30m' },
  { id: 3, time: '16:00', type: 'Occupational_Therapy', status: 'pending', duration: '45m' },
];

export default function CaregiverDashboard() {
  const { data: patientsData, isLoading: patientsLoading, error: patientsError } = useCaregiverPatients();
  const { data: stats, isLoading: statsLoading } = useCaregiverDashboardStats();

  const linkedPatients = patientsData?.patients || [];
  const isLoading = patientsLoading || statsLoading;
  const error = patientsError;

  const [showLogModal, setShowLogModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showVideoRecording, setShowVideoRecording] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const primaryPatient = linkedPatients.find(p => p.id === selectedPatientId) || (linkedPatients.length > 0 ? linkedPatients[0] : null);
  const patientId = primaryPatient?.id || primaryPatient?._id || '';

  if (showVideoRecording) {
    return <GuidedVideoRecording onClose={() => setShowVideoRecording(false)} patientId={patientId} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-mono">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-900" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Loading_System_Nodes...</p>
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
          <h2 className="text-xl font-black uppercase mb-2 tracking-tight">System_Error_Detected</h2>
          <p className="text-xs text-zinc-500 font-bold mb-6 tracking-wide leading-relaxed uppercase">
            {error instanceof Error ? error.message : 'Unknown kernel exception occurred.'}
          </p>
          <button onClick={() => window.location.reload()} className="w-full py-3 bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all">
            Reboot_Session
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
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Caregiver_Terminal_V1.0</p>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase leading-none">
              {primaryPatient?.fullName || 'Patient'}<span className="text-zinc-200">_</span>PORTAL
            </h1>
            <p className="mt-2 text-zinc-400 text-xs font-bold uppercase tracking-widest">
              Clinical monitoring & therapy support active
            </p>
          </div>

          <div className="flex gap-4">
            <button className="w-10 h-10 border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition-colors text-zinc-400 hover:text-zinc-900">
              <Settings size={18} />
            </button>
            <button className="w-10 h-10 border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition-colors text-zinc-400 hover:text-zinc-900">
              <AlertCircle size={18} />
            </button>
          </div>
        </header>

        {/* Global CTA */}
        <div className="mb-12 group cursor-pointer" onClick={() => setShowVideoRecording(true)}>
          <div className="border-4 border-zinc-900 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:bg-zinc-900 hover:text-white relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-4 mb-2">
                <Camera size={28} /> Start_Session_Recording
              </h2>
              <p className="text-[10px] uppercase font-bold tracking-[0.1em] opacity-70">
                Record guided activity videos for clinical analysis | 11 Actions available
              </p>
            </div>
            <div className="relative z-10 flex items-center gap-4">
              <span className="text-xs font-black uppercase tracking-widest hidden md:block">Initialize_Camera</span>
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
                  <TrendingUp size={14} /> Activity_Compliance
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
                <h4 className="text-[10px] font-black uppercase text-zinc-400 mb-6 tracking-widest">Therapy_Compliance_Score</h4>
                <div>
                  <div className="text-6xl font-black tracking-tighter mb-2">{(primaryPatient as any)?.progressScore || 0}<span className="text-2xl text-zinc-300">%</span></div>
                  <div className="w-full h-1 bg-zinc-200 mt-4 overflow-hidden">
                    <div className="h-full bg-zinc-900" style={{ width: `${(primaryPatient as any)?.progressScore || 0}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="border border-zinc-200 p-8 space-y-4">
                <h4 className="text-[10px] font-black uppercase text-zinc-400 mb-2 tracking-widest">Active_Metrics</h4>
                <div className="space-y-4">
                  <div className="flex justify-between border-b border-zinc-100 pb-2">
                    <span className="text-[10px] font-bold uppercase text-zinc-500">Weekly_Goal</span>
                    <span className="text-xs font-black uppercase">08 Sessions</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-100 pb-2">
                    <span className="text-[10px] font-bold uppercase text-zinc-500">Next_Event</span>
                    <span className="text-xs font-black uppercase">Tomorrow_10:00</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-100 pb-2">
                    <span className="text-[10px] font-bold uppercase text-zinc-500">This_Cycle</span>
                    <span className="text-xs font-black uppercase">07 Planned</span>
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
                  <Calendar size={14} /> Daily_Logs
                </h3>
                <span className="text-[10px] font-bold text-zinc-300">{new Date().toLocaleDateString()}</span>
              </div>

              <div className="space-y-4">
                {mockChildSessions.map((session) => (
                  <div key={session.id} className="border border-zinc-100 p-4 hover:border-zinc-300 transition-all group relative cursor-pointer">
                    <div className="absolute top-0 right-0 p-1"><div className="w-1 h-1 bg-zinc-200 group-hover:bg-zinc-900 transition-colors"></div></div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-black uppercase tracking-tight">{session.time}</span>
                      <div className={`text-[8px] font-bold px-2 py-0.5 border ${session.status === 'completed' ? 'bg-zinc-900 text-white border-zinc-900' :
                        session.status === 'active' ? 'bg-zinc-50 text-zinc-900 border-zinc-200' :
                          'text-zinc-300 border-zinc-100'
                        }`}>
                        {session.status.toUpperCase()}
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-zinc-600 block mb-1 uppercase tracking-tight">{session.type.replace('_', ' ')}</p>
                    <p className="text-[8px] text-zinc-300 font-bold uppercase tracking-widest">{session.duration} Expected_Cycle</p>
                  </div>
                ))}
              </div>

              <button onClick={() => setShowLogModal(true)} className="w-full mt-6 py-4 border border-zinc-200 hover:bg-zinc-50 text-[10px] font-black uppercase tracking-widest transition-all">
                + New_Behavior_Entry
              </button>
            </section>

            {/* Quick Actions Card */}
            <section className="bg-zinc-50 p-8 border border-zinc-200 relative overflow-hidden">
              <div className="absolute top-0 left-0 p-2"><div className="w-2 h-2 border-t border-l border-zinc-300"></div></div>
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-900 mb-6 flex items-center gap-2">
                QUICK_SYBSYTEMS
              </h3>
              <div className="space-y-3">
                <button onClick={() => setShowVideoRecording(true)} className="w-full p-4 border border-zinc-200 bg-white hover:bg-zinc-900 hover:text-white transition-all flex items-center justify-between group">
                  <span className="text-[10px] font-bold uppercase">Video_Recorder</span>
                  <Video size={14} className="opacity-40 group-hover:opacity-100" />
                </button>
                <button className="w-full p-4 border border-zinc-200 bg-white hover:bg-zinc-900 hover:text-white transition-all flex items-center justify-between group">
                  <span className="text-[10px] font-bold uppercase">Analytics_Report</span>
                  <TrendingUp size={14} className="opacity-40 group-hover:opacity-100" />
                </button>
                <button className="w-full p-4 border border-zinc-200 bg-white hover:bg-zinc-900 hover:text-white transition-all flex items-center justify-between group">
                  <span className="text-[10px] font-bold uppercase">Clinical_Notes</span>
                  <Settings size={14} className="opacity-40 group-hover:opacity-100" />
                </button>
              </div>
            </section>

          </div>
        </div>

        {/* System Footer */}
        <footer className="mt-24 border-t border-zinc-100 pt-8 text-center">
          <div className="flex justify-center gap-12 mb-4">
            <div className="text-center">
              <p className="text-[8px] font-black text-zinc-300 uppercase tracking-widest mb-1">Station_ID</p>
              <p className="text-[10px] font-bold uppercase">ABTS-NODE-04</p>
            </div>
            <div className="text-center">
              <p className="text-[8px] font-black text-zinc-300 uppercase tracking-widest mb-1">Secure_Key</p>
              <p className="text-[10px] font-bold uppercase">CR-X299-RSA</p>
            </div>
            <div className="text-center">
              <p className="text-[8px] font-black text-zinc-300 uppercase tracking-widest mb-1">Link_Status</p>
              <p className="text-[10px] font-bold uppercase text-emerald-500">Active_Sync</p>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}
