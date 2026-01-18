import React, { useState } from 'react';
import { Video, Calendar, CheckCircle, Clock, AlertCircle, Plus, TrendingUp, Settings, X, Loader2, Camera } from 'lucide-react';
import { useCaregiverPatients } from '../../../api/caregiver';
import { useCaregiverDashboardStats } from '../../../api/dashboard';
import { useVideoSessions } from '../../../api/clinical';
import VideoProgressTracker from './VideoProgressTracker';
import GuidedVideoRecording from './GuidedVideoRecording';

// Mock sessions for now (will be replaced with real data)
const mockChildSessions = [
  { id: 1, time: '9:00 AM', type: 'Behavioral Therapy', status: 'completed', duration: '45 min' },
  { id: 2, time: '2:00 PM', type: 'Speech Therapy', status: 'in-progress', duration: '30 min' },
  { id: 3, time: '4:00 PM', type: 'Occupational Therapy', status: 'pending', duration: '45 min' },
];

export default function CaregiverDashboard() {
  // Fetch real data from APIs
  const { data: patientsData, isLoading: patientsLoading, error: patientsError } = useCaregiverPatients();
  const { data: stats, isLoading: statsLoading } = useCaregiverDashboardStats();
  const { data: sessionsData, isLoading: sessionsLoading } = useVideoSessions();

  const linkedPatients = patientsData?.patients || [];
  const isLoading = patientsLoading || statsLoading;
  const error = patientsError;

  const [showLogModal, setShowLogModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showVideoRecording, setShowVideoRecording] = useState(false);
  const [selectedSession, setSelectedSession] = useState(mockChildSessions[0] || null);
  const [logForm, setLogForm] = useState({ type: '', date: '', time: '', notes: '', duration: '' });
  const [scheduleForm, setScheduleForm] = useState({ date: '', time: '', type: '', duration: '' });

  // Get first patient (or selected patient)
  const primaryPatient = linkedPatients && linkedPatients.length > 0 ? linkedPatients[0] : null;
  const patientId = primaryPatient?.id || primaryPatient?._id || '';

  const handleLogIncident = () => {
    setShowLogModal(true);
  };

  const handleScheduleSession = () => {
    setShowScheduleModal(true);
  };

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Behavior logged:', logForm);
    setShowLogModal(false);
    alert('Incident logged successfully');
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Session scheduled:', scheduleForm);
    setShowScheduleModal(false);
    alert('Session scheduled successfully');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg"><CheckCircle size={14} /> Completed</span>;
      case 'in-progress':
        return <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg"><Clock size={14} /> In Progress</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg"><Clock size={14} /> Scheduled</span>;
      default:
        return null;
    }
  };

  // Show Video Recording Screen
  if (showVideoRecording) {
    return <GuidedVideoRecording onClose={() => setShowVideoRecording(false)} patientId={patientId} />;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600 font-light">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-xl border border-red-200 p-8 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-light text-slate-900 mb-2">Failed to load data</h2>
          <p className="text-slate-600 font-light mb-4">{error instanceof Error ? error.message : 'Unknown error occurred'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
              {primaryPatient?.fullName?.split(' ').map((n: string) => n[0]).join('') || 'PT'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Caregiver Portal</h1>
              <p className="text-slate-500">{primaryPatient?.fullName || 'Patient'}'s Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
              <Settings size={20} />
            </button>
            <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
              <AlertCircle size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Record Video CTA */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/25">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Camera size={24} />
                Record Therapy Videos
              </h2>
              <p className="text-blue-100 mt-1">
                Help your therapist by recording your child performing guided activities
              </p>
            </div>
            <button
              onClick={() => setShowVideoRecording(true)}
              className="px-6 py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors flex items-center gap-2 shadow-lg"
            >
              <Video size={18} />
              Start Recording
            </button>
          </div>
        </div>

        {/* Video Progress Tracker */}
        {patientId && (
          <VideoProgressTracker
            patientId={patientId}
            onRecordAction={() => setShowVideoRecording(true)}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Child's Progress */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">{primaryPatient?.fullName || 'Patient'}'s Progress</h2>
              <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
                <TrendingUp size={16} />
              </button>
            </div>
            <div className="h-32 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl flex items-center justify-center flex-col">
              <span className="text-4xl font-bold text-emerald-700">{(primaryPatient as any)?.progressScore || 0}%</span>
              <p className="text-xs text-emerald-600 mt-2">Overall Progress</p>
            </div>
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Weekly Goal</span>
                <span className="text-slate-900 font-semibold">8 sessions completed</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Next Session</span>
                <span className="text-slate-900 font-semibold">Tomorrow, 10:00 AM</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">This Week</span>
                <span className="text-slate-900 font-semibold">7 sessions planned</span>
              </div>
            </div>
            <button className="w-full mt-4 py-3 text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors border border-blue-200">
              View Full Report
            </button>
          </div>

          {/* Today's Schedule */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Today's Schedule</h2>
              <div className="text-xs text-slate-500">{new Date().toLocaleDateString()}</div>
            </div>
            <div className="flex gap-2 mb-4">
              <button onClick={handleLogIncident} className="p-2 text-blue-600 hover:text-blue-700 rounded-lg transition-colors flex items-center gap-2">
                <Plus size={16} />
                <span>Log Incident</span>
              </button>
              <button onClick={handleScheduleSession} className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2">
                <Calendar size={16} />
                <span>Schedule</span>
              </button>
            </div>
            <div className="space-y-4">
              {mockChildSessions.map((session) => (
                <div key={session.id} className="border-b border-slate-100 pb-4 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer rounded-lg p-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{session.time}</p>
                      <p className="text-xs text-slate-500">{session.type}</p>
                    </div>
                    {getStatusBadge(session.status)}
                  </div>
                  <div className="text-right mt-1">
                    <p className="text-xs text-slate-400">{session.duration}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Quick Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => setShowVideoRecording(true)}
                className="w-full p-4 flex items-center gap-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors"
              >
                <Video size={20} />
                <span className="font-medium">Record Activity Video</span>
              </button>
              <button
                onClick={handleLogIncident}
                className="w-full p-4 flex items-center gap-3 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl transition-colors"
              >
                <AlertCircle size={20} />
                <span className="font-medium">Log Behavioral Incident</span>
              </button>
              <button
                onClick={handleScheduleSession}
                className="w-full p-4 flex items-center gap-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-colors"
              >
                <Calendar size={20} />
                <span className="font-medium">Schedule Session</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Log Incident Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Log Incident</h2>
              <button onClick={() => setShowLogModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleLogSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">Date</label>
                <input
                  type="date"
                  value={logForm.date}
                  onChange={(e) => setLogForm({ ...logForm, date: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-0 focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">Time</label>
                <input
                  type="time"
                  value={logForm.time}
                  onChange={(e) => setLogForm({ ...logForm, time: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-0 focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">Incident Type</label>
                <select
                  value={logForm.type}
                  onChange={(e) => setLogForm({ ...logForm, type: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-0 focus:border-blue-500 transition-all bg-white"
                >
                  <option value="">Select type...</option>
                  <option value="Behavioral">Behavioral</option>
                  <option value="Therapy">Therapy</option>
                  <option value="Medical">Medical</option>
                  <option value="Social">Social</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">Notes</label>
                <textarea
                  value={logForm.notes}
                  onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-0 focus:border-blue-500 transition-all resize-none"
                  placeholder="Describe the incident..."
                />
              </div>
              <div className="flex gap-4 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-6 py-2.5 text-slate-600 hover:text-slate-900 font-medium rounded-xl border-2 border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Save Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
