import React, { useState } from 'react';
import { useRecentSessions } from '../../../api/clinical';
import { usePatients } from '../../../api/patient';
import { getFileUrl } from '../../../config/apiConfig';
import {
  Play, Grid, List, Clock, Loader2, Brain, Search,
  Calendar, TrendingUp, Award, Sparkles, Eye, Filter, User, Target, X, Activity
} from 'lucide-react';

export default function VideoLibraryScreen() {
  const { data: videos, isLoading } = useRecentSessions();
  const { data: patientsData } = usePatients({ limit: 100 });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPatient, setFilterPatient] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');

  const GUIDED_ACTIONS = [
    { id: 'arm_swing_left', name: 'Arm Swing Left' },
    { id: 'arm_swing_right', name: 'Arm Swing Right' },
    { id: 'body_swing', name: 'Body Swing' },
    { id: 'chest_expansion', name: 'Chest Expansion' },
    { id: 'sing_and_clap', name: 'Sing and Clap' },
    { id: 'drumming', name: 'Drumming' },
    { id: 'frog_pose', name: 'Frog Pose' },
    { id: 'arm_rotation', name: 'Arm Rotation' },
    { id: 'head_tilt', name: 'Head Tilt' },
    { id: 'finger_tapping', name: 'Finger Tapping' },
    { id: 'jump_test', name: 'Jump Test' },
  ];

  const handleViewVideo = (videoId: string) => {
    window.location.href = `/videos/${videoId}`;
  };

  const getStatusStyle = (status?: string) => {
    switch (status) {
      case 'analyzed':
        return 'bg-zinc-900 text-white border-zinc-900';
      case 'processing':
        return 'bg-amber-500 text-white border-amber-500 animate-pulse';
      case 'uploaded':
        return 'bg-zinc-400 text-white border-zinc-400';
      case 'reviewed':
        return 'bg-green-600 text-white border-green-600';
      default:
        return 'bg-zinc-200 text-zinc-700 border-zinc-300';
    }
  };

  const getQualityStyle = (quality?: string) => {
    switch (quality?.toLowerCase()) {
      case 'high':
        return 'bg-zinc-900 text-white border-zinc-900';
      case 'medium':
        return 'bg-zinc-600 text-white border-zinc-600';
      case 'low':
        return 'bg-zinc-400 text-white border-zinc-400';
      default:
        return 'bg-zinc-200 text-zinc-700 border-zinc-300';
    }
  };

  const filteredVideos = videos?.sessions?.filter(video => {
    const matchesSearch =
      (video.actionType?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (video.patientName?.toLowerCase() || '').includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' || video.status === filterStatus;
    const matchesPatient = filterPatient === 'all' || video.patientId === filterPatient;

    // Action filter matches either the ID or the Label
    const matchesAction = filterAction === 'all' ||
      video.actionType === filterAction ||
      GUIDED_ACTIONS.find(a => a.id === filterAction)?.name === video.actionType;

    return matchesSearch && matchesStatus && matchesPatient && matchesAction;
  });

  const stats = {
    total: videos?.sessions?.length || 0,
    analyzed: videos?.sessions?.filter(v => v.status === 'analyzed').length || 0,
    processing: videos?.sessions?.filter(v => v.status === 'processing').length || 0,
    reviewed: videos?.sessions?.filter(v => v.reviewed).length || 0,
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-mono">

      {/* Header */}
      <div className="bg-zinc-900 border-b-2 border-zinc-900">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">
                Video Library
              </h1>
              <p className="text-zinc-400 text-xs uppercase tracking-widest font-bold">
                Session Recordings & AI Analysis
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2.5 border-2 transition-all ${viewMode === 'grid'
                  ? 'bg-white text-zinc-900 border-white'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                  }`}
              >
                <Grid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2.5 border-2 transition-all ${viewMode === 'list'
                  ? 'bg-white text-zinc-900 border-white'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                  }`}
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-8 py-8">

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 border-2 border-zinc-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-zinc-100 p-2 border border-zinc-200">
                <Sparkles className="text-zinc-600" size={20} />
              </div>
              <span className="text-3xl font-black text-zinc-900">{stats.total}</span>
            </div>
            <p className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Total Videos</p>
          </div>

          <div className="bg-white p-6 border-2 border-zinc-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-zinc-100 p-2 border border-zinc-200">
                <Brain className="text-zinc-600" size={20} />
              </div>
              <span className="text-3xl font-black text-zinc-900">{stats.analyzed}</span>
            </div>
            <p className="text-xs font-bold text-zinc-600 uppercase tracking-wider">AI Analyzed</p>
          </div>

          <div className="bg-white p-6 border-2 border-zinc-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-zinc-100 p-2 border border-zinc-200">
                <TrendingUp className="text-zinc-600" size={20} />
              </div>
              <span className="text-3xl font-black text-zinc-900">{stats.processing}</span>
            </div>
            <p className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Processing</p>
          </div>

          <div className="bg-white p-6 border-2 border-zinc-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-zinc-100 p-2 border border-zinc-200">
                <Award className="text-zinc-600" size={20} />
              </div>
              <span className="text-3xl font-black text-zinc-900">{stats.reviewed}</span>
            </div>
            <p className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Reviewed</p>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-white border-2 border-zinc-900 p-6 mb-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Search */}
            <div className="flex-[2] relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-400" size={18} />
              <input
                type="text"
                placeholder="SEARCH ACTIONS OR PATIENTS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-zinc-50 border-2 border-zinc-200 focus:border-zinc-900 focus:outline-none text-sm uppercase tracking-wider placeholder:text-zinc-400 font-bold transition-all"
              />
            </div>

            {/* Quick Filters */}
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <User size={12} /> Patient
              </label>
              <select
                value={filterPatient}
                onChange={(e) => setFilterPatient(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-50 border-2 border-zinc-200 focus:border-zinc-900 focus:outline-none text-xs font-bold uppercase tracking-widest transition-all appearance-none cursor-pointer"
              >
                <option value="all">ALL PATIENTS</option>
                {patientsData?.patients?.map(p => (
                  <option key={p.id} value={p.id}>{p.fullName.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Target size={12} /> Action Type
              </label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-50 border-2 border-zinc-200 focus:border-zinc-900 focus:outline-none text-xs font-bold uppercase tracking-widest transition-all appearance-none cursor-pointer"
              >
                <option value="all">ALL ACTIONS</option>
                {GUIDED_ACTIONS.map(a => (
                  <option key={a.id} value={a.id}>{a.name.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Activity size={12} /> Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-50 border-2 border-zinc-200 focus:border-zinc-900 focus:outline-none text-xs font-bold uppercase tracking-widest transition-all appearance-none cursor-pointer"
              >
                <option value="all">ALL STATUS</option>
                <option value="uploaded">UPLOADED</option>
                <option value="processing">PROCESSING</option>
                <option value="analyzed">ANALYZED</option>
                <option value="reviewed">REVIEWED</option>
              </select>
            </div>
          </div>

          {/* Active Filters Display */}
          {(filterPatient !== 'all' || filterAction !== 'all' || filterStatus !== 'all' || searchQuery) && (
            <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-wrap gap-2 items-center">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Active:</span>
              {searchQuery && (
                <FilterBadge label={`Search: ${searchQuery}`} onClear={() => setSearchQuery('')} />
              )}
              {filterPatient !== 'all' && (
                <FilterBadge
                  label={`Patient: ${patientsData?.patients?.find(p => p.id === filterPatient)?.fullName}`}
                  onClear={() => setFilterPatient('all')}
                />
              )}
              {filterAction !== 'all' && (
                <FilterBadge
                  label={`Action: ${GUIDED_ACTIONS.find(a => a.id === filterAction)?.name}`}
                  onClear={() => setFilterAction('all')}
                />
              )}
              {filterStatus !== 'all' && (
                <FilterBadge label={`Status: ${filterStatus.toUpperCase()}`} onClear={() => setFilterStatus('all')} />
              )}
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterPatient('all');
                  setFilterAction('all');
                  setFilterStatus('all');
                }}
                className="text-[10px] font-black text-zinc-900 hover:text-red-600 transition-colors uppercase tracking-widest ml-auto"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-zinc-900 mb-4" size={48} />
            <p className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Loading videos...</p>
          </div>
        ) : !filteredVideos || filteredVideos.length === 0 ? (
          <div className="bg-white border-2 border-zinc-900 p-16 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="bg-zinc-100 p-8 border-2 border-zinc-300 inline-block mb-6">
              <Play className="text-zinc-900" size={64} />
            </div>
            <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tight mb-2">No videos found</h3>
            <p className="text-zinc-600 text-xs uppercase tracking-wider font-bold">
              {searchQuery || filterStatus !== 'all'
                ? 'Adjust search or filter'
                : 'Upload sessions to begin'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (

          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredVideos.map((video) => (
              <div
                key={video.id}
                className="group bg-white border-2 border-zinc-200 hover:border-zinc-900 transition-all cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                onClick={() => handleViewVideo(video.id)}
              >
                {/* Thumbnail */}
                <div
                  className="aspect-video bg-zinc-900 relative border-b-2 border-zinc-200 group-hover:border-zinc-900 transition-colors"
                  style={{
                    backgroundImage: video.thumbnailUrl ? `url(${getFileUrl(video.thumbnailUrl)})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>

                  {/* Play Button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white/90 p-4 border-2 border-zinc-900 group-hover:bg-white transition-colors">
                      <Play size={32} className="text-zinc-900" fill="currentColor" />
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                    {video.aiConfidence && (
                      <div className="bg-black/80 text-white px-2 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                        <Brain size={12} />
                        {video.aiConfidence}%
                      </div>
                    )}
                    <div className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider border ${getQualityStyle(video.qualityScore)}`}>
                      {video.qualityScore}
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="absolute bottom-3 left-3 bg-black/80 text-white px-2 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Clock size={10} />
                    {video.duration}s
                  </div>

                  {/* Date */}
                  <div className="absolute bottom-3 right-3 bg-black/80 text-white px-2 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Calendar size={10} />
                    {new Date(video.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-black text-zinc-900 text-sm uppercase tracking-tight truncate mb-1">
                    {video.actionType || 'Untitled Session'}
                  </h3>
                  <p className="text-xs text-zinc-600 mb-4 truncate uppercase tracking-wider font-bold">
                    {video.patientName}
                  </p>

                  <div className="flex items-center gap-2 mb-4">
                    <span className={`flex-1 text-center px-2 py-1.5 border-2 text-[10px] font-black uppercase tracking-widest ${getStatusStyle(video.status)}`}>
                      {video.status}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewVideo(video.id);
                    }}
                    className="w-full py-2.5 bg-zinc-900 text-white border-2 border-zinc-900 hover:bg-zinc-800 transition-colors font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <Eye size={14} />
                    {video.status === 'analyzed' ? 'View Analysis' : 'Review'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (

          /* List View */
          <div className="bg-white border-2 border-zinc-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-900 text-white border-b-2 border-zinc-900">
                  <th className="text-left p-4 text-xs font-black uppercase tracking-widest">Video</th>
                  <th className="text-left p-4 text-xs font-black uppercase tracking-widest">Patient</th>
                  <th className="text-left p-4 text-xs font-black uppercase tracking-widest">Date</th>
                  <th className="text-left p-4 text-xs font-black uppercase tracking-widest">Duration</th>
                  <th className="text-left p-4 text-xs font-black uppercase tracking-widest">Quality</th>
                  <th className="text-left p-4 text-xs font-black uppercase tracking-widest">Status</th>
                  <th className="text-left p-4 text-xs font-black uppercase tracking-widest">AI Score</th>
                  <th className="text-left p-4 text-xs font-black uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVideos.map((video, index) => (
                  <tr
                    key={video.id}
                    className={`border-b-2 border-zinc-100 hover:bg-zinc-50 cursor-pointer transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50'
                      }`}
                    onClick={() => handleViewVideo(video.id)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-12 bg-zinc-900 flex items-center justify-center border-2 border-zinc-900">
                          <Play size={16} className="text-white" fill="currentColor" />
                        </div>
                        <div className="max-w-[200px]">
                          <p className="font-black text-zinc-900 truncate text-sm uppercase tracking-tight">
                            {video.actionType || 'Untitled'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                        {video.patientName}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-xs text-zinc-600 font-bold uppercase tracking-wider">
                        <Calendar size={12} />
                        {new Date(video.recordedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-xs font-black text-zinc-900 uppercase tracking-wider">
                        <Clock size={12} />
                        {video.duration}s
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 border-2 text-[10px] font-black uppercase tracking-wider inline-block ${getQualityStyle(video.qualityScore)}`}>
                        {video.qualityScore}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 border-2 text-[10px] font-black uppercase tracking-wider inline-block ${getStatusStyle(video.status)}`}>
                        {video.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {video.aiConfidence ? (
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider">
                          <Brain size={14} className="text-zinc-900" />
                          <span className="text-zinc-900">
                            {video.aiConfidence}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewVideo(video.id);
                        }}
                        className="px-4 py-2 bg-zinc-900 text-white border-2 border-zinc-900 hover:bg-zinc-800 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                      >
                        <Eye size={12} />
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterBadge({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest border border-zinc-900">
      <span>{label}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClear();
        }}
        className="hover:text-red-400 p-0.5"
      >
        <X size={10} />
      </button>
    </div>
  );
}
