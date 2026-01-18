import React, { useState } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Maximize, Volume2, 
  ChevronRight, ChevronLeft, Flag, CheckCircle, Activity
} from 'lucide-react';

export default function VideoReviewInterface() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Library */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 hidden lg:flex flex-col">
          <div className="p-4 border-b border-gray-700">
             <h3 className="text-gray-300 font-semibold text-sm">Session Library</h3>
             <select className="mt-2 w-full bg-gray-900 border border-gray-600 text-gray-300 text-xs rounded p-2">
               <option>All Sessions</option>
               <option>This Week</option>
             </select>
          </div>
          <div className="flex-1 overflow-y-auto">
             {[1, 2, 3, 4].map((i) => (
               <div key={i} className={`p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-700/50 ${i === 1 ? 'bg-blue-900/30 border-l-4 border-l-blue-500' : ''}`}>
                 <div className="aspect-video bg-gray-900 rounded mb-2 relative">
                   <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1 rounded">00:45</span>
                 </div>
                 <p className="text-gray-200 text-sm font-medium">Arm Swing - Right</p>
                 <p className="text-gray-500 text-xs mt-1">Oct 12, 10:30 AM</p>
               </div>
             ))}
          </div>
        </div>

        {/* Center Panel: Video Player */}
        <div className="flex-1 flex flex-col relative bg-black">
          {/* Metadata Bar */}
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 z-10 flex justify-between items-start">
            <div>
              <h2 className="text-white font-bold text-lg">Arm Swing Analysis - Session #42</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 bg-blue-600/80 text-white text-xs rounded">Patient #114</span>
                <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">Oct 12, 2023</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
               <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs font-bold uppercase">Quality: High</span>
            </div>
          </div>

          {/* Video Area */}
          <div className="flex-1 flex items-center justify-center relative">
             <div className="w-3/4 aspect-video bg-gray-800 rounded-lg flex items-center justify-center relative group cursor-pointer" onClick={() => setIsPlaying(!isPlaying)}>
                {/* AI Overlay Bounding Box Simulation */}
                <div className="absolute w-32 h-48 border-2 border-blue-500/50 rounded top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                   <div className="absolute -top-6 left-0 bg-blue-600 text-white text-[10px] px-1 rounded">Arm Angle: 45°</div>
                   {/* Skeleton Points */}
                   <div className="absolute top-4 left-1/2 w-2 h-2 bg-blue-400 rounded-full"></div>
                   <div className="absolute top-12 left-8 w-2 h-2 bg-blue-400 rounded-full"></div>
                   <div className="absolute top-12 right-8 w-2 h-2 bg-blue-400 rounded-full"></div>
                </div>
                {!isPlaying && <Play size={64} className="text-white/80 fill-current" />}
             </div>
          </div>

          {/* Controls */}
          <div className="bg-gray-900 p-4 border-t border-gray-800">
             {/* Scrubber */}
             <div className="relative h-1.5 bg-gray-700 rounded-full cursor-pointer mb-4 group">
               <div className="absolute top-0 left-0 h-full w-1/3 bg-blue-500 rounded-full"></div>
               <div className="absolute top-1/2 left-1/3 w-3 h-3 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"></div>
               {/* Event Markers */}
               <div className="absolute top-0 left-[20%] w-1 h-1.5 bg-yellow-500"></div>
               <div className="absolute top-0 left-[60%] w-1 h-1.5 bg-red-500"></div>
             </div>

             <div className="flex items-center justify-between">
               <div className="flex items-center gap-4 text-gray-400">
                 <button className="hover:text-white" onClick={() => setIsPlaying(!isPlaying)}>
                   {isPlaying ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current" />}
                 </button>
                 <div className="flex items-center gap-2">
                    <span className="text-xs font-mono">00:15 / 00:45</span>
                 </div>
                 <div className="flex items-center gap-2 ml-4">
                    <button className="hover:text-white"><SkipBack size={20} /></button>
                    <button className="hover:text-white"><SkipForward size={20} /></button>
                 </div>
               </div>

               <div className="flex items-center gap-4 text-gray-400">
                 <select className="bg-transparent text-xs font-medium border border-gray-700 rounded px-1 py-0.5">
                   <option>1.0x</option>
                   <option>0.5x</option>
                   <option>0.25x</option>
                 </select>
                 <Volume2 size={20} />
                 <Maximize size={20} />
               </div>
             </div>
          </div>
        </div>

        {/* Right Panel: AI Analysis */}
        <div className={`bg-white border-l border-gray-200 flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-96' : 'w-0 overflow-hidden'}`}>
           <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
             <div className="flex items-center gap-2">
               <Activity className="text-blue-600" size={18} />
               <h3 className="font-bold text-gray-800">AI Analysis</h3>
             </div>
             <button onClick={() => setSidebarOpen(false)} className="lg:hidden"><ChevronRight size={20} /></button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 space-y-6">
             {/* Confidence Score */}
             <div className="flex items-center gap-4">
               <div className="relative w-16 h-16 flex items-center justify-center">
                 <svg className="w-full h-full transform -rotate-90">
                   <circle cx="32" cy="32" r="28" stroke="#e5e7eb" strokeWidth="6" fill="transparent" />
                   <circle cx="32" cy="32" r="28" stroke="#10b981" strokeWidth="6" fill="transparent" strokeDasharray="175.9" strokeDashoffset="35" />
                 </svg>
                 <span className="absolute text-sm font-bold text-gray-900">82%</span>
               </div>
               <div>
                 <p className="text-sm font-medium text-gray-500">Confidence Score</p>
                 <p className="text-xs text-green-600 font-semibold">High Reliability</p>
               </div>
             </div>

             {/* Key Findings */}
             <div>
               <h4 className="text-sm font-bold text-gray-900 mb-2">Key Findings</h4>
               <ul className="space-y-3">
                 <li className="flex gap-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0"></div>
                    <span>Limited range of motion in left elbow during extension (00:15)</span>
                 </li>
                 <li className="flex gap-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></div>
                    <span>Repetitive hand flapping detected (00:32 - 00:38)</span>
                 </li>
               </ul>
             </div>

             {/* Clinical Notes Input */}
             <div>
               <h4 className="text-sm font-bold text-gray-900 mb-2">Clinical Notes</h4>
               <textarea className="w-full text-sm p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" rows={4} placeholder="Add your observations..."></textarea>
               <div className="flex gap-2 mt-2">
                  <button className="flex-1 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 flex items-center justify-center gap-1">
                    <Flag size={14} /> Mark Frame
                  </button>
                  <button className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 flex items-center justify-center gap-1">
                     Save Note
                  </button>
               </div>
             </div>
           </div>
           
           <div className="p-4 border-t border-gray-200 bg-gray-50">
             <button className="w-full py-3 bg-green-600 text-white font-bold rounded-lg shadow-sm hover:bg-green-700 flex items-center justify-center gap-2">
               <CheckCircle size={18} /> Mark as Reviewed
             </button>
           </div>
        </div>

        {/* Floating Toggle for Sidebar */}
        {!sidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(true)}
            className="absolute top-1/2 right-0 bg-white p-2 rounded-l-lg shadow-lg text-gray-600 hover:text-blue-600 z-20"
          >
            <ChevronLeft size={20} />
          </button>
        )}
      </div>
    </div>
  );
}