
import React from 'react';
import { useRecentSessions } from '../../../api/clinical';
import { Play, Download, Trash2, Filter, Grid, List } from 'lucide-react';

export default function VideoLibraryScreen() {
  const { data: videos, isLoading } = useRecentSessions();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Video Library</h1>
        <div className="flex gap-2">
           <button className="p-2 border rounded hover:bg-slate-50"><Grid size={18} /></button>
           <button className="p-2 border rounded hover:bg-slate-50 bg-slate-100"><List size={18} /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? <p>Loading...</p> : videos?.map((video) => (
          <div key={video.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group">
            <div className="aspect-video bg-slate-900 relative flex items-center justify-center">
              <Play className="text-white opacity-50 group-hover:opacity-100 transition-opacity cursor-pointer" size={48} />
              <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">{video.duration}s</span>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-slate-900 text-sm">{video.actionType}</h3>
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${video.qualityScore === 'High' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{video.qualityScore} Quality</span>
              </div>
              <p className="text-xs text-slate-500 mb-3">{new Date(video.recordedAt).toLocaleDateString()} • {video.patientName}</p>
              <div className="flex gap-2 border-t border-slate-100 pt-3">
                 <button className="flex-1 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded">Analysis</button>
                 <button className="p-1.5 text-slate-400 hover:text-blue-600"><Download size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
