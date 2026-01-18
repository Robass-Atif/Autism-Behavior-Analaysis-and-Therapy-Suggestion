
import React from 'react';
import { useRecentSessions } from '../../../api/clinical';
import { Play, Download, Trash2, Filter, Grid, List, Clock, Loader2 } from 'lucide-react';

export default function VideoLibraryScreen() {
  const { data: videos, isLoading } = useRecentSessions();

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 font-mono">
      <div className="flex justify-between items-center bg-white border-2 border-zinc-900 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter">Video Library</h1>
          <p className="text-zinc-500 text-xs mt-1 font-bold">SESSION RECORDINGS & ANALYSIS</p>
        </div>
        <div className="flex gap-2">
          <button className="p-2 border-2 border-zinc-200 hover:border-zinc-900 hover:bg-zinc-900 hover:text-white transition-all text-zinc-900">
            <Grid size={18} />
          </button>
          <button className="p-2 border-2 border-transparent hover:border-zinc-200 text-zinc-400 hover:text-zinc-900 transition-all">
            <List size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-20">
            <Loader2 className="animate-spin text-zinc-300" size={32} />
          </div>
        ) : videos?.sessions?.map((video) => (
          <div key={video.id} className="bg-white border-2 border-zinc-200 p-4 hover:border-zinc-900 transition-colors group">
            <div className="aspect-video bg-zinc-900 relative flex items-center justify-center mb-4 border border-zinc-100 overflow-hidden">
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
              <Play className="text-white relative z-10 opacity-50 group-hover:opacity-100 transition-opacity cursor-pointer transform group-hover:scale-110 active:scale-95 duration-200" size={48} fill="currentColor" />
              <div className="absolute top-2 right-2 bg-black text-white text-[10px] font-bold px-2 py-1 uppercase tracking-wider border border-white/20">
                {video.duration}s
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white text-[10px] font-bold uppercase tracking-widest truncate">
                  {new Date(video.recordedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-zinc-900 text-sm uppercase tracking-tight">{video.actionType}</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">{video.patientName}</p>
                </div>
                <span className={`px-2 py-0.5 border text-[10px] font-bold uppercase tracking-wider ${video.qualityScore === 'High' ? 'bg-zinc-900 text-white border-zinc-900' :
                    'bg-white text-zinc-500 border-zinc-200'
                  }`}>
                  {video.qualityScore} Quality
                </span>
              </div>

              <div className="flex gap-2 pt-3 border-t border-zinc-100">
                <button className="flex-1 py-2 text-[10px] font-bold uppercase tracking-widest text-white bg-zinc-900 hover:bg-zinc-800 transition-colors border border-zinc-900">
                  Analysis
                </button>
                <button className="px-3 border text-zinc-400 hover:text-zinc-900 hover:border-zinc-900 transition-all">
                  <Download size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
