import React from 'react';
import { CheckCircle, Circle, Clock, Video, PlayCircle, AlertCircle } from 'lucide-react';
import { ActionIcon } from '../../ui/ActionIcon';
import { useVideoSessions } from '../../../api/clinical';

interface VideoProgressTrackerProps {
    patientId: string;
    onRecordAction?: (actionId: string) => void;
}

const GUIDED_ACTIONS = [
    { id: 'arm_swing_left', name: 'Arm Swing Left', icon: <ActionIcon id="arm_swing_left" className="w-10 h-10" /> },
    { id: 'arm_swing_right', name: 'Arm Swing Right', icon: <ActionIcon id="arm_swing_right" className="w-10 h-10" /> },
    { id: 'body_swing', name: 'Body Swing', icon: <ActionIcon id="body_swing" className="w-10 h-10" /> },
    { id: 'chest_expansion', name: 'Chest Expansion', icon: <ActionIcon id="chest_expansion" className="w-10 h-10" /> },
    { id: 'sing_and_clap', name: 'Sing and Clap', icon: <ActionIcon id="sing_and_clap" className="w-10 h-10" /> },
    { id: 'drumming', name: 'Drumming', icon: <ActionIcon id="drumming" className="w-10 h-10" /> },
    { id: 'frog_pose', name: 'Frog Pose', icon: <ActionIcon id="frog_pose" className="w-10 h-10" /> },
    { id: 'maracas_shaking', name: 'Maracas Shaking', icon: <ActionIcon id="maracas_shaking" className="w-10 h-10" /> },
    { id: 'maracas_forward', name: 'Maracas Forward', icon: <ActionIcon id="maracas_forward" className="w-10 h-10" /> },
    { id: 'squat', name: 'Squat', icon: <ActionIcon id="squat" className="w-10 h-10" /> },
    { id: 'tree_pose', name: 'Tree Pose', icon: <ActionIcon id="tree_pose" className="w-10 h-10" /> },
    { id: 'twist_pose', name: 'Twist Pose', icon: <ActionIcon id="twist_pose" className="w-10 h-10" /> },
];

export default function VideoProgressTracker({ patientId, onRecordAction }: VideoProgressTrackerProps) {
    const { data: sessionsData, isLoading } = useVideoSessions(patientId);
    const sessions = sessionsData?.sessions || [];

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
        if (count >= 3) return 'complete';
        return 'partial';
    };

    if (isLoading) {
        return (
            <div className="bg-white border border-zinc-200 p-6 animate-pulse font-mono">
                <div className="h-4 bg-zinc-100 w-1/4 mb-8"></div>
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="aspect-square bg-zinc-50 border border-zinc-100"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border border-zinc-200 p-8 font-mono relative overflow-hidden">
            {/* Accents */}
            <div className="absolute top-0 right-0 p-1"><div className="w-1 h-1 bg-zinc-400"></div></div>
            <div className="absolute bottom-0 left-0 p-1"><div className="w-1 h-1 bg-zinc-400"></div></div>

            {/* Header with Progress */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 border-b border-zinc-100 pb-8">
                <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-900 flex items-center gap-2 mb-2">
                        <Video size={14} /> Recording Registry
                    </h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        {completedCount} OF {totalActions} ACTION NODES REGISTERED
                    </p>
                </div>
                <div className="flex items-end gap-4">
                    <div className="text-right">
                        <div className="text-xs font-black uppercase text-zinc-300 mb-1">Status Cap</div>
                        <div className="text-4xl font-black tracking-tighter">{progressPercentage}<span className="text-sm text-zinc-300">%</span></div>
                    </div>
                </div>
            </div>

            {/* Progress Bar (Technical Style) */}
            <div className="w-full h-4 border border-zinc-200 mb-12 p-[2px] bg-zinc-50 flex gap-[1px]">
                {Array.from({ length: 50 }).map((_, i) => (
                    <div
                        key={i}
                        className={`flex-1 h-full transition-colors duration-500 ${(i / 50) * 100 < progressPercentage ? 'bg-zinc-900' : 'bg-transparent'
                            }`}
                    />
                ))}
            </div>

            {/* Action Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-0">
                {GUIDED_ACTIONS.map(action => {
                    const status = getActionStatus(action.id);
                    const count = actionCounts[action.id] || 0;

                    return (
                        <div
                            key={action.id}
                            onClick={() => onRecordAction?.(action.id)}
                            className={`border border-zinc-200 p-4 transition-all group cursor-pointer relative ${status === 'complete' ? 'bg-zinc-900 text-white' :
                                    status === 'partial' ? 'bg-white' : 'bg-zinc-50'
                                }`}
                        >
                            {/* Corner indicator */}
                            <div className={`absolute top-0 right-0 p-1`}>
                                <div className={`w-1 h-1 ${status === 'complete' ? 'bg-white' :
                                        status === 'partial' ? 'bg-zinc-900' : 'bg-zinc-300'
                                    }`}></div>
                            </div>

                            <div className="text-3xl mb-4 flex justify-center">{action.icon}</div>

                            <div className="space-y-1">
                                <div className={`text-[9px] font-black uppercase truncate tracking-tight ${status === 'complete' ? 'text-zinc-400' : 'text-zinc-900'
                                    }`}>
                                    {action.name.replace('_', ' ')}
                                </div>
                                <div className={`text-[8px] font-bold uppercase tracking-widest ${status === 'complete' ? 'text-zinc-500' : 'text-zinc-400'
                                    }`}>
                                    Sessions: 0{count}
                                </div>
                            </div>

                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[10px] font-black uppercase text-white tracking-widest">Initialize</span>
                            </div>
                        </div>
                    );
                })}
            </div>

        </div>
    );
}
