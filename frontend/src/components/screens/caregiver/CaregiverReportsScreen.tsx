import React from 'react';
import { FileText, Download, Lock, ShieldCheck, ChevronRight } from 'lucide-react';

export default function CaregiverReportsScreen() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 font-mono selection:bg-zinc-100 p-8 md:p-12 animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <header className="mb-12 border-b border-zinc-100 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-400 mb-2">SHARED DOCUMENTATION</h3>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Clinical Reports</h1>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-2 underline decoration-zinc-100 underline-offset-4">
              SECURE LINK TO THERAPIST ANALYSIS
            </p>
          </div>
          <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-100 px-4 py-2 text-[10px] font-black uppercase text-zinc-500 tracking-widest">
            <Lock size={12} className="text-zinc-900" /> Secure Access Only
          </div>
        </header>

        {/* Global Notice */}
        <div className="mb-12 border-l-4 border-zinc-900 bg-zinc-50 p-6 flex items-start gap-4">
          <ShieldCheck className="text-zinc-900 mt-0.5" size={20} />
          <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed text-zinc-600">
            These diagnostic summaries has been shared by your primary therapist.
            Technical metrics are processed for caregiver readability.
            Contact support if document integrity is compromised.
          </p>
        </div>

        {/* Reports Registry */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-6">REGISTRY ENTRIES</h3>

          {[
            { id: 1, title: 'Monthly Progress Summary OCT 2023', date: '2023.10.25', author: 'DR SARAH' },
            { id: 2, title: 'Behavioral Interaction Report SEP 2023', date: '2023.09.12', author: 'DR SARAH' }
          ].map(report => (
            <div key={report.id} className="border border-zinc-100 p-8 flex flex-col md:flex-row md:items-center justify-between gap-8 hover:bg-zinc-50 hover:border-zinc-300 transition-all group relative cursor-pointer">
              {/* Corner Accent */}
              <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100">
                <div className="w-1.5 h-1.5 bg-zinc-900"></div>
              </div>

              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 group-hover:text-zinc-900 group-hover:border-zinc-900 transition-colors">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight mb-2 group-hover:translate-x-1 transition-transform">{report.title}</h3>
                  <div className="flex items-center gap-4 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                    <span>DATE RELEASED: {report.date}</span>
                    <span>AUTHOR ID: {report.author}</span>
                  </div>
                </div>
              </div>

              <button className="flex items-center gap-3 bg-zinc-900 text-white px-8 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all group-hover:translate-y-[-2px] shadow-lg shadow-zinc-900/10">
                <Download size={14} /> Download Binary
              </button>
            </div>
          ))}
        </div>

        {/* Bottom Metadata */}
        <footer className="mt-24 pt-8 border-t border-zinc-100 flex justify-between">
          <div className="text-[8px] font-black text-zinc-300 uppercase tracking-[0.5em]">SYSTEM FS EXT4 | ENCRYPTED</div>
          <div className="text-[8px] font-black text-zinc-300 uppercase tracking-[0.5em]">HASH CHECK OK</div>
        </footer>

      </div>
    </div>
  );
}