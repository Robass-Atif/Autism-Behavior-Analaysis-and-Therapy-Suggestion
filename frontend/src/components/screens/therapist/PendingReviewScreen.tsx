import React, { useState } from "react";
import {
  usePendingReviewSessions,
  useApproveForAI,
  useTriggerAIAnalysis,
  useCancelAIAnalysis,
  useRetryAIAnalysis,
  useDeleteVideoSession,
} from "../../../api/clinical";
import { usePatients } from "../../../api/patient";
import { getFileUrl } from "../../../config/apiConfig";
import {
  Play,
  Clock,
  Loader2,
  Brain,
  Search,
  Calendar,
  CheckCircle,
  Eye,
  User,
  ShieldCheck,
  Zap,
  Video,
  AlertTriangle,
  ChevronRight,
  Upload,
  X,
  Filter,
  XCircle,
  RefreshCw,
  AlertOctagon,
  RotateCcw,
  BookOpen,
  Trash2,
} from "lucide-react";
import { VideoSession, Screen } from "../../../types";
import toast from "../../../lib/toast";

interface PendingReviewScreenProps {
  onNavigate?: (screen: Screen, data?: any) => void;
}

export default function PendingReviewScreen({
  onNavigate,
}: PendingReviewScreenProps) {
  const { data: sessionsData, isLoading } = usePendingReviewSessions();
  const { data: patientsData } = usePatients({ limit: 100 });
  const approveForAI = useApproveForAI();
  const triggerAI = useTriggerAIAnalysis();
  const cancelAI = useCancelAIAnalysis();
  const retryAI = useRetryAIAnalysis();
  const deleteSession = useDeleteVideoSession();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterPatient, setFilterPatient] = useState<string>("all");
  const [selectedSession, setSelectedSession] = useState<VideoSession | null>(
    null,
  );
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const sessions = sessionsData?.sessions || [];

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      (s.actionType?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (s.patientName?.toLowerCase() || "").includes(
        searchQuery.toLowerCase(),
      ) ||
      (s.caregiverName?.toLowerCase() || "").includes(
        searchQuery.toLowerCase(),
      );
    const matchesPatient =
      filterPatient === "all" || s.patientId === filterPatient;
    return matchesSearch && matchesPatient;
  });

  const pendingCount = sessions.filter(
    (s) => s.status === "pending_review",
  ).length;
  const approvedCount = sessions.filter(
    (s) => s.status === "approved_for_ai",
  ).length;
  const processingCount = sessions.filter(
    (s) => s.status === "processing",
  ).length;
  const failedCount = sessions.filter((s) => s.status === "failed").length;
  const completedCount = sessions.filter(
    (s) => s.status === "completed",
  ).length;

  const handleApprove = async (session: VideoSession) => {
    try {
      await approveForAI.mutateAsync(session.id);
      toast.success("Session approved for AI analysis", {
        id: `approve-${session.id}`,
      });
    } catch (err: any) {
      const errorMsg =
        err.response?.detail ||
        err.response?.message ||
        err.message ||
        "Failed to approve session";
      toast.error(errorMsg, { id: `approve-${session.id}` });
    }
  };

  const handleTriggerAI = async (session: VideoSession) => {
    try {
      await triggerAI.mutateAsync(session.id);
      toast.success(
        "AI analysis triggered. Processing with up to 3 retries...",
        { id: `trigger-${session.id}` },
      );
    } catch (err: any) {
      let errorMsg =
        err.response?.detail ||
        err.response?.message ||
        err.message ||
        "Failed to trigger AI analysis";
        
      if (errorMsg.includes("Video is too dark") || errorMsg.includes("Person detected in only")) {
        errorMsg = "⚠️ Video Rejected: Too dark or empty. Please record a clearer video.";
      }
      
      toast.error(errorMsg, { id: `trigger-${session.id}`, duration: 5000 });
    }
  };

  const handleCancel = async (session: VideoSession) => {
    try {
      await cancelAI.mutateAsync(session.id);
      toast.success("AI analysis cancelled", { id: `cancel-${session.id}` });
      setConfirmCancel(null);
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to cancel AI analysis";
      toast.error(errorMsg, { id: `cancel-${session.id}` });
      setConfirmCancel(null);
    }
  };

  const handleRetry = async (session: VideoSession) => {
    try {
      await retryAI.mutateAsync(session.id);
      toast.success("Session reset. You can now trigger AI analysis again.", {
        id: `retry-${session.id}`,
      });
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message || err.message || "Failed to retry";
      toast.error(errorMsg, { id: `retry-${session.id}` });
    }
  };

  const handleDelete = async (session: VideoSession) => {
    try {
      await deleteSession.mutateAsync(session.id);
      toast.success("Session deleted successfully", {
        id: `delete-${session.id}`,
      });
      setConfirmDelete(null);
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to delete session";
      toast.error(errorMsg, { id: `delete-${session.id}` });
    }
  };

  const handleViewReport = (session: VideoSession) => {
    if (onNavigate) {
      onNavigate(Screen.SESSION_REPORT, { sessionId: session.id });
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending_review":
        return {
          label: "PENDING REVIEW",
          bg: "bg-amber-100",
          text: "text-amber-800",
          border: "border-amber-300",
          icon: <Clock size={12} />,
        };
      case "approved_for_ai":
        return {
          label: "APPROVED FOR AI",
          bg: "bg-blue-100",
          text: "text-blue-800",
          border: "border-blue-300",
          icon: <CheckCircle size={12} />,
        };
      case "processing":
        return {
          label: "PROCESSING",
          bg: "bg-amber-500",
          text: "text-white",
          border: "border-amber-500",
          icon: <Loader2 size={12} className="animate-spin" />,
        };
      case "failed":
        return {
          label: "FAILED",
          bg: "bg-red-100",
          text: "text-red-800",
          border: "border-red-400",
          icon: <AlertOctagon size={12} />,
        };
      case "completed":
        return {
          label: "READY FOR REVIEW",
          bg: "bg-green-100",
          text: "text-green-800",
          border: "border-green-400",
          icon: <CheckCircle size={12} />,
        };
      default:
        return {
          label: status?.toUpperCase(),
          bg: "bg-zinc-100",
          text: "text-zinc-700",
          border: "border-zinc-300",
          icon: null,
        };
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-mono">
      {/* Header */}
      <div className="bg-zinc-900 border-b-2 border-zinc-900">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">
                Pending Review Queue
              </h1>
              <p className="text-zinc-400 text-xs uppercase tracking-widest font-bold">
                Video Submissions Awaiting Therapist Review
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 px-3 py-1.5">
                <Clock size={14} className="text-amber-400" />
                <span className="text-amber-300 text-[10px] font-black uppercase tracking-wider">
                  {pendingCount} Pending
                </span>
              </div>
              <div className="flex items-center gap-2 bg-blue-500/20 border border-blue-500/40 px-3 py-1.5">
                <ShieldCheck size={14} className="text-blue-400" />
                <span className="text-blue-300 text-[10px] font-black uppercase tracking-wider">
                  {approvedCount} Approved
                </span>
              </div>
              {processingCount > 0 && (
                <div className="flex items-center gap-2 bg-amber-600/20 border border-amber-600/40 px-3 py-1.5">
                  <Loader2 size={14} className="text-amber-400 animate-spin" />
                  <span className="text-amber-300 text-[10px] font-black uppercase tracking-wider">
                    {processingCount} Processing
                  </span>
                </div>
              )}
              {failedCount > 0 && (
                <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/40 px-3 py-1.5">
                  <AlertOctagon size={14} className="text-red-400" />
                  <span className="text-red-300 text-[10px] font-black uppercase tracking-wider">
                    {failedCount} Failed
                  </span>
                </div>
              )}
              {completedCount > 0 && (
                <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/40 px-3 py-1.5">
                  <CheckCircle size={14} className="text-green-400" />
                  <span className="text-green-300 text-[10px] font-black uppercase tracking-wider">
                    {completedCount} Needs Review
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-8 py-8">
        {/* Filters */}
        <div className="bg-white border-2 border-zinc-900 p-6 mb-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-[2] relative space-y-1">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Search size={12} /> Search
              </label>
              <input
                type="text"
                placeholder="SEARCH BY PATIENT, ACTION, OR CAREGIVER..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-zinc-50 border-2 border-zinc-200 focus:border-zinc-900 focus:outline-none text-sm uppercase tracking-wider placeholder:text-zinc-400 font-bold transition-all"
              />
            </div>
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
                {patientsData?.patients?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-zinc-900 mb-4" size={48} />
            <p className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
              Loading queue...
            </p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="bg-white border-2 border-zinc-900 p-16 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="bg-zinc-100 p-8 border-2 border-zinc-300 inline-block mb-6">
              <CheckCircle className="text-zinc-900" size={64} />
            </div>
            <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tight mb-2">
              Queue Clear
            </h3>
            <p className="text-zinc-600 text-xs uppercase tracking-wider font-bold">
              No pending video submissions to review
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSessions.map((session) => {
              const statusConfig = getStatusConfig(session.status);
              const isFailed = session.status === "failed";
              const isProcessing = session.status === "processing";

              return (
                <div
                  key={session.id}
                  className={`bg-white border-2 transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col ${
                    isFailed
                      ? "border-red-500 hover:border-red-600"
                      : isProcessing
                        ? "border-amber-500 hover:border-amber-600"
                        : "border-zinc-900 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
                  }`}
                >
                  <div className="flex flex-col md:flex-row min-h-[160px]">
                    {/* Video Thumbnail */}
                    <div className="w-full md:w-72 h-48 md:h-auto bg-zinc-950 relative flex-shrink-0 border-b-2 md:border-b-0 md:border-r-2 border-zinc-900 overflow-hidden group">
                      {session.thumbnailUrl ? (
                        <img
                          src={getFileUrl(session.thumbnailUrl)}
                          alt={session.actionType}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-60"
                        />
                      ) : session.videoUrl ? (
                        <video
                          src={`${getFileUrl(session.videoUrl)}#t=0.001`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-60 pointer-events-none"
                          preload="metadata"
                          muted
                          playsInline
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-20">
                          <Video size={48} className="text-white" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-center justify-center">
                        {isProcessing ? (
                          <div className="bg-amber-500 p-4 border-2 border-white shadow-lg">
                            <Loader2
                              size={32}
                              className="text-white animate-spin"
                            />
                          </div>
                        ) : isFailed ? (
                          <div className="bg-red-500 p-4 border-2 border-white shadow-lg">
                            <AlertOctagon size={32} className="text-white" />
                          </div>
                        ) : (
                          <div className="bg-white p-4 border-2 border-zinc-900 shadow-lg transform transition-transform group-hover:scale-110">
                            <Play
                              size={24}
                              className="text-zinc-900"
                              fill="currentColor"
                            />
                          </div>
                        )}
                      </div>

                      {/* Overlay Info */}
                      <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
                        <div className="bg-zinc-900/90 text-white px-2 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-white/20">
                          <Clock size={10} />
                          {session.duration}s
                        </div>
                        <div className="bg-zinc-900/90 text-white px-2 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-white/20">
                          <Calendar size={10} />
                          {new Date(session.recordedAt).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" },
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Session Info */}
                    <div className="flex-1 p-6 flex flex-col">
                      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6 h-full">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-3 mb-3">
                            <h3 className="font-black text-zinc-900 text-xl uppercase tracking-tighter truncate">
                              {session.actionType.replace(/_/g, ' ') || "Untitled Session"}
                            </h3>
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest border-2 ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} shadow-[2px_2px_0px_0px_currentColor]`}
                            >
                              {statusConfig.icon}
                              {statusConfig.label}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-2 gap-x-6 text-xs mb-4">
                            <div className="flex items-center gap-2 text-zinc-600 font-bold uppercase tracking-wider truncate">
                              <User size={14} className="text-zinc-400" />
                              <span className="text-zinc-900">
                                {session.patientName || "Unknown Patient"}
                              </span>
                            </div>
                            {session.caregiverName && (
                              <div className="flex items-center gap-2 text-zinc-600 font-bold uppercase tracking-wider truncate">
                                <Upload size={14} className="text-zinc-400" />
                                <span>By {session.caregiverName}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-zinc-600 font-bold uppercase tracking-wider">
                              <ShieldCheck
                                size={14}
                                className="text-zinc-400"
                              />
                              <span className="px-2 py-0.5 bg-zinc-100 border border-zinc-200 text-[9px] font-black">
                                {session.uploadedBy === "caregiver"
                                  ? "CAREGIVER"
                                  : "THERAPIST"}{" "}
                                UPLOAD
                              </span>
                            </div>
                          </div>

                          {/* Failed Session Error Info */}
                          {isFailed && session.lastError && (
                            <div className="bg-red-50 border-2 border-red-500 p-4 mb-4 transform hover:scale-[1.01] transition-transform">
                              <div className="flex items-start gap-3">
                                <div className="bg-red-500 p-1.5 text-white">
                                  <AlertOctagon size={16} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-1 decoration-red-500/30 underline underline-offset-4">
                                    ANALYSIS BLOCKED — {session.retryCount || 0}/
                                    {session.maxRetries || 3} ATTEMPTS FAILED
                                  </p>
                                  <p className="text-xs text-red-900 font-mono leading-tight font-bold uppercase">
                                    {session.lastError?.includes("Video is too dark") || session.lastError?.includes("Person detected in only")
                                      ? "Video is too dark or empty. Please provide a clearer recording for analysis."
                                      : session.lastError || "The analysis engine was unable to process this video. Please verify quality and retry."}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Processing Status */}
                          {isProcessing && (
                            <div className="bg-amber-50 border-2 border-amber-500 p-4 shadow-[4px_4px_0px_0px_rgba(245,158,11,0.2)]">
                              <div className="flex items-center gap-3">
                                <div className="bg-amber-500 p-1.5 text-white rounded-full">
                                  <Loader2 size={16} className="animate-spin" />
                                </div>
                                <p className="text-[10px] font-black text-amber-800 tracking-widest italic font-mono uppercase">
                                  Engine Analyzing... Auto-retries enabled (
                                  {session.maxRetries || 3} max)
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-row xl:flex-col items-stretch gap-2 flex-shrink-0 w-full xl:w-56 mt-auto xl:mt-0">
                          {session.status === "pending_review" && (
                            <button
                              onClick={() => handleApprove(session)}
                              disabled={approveForAI.isPending}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 text-white border-2 border-zinc-900 hover:bg-zinc-800 transition-all text-xs font-black uppercase tracking-widest disabled:opacity-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                            >
                              {approveForAI.isPending ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <ShieldCheck size={16} />
                              )}
                              APPROVE FOR AI
                            </button>
                          )}

                          {session.status === "approved_for_ai" && (
                            <button
                              onClick={() => handleTriggerAI(session)}
                              disabled={triggerAI.isPending}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white border-2 border-blue-600 hover:bg-blue-700 transition-all text-xs font-black uppercase tracking-widest disabled:opacity-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"
                            >
                              {triggerAI.isPending ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Zap size={16} />
                              )}
                              RUN ANALYSIS
                            </button>
                          )}

                          {isFailed && (
                            <button
                              onClick={() => handleRetry(session)}
                              disabled={retryAI.isPending}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-zinc-900 border-2 border-zinc-900 hover:bg-amber-600 transition-all text-xs font-black uppercase tracking-widest disabled:opacity-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                            >
                              {retryAI.isPending ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <RotateCcw size={16} />
                              )}
                              RETRY ANALYSIS
                            </button>
                          )}

                          {session.status === "completed" && (
                            <button
                              onClick={() => handleViewReport(session)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white border-2 border-zinc-900 hover:bg-emerald-700 transition-all text-xs font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                            >
                              <BookOpen size={16} />
                              VIEW INSIGHTS
                            </button>
                          )}

                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                setSelectedSession(
                                  selectedSession?.id === session.id
                                    ? null
                                    : session,
                                )
                              }
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white text-zinc-900 border-2 border-zinc-900 hover:bg-zinc-50 transition-all text-xs font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                            >
                              {selectedSession?.id === session.id ? (
                                <X size={16} />
                              ) : (
                                <Eye size={16} />
                              )}
                              {selectedSession?.id === session.id
                                ? "CLOSE"
                                : "PREVIEW"}
                            </button>

                            {(session.status === "processing" ||
                              session.status === "approved_for_ai") && (
                              <button
                                onClick={() =>
                                  setConfirmCancel(
                                    confirmCancel === session.id
                                      ? null
                                      : session.id,
                                  )
                                }
                                className="p-3 bg-red-100 text-red-600 border-2 border-red-500 hover:bg-red-600 hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                              >
                                <XCircle size={16} />
                              </button>
                            )}

                            <button
                              onClick={() =>
                                setConfirmDelete(
                                  confirmDelete === session.id
                                    ? null
                                    : session.id,
                                )
                              }
                              className={`p-3 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                                confirmDelete === session.id
                                  ? "bg-red-600 text-white border-2 border-zinc-900"
                                  : "bg-white text-red-600 border-2 border-red-200 hover:border-red-600"
                              }`}
                              title="Delete Session"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          {confirmCancel === session.id && (
                            <div className="flex items-center gap-2 mt-2 bg-red-50 p-2 border-2 border-red-200">
                              <span className="text-[10px] font-black uppercase text-red-700">
                                Cancel AI?
                              </span>
                              <button
                                onClick={() => handleCancel(session)}
                                className="px-3 py-1 bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest border border-zinc-900"
                              >
                                YES
                              </button>
                            </div>
                          )}

                          {confirmDelete === session.id && (
                            <div className="flex items-center gap-2 mt-2 bg-red-50 p-2 border-2 border-red-600 shadow-[2px_2px_0px_0px_rgba(220,38,38,1)]">
                              <span className="text-[9px] font-black uppercase text-red-700 flex-1">
                                PERMANENT DELETE?
                              </span>
                              <button
                                onClick={() => handleDelete(session)}
                                className="px-3 py-1 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest border border-zinc-900 hover:bg-red-700"
                              >
                                DELETE
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="px-2 py-1 bg-white text-zinc-900 text-[9px] font-bold uppercase border border-zinc-200"
                              >
                                NO
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Preview Panel (Expandable) */}
                  {selectedSession?.id === session.id && (
                    <div className="border-t-2 border-zinc-200 bg-zinc-50 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest">
                          Session Preview
                        </h4>
                        <button
                          onClick={() => setSelectedSession(null)}
                          className="p-1 hover:bg-zinc-200 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-4 border-2 border-zinc-200">
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">
                            Action Type
                          </p>
                          <p className="text-sm font-black text-zinc-900 uppercase">
                            {session.actionType.replace(/_/g, ' ') || "—"}
                          </p>
                        </div>
                        <div className="bg-white p-4 border-2 border-zinc-200">
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">
                            Duration
                          </p>
                          <p className="text-sm font-black text-zinc-900">
                            {session.duration}s
                          </p>
                        </div>
                        <div className="bg-white p-4 border-2 border-zinc-200">
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">
                            Quality
                          </p>
                          <p className="text-sm font-black text-zinc-900 uppercase">
                            {session.qualityScore || "Medium"}
                          </p>
                        </div>
                        <div className="bg-white p-4 border-2 border-zinc-200">
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">
                            Retry Count
                          </p>
                          <p className="text-sm font-black text-zinc-900">
                            {session.retryCount || 0} /{" "}
                            {session.maxRetries || 3}
                          </p>
                        </div>
                      </div>
                      {session.videoUrl && (
                        <div className="mt-4">
                          <video
                            src={getFileUrl(session.videoUrl)}
                            controls
                            className="w-full max-w-2xl border-2 border-zinc-900"
                            style={{ maxHeight: "400px" }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
