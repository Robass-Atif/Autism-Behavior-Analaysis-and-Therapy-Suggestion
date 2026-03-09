import React, { useState } from "react";
import {
  useRecentSessions,
  useRetryAIAnalysis,
  useTriggerAIAnalysis,
} from "../../../api/clinical";
import { usePatients } from "../../../api/patient";
import { getFileUrl } from "../../../config/apiConfig";
import {
  Play,
  Grid,
  List,
  Clock,
  Loader2,
  Brain,
  Search,
  Calendar,
  TrendingUp,
  Award,
  Sparkles,
  Eye,
  Filter,
  User,
  Target,
  X,
  Activity,
  RotateCcw,
} from "lucide-react";
import toast from "../../../lib/toast";

export default function VideoLibraryScreen() {
  const { data: videos, isLoading } = useRecentSessions();
  // console.log("📹 Videos:", videos);
  const { data: patientsData } = usePatients({ limit: 100 });
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPatient, setFilterPatient] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");

  const retryAI = useRetryAIAnalysis();
  const triggerAI = useTriggerAIAnalysis();
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const handleRetryFailed = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setRetryingId(sessionId);
    try {
      await retryAI.mutateAsync(sessionId);
      await triggerAI.mutateAsync(sessionId);
      toast.success("AI Analysis retry triggered.", { id: sessionId });
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to retry analysis.";
      toast.error(errorMsg, { id: sessionId });
    }
    setRetryingId(null);
  };

  const GUIDED_ACTIONS = [
    { id: "arm_swing_left", name: "Arm Swing Left" },
    { id: "arm_swing_right", name: "Arm Swing Right" },
    { id: "body_swing", name: "Body Swing" },
    { id: "chest_expansion", name: "Chest Expansion" },
    { id: "sing_and_clap", name: "Sing and Clap" },
    { id: "drumming", name: "Drumming" },
    { id: "frog_pose", name: "Frog Pose" },
    { id: "arm_rotation", name: "Arm Rotation" },
    { id: "head_tilt", name: "Head Tilt" },
    { id: "finger_tapping", name: "Finger Tapping" },
    { id: "jump_test", name: "Jump Test" },
  ];

  const handleViewVideo = (videoId: string) => {
    window.location.href = `/sessions/${videoId}/report`;
  };

  const getStatusStyle = (status?: string) => {
    switch (status) {
      case "pending_review":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "approved_for_ai":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "processing":
        return "bg-amber-500 text-white border-amber-500 animate-pulse";
      case "completed":
        return "bg-zinc-900 text-white border-zinc-900";
      case "therapist_review":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "published":
        return "bg-green-600 text-white border-green-600";
      case "failed":
        return "bg-red-100 text-red-800 border-red-300";
      // Legacy statuses
      case "analyzed":
        return "bg-zinc-900 text-white border-zinc-900";
      case "uploaded":
        return "bg-zinc-400 text-white border-zinc-400";
      case "reviewed":
        return "bg-green-600 text-white border-green-600";
      default:
        return "bg-zinc-200 text-zinc-700 border-zinc-300";
    }
  };

  const getQualityStyle = (quality?: string) => {
    switch (quality?.toLowerCase()) {
      case "high":
        return "bg-zinc-900 text-white border-zinc-900";
      case "medium":
        return "bg-zinc-600 text-white border-zinc-600";
      case "low":
        return "bg-zinc-400 text-white border-zinc-400";
      default:
        return "bg-zinc-200 text-zinc-700 border-zinc-300";
    }
  };

  const filteredVideos = videos?.sessions?.filter((video) => {
    const matchesSearch =
      (video.actionType?.toLowerCase() || "").includes(
        searchQuery.toLowerCase(),
      ) ||
      (video.patientName?.toLowerCase() || "").includes(
        searchQuery.toLowerCase(),
      );

    const matchesStatus =
      filterStatus === "all" || video.status === filterStatus;
    const matchesPatient =
      filterPatient === "all" || video.patientId === filterPatient;

    // Action filter matches either the ID or the Label
    const matchesAction =
      filterAction === "all" ||
      video.actionType === filterAction ||
      GUIDED_ACTIONS.find((a) => a.id === filterAction)?.name ===
      video.actionType;

    return matchesSearch && matchesStatus && matchesPatient && matchesAction;
  });

  const stats = {
    total: videos?.sessions?.length || 0,
    analyzed:
      videos?.sessions?.filter(
        (v) =>
          v.status === "completed" ||
          v.status === "therapist_review" ||
          v.status === "published",
      ).length || 0,
    processing:
      videos?.sessions?.filter((v) => v.status === "processing").length || 0,
    reviewed: videos?.sessions?.filter((v) => v.reviewed).length || 0,
  };

  return (
    <div className="bg-zinc-50 min-h-screen font-mono">
      {/* Header */}
      <div className="bg-zinc-900 border-zinc-900 border-b-2">
        <div className="mx-auto px-8 py-6 max-w-[1800px]">
          <div className="flex lg:flex-row flex-col justify-between lg:items-center gap-6">
            <div>
              <h1 className="mb-2 font-black text-white text-3xl uppercase tracking-tighter">
                Video Library
              </h1>
              <p className="font-bold text-zinc-400 text-xs uppercase tracking-widest">
                Session Recordings & AI Analysis
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2.5 border-2 transition-all ${viewMode === "grid"
                    ? "bg-white text-zinc-900 border-white"
                    : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                  }`}
              >
                <Grid size={18} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2.5 border-2 transition-all ${viewMode === "list"
                    ? "bg-white text-zinc-900 border-white"
                    : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                  }`}
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-8 py-8 max-w-[1800px]">
        {/* Stats Cards */}
        <div className="gap-4 grid grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 border-2 border-zinc-200">
            <div className="flex justify-between items-center mb-2">
              <div className="bg-zinc-100 p-2 border border-zinc-200">
                <Sparkles className="text-zinc-600" size={20} />
              </div>
              <span className="font-black text-zinc-900 text-3xl">
                {stats.total}
              </span>
            </div>
            <p className="font-bold text-zinc-600 text-xs uppercase tracking-wider">
              Total Videos
            </p>
          </div>

          <div className="bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 border-2 border-zinc-200">
            <div className="flex justify-between items-center mb-2">
              <div className="bg-zinc-100 p-2 border border-zinc-200">
                <Brain className="text-zinc-600" size={20} />
              </div>
              <span className="font-black text-zinc-900 text-3xl">
                {stats.analyzed}
              </span>
            </div>
            <p className="font-bold text-zinc-600 text-xs uppercase tracking-wider">
              AI Analyzed
            </p>
          </div>

          <div className="bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 border-2 border-zinc-200">
            <div className="flex justify-between items-center mb-2">
              <div className="bg-zinc-100 p-2 border border-zinc-200">
                <TrendingUp className="text-zinc-600" size={20} />
              </div>
              <span className="font-black text-zinc-900 text-3xl">
                {stats.processing}
              </span>
            </div>
            <p className="font-bold text-zinc-600 text-xs uppercase tracking-wider">
              Processing
            </p>
          </div>

          <div className="bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 border-2 border-zinc-200">
            <div className="flex justify-between items-center mb-2">
              <div className="bg-zinc-100 p-2 border border-zinc-200">
                <Award className="text-zinc-600" size={20} />
              </div>
              <span className="font-black text-zinc-900 text-3xl">
                {stats.reviewed}
              </span>
            </div>
            <p className="font-bold text-zinc-600 text-xs uppercase tracking-wider">
              Reviewed
            </p>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-8 p-6 border-2 border-zinc-900">
          <div className="flex lg:flex-row flex-col gap-6">
            {/* Search */}
            <div className="flex-[2] space-y-2 w-full">
              <label className="flex items-center gap-2 font-black text-[10px] text-zinc-500 uppercase tracking-[0.2em] invisible select-none">
                <Search size={12} /> Search
              </label>
              <div className="relative">
                <Search
                  className="top-1/2 left-4 absolute text-zinc-400 -translate-y-1/2 transform"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="SEARCH ACTIONS OR PATIENTS..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-zinc-50 py-2.5 pr-4 pl-12 border-2 border-zinc-200 focus:border-zinc-900 focus:outline-none w-full font-bold placeholder:text-zinc-400 text-xs uppercase tracking-widest transition-all"
                />
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex-1 space-y-2 w-full">
              <label className="flex items-center gap-2 font-black text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
                <User size={12} /> Patient
              </label>
              <select
                value={filterPatient}
                onChange={(e) => setFilterPatient(e.target.value)}
                className="bg-zinc-50 px-4 py-2.5 border-2 border-zinc-200 focus:border-zinc-900 focus:outline-none w-full font-bold text-xs uppercase tracking-widest transition-all appearance-none cursor-pointer"
              >
                <option value="all">ALL PATIENTS</option>
                {patientsData?.patients?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 space-y-2 w-full">
              <label className="flex items-center gap-2 font-black text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
                <Target size={12} /> Action Type
              </label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="bg-zinc-50 px-4 py-2.5 border-2 border-zinc-200 focus:border-zinc-900 focus:outline-none w-full font-bold text-xs uppercase tracking-widest transition-all appearance-none cursor-pointer"
              >
                <option value="all">ALL ACTIONS</option>
                {GUIDED_ACTIONS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 space-y-2 w-full">
              <label className="flex items-center gap-2 font-black text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
                <Activity size={12} /> Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-zinc-50 px-4 py-2.5 border-2 border-zinc-200 focus:border-zinc-900 focus:outline-none w-full font-bold text-xs uppercase tracking-widest transition-all appearance-none cursor-pointer"
              >
                <option value="all">ALL STATUS</option>
                <option value="pending_review">PENDING REVIEW</option>
                <option value="approved_for_ai">APPROVED FOR AI</option>
                <option value="processing">PROCESSING</option>
                <option value="completed">COMPLETED</option>
                <option value="therapist_review">THERAPIST REVIEW</option>
                <option value="published">PUBLISHED</option>
                <option value="failed">FAILED</option>
              </select>
            </div>
          </div>

          {/* Active Filters Display */}
          {(filterPatient !== "all" ||
            filterAction !== "all" ||
            filterStatus !== "all" ||
            searchQuery) && (
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-zinc-100 border-t">
                <span className="font-black text-[10px] text-zinc-400 uppercase tracking-widest">
                  Active:
                </span>
                {searchQuery && (
                  <FilterBadge
                    label={`Search: ${searchQuery}`}
                    onClear={() => setSearchQuery("")}
                  />
                )}
                {filterPatient !== "all" && (
                  <FilterBadge
                    label={`Patient: ${patientsData?.patients?.find((p) => p.id === filterPatient)?.fullName}`}
                    onClear={() => setFilterPatient("all")}
                  />
                )}
                {filterAction !== "all" && (
                  <FilterBadge
                    label={`Action: ${GUIDED_ACTIONS.find((a) => a.id === filterAction)?.name}`}
                    onClear={() => setFilterAction("all")}
                  />
                )}
                {filterStatus !== "all" && (
                  <FilterBadge
                    label={`Status: ${filterStatus.toUpperCase()}`}
                    onClear={() => setFilterStatus("all")}
                  />
                )}
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setFilterPatient("all");
                    setFilterAction("all");
                    setFilterStatus("all");
                  }}
                  className="ml-auto font-black text-[10px] text-zinc-900 hover:text-red-600 uppercase tracking-widest transition-colors"
                >
                  Clear All
                </button>
              </div>
            )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col justify-center items-center py-20">
            <Loader2 className="mb-4 text-zinc-900 animate-spin" size={48} />
            <p className="font-bold text-zinc-900 text-sm uppercase tracking-wider">
              Loading videos...
            </p>
          </div>
        ) : !filteredVideos || filteredVideos.length === 0 ? (
          <div className="bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-16 border-2 border-zinc-900 text-center">
            <div className="inline-block bg-zinc-100 mb-6 p-8 border-2 border-zinc-300">
              <Play className="text-zinc-900" size={64} />
            </div>
            <h3 className="mb-2 font-black text-zinc-900 text-2xl uppercase tracking-tight">
              No videos found
            </h3>
            <p className="font-bold text-zinc-600 text-xs uppercase tracking-wider">
              {searchQuery || filterStatus !== "all"
                ? "Adjust search or filter"
                : "Upload sessions to begin"}
            </p>
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredVideos.map((video) => (
              <div
                key={video.id}
                className="group bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-zinc-200 hover:border-zinc-900 transition-all cursor-pointer"
                onClick={() => handleViewVideo(video.id)}
              >
                {/* Thumbnail */}
                <div className="relative bg-zinc-900 border-zinc-200 group-hover:border-zinc-900 border-b-2 aspect-video overflow-hidden transition-colors">
                  {video.thumbnailUrl ? (
                    <img
                      src={getFileUrl(video.thumbnailUrl)}
                      alt={video.actionType}
                      className="absolute inset-0 opacity-60 group-hover:opacity-80 w-full h-full object-cover transition-opacity"
                    />
                  ) : video.videoUrl ? (
                    <video
                      src={`${getFileUrl(video.videoUrl)}#t=0.001`}
                      className="absolute inset-0 opacity-60 group-hover:opacity-80 w-full h-full object-cover transition-opacity pointer-events-none"
                      preload="metadata"
                      muted
                      playsInline
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>

                  {/* Play Button */}
                  <div className="absolute inset-0 flex justify-center items-center">
                    <div className="bg-white/90 group-hover:bg-white p-4 border-2 border-zinc-900 transition-colors">
                      <Play
                        size={32}
                        className="text-zinc-900"
                        fill="currentColor"
                      />
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="top-3 right-3 left-3 absolute flex justify-between items-start gap-2">
                    {video.aiConfidence && (
                      <div className="flex items-center gap-1 bg-black/80 px-2 py-1 font-black text-[10px] text-white uppercase tracking-wider">
                        <Brain size={12} />
                        {video.aiConfidence}%
                      </div>
                    )}
                    <div
                      className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider border ${getQualityStyle(video.qualityScore)}`}
                    >
                      {video.qualityScore}
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="bottom-3 left-3 absolute flex items-center gap-1 bg-black/80 px-2 py-1 font-black text-[10px] text-white uppercase tracking-wider">
                    <Clock size={10} />
                    {video.duration}s
                  </div>

                  {/* Date */}
                  <div className="right-3 bottom-3 absolute flex items-center gap-1 bg-black/80 px-2 py-1 font-black text-[10px] text-white uppercase tracking-wider">
                    <Calendar size={10} />
                    {new Date(video.recordedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="mb-1 font-black text-zinc-900 text-sm truncate uppercase tracking-tight">
                    {video.actionType?.replace(/_/g, " ") || "Untitled Session"}
                  </h3>
                  <p className="mb-1 font-bold text-zinc-600 text-xs truncate uppercase tracking-wider">
                    {video.patientName}
                  </p>
                  {video.caregiverName && (
                    <p className="mb-3 font-bold text-[10px] text-zinc-400 truncate uppercase tracking-wider">
                      Uploaded by: {video.caregiverName}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mb-4">
                    <span
                      className={`flex-1 text-center px-2 py-1.5 border-2 text-[10px] font-black uppercase tracking-widest ${getStatusStyle(video.status)}`}
                    >
                      {video.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewVideo(video.id);
                      }}
                      className="flex justify-center items-center gap-2 bg-zinc-900 hover:bg-zinc-800 py-2.5 border-2 border-zinc-900 w-full font-bold text-white text-xs uppercase tracking-widest transition-colors"
                    >
                      <Eye size={14} />
                      {video.status === "completed" ||
                        video.status === "therapist_review" ||
                        video.status === "published"
                        ? "View Report"
                        : video.status === "pending_review" ||
                          video.status === "approved_for_ai" ||
                          video.status === "processing"
                          ? "Review"
                          : "View"}
                    </button>
                    {video.status === "failed" && (
                      <button
                        onClick={(e) => handleRetryFailed(e, video.id)}
                        disabled={retryingId === video.id}
                        className="flex justify-center items-center gap-2 bg-red-50 disabled:opacity-50 py-2.5 border-2 border-red-300 hover:border-red-600 w-full font-bold text-red-700 text-xs uppercase tracking-widest transition-colors"
                      >
                        {retryingId === video.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <RotateCcw size={14} />
                        )}
                        Retry Analysis
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-2 border-zinc-900">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-900 border-zinc-900 border-b-2 text-white">
                  <th className="p-4 font-black text-xs text-left uppercase tracking-widest">
                    Video
                  </th>
                  <th className="p-4 font-black text-xs text-left uppercase tracking-widest">
                    Patient
                  </th>
                  <th className="p-4 font-black text-xs text-left uppercase tracking-widest">
                    Date
                  </th>
                  <th className="p-4 font-black text-xs text-left uppercase tracking-widest">
                    Duration
                  </th>
                  <th className="p-4 font-black text-xs text-left uppercase tracking-widest">
                    Quality
                  </th>
                  <th className="p-4 font-black text-xs text-left uppercase tracking-widest">
                    Status
                  </th>
                  <th className="p-4 font-black text-xs text-left uppercase tracking-widest">
                    AI Score
                  </th>
                  <th className="p-4 font-black text-xs text-left uppercase tracking-widest">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredVideos.map((video, index) => (
                  <tr
                    key={video.id}
                    className={`border-b-2 border-zinc-100 hover:bg-zinc-50 cursor-pointer transition-colors ${index % 2 === 0 ? "bg-white" : "bg-zinc-50/50"
                      }`}
                    onClick={() => handleViewVideo(video.id)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="relative flex justify-center items-center bg-zinc-900 border-2 border-zinc-900 w-16 h-12 overflow-hidden">
                          {video.thumbnailUrl ? (
                            <img
                              src={getFileUrl(video.thumbnailUrl)}
                              alt={video.actionType}
                              className="absolute inset-0 opacity-60 w-full h-full object-cover"
                            />
                          ) : video.videoUrl ? (
                            <video
                              src={`${getFileUrl(video.videoUrl)}#t=0.001`}
                              className="absolute inset-0 opacity-60 w-full h-full object-cover pointer-events-none"
                              preload="metadata"
                              muted
                              playsInline
                            />
                          ) : (
                            <Play
                              size={16}
                              className="z-10 relative text-white"
                              fill="currentColor"
                            />
                          )}
                          {(video.thumbnailUrl || video.videoUrl) && (
                            <Play
                              size={16}
                              className="z-10 relative drop-shadow-md text-white"
                              fill="currentColor"
                            />
                          )}
                        </div>
                        <div className="max-w-[200px]">
                          <p className="font-black text-zinc-900 text-sm truncate uppercase tracking-tight">
                            {video.actionType || "Untitled"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="block font-bold text-zinc-700 text-xs uppercase tracking-wider">
                        {video.patientName}
                      </span>
                      {video.caregiverName && (
                        <span className="font-bold text-[10px] text-zinc-400 uppercase tracking-wider">
                          By: {video.caregiverName}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 font-bold text-zinc-600 text-xs uppercase tracking-wider">
                        <Calendar size={12} />
                        {new Date(video.recordedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 font-black text-zinc-900 text-xs uppercase tracking-wider">
                        <Clock size={12} />
                        {video.duration}s
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 border-2 text-[10px] font-black uppercase tracking-wider inline-block ${getQualityStyle(video.qualityScore)}`}
                      >
                        {video.qualityScore}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 border-2 text-[10px] font-black uppercase tracking-wider inline-block ${getStatusStyle(video.status)}`}
                      >
                        {video.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {video.aiConfidence ? (
                        <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider">
                          <Brain size={14} className="text-zinc-900" />
                          <span className="text-zinc-900">
                            {video.aiConfidence}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      {video.status === "failed" ? (
                        <button
                          onClick={(e) => handleRetryFailed(e, video.id)}
                          disabled={retryingId === video.id}
                          className="flex items-center gap-2 bg-red-50 hover:bg-red-100 disabled:opacity-50 px-4 py-2 border-2 border-red-300 hover:border-red-600 font-black text-[10px] text-red-700 uppercase tracking-widest transition-colors"
                        >
                          {retryingId === video.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <RotateCcw size={12} />
                          )}
                          Retry
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewVideo(video.id);
                          }}
                          className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 px-4 py-2 border-2 border-zinc-900 font-black text-[10px] text-white uppercase tracking-widest transition-colors"
                        >
                          <Eye size={12} />
                          {video.status === "completed" ||
                            video.status === "published" ||
                            video.status === "therapist_review"
                            ? "Review Report"
                            : "Review"}
                        </button>
                      )}
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

function FilterBadge({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 bg-zinc-900 px-2 py-1 border border-zinc-900 font-black text-[10px] text-white uppercase tracking-widest">
      <span>{label}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClear();
        }}
        className="p-0.5 hover:text-red-400"
      >
        <X size={10} />
      </button>
    </div>
  );
}
