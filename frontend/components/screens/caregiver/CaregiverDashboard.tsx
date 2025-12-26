import React from 'react';
import { Calendar, CheckCircle, Clock, Video } from 'lucide-react';

export default function CaregiverDashboard() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="bg-blue-600 rounded-2xl p-8 text-white">
        <h1 className="text-2xl font-bold">Good Morning, Jane.</h1>
        <p className="text-blue-100 mt-2">You have 2 therapy sessions scheduled for today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Clock className="text-blue-600" size={20} /> Today's Schedule</h3>
          <div className="space-y-4">
            <TaskItem time="10:00 AM" title="Arm Swing Exercise" status="pending" />
            <TaskItem time="02:00 PM" title="Social Interaction Log" status="pending" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><CheckCircle className="text-green-600" size={20} /> Recent Progress</h3>
          <p className="text-sm text-slate-600 mb-4">Liam has completed 80% of his weekly goals!</p>
          <div className="w-full bg-slate-100 rounded-full h-3">
             <div className="bg-green-500 h-3 rounded-full" style={{ width: '80%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

const TaskItem = ({ time, title, status }: any) => (
  <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
    <div className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">{time}</div>
    <div className="flex-1 font-medium text-slate-900">{title}</div>
    <button className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"><Video size={16} /></button>
  </div>
);