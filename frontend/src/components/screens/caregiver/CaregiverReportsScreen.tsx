import React from 'react';
import { FileText, Download, Lock } from 'lucide-react';

export default function CaregiverReportsScreen() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
       <h1 className="text-2xl font-bold text-slate-900">My Reports</h1>
       <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-center gap-3 text-blue-800 text-sm">
         <Lock size={16} /> These reports have been shared by your therapist. Technical details are hidden.
       </div>

       <div className="grid gap-4">
         {[1, 2].map(i => (
           <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
             <div className="flex items-center gap-4">
               <div className="p-3 bg-slate-100 rounded-lg text-slate-500"><FileText size={24} /></div>
               <div>
                 <h3 className="font-bold text-slate-900">Monthly Progress Summary - Oct 2023</h3>
                 <p className="text-sm text-slate-500">Shared by Dr. Sarah on Oct 25</p>
               </div>
             </div>
             <button className="flex items-center gap-2 text-blue-600 font-medium hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors">
               <Download size={18} /> Download PDF
             </button>
           </div>
         ))}
       </div>
    </div>
  );
}