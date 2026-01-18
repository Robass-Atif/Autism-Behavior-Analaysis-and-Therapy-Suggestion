import React from 'react';
import { CheckCircle, Circle, Clock, Video, PlayCircle, AlertCircle } from 'lucide-react';
import { useVideoSessions } from '../../../api/clinical';

interface VideoProgressTrackerProps {
    patientId: string;
    onRecordAction?: (actionId: string) => void;
}

// The 11 Specific Actions from FR-4
const GUIDED_ACTIONS = [
    { id: 'arm_swing_left', name: 'Arm Swing Left', icon: '🦾' },
    { id: 'arm_swing_right', name: 'Arm Swing Right', icon: '💪' },
    { id: 'body_swing', name: 'Body Swing', icon: '🧍' },
    { id: 'chest_expansion', name: 'Chest Expansion', icon: '🫁' },
    { id: 'sing_and_clap', name: 'Sing and Clap', icon: '👏' },
    { id: 'drumming', name: 'Drumming', icon: '🥁' },
    { id: 'frog_pose', name: 'Frog Pose', icon: '🐸' },
    { id: 'maracas_shaking', name: 'Maracas Shaking', icon: '🎵' },
    { id: 'maracas_forward', name: 'Maracas Forward', icon: '🎶' },
    { id: 'squat', name: 'Squat', icon: '🏋️' },
    { id: 'tree_pose', name: 'Tree Pose', icon: '🌳' },
    { id: 'twist_pose', name: 'Twist Pose', icon: '🔄' },
];

export default function VideoProgressTracker({ patientId, onRecordAction }: VideoProgressTrackerProps) {
    const { data: sessionsData, isLoading } = useVideoSessions(patientId);
    const sessions = sessionsData?.sessions || [];

    // Count completed actions
    const completedActions = new Set<string>();
    const actionCounts: Record<string, number> = {};

    sessions.forEach((session: any) => {
        if (session.actionType) {
            completedActions.add(session.actionType);
            actionCounts[session.actionType] = (actionCounts[session.actionType] || 0) + 1;
        }
    });

    const totalActions = GUIDED_ACTIONS.length;
    const completedCount = completedActions.size;
    const progressPercentage = Math.round((completedCount / totalActions) * 100);

    const getActionStatus = (actionId: string) => {
        const count = actionCounts[actionId] || 0;
        if (count === 0) return 'pending';
        if (count >= 3) return 'complete'; // 3+ recordings = complete
        return 'partial'; // 1-2 recordings = partial
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
                <div className="grid grid-cols-4 gap-2">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="h-16 bg-slate-100 rounded-xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50">
            {/* Header with Progress */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <Video size={18} className="text-blue-600" />
                        Recording Progress
                    </h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {completedCount} of {totalActions} activities recorded
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{progressPercentage}%</div>
                    <div className="text-xs text-slate-400">Complete</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full mb-5 overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                ></div>
            </div>

            {/* Action Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {GUIDED_ACTIONS.map(action => {
                    const status = getActionStatus(action.id);
                    const count = actionCounts[action.id] || 0;

                    return (
                        <button
                            key={action.id}
                            onClick={() => onRecordAction?.(action.id)}
                            className={`p-3 rounded-xl transition-all text-center group relative ${status === 'complete'
                                    ? 'bg-green-50 border-2 border-green-200 hover:border-green-300'
                                    : status === 'partial'
                                        ? 'bg-amber-50 border-2 border-amber-200 hover:border-amber-300'
                                        : 'bg-slate-50 border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                                }`}
                        >
                            <div className="text-2xl mb-1">{action.icon}</div>
                            <div className={`text-xs font-medium leading-tight ${status === 'complete' ? 'text-green-700' : status === 'partial' ? 'text-amber-700' : 'text-slate-600'
                                }`}>
                                {action.name.split(' ').slice(0, 2).join(' ')}
                            </div>

                            {/* Status Indicator */}
                            <div className="absolute -top-1 -right-1">
                                {status === 'complete' ? (
                                    <CheckCircle size={16} className="text-green-500 fill-green-500" />
                                ) : status === 'partial' ? (
                                    <div className="w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                                        {count}
                                    </div>
                                ) : (
                                    <Circle size={16} className="text-slate-300" />
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                    <CheckCircle size={12} className="text-green-500" /> Complete (3+ recordings)
                </span>
                <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div> In Progress
                </span>
                <span className="flex items-center gap-1">
                    <Circle size={12} className="text-slate-300" /> Not Started
                </span>
            </div>
        </div>
    );
}
