import React, { useState } from 'react';
import { Layers, ArrowRight, BarChart2 } from 'lucide-react';
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
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consolidated Progress Report</h1>
          <p className="text-gray-500 mt-1">Q2 2023 Analysis • Patient: John Doe</p>
        </div>
        <div className="flex items-center gap-3 bg-gray-100 p-1 rounded-lg">
           <button 
             onClick={() => setViewMode('technical')}
             className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'technical' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
           >
             Technical
           </button>
           <button 
             onClick={() => setViewMode('friendly')}
             className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'friendly' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
           >
             Patient-Friendly
           </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-6 text-white shadow-lg">
          <p className="text-blue-100 font-medium mb-1">Total Sessions</p>
          <div className="text-4xl font-bold">24</div>
          <p className="text-sm text-blue-100 mt-4 bg-blue-600/50 inline-block px-2 py-1 rounded">+4 from last quarter</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
           <p className="text-gray-500 font-medium mb-1">Overall Progress</p>
           <div className="text-4xl font-bold text-green-600">72%</div>
           <p className="text-sm text-gray-400 mt-4">Average goal attainment</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
           <p className="text-gray-500 font-medium mb-1">Priority Areas</p>
           <div className="text-4xl font-bold text-amber-500">2</div>
           <p className="text-sm text-gray-400 mt-4">Requiring attention</p>
        </div>
      </div>

      {/* Progress Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Longitudinal Progress</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              <Legend />
              <Bar dataKey="engagement" name="Social Engagement" fill="#1E40AF" radius={[4, 4, 0, 0]} />
              <Bar dataKey="motor" name="Motor Skills" fill="#14B8A6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Priority Areas */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Priority Areas for Clinical Attention</h3>
        
        <div className="bg-red-50 border border-red-100 rounded-xl p-6 flex flex-col md:flex-row gap-6">
           <div className="flex-shrink-0">
             <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold">
               !
             </div>
           </div>
           <div className="flex-1">
             <div className="flex justify-between items-start">
               <h4 className="text-lg font-bold text-red-900">Fine Motor Control Regression</h4>
               <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full uppercase">High Priority</span>
             </div>
             <p className="text-red-800 mt-2 mb-4">
               {viewMode === 'technical' 
                 ? 'Pincer grasp latency increased by 200ms over last 3 sessions. Deviation from baseline > 2 SD.' 
                 : 'We noticed John is taking a bit longer to pick up small objects with his fingers recently. This is something we want to focus on to help him get back to his usual speed.'}
             </p>
             <button className="text-red-700 text-sm font-semibold flex items-center gap-1 hover:underline">
               View Recommended Interventions <ArrowRight size={16} />
             </button>
           </div>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-xl p-6 flex flex-col md:flex-row gap-6">
           <div className="flex-shrink-0">
             <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-bold">
               2
             </div>
           </div>
           <div className="flex-1">
             <div className="flex justify-between items-start">
               <h4 className="text-lg font-bold text-amber-900">Sensory Processing Sensitivity</h4>
               <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full uppercase">Medium Priority</span>
             </div>
             <p className="text-amber-800 mt-2">
                {viewMode === 'technical'
                 ? 'Auditory hypersensitivity observed in 40% of sessions containing background noise > 60dB.'
                 : 'John seems to be more sensitive to loud noises lately. We might want to try some quiet environment exercises.'}
             </p>
           </div>
        </div>
      </div>
    </div>
  );
}