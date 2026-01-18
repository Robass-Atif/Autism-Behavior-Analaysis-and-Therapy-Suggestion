import React, { useState } from 'react';
import { Settings, FileText, Download, Printer, Check, ChevronDown, Lock, BarChart2, CheckSquare, Square } from 'lucide-react';

export default function ReportGeneration() {
  const [config, setConfig] = useState({
    charts: true,
    tables: false,
    notes: true,
    watermark: true
  });

  return (
    <div className="flex h-full bg-zinc-100 overflow-hidden font-mono">
      {/* Left Panel: Configuration */}
      <div className="w-full md:w-5/12 lg:w-4/12 bg-white border-r-2 border-zinc-200 flex flex-col h-full z-10">
        <div className="p-6 border-b-2 border-zinc-200">
          <h1 className="text-xl font-black text-zinc-900 flex items-center gap-3 uppercase tracking-tighter">
            <Settings className="text-zinc-900" /> Report Generator
          </h1>
          <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mt-1">CONFIGURE & EXPORT CLINICAL DATA</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Section 1 */}
          <section>
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-5 h-5 bg-zinc-900 text-white flex items-center justify-center text-[10px]">1</span> Report Type
            </h3>
            <div className="space-y-3">
              <ReportOption label="Individual Summary" active={true} />
              <ReportOption label="Progress Report (Quarterly)" active={false} />
              <ReportOption label="Consolidated Analysis" active={false} />
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-5 h-5 bg-zinc-900 text-white flex items-center justify-center text-[10px]">2</span> Content
            </h3>
            <div className="bg-zinc-50 p-4 space-y-3 border-2 border-zinc-100">
              <Checkbox label="Demographics & History" checked={true} />
              <Checkbox label="Therapy Goals Status" checked={true} />
              <Checkbox label="AI Analysis Visualizations" checked={config.charts} onChange={() => setConfig({ ...config, charts: !config.charts })} />
              <Checkbox label="Raw Data Tables" checked={config.tables} onChange={() => setConfig({ ...config, tables: !config.tables })} />
              <Checkbox label="Therapist Notes" checked={config.notes} onChange={() => setConfig({ ...config, notes: !config.notes })} />
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-5 h-5 bg-zinc-900 text-white flex items-center justify-center text-[10px]">3</span> Security
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border-2 border-zinc-200">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-zinc-700">
                  <Lock size={14} className="text-zinc-400" /> Password Protection
                </div>
                <div className="w-10 h-6 bg-zinc-200 rounded-none relative cursor-pointer border border-zinc-300">
                  <div className="absolute left-0.5 top-0.5 w-4 h-[18px] bg-white border border-zinc-400 shadow-sm"></div>
                </div>
              </div>
              <Checkbox label="Watermark 'CONFIDENTIAL'" checked={config.watermark} onChange={() => setConfig({ ...config, watermark: !config.watermark })} />
            </div>
          </section>
        </div>

        <div className="p-6 border-t-2 border-zinc-200 bg-zinc-50">
          <button className="w-full py-3 bg-zinc-900 text-white font-bold text-xs uppercase tracking-widest hover:bg-zinc-800 flex items-center justify-center gap-2 transition-all">
            <Download size={16} /> Generate PDF Report
          </button>
        </div>
      </div>

      {/* Right Panel: Live Preview */}
      <div className="hidden md:flex flex-1 bg-zinc-100 items-center justify-center p-8 overflow-hidden relative">
        <div className="absolute top-4 right-4 flex gap-2">
          <button className="p-2 border-2 border-zinc-300 bg-white text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 transition-all"><Printer size={20} /></button>
        </div>

        {/* Paper Document Simulation */}
        <div className="bg-white w-[600px] h-[800px] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] border border-zinc-200 p-12 flex flex-col relative overflow-hidden transform scale-90 lg:scale-100 transition-transform">
          {config.watermark && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 transform -rotate-45">
              <span className="text-8xl font-black text-zinc-900 uppercase">Confidential</span>
            </div>
          )}

          {/* Report Header */}
          <div className="border-b-4 border-zinc-900 pb-6 mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-black text-zinc-900 mb-1 uppercase tracking-tighter">Clinical Summary</h1>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">NeuroCare AI Analysis System</p>
            </div>
            <div className="text-right">
              <div className="text-sm font-black text-zinc-900 uppercase tracking-widest border-2 border-zinc-900 px-2 py-1 inline-block">CONFIDENTIAL</div>
              <div className="text-[10px] text-zinc-400 mt-1 font-mono">GEN: {new Date().toLocaleDateString()}</div>
            </div>
          </div>

          {/* Content Mockup */}
          <div className="space-y-8 font-serif">
            <div className="flex gap-4 mb-8">
              <div className="w-24 h-24 bg-zinc-100 border border-zinc-200"></div>
              <div>
                <h2 className="font-bold text-xl text-zinc-900">John Doe (7y)</h2>
                <p className="text-sm text-zinc-500 font-mono mt-1">Patient ID: #114-XJ</p>
                <div className="mt-3 flex gap-2">
                  <span className="bg-zinc-900 text-white text-[10px] px-2 py-1 font-bold uppercase tracking-widest">ASD Level 2</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="h-3 bg-zinc-100 w-full"></div>
              <div className="h-3 bg-zinc-100 w-5/6"></div>
              <div className="h-3 bg-zinc-100 w-4/6"></div>
            </div>

            {config.charts && (
              <div className="h-48 bg-zinc-50 border-2 border-zinc-100 flex items-center justify-center text-zinc-300">
                <BarChart2 size={48} />
              </div>
            )}

            {config.tables && (
              <div className="border-2 border-zinc-900">
                <div className="h-8 bg-zinc-100 border-b-2 border-zinc-900"></div>
                <div className="h-8 border-b border-zinc-100"></div>
                <div className="h-8 border-b border-zinc-100"></div>
              </div>
            )}

            {config.notes && (
              <div className="mt-8 p-6 bg-zinc-50 border-l-4 border-zinc-900 text-sm text-zinc-700 italic">
                <span className="font-bold not-italic block mb-2 uppercase text-xs tracking-wider">Therapist Note:</span>
                "Patient has shown remarkable resilience this quarter. Recommend continuing current protocol."
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-auto border-t-2 border-zinc-100 pt-4 flex justify-between items-center text-[10px] text-zinc-400 font-mono uppercase">
            <span>Page 1 of 4</span>
            <span>Dr. Sarah Williams, MD // NeuroCare</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const ReportOption = ({ label, active }: any) => (
  <div className={`p-4 border-2 cursor-pointer transition-all flex items-center justify-between group ${active ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 hover:border-zinc-900'}`}>
    <span className={`text-xs font-bold uppercase tracking-wider ${active ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-900'}`}>{label}</span>
    {active && <Check size={16} className="text-white" />}
  </div>
);

const Checkbox = ({ label, checked, onChange }: any) => (
  <div className="flex items-center gap-3 cursor-pointer group" onClick={onChange}>
    <div className={`w-5 h-5 border-2 flex items-center justify-center transition-colors ${checked ? 'bg-zinc-900 border-zinc-900' : 'bg-white border-zinc-300 group-hover:border-zinc-500'}`}>
      {checked && <Check size={12} className="text-white" />}
    </div>
    <span className="text-xs font-bold uppercase tracking-wide text-zinc-600 group-hover:text-zinc-900 select-none">{label}</span>
  </div>
);
