import React from 'react';
import { Calendar as CalendarIcon, ChevronRight } from 'lucide-react';

export default function RecordingScheduleScreen() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Recording Schedule</h1>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
         <div className="grid grid-cols-7 gap-2 mb-4 text-center text-sm font-bold text-slate-500">
           {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
         </div>
         <div className="grid grid-cols-7 gap-2">
           {Array.from({ length: 31 }).map((_, i) => (
             <div key={i} className={`h-24 border rounded-lg p-2 text-xs relative ${i === 12 ? 'bg-blue-50 border-blue-200' : 'border-slate-100'}`}>
               <span className="font-medium text-slate-700">{i + 1}</span>
               {i === 12 && (
                 <div className="mt-2 bg-blue-100 text-blue-700 p-1 rounded text-[10px] font-bold truncate">
                   10:00 AM Arm Swing
                 </div>
               )}
             </div>
           ))}
         </div>
      </div>
    </div>
  );
}