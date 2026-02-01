import React from 'react';
import { Calendar as CalendarIcon, ChevronRight, Clock } from 'lucide-react';

export default function RecordingScheduleScreen() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 font-mono selection:bg-zinc-100 p-8 md:p-12 animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <header className="mb-12 border-b border-zinc-100 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-400 mb-2">TEMPORAL_PLANNING</h3>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Recording_Schedule</h1>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-2 underline decoration-zinc-100 underline-offset-4">
              // UPCOMING_THERAPY_CAPTURE_WINDOWS
            </p>
          </div>
          <div className="flex items-baseline gap-2 text-zinc-300">
            <span className="text-[10px] font-black uppercase">TIME_ZONE:</span>
            <span className="text-xs font-black text-zinc-900">UTC_05:00</span>
          </div>
        </header>

        {/* Calendar Grid */}
        <div className="bg-white border border-zinc-200 relative overflow-hidden">
          {/* Accents */}
          <div className="absolute top-0 right-0 p-1"><div className="w-1.5 h-1.5 bg-zinc-900"></div></div>

          <div className="grid grid-cols-7 border-b border-zinc-200">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
              <div key={d} className="p-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 border-r border-zinc-100 last:border-r-0">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {Array.from({ length: 35 }).map((_, i) => {
              const day = i - 3; // Mocking start of month
              const isCurrentMonth = day > 0 && day <= 31;
              const isToday = day === 13;

              return (
                <div
                  key={i}
                  className={`h-32 border-r border-b border-zinc-100 p-4 transition-all relative group ${!isCurrentMonth ? 'bg-zinc-50/50 opacity-20' : 'bg-white hover:bg-zinc-50'
                    } ${isToday ? 'bg-zinc-50 ring-1 ring-inset ring-zinc-900 relative z-10' : ''}`}
                >
                  <span className={`text-xs font-black ${isToday ? 'text-zinc-900 underline underline-offset-4' : 'text-zinc-300 group-hover:text-zinc-900 animate-transition'}`}>
                    {isCurrentMonth ? day.toString().padStart(2, '0') : ''}
                  </span>

                  {isToday && (
                    <div className="mt-4 space-y-2">
                      <div className="bg-zinc-900 text-white p-2 text-[8px] font-black uppercase tracking-widest relative overflow-hidden">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Clock size={8} /> 10:00_PST
                        </div>
                        ARM_SWING_L
                        <div className="absolute top-0 right-0 w-1 h-1 bg-white"></div>
                      </div>
                      <div className="border border-zinc-200 bg-white p-2 text-[8px] font-black uppercase tracking-widest text-zinc-400">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Clock size={8} /> 16:30_PST
                        </div>
                        FROG_POSE
                      </div>
                    </div>
                  )}

                  {day === 20 && isCurrentMonth && (
                    <div className="mt-4">
                      <div className="border border-zinc-100 bg-zinc-50 p-2 text-[8px] font-black uppercase tracking-widest text-zinc-300">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Clock size={8} /> 09:00_PST
                        </div>
                        BODY_SWING
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend / Info */}
        <div className="mt-12 flex flex-col md:flex-row gap-8 justify-between">
          <div className="flex flex-wrap gap-8">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-zinc-900"></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">HIGH_PRIORITY_CAPTURE</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 border border-zinc-200"></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">PLANNED_SEQUENCE</span>
            </div>
          </div>

          <div className="text-[8px] font-black text-zinc-300 uppercase tracking-[0.5em] text-right">
            RECURRENCE_PROTOCOL: ACTIVE // NODE_ID: CR-SCHED-01
          </div>
        </div>
      </div>
    </div>
  );
}