import React, { useState } from 'react';
import { 
  CheckCircle2, AlertCircle, Save, Send, Eye, Brain, 
  ShieldCheck, MessageSquare, AlertTriangle, FileText,
  Sliders, Activity, Zap, History, Settings, ChevronRight
} from 'lucide-react';
import { VideoSession as Session, Screen } from '../../../types';
import { useSubmitTherapistReview, usePublishReport } from '../../../api/clinical';
import toast from 'react-hot-toast';

interface TherapistReviewPanelProps {
  session: Session;
  onNavigate?: (screen: Screen, data?: any) => void;
}

export default function TherapistReviewPanel({ session, onNavigate }: TherapistReviewPanelProps) {
  const [overrideSeverity, setOverrideSeverity] = useState<number | ''>(session.therapistReview?.overrideSeverity || '');
  const [reviewNotes, setReviewNotes] = useState(session.therapistReview?.reviewNotes || '');
  const [therapyPlanAdjustments, setTherapyPlanAdjustments] = useState(session.therapistReview?.therapyPlanAdjustments || '');
  
  const submitReview = useSubmitTherapistReview();
  const publishReport = usePublishReport();

  const handleSubmitReview = async () => {
    try {
      await submitReview.mutateAsync({
        id: session.id,
        data: {
          overrideSeverity: overrideSeverity !== '' ? Number(overrideSeverity) : undefined,
          reviewNotes,
          therapyPlanAdjustments,
        },
      });
      toast.success('Clinical validation sequence stored');
    } catch (err: any) {
      toast.error(err?.message || 'IO TRANSFER FAILED');
    }
  };

  const handlePublish = async () => {
    try {
      await publishReport.mutateAsync(session.id);
      toast.success('Report broadcasted to Caretaker Portal');
    } catch (err: any) {
      toast.error(err?.message || 'BROADCAST FAILED');
    }
  };

  return (
    <div className="space-y-10 font-mono">
      {/* Neural Override Control */}
      <div className="bg-zinc-900 border-b-4 border-zinc-800 p-8 text-white relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="absolute top-0 right-0 p-8 opacity-5"><ShieldCheck size={120} /></div>
        <div className="relative z-10">
          <h2 className="text-2xl font-black uppercase tracking-tighter">Clinical Validation Console</h2>
          <p className="text-zinc-500 text-[9px] font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
            <Zap size={14} className="text-blue-500 animate-pulse" /> Manual Neural Sync Enabled
          </p>
        </div>
        <div className="flex items-center gap-3 bg-zinc-950 p-2 border border-zinc-800 relative z-10 shrink-0">
          <button 
            onClick={handleSubmitReview}
            disabled={submitReview.isPending}
            className="px-6 py-3 bg-white text-zinc-900 font-black text-[10px] uppercase tracking-widest hover:bg-zinc-100 transition-all flex items-center gap-2"
          >
            {submitReview.isPending ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />} Store Matrix
          </button>
          <button 
            disabled={session.status === 'published' || publishReport.isPending}
            onClick={handlePublish}
            className="px-6 py-3 bg-zinc-800 text-zinc-400 border border-zinc-700 font-black text-[10px] uppercase tracking-widest hover:text-white hover:border-white transition-all flex items-center gap-2 disabled:opacity-30 disabled:pointer-events-none"
          >
            <Send size={12} /> Broadcast
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         {/* Decision Matrix */}
         <div className="space-y-10">
            <section className="bg-white border-2 border-zinc-900 p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
               <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                  <Sliders size={14} className="text-zinc-900" /> Neural Weight Adjustment
               </h3>
               <div className="space-y-6">
                  <div>
                    <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-3">Target_Severity_Level (1-10)</label>
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <button
                          key={num}
                          onClick={() => setOverrideSeverity(num)}
                          className={`w-10 h-10 border-2 font-black text-xs transition-all flex items-center justify-center ${
                            overrideSeverity === num 
                            ? 'bg-zinc-900 text-white border-zinc-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] scale-110 z-10' 
                            : 'bg-white text-zinc-400 border-zinc-100 hover:border-zinc-900'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 bg-zinc-50 border-l-4 border-zinc-900">
                     <p className="text-[9px] font-bold text-zinc-500 uppercase leading-relaxed font-mono">
                        "OVERRIDE NOTICE: Adjusting weight values will immediately recalibrate longitudinal trending data for this patient identifier."
                     </p>
                  </div>
               </div>
            </section>

            <section className="bg-white border-2 border-zinc-900 p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
               <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                  <Activity size={14} className="text-zinc-900" /> Plan Recalibration
               </h3>
               <textarea
                 value={therapyPlanAdjustments}
                 onChange={(e) => setTherapyPlanAdjustments(e.target.value)}
                 placeholder="INPUT ADAPTIVE INSTRUCTIONS..."
                 className="w-full h-40 p-6 bg-zinc-50 border-2 border-zinc-200 focus:border-zinc-900 outline-none text-xs font-bold uppercase tracking-tight transition-all font-mono leading-relaxed"
               />
            </section>
         </div>

         {/* Contextual Narrative */}
         <div className="space-y-10">
            <section className="bg-white border-2 border-zinc-900 p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
               <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                  <MessageSquare size={14} className="text-zinc-900" /> Analyst Observations
               </h3>
               <textarea
                 value={reviewNotes}
                 onChange={(e) => setReviewNotes(e.target.value)}
                 placeholder="INPUT QUALITATIVE DATA HERE..."
                 className="w-full h-40 p-6 bg-zinc-50 border-2 border-zinc-200 focus:border-zinc-900 outline-none text-xs font-bold uppercase tracking-tight transition-all font-mono leading-relaxed"
               />
               <div className="mt-6 flex items-center gap-2 text-[8px] font-black text-zinc-400 uppercase tracking-widest border-t pt-4">
                  <CheckCircle2 size={12} className="text-zinc-300" /> SHA RECORD READY
               </div>
            </section>

            {/* Evidence Linkages */}
            <div className="p-8 border-2 border-dashed border-zinc-300 flex flex-col items-center text-center">
               <Brain size={40} strokeWidth={1} className="text-zinc-200 mb-4" />
               <h4 className="text-[10px] font-black text-zinc-900 uppercase tracking-[0.2em] mb-2">Neural Evidence Mapping</h4>
               <p className="text-[9px] font-bold text-zinc-400 uppercase max-w-xs leading-relaxed">
                  Mapping session kinematics against clinical baselines to ensure validation accuracy {'>'} 0.99.
               </p>
               <button className="mt-6 text-[9px] font-black text-zinc-900 underline underline-offset-4 flex items-center gap-1 hover:gap-3 transition-all">
                  VIEW RAW DATAPOINTS <ChevronRight size={10} />
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}

function Loader2({ className, size }: { className?: string, size?: number }) {
   return (
      <div className={`${className} border-2 border-zinc-900 border-t-transparent animate-spin`} style={{ width: size, height: size }}></div>
   )
}
