import React from 'react';
import { Download, Upload, Database, FileSpreadsheet, Lock } from 'lucide-react';

export default function DataExportImportScreen() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Data Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Export */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
           <div className="flex items-center gap-3 mb-6">
             <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><Download size={24} /></div>
             <div>
               <h3 className="font-bold text-slate-900">Export Data</h3>
               <p className="text-sm text-slate-500">Securely download patient records.</p>
             </div>
           </div>
           
           <div className="space-y-4 mb-6">
             <label className="block text-sm font-medium text-slate-700">Data Range</label>
             <select className="w-full border border-slate-300 rounded-lg p-2 text-sm"><option>All Time</option><option>Last 30 Days</option></select>
             
             <label className="block text-sm font-medium text-slate-700">Format</label>
             <div className="grid grid-cols-3 gap-3">
               <button className="border border-blue-500 bg-blue-50 text-blue-700 py-2 rounded text-sm font-medium">CSV</button>
               <button className="border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 rounded text-sm font-medium">JSON</button>
               <button className="border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 rounded text-sm font-medium">Excel</button>
             </div>
             
             <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded border border-slate-200">
               <Lock size={12} /> Exports are encrypted with AES-256. Password required to open.
             </div>
           </div>
           
           <button className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Export Archive</button>
        </div>

        {/* Import */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
           <div className="flex items-center gap-3 mb-6">
             <div className="p-3 bg-teal-100 text-teal-600 rounded-lg"><Upload size={24} /></div>
             <div>
               <h3 className="font-bold text-slate-900">Import Data</h3>
               <p className="text-sm text-slate-500">Restore or migrate data.</p>
             </div>
           </div>
           
           <div className="border-2 border-dashed border-slate-300 rounded-xl h-48 flex flex-col items-center justify-center mb-6 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
              <Database className="text-slate-400 mb-2" size={32} />
              <p className="text-sm font-medium text-slate-600">Drag & Drop .enc file here</p>
              <p className="text-xs text-slate-400">Max 500MB</p>
           </div>
           
           <button className="w-full py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800">Upload & Restore</button>
        </div>
      </div>
    </div>
  );
}