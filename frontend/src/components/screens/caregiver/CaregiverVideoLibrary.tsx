import React, { useState } from 'react';
import { Video, Clock, Calendar, CheckCircle, AlertCircle, Play, Trash2, Eye, Filter, Search, Grid, List } from 'lucide-react';
import { useVideoSessions, useDeleteVideoSession } from '../../../api/clinical';
import { format } from 'date-fns';

interface CaregiverVideoLibraryProps {
    patientId?: string;
    onRecordNew?: () => void;
}

// Action name mapping
const ACTION_LABELS: Record<string, { name: string; icon: string }> = {
    arm_swing_left: { name: 'Arm Swing Left', icon: '🦾' },
    arm_swing_right: { name: 'Arm Swing Right', icon: '💪' },
    body_swing: { name: 'Body Swing', icon: '🧍' },
    chest_expansion: { name: 'Chest Expansion', icon: '🫁' },
    sing_and_clap: { name: 'Sing and Clap', icon: '👏' },
    drumming: { name: 'Drumming', icon: '🥁' },
    frog_pose: { name: 'Frog Pose', icon: '🐸' },
    maracas_shaking: { name: 'Maracas Shaking', icon: '🎵' },
    maracas_forward: { name: 'Maracas Forward', icon: '🎶' },
    squat: { name: 'Squat', icon: '🏋️' },
    tree_pose: { name: 'Tree Pose', icon: '🌳' },
    twist_pose: { name: 'Twist Pose', icon: '🔄' },
};

export default function CaregiverVideoLibrary({ patientId, onRecordNew }: CaregiverVideoLibraryProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterAction, setFilterAction] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const { data: sessionsData, isLoading, refetch } = useVideoSessions(patientId);
    const deleteMutation = useDeleteVideoSession();
    const sessions = sessionsData?.sessions || [];

    // Filter sessions
    const filteredSessions = sessions.filter((session: any) => {
        const matchesSearch = session.actionType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            session.patientName?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesAction = filterAction === 'all' || session.actionType === filterAction;
        const matchesStatus = filterStatus === 'all' || session.status === filterStatus;
        return matchesSearch && matchesAction && matchesStatus;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Analyzed': return 'bg-green-100 text-green-700 border-green-200';
            case 'Processing': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Reviewed': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'Uploaded': return 'bg-slate-100 text-slate-700 border-slate-200';
            case 'Failed': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-slate-200 rounded w-1/4"></div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-40 bg-slate-100 rounded-xl"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                            <Video size={20} className="text-blue-600" />
                            Video Library
                        </h3>
                        <p className="text-sm text-slate-500">{sessions.length} recordings uploaded</p>
                    </div>

                    {onRecordNew && (
                        <button
                            onClick={onRecordNew}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 flex items-center gap-2 shadow-lg shadow-blue-500/20"
                        >
                            <Video size={16} />
                            Record New
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 mt-4">
                    <div className="flex-1 min-w-[200px] relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search videos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <select
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                        <option value="all">All Actions</option>
                        {Object.entries(ACTION_LABELS).map(([id, { name }]) => (
                            <option key={id} value={id}>{name}</option>
                        ))}
                    </select>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                        <option value="all">All Status</option>
                        <option value="Uploaded">Uploaded</option>
                        <option value="Processing">Processing</option>
                        <option value="Analyzed">Analyzed</option>
                        <option value="Reviewed">Reviewed</option>
                    </select>

                    <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'bg-white text-slate-400 hover:text-slate-600'}`}
                        >
                            <Grid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'bg-white text-slate-400 hover:text-slate-600'}`}
                        >
                            <List size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Video Grid/List */}
            <div className="p-5">
                {filteredSessions.length === 0 ? (
                    <div className="text-center py-12">
                        <Video size={48} className="mx-auto text-slate-300 mb-4" />
                        <h4 className="font-semibold text-slate-700 mb-1">No videos found</h4>
                        <p className="text-sm text-slate-500">
                            {searchQuery || filterAction !== 'all' || filterStatus !== 'all'
                                ? 'Try adjusting your filters'
                                : 'Start recording to see videos here'}
                        </p>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredSessions.map((session: any) => {
                            const actionInfo = ACTION_LABELS[session.actionType] || { name: session.actionType, icon: '🎬' };
                            return (
                                <div
                                    key={session.id}
                                    className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group"
                                >
                                    {/* Thumbnail */}
                                    <div className="aspect-video bg-slate-200 relative flex items-center justify-center">
                                        <div className="text-5xl opacity-30">{actionInfo.icon}</div>
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                            <Play size={48} className="text-white" />
                                        </div>
                                        <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 text-white text-xs rounded">
                                            {formatDuration(session.duration || 0)}
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="p-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-sm text-slate-900 truncate">{actionInfo.name}</h4>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {session.recordedAt ? format(new Date(session.recordedAt), 'MMM d, yyyy • h:mm a') : 'Unknown date'}
                                                </p>
                                            </div>
                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(session.status)}`}>
                                                {session.status}
                                            </span>
                                        </div>

                                        {session.aiConfidence && (
                                            <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                                                <CheckCircle size={12} className="text-green-500" />
                                                AI Confidence: {session.aiConfidence}%
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredSessions.map((session: any) => {
                            const actionInfo = ACTION_LABELS[session.actionType] || { name: session.actionType, icon: '🎬' };
                            return (
                                <div
                                    key={session.id}
                                    className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200 hover:shadow-sm transition-shadow"
                                >
                                    <div className="w-12 h-12 bg-slate-200 rounded-lg flex items-center justify-center text-2xl">
                                        {actionInfo.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-sm text-slate-900">{actionInfo.name}</h4>
                                        <p className="text-xs text-slate-500">
                                            {session.recordedAt ? format(new Date(session.recordedAt), 'MMM d, yyyy • h:mm a') : 'Unknown'} • {formatDuration(session.duration || 0)}
                                        </p>
                                    </div>
                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(session.status)}`}>
                                        {session.status}
                                    </span>
                                    <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                        <Eye size={16} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
