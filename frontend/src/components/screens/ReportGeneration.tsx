import React, { useState } from 'react';
import { Settings, FileText, Download, Printer, Check, ChevronDown, Lock, BarChart2 } from 'lucide-react';

export default function ReportGeneration() {
  const [config, setConfig] = useState({
    charts: true,
    tables: false,
    notes: true,
    watermark: true
  });

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden">
      {/* Left Panel: Configuration */}
      <div className="w-full md:w-5/12 lg:w-4/12 bg-white border-r border-gray-200 flex flex-col h-full z-10 shadow-lg">
        <div className="p-6 border-b border-gray-200">
           <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
             <Settings className="text-gray-500" /> Report Generator
           </h1>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
           {/* Section 1 */}
           <section>
             <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
               <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">1</span> Report Type
             </h3>
             <div className="space-y-3">
               <ReportOption label="Individual Summary" active={true} />
               <ReportOption label="Progress Report (Quarterly)" active={false} />
               <ReportOption label="Consolidated Analysis" active={false} />
             </div>
           </section>

           {/* Section 2 */}
           <section>
             <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
               <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">2</span> Content
             </h3>
             <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
                <Checkbox label="Demographics & History" checked={true} />
                <Checkbox label="Therapy Goals Status" checked={true} />
                <Checkbox label="AI Analysis Visualizations" checked={config.charts} onChange={() => setConfig({...config, charts: !config.charts})} />
                <Checkbox label="Raw Data Tables" checked={config.tables} onChange={() => setConfig({...config, tables: !config.tables})} />
                <Checkbox label="Therapist Notes" checked={config.notes} onChange={() => setConfig({...config, notes: !config.notes})} />
             </div>
           </section>

           {/* Section 3 */}
           <section>
             <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
               <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">3</span> Security
             </h3>
             <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                   <div className="flex items-center gap-2 text-sm text-gray-700">
                     <Lock size={16} className="text-gray-400" /> Password Protection
                   </div>
                   <div className="w-10 h-6 bg-gray-200 rounded-full relative cursor-pointer">
                     <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                   </div>
                </div>
                <Checkbox label="Watermark 'CONFIDENTIAL'" checked={config.watermark} onChange={() => setConfig({...config, watermark: !config.watermark})} />
             </div>
           </section>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg shadow-md hover:from-blue-700 hover:to-indigo-700 transform transition hover:-translate-y-0.5 flex items-center justify-center gap-2">
            <Download size={20} /> Generate PDF Report
          </button>
        </div>
      </div>

      {/* Right Panel: Live Preview */}
      <div className="hidden md:flex flex-1 bg-gray-800 items-center justify-center p-8 overflow-hidden relative">
        <div className="absolute top-4 right-4 flex gap-2">
          <button className="p-2 bg-gray-700 text-white rounded hover:bg-gray-600"><Printer size={20} /></button>
        </div>
        
        {/* Paper Document Simulation */}
        <div className="bg-white w-[600px] h-[800px] shadow-2xl rounded-sm p-12 flex flex-col relative overflow-hidden transform scale-90 lg:scale-100 transition-transform">
           {config.watermark && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 transform -rotate-45">
               <span className="text-8xl font-bold text-red-500 uppercase">Confidential</span>
             </div>
           )}
           
           {/* Report Header */}
           <div className="border-b-2 border-blue-800 pb-6 mb-8 flex justify-between items-end">
             <div>
               <h1 className="text-3xl font-bold text-gray-900 mb-1">Clinical Summary</h1>
               <p className="text-gray-500 text-sm">NeuroCare AI Analysis System</p>
             </div>
             <div className="text-right">
               <div className="text-sm font-bold text-blue-800">CONFIDENTIAL</div>
               <div className="text-xs text-gray-400">Gen: Oct 12, 2023</div>
             </div>
           </div>

           {/* Content Mockup */}
           <div className="space-y-6">
             <div className="flex gap-4 mb-8">
               <div className="w-24 h-24 bg-gray-100 rounded-lg"></div>
               <div>
                 <h2 className="font-bold text-lg">John Doe (7y)</h2>
                 <p className="text-sm text-gray-500">Patient ID: #114-XJ</p>
                 <div className="mt-2 flex gap-2">
                   <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">ASD Level 2</span>
                 </div>
               </div>
             </div>

             <div className="space-y-2">
               <div className="h-4 bg-gray-100 rounded w-full"></div>
               <div className="h-4 bg-gray-100 rounded w-5/6"></div>
               <div className="h-4 bg-gray-100 rounded w-4/6"></div>
             </div>

             {config.charts && (
               <div className="h-48 bg-blue-50 rounded border border-blue-100 flex items-center justify-center text-blue-300">
                 <BarChart2 size={48} />
               </div>
             )}
             
             {config.tables && (
               <div className="border border-gray-200 rounded">
                 <div className="h-8 bg-gray-50 border-b border-gray-200"></div>
                 <div className="h-8 border-b border-gray-100"></div>
                 <div className="h-8 border-b border-gray-100"></div>
               </div>
             )}

             {config.notes && (
                <div className="mt-8 p-4 bg-yellow-50 border border-yellow-100 rounded text-sm text-yellow-800">
                  <span className="font-bold">Therapist Note:</span> Patient has shown remarkable resilience this quarter. Recommend continuing current protocol.
                </div>
             )}
           </div>

           {/* Footer */}
           <div className="mt-auto border-t border-gray-200 pt-4 flex justify-between items-center text-xs text-gray-400">
             <span>Page 1 of 4</span>
             <span>Dr. Sarah Williams, MD</span>
           </div>
        </div>
      </div>
    </div>
  );
}

const ReportOption = ({ label, active }: any) => (
  <div className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${active ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
    <span className={`text-sm font-medium ${active ? 'text-blue-700' : 'text-gray-700'}`}>{label}</span>
    {active && <Check size={16} className="text-blue-600" />}
  </div>
);

const Checkbox = ({ label, checked, onChange }: any) => (
  <div className="flex items-center gap-3" onClick={onChange}>
    <div className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${checked ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
      {checked && <Check size={14} className="text-white" />}
    </div>
    <span className="text-sm text-gray-700 cursor-pointer select-none">{label}</span>
  </div>
);