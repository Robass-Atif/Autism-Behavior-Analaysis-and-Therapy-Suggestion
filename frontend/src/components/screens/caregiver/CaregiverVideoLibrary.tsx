import React, { useState } from "react";
import {
  Video,
  Clock,
  Calendar,
  CheckCircle,
  AlertCircle,
  Play,
  Trash2,
  Eye,
  Filter,
  Search,
  Grid,
  List,
  ChevronRight,
  Loader2,
  Plus,
} from "lucide-react";
import { useVideoSessions, useDeleteVideoSession } from "../../../api/clinical";
import { getFileUrl } from "../../../config/apiConfig";
import { format } from "date-fns";

interface CaregiverVideoLibraryProps {
  patientId?: string;
  onRecordNew?: () => void;
}

const ACTION_LABELS: Record<string, { name: string; icon: string }> = {
  arm_swing_left: { name: "Arm Swing Left", icon: "🦾" },
  arm_swing_right: { name: "Arm Swing Right", icon: "💪" },
  body_swing: { name: "Body Swing", icon: "🧍" },
  chest_expansion: { name: "Chest Expansion", icon: "🫁" },
  sing_and_clap: { name: "Sing and Clap", icon: "👏" },
  drumming: { name: "Drumming", icon: "🥁" },
  frog_pose: { name: "Frog Pose", icon: "🐸" },
  maracas_shaking: { name: "Maracas Shaking", icon: "🎵" },
  maracas_forward: { name: "Maracas Forward", icon: "🎶" },
  squat: { name: "Squat", icon: "🏋️" },
  tree_pose: { name: "Tree Pose", icon: "🌳" },
  twist_pose: { name: "Twist Pose", icon: "🔄" },
};

export default function CaregiverVideoLibrary({
  patientId,
  onRecordNew,
}: CaregiverVideoLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const {
    data: sessionsData,
    isLoading,
    refetch,
  } = useVideoSessions(patientId);
  const deleteMutation = useDeleteVideoSession();
  const sessions = sessionsData?.sessions || [];

  const filteredSessions = sessions.filter((session: any) => {
    const matchesSearch =
      session.actionType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.patientName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction =
      filterAction === "all" || session.actionType === filterAction;
    const matchesStatus =
      filterStatus === "all" || session.status === filterStatus;
    return matchesSearch && matchesAction && matchesStatus;
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-zinc-200 p-8 font-mono">
        <div className="animate-pulse space-y-8">
          <div className="h-4 bg-zinc-100 w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="aspect-video bg-zinc-50 border border-zinc-100"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-zinc-200 font-mono text-zinc-900 selection:bg-zinc-100 relative overflow-hidden">
      {/* Accents */}
      <div className="absolute top-0 right-0 p-1">
        <div className="w-1 h-1 bg-zinc-200"></div>
      </div>
      <div className="absolute bottom-0 left-0 p-1">
        <div className="w-1 h-1 bg-zinc-200"></div>
      </div>

      {/* Header */}
      <header className="p-8 border-b border-zinc-100">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2 mb-2">
              <Video size={14} /> Video Archive
            </h3>
            <h2 className="text-3xl font-black uppercase tracking-tight">
              Capture Vault
            </h2>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-2">
              {sessions.length} RECORDED MOTION CYCLES STORED
            </p>
          </div>

          {onRecordNew && (
            <button
              onClick={onRecordNew}
              className="px-8 py-4 bg-zinc-900 text-white text-xs font-black uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center gap-4 group"
            >
              Initialize New Capture{" "}
              <Plus
                size={16}
                className="group-hover:rotate-90 transition-transform"
              />
            </button>
          )}
        </div>

        {/* Technical Filters HUD */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 relative group">
            <Search
              size={14}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 transition-colors"
            />
            <input
              type="text"
              placeholder="SEARCH REGISTRY..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 border-b border-zinc-200 pl-10 pr-4 py-3 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-zinc-900 transition-all"
            />
          </div>

          <div className="lg:col-span-3">
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full bg-zinc-50 border-b border-zinc-200 px-4 py-3 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-zinc-900 transition-all appearance-none cursor-pointer"
            >
              <option value="all">ALL ACTION NODES</option>
              {Object.entries(ACTION_LABELS).map(([id, { name }]) => (
                <option key={id} value={id}>
                  {name.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-zinc-50 border-b border-zinc-200 px-4 py-3 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-zinc-900 transition-all appearance-none cursor-pointer"
            >
              <option value="all">ALL STATUS MODES</option>
              <option value="uploaded">UPLOADED</option>
              <option value="processing">PROCESSING</option>
              <option value="analyzed">ANALYZED</option>
              <option value="reviewed">REVIEWED</option>
            </select>
          </div>

          <div className="lg:col-span-2 flex border border-zinc-200">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex-1 flex items-center justify-center p-3 transition-colors ${viewMode === "grid" ? "bg-zinc-900 text-white" : "bg-white hover:bg-zinc-50"}`}
            >
              <Grid size={14} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex-1 flex items-center justify-center p-3 border-l border-zinc-100 transition-colors ${viewMode === "list" ? "bg-zinc-900 text-white" : "bg-white hover:bg-zinc-50"}`}
            >
              <List size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Video Content */}
      <div className="p-8">
        {filteredSessions.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center border border-dashed border-zinc-200 grayscale">
            <Video size={48} className="text-zinc-200 mb-6" />
            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">
              Null Entries Detected
            </h4>
            <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
              NO RECORDS MATCH OPERATIONAL PARAMETERS
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-l border-t border-zinc-100">
            {filteredSessions.map((session: any) => {
              const actionInfo = ACTION_LABELS[session.actionType] || {
                name: session.actionType || "UNKNOWN_ACTION",
                icon: "🎬",
              };
              return (
                <div
                  key={session.id}
                  className="border-r border-b border-zinc-100 bg-white group cursor-pointer relative overflow-hidden"
                >
                  {/* Thumbnail Placeholder */}
                  <div className="aspect-video bg-zinc-50 relative flex items-center justify-center border-b border-zinc-50 overflow-hidden">
                    {session.thumbnailUrl ? (
                      <img
                        src={getFileUrl(session.thumbnailUrl)}
                        alt={actionInfo.name}
                        className="w-full h-full object-cover mix-blend-luminosity opacity-80 group-hover:opacity-100 transition-opacity"
                      />
                    ) : session.videoUrl ? (
                      <video
                        src={`${getFileUrl(session.videoUrl)}#t=0.001`}
                        className="w-full h-full object-cover mix-blend-luminosity opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none"
                        preload="metadata"
                        muted
                        playsInline
                      />
                    ) : (
                      <div className="text-5xl opacity-[0.05] grayscale group-hover:opacity-20 transition-opacity">
                        {actionInfo.icon}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-zinc-900/0 group-hover:bg-zinc-900/10 transition-colors flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full border border-white/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0 scale-75 group-hover:scale-100 bg-zinc-900">
                        <Play size={20} className="ml-1" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-zinc-900 text-white text-[8px] font-black tracking-widest z-10">
                      {formatDuration(session.duration || 0)}
                    </div>
                  </div>

                  {/* Info HUD */}
                  <div className="p-5">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h4 className="text-xs font-black uppercase tracking-tight text-zinc-900 truncate mb-1">
                            {actionInfo.name.replace(" ", "_")}
                          </h4>
                          <div className="flex items-center gap-2 text-[8px] font-bold text-zinc-400 uppercase tracking-widest">
                            <Calendar size={10} />
                            {session.recordedAt
                              ? format(
                                  new Date(session.recordedAt),
                                  "yyyy.MM.dd | HH:mm",
                                )
                              : "0000.00.00"}
                          </div>
                        </div>
                        <div
                          className={`text-[8px] font-black px-2 py-0.5 border ${
                            session.status === "analyzed"
                              ? "bg-zinc-900 text-white border-zinc-900"
                              : "bg-transparent text-zinc-400 border-zinc-200"
                          }`}
                        >
                          {session.status.toUpperCase()}
                        </div>
                      </div>

                      {session.aiConfidence && (
                        <div className="pt-3 border-t border-zinc-50 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[8px] font-bold text-zinc-400 uppercase">
                            <CheckCircle size={10} className="text-zinc-900" />
                            Confidence Index
                          </div>
                          <span className="text-[10px] font-black text-zinc-900">
                            {session.aiConfidence}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Corner Accent */}
                  <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-1 h-1 bg-zinc-900"></div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-0 border-t border-zinc-100">
            {filteredSessions.map((session: any) => {
              const actionInfo = ACTION_LABELS[session.actionType] || {
                name: session.actionType || "UNKNOWN_ACTION",
                icon: "🎬",
              };
              return (
                <div
                  key={session.id}
                  className="flex items-center gap-6 p-6 bg-white border-b border-zinc-100 hover:bg-zinc-50 group cursor-pointer transition-colors"
                >
                  <div className="w-12 h-12 bg-zinc-50 flex items-center justify-center text-3xl grayscale opacity-30 group-hover:opacity-100 transition-opacity border border-zinc-100 overflow-hidden">
                    {session.thumbnailUrl ? (
                      <img
                        src={getFileUrl(session.thumbnailUrl)}
                        alt={actionInfo.name}
                        className="w-full h-full object-cover mix-blend-luminosity"
                      />
                    ) : session.videoUrl ? (
                      <video
                        src={`${getFileUrl(session.videoUrl)}#t=0.001`}
                        className="w-full h-full object-cover mix-blend-luminosity pointer-events-none"
                        preload="metadata"
                        muted
                        playsInline
                      />
                    ) : (
                      <div className="text-3xl">{actionInfo.icon}</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black uppercase tracking-tight text-zinc-900 mb-1">
                      {actionInfo.name.replace(" ", "_")}
                    </h4>
                    <div className="flex items-center gap-4 text-[8px] font-bold text-zinc-400 uppercase tracking-widest">
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />{" "}
                        {session.recordedAt
                          ? format(
                              new Date(session.recordedAt),
                              "yyyy.MM.dd | HH:mm",
                            )
                          : "NULL"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} />{" "}
                        {formatDuration(session.duration || 0)}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`text-[8px] font-black px-3 py-1 border ${
                      session.status === "analyzed"
                        ? "bg-zinc-900 text-white border-zinc-900"
                        : "bg-transparent text-zinc-400 border-zinc-200"
                    }`}
                  >
                    {session.status.toUpperCase()}
                  </div>
                  <button className="w-10 h-10 border border-zinc-200 flex items-center justify-center hover:bg-zinc-900 hover:text-white transition-all opacity-0 group-hover:opacity-100">
                    <ChevronRight size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* System Log Footer */}
      <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-center overflow-hidden h-10">
        <div className="text-[8px] font-black text-zinc-300 uppercase tracking-[1em] animate-marquee-slower whitespace-nowrap">
          SYSTEM DATA SYNC ID:{" "}
          {Math.random().toString(16).substring(2, 10).toUpperCase()} | SECURITY
          LOCK STATUS: ENGAGED | ENCRYPTION: AES 256
        </div>
      </div>
    </div>
  );
}
