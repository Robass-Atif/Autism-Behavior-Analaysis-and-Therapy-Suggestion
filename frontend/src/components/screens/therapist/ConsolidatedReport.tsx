import React, { useState } from 'react';
import { Layers, ArrowRight, BarChart2, Star, TrendingUp, Calendar, Target, Shield, Clock, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const progressData = [
  { month: 'Jan', engagement: 40, motor: 35 },
  { month: 'Feb', engagement: 45, motor: 38 },
  { month: 'Mar', engagement: 55, motor: 45 },
  { month: 'Apr', engagement: 50, motor: 52 },
  { month: 'May', engagement: 65, motor: 60 },
  { month: 'Jun', engagement: 70, motor: 68 },
];

export default function ConsolidatedReport() {
  const [viewMode, setViewMode] = useState<'technical' | 'friendly'>('technical');

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 font-mono">
      {/* Header - Industrial/Codex */}
      <div className="bg-zinc-900 border-b-4 border-zinc-800 p-8 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-white">
        <div className="absolute top-0 right-0 p-8 opacity-5 -rotate-12"><BarChart2 size={120} /></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black tracking-tighter uppercase whitespace-nowrap">Integrated Feed <span className="text-zinc-500">(Q2 2024)</span></h1>
          <div className="flex items-center gap-3 mt-3">
             <span className="px-3 py-1 bg-zinc-800 border border-zinc-700 text-zinc-400 text-[9px] font-black uppercase tracking-[0.2em]">Clinical_Dataset_012</span>
             <span className="text-blue-400 font-black text-[9px] uppercase tracking-widest leading-none">• Identity: John Doe</span>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-zinc-950 p-1 border border-zinc-800 relative z-10">
           <button 
             onClick={() => setViewMode('technical')}
             className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'technical' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}
           >
             Technical
           </button>
           <button 
             onClick={() => setViewMode('friendly')}
             className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'friendly' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}
           >
             Friendly
           </button>
        </div>
      </div>

      {/* Stats Summary Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 p-8 text-white shadow-[6px_6px_0px_0px_rgba(24,24,27,0.2)] border border-zinc-800 relative group overflow-hidden">
          <div className="absolute -right-4 -bottom-4 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700"><Calendar size={100} /></div>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Cycles Completed</p>
          <div className="text-6xl font-black tracking-tighter">24</div>
          <p className="mt-8 text-[9px] font-black text-blue-400 uppercase tracking-widest">+16% INCREASE DELTA</p>
        </div>
        
        <div className="bg-white border-2 border-zinc-900 p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
           <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Goal Attainment</p>
           <div className="text-6xl font-black text-zinc-900 tracking-tighter leading-none">72<span className="text-2xl text-zinc-200 ml-1">%</span></div>
           <p className="text-[9px] font-black text-zinc-400 mt-8 uppercase tracking-widest border-t pt-4">AGG METRIC SUCCESS</p>
        </div>

        <div className="bg-white border-2 border-zinc-900 p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
           <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Focus Protocols</p>
           <div className="text-6xl font-black text-zinc-900 tracking-tighter leading-none">02</div>
           <p className="text-[9px] font-black text-zinc-400 mt-8 uppercase tracking-widest border-t pt-4">ACTIVE OBSERVABLES</p>
        </div>
      </div>

      {/* Trajectory Plot */}
      <div className="bg-white border-2 border-zinc-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="p-4 border-b-2 border-zinc-900 bg-zinc-900 text-zinc-500 flex justify-between items-center">
           <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Longitudinal Telemetry Plot</h3>
           <div className="flex gap-4">
              <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest">
                 <div className="w-1.5 h-1.5 bg-zinc-500"></div> Social
              </div>
              <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest">
                 <div className="w-1.5 h-1.5 border border-zinc-500"></div> Motor
              </div>
           </div>
        </div>
        <div className="p-10">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#a1a1aa', fontSize: 10, fontWeight: 900}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#a1a1aa', fontSize: 10, fontWeight: 900}} />
                <Tooltip 
                  cursor={{fill: '#f4f4f5'}} 
                  contentStyle={{borderRadius: '0', border: '2px solid #18181b', boxShadow: 'none', padding: '12px', fontSize: '10px'}} 
                />
                <Bar dataKey="engagement" name="Social Engagement" fill="#18181b" barSize={40} />
                <Bar dataKey="motor" name="Motor Skills" fill="#e4e4e7" stroke="#18181b" strokeWidth={1} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Intervention Segments */}
      <div className="space-y-6">
        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] px-1 flex items-center gap-3">
           <Target size={14} className="text-zinc-900" /> Strategic Intervention Points
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="bg-zinc-50 border-2 border-zinc-100 p-8 flex flex-col gap-8 group hover:border-zinc-900 transition-all">
              <div className="flex justify-between items-start">
                 <div className="w-10 h-10 bg-zinc-900 text-white flex items-center justify-center border-2 border-zinc-900">
                   <AlertCircle size={20} />
                 </div>
                 <span className="px-3 py-1 bg-zinc-200 text-zinc-700 text-[8px] font-black uppercase tracking-widest">URGENT</span>
              </div>
              <div className="flex-1">
                <h4 className="text-2xl font-black text-zinc-900 tracking-tighter mb-2 uppercase">Motor Control Regression</h4>
                <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-tight leading-relaxed">
                  {viewMode === 'technical' 
                    ? 'Pincer grasp latency increased (+200ms). Deviation exceeds 2.0 SD thresholds. Immediate OT protocol adjustment required.' 
                    : 'John is experiencing mild difficulty with fine finger movements. Recommend session frequency increase.'}
                </p>
              </div>
              <button className="flex items-center gap-2 text-zinc-900 text-[10px] font-black uppercase tracking-widest hover:gap-4 transition-all w-fit border-b-2 border-zinc-900 pb-1">
                RECALIBRATE PROTOCOLS <ArrowRight size={12} />
              </button>
           </div>

           <div className="bg-zinc-50 border-2 border-zinc-100 p-8 flex flex-col gap-8 group hover:border-zinc-900 transition-all">
              <div className="flex justify-between items-start">
                 <div className="w-10 h-10 bg-white border-2 border-zinc-900 text-zinc-900 flex items-center justify-center font-black text-xs">
                   02
                 </div>
                 <span className="px-3 py-1 bg-zinc-200 text-zinc-700 text-[8px] font-black uppercase tracking-widest">ACTIVE</span>
              </div>
              <div className="flex-1">
                <h4 className="text-2xl font-black text-zinc-900 tracking-tighter mb-2 uppercase">Sensory Map Alpha</h4>
                <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-tight leading-relaxed">
                   {viewMode === 'technical'
                    ? 'Auditory hypersensitivity triggered at 40% rate. Threshold correlation > 60dB identified.'
                    : 'Sensitivity to ambient noise has spiked. Use noise-dampening tools during social engagement blocks.'}
                </p>
              </div>
              <button className="flex items-center gap-2 text-zinc-900 text-[10px] font-black uppercase tracking-widest hover:gap-4 transition-all w-fit border-b-2 border-zinc-900 pb-1">
                VIEW NARRATIVE <ArrowRight size={12} />
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}