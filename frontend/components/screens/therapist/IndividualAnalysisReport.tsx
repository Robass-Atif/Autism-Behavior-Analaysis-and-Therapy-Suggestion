import React from 'react';
import { FileText, Calendar, User, Printer, Share2, Download, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const movementData = [
  { time: '0s', score: 20 },
  { time: '5s', score: 45 },
  { time: '10s', score: 65 },
  { time: '15s', score: 55 },
  { time: '20s', score: 80 },
  { time: '25s', score: 75 },
  { time: '30s', score: 90 },
];

export default function IndividualAnalysisReport() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
             <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">RPT-2023-894</span>
             <span>•</span>
             <span>Generated Oct 12, 2023</span>
           </div>
           <h1 className="text-3xl font-bold text-gray-900">Video Analysis Report</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-500 hover:bg-white hover:shadow-sm rounded-lg border border-transparent hover:border-gray-200"><Printer size={20} /></button>
          <button className="p-2 text-gray-500 hover:bg-white hover:shadow-sm rounded-lg border border-transparent hover:border-gray-200"><Share2 size={20} /></button>
          <button className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm">
            <Download size={18} /> Export PDF
          </button>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white rounded-lg shadow-sm text-blue-600">
            <FileText size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Executive Summary</h2>
            <p className="text-gray-700 leading-relaxed">
              Patient #114 demonstrated significant improvement in arm motor control compared to baseline. 
              AI analysis detected a <span className="font-semibold text-green-700">15% increase</span> in motion fluidity. 
              However, repetitive behaviors were noted at the 32-second mark, indicating potential sensory overload triggers.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Col: Key Findings */}
        <div className="md:col-span-2 space-y-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6 border-l-4 border-teal-500 pl-3">Observed Patterns</h3>
            <div className="space-y-6">
              <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="mt-1"><TrendingUp className="text-green-600" size={20} /></div>
                <div>
                  <h4 className="font-bold text-gray-900">Improved Range of Motion</h4>
                  <p className="text-sm text-gray-600 mt-1">Right arm extension reached 145 degrees, consistently within typical range for 3 consecutive attempts.</p>
                </div>
              </div>
              <div className="flex gap-4 p-4 bg-amber-50 rounded-lg border border-amber-100">
                <div className="mt-1"><AlertTriangle className="text-amber-600" size={20} /></div>
                <div>
                  <h4 className="font-bold text-gray-900">Self-Stimulatory Behavior</h4>
                  <p className="text-sm text-gray-600 mt-1">Brief episodes of hand flapping observed post-task, duration 4.5 seconds.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6 border-l-4 border-blue-500 pl-3">Movement Analysis</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={movementData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1E40AF" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#1E40AF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="time" tick={{fontSize: 12}} />
                  <YAxis tick={{fontSize: 12}} />
                  <Tooltip />
                  <Area type="monotone" dataKey="score" stroke="#1E40AF" fillOpacity={1} fill="url(#colorScore)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">Time (seconds) vs. Motion Fluidity Score</p>
          </div>
        </div>

        {/* Right Col: AI Stats & Metadata */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">AI Confidence</h3>
            <div className="flex flex-col items-center justify-center py-4">
               <div className="relative w-32 h-32 flex items-center justify-center">
                 <svg className="w-full h-full transform -rotate-90">
                   <circle cx="64" cy="64" r="56" stroke="#f3f4f6" strokeWidth="12" fill="transparent" />
                   <circle cx="64" cy="64" r="56" stroke="#10b981" strokeWidth="12" fill="transparent" strokeDasharray="351.8" strokeDashoffset="50" strokeLinecap="round" />
                 </svg>
                 <div className="absolute text-center">
                   <span className="block text-3xl font-bold text-gray-900">86%</span>
                   <span className="text-xs text-gray-500">Confidence</span>
                 </div>
               </div>
               <p className="text-xs text-center text-gray-500 mt-4 px-4">
                 Based on 1.2M labeled frames in dataset v2.4. Model uncertainty within acceptable clinical range.
               </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
             <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Clinical Metadata</h3>
             <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Patient ID</span>
                  <span className="font-medium">PT-114-XJ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">DOB</span>
                  <span className="font-medium">12/05/2018</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Caregiver</span>
                  <span className="font-medium">Jane Doe</span>
                </div>
                 <div className="flex justify-between">
                  <span className="text-gray-500">Diagnosis</span>
                  <span className="font-medium">ASD Level 2</span>
                </div>
             </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Therapist Actions</h3>
            <textarea 
              className="w-full text-sm border border-gray-300 rounded-lg p-3 h-32 focus:ring-2 focus:ring-blue-500 mb-4"
              placeholder="Add clinical override notes..."
            ></textarea>
            <button className="w-full py-2 bg-green-600 text-white font-bold rounded-lg shadow-sm hover:bg-green-700 flex items-center justify-center gap-2 text-sm">
               <CheckCircle size={16} /> Approve & Sign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}