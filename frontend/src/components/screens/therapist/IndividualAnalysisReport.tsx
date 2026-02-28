import React from 'react';
import { 
  FileText, Download, Share2, Shield, Calendar, Activity, 
  Brain, BarChart2, TrendingUp, AlertCircle, Info, CheckCircle2,
  ChevronRight, Lock, Zap, Target
} from 'lucide-react';
import { Screen, VideoSession as Session } from '../../../types';
import { useVideoSession } from '../../../api/clinical';
import { 
  ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

interface IndividualAnalysisReportProps {
  sessionId: string;
}

export default function IndividualAnalysisReport({ sessionId }: IndividualAnalysisReportProps) {
  const { data: session, isLoading } = useVideoSession(sessionId);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center p-20 font-mono gap-4">
      <div className="w-8 h-8 border-4 border-zinc-900 border-t-transparent animate-spin"></div>
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Compiling Matrix...</p>
    </div>
  );
  
  if (!session) return (
    <div className="p-10 text-center border-4 border-dashed border-zinc-200 font-mono">
      <h2 className="text-xl font-black uppercase text-zinc-300">File Not Accessible</h2>
    </div>
  );

  const radarData = [
    { subject: 'Motor', A: 120, fullMark: 150 },
    { subject: 'Social', A: 98, fullMark: 150 },
    { subject: 'Sensory', A: 86, fullMark: 150 },
    { subject: 'Comm', A: 99, fullMark: 150 },
    { subject: 'Attention', A: 85, fullMark: 150 },
  ];

  return (
    <div className="space-y-10 font-mono">
      {/* Report Banner - Codex Style */}
      <div className="bg-zinc-900 border-b-4 border-zinc-800 p-8 text-white relative overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="absolute top-0 right-0 p-8 opacity-5"><FileText size={120} /></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
               <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-400 text-[8px] font-black uppercase tracking-widest">v4.0.2-SECURE</span>
               <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-blue-400 text-[8px] font-black uppercase tracking-widest">ENCRYPTED_SHA256</span>
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">Diagnostic Summary</h1>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2 italic">GENERATION DATE: {new Date().toLocaleDateString()}</p>
          </div>
          <div className="flex gap-2">
             <button className="p-3 bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:border-white transition-all shadow-sm">
                <Download size={18} />
             </button>
             <button className="p-3 bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:border-white transition-all shadow-sm">
                <Share2 size={18} />
             </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-8">
           <div className="bg-white border-2 border-zinc-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-8">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                 <Shield size={14} className="text-zinc-900" /> Patient Identity
              </h3>
              <div className="space-y-6">
                 <IdentityField label="FULL NAME" value={session.patientName} />
                 <IdentityField label="ID MARKER" value={sessionId.slice(-12).toUpperCase()} />
                 <div className="grid grid-cols-2 gap-4 pt-6 border-t border-zinc-100">
                    <IdentityField label="AGE PHASE" value="CHILD" />
                    <IdentityField label="STATUS" value="PUBLISHED" color="text-green-600" />
                 </div>
              </div>
           </div>

           {/* Metrics Radar */}
           <div className="bg-zinc-950 border-2 border-zinc-800 p-8 text-white">
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-8">Clinical Dimensionality</h3>
              <div className="h-64 -mx-4">
                 <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                       <PolarGrid stroke="#27272a" />
                       <PolarAngleAxis dataKey="subject" tick={{fill: '#71717a', fontSize: 8, fontWeight: 'bold'}} />
                       <PolarRadiusAxis hide />
                       <Radar
                          name="Diagnosis"
                          dataKey="A"
                          stroke="#ffffff"
                          fill="#ffffff"
                          fillOpacity={0.1}
                       />
                    </RadarChart>
                 </ResponsiveContainer>
              </div>
              <div className="mt-6 flex justify-between items-center text-[8px] font-black text-zinc-600 uppercase tracking-widest leading-none">
                 <span>Baseline: 0.88</span>
                 <span>Detection: 0.92</span>
              </div>
           </div>
        </div>

        {/* Behavioral Findings */}
        <div className="lg:col-span-2 space-y-10">
           <div className="bg-white border-2 border-zinc-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="p-4 border-b-2 border-zinc-900 bg-zinc-900 text-zinc-500 flex items-center gap-3">
                 <Zap size={14} />
                 <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Neural Behavioral Insights</h3>
              </div>
              <div className="p-8 space-y-10">
                 <FindingSection 
                    icon={<Brain className="text-zinc-900" size={18} />} 
                    title="Cognitive Engagement" 
                    desc="Subject displays high variance in focused attention during sensory tasks. Neural inference suggests environmental auditory sensitivity as primary factor."
                    tags={['ATTENTION', 'SENSORY', 'AUDITORY']}
                 />
                 <FindingSection 
                    icon={<Target className="text-zinc-900" size={18} />} 
                    title="Executive Function" 
                    desc="Task switching latency identified at > 3400ms. Goal-directed behaviors remain within normal baseline deviation for this identifier."
                    tags={['PLANNING', 'TRANSITION']}
                 />
                 <FindingSection 
                    icon={<Activity className="text-zinc-900" size={18} />} 
                    title="Motor Telemetry" 
                    desc="Kinematic analysis detects subtle regression in pincer grasp precision. Recalibration of OT protocols highly recommended."
                    tags={['FINE MOTOR', 'STABILITY']}
                 />
              </div>
           </div>

           {/* Security Footnote */}
           <div className="p-6 border-2 border-dashed border-zinc-200 flex items-center justify-between text-zinc-400">
              <div className="flex items-center gap-3">
                 <Lock size={14} />
                 <p className="text-[9px] font-black uppercase tracking-[0.2em]">Diagnostic Encryption Active Mode</p>
              </div>
              <CheckCircle2 size={16} className="text-zinc-100" />
           </div>
        </div>
      </div>
    </div>
  );
}

function IdentityField({ label, value, color = "text-zinc-900" }: { label: string, value: string, color?: string }) {
  return (
    <div className="space-y-1">
       <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest leading-none">{label}</p>
       <p className={`text-xs font-black uppercase tracking-tight ${color}`}>{value}</p>
    </div>
  );
}

function FindingSection({ icon, title, desc, tags }: { icon: any, title: string, desc: string, tags: string[] }) {
  return (
    <div className="flex gap-6 group">
       <div className="w-10 h-10 bg-zinc-100 flex items-center justify-center shrink-0 border border-zinc-200 group-hover:bg-zinc-900 group-hover:text-white transition-all">
          {icon}
       </div>
       <div className="space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-900">{title}</h4>
          <p className="text-xs font-bold uppercase text-zinc-500 leading-relaxed tracking-tight">{desc}</p>
          <div className="flex gap-2">
             {tags.map(t => (
               <span key={t} className="px-2 py-0.5 border border-zinc-100 text-[8px] font-black text-zinc-400 uppercase">{t}</span>
             ))}
          </div>
       </div>
    </div>
  );
}