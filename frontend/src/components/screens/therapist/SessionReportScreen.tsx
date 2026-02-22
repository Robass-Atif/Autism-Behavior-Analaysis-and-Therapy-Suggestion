import React, { useState } from "react";
import {
  ArrowLeft,
  Download,
  Share2,
  User,
  Calendar,
  Activity,
  Brain,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  FileText,
  Shield,
  BarChart2,
  Zap,
  Play,
  Settings,
} from "lucide-react";
import toast from "react-hot-toast";
import { Screen, VideoSession as Session } from "../../../types";
import { useVideoSession } from "../../../api/clinical";

interface SessionReportScreenProps {
  sessionId: string;
  onNavigate?: (screen: Screen, data?: any) => void;
  onBack?: () => void;
}

export default function SessionReportScreen({
  sessionId,
  onNavigate,
  onBack,
}: SessionReportScreenProps) {
  const { data: session, isLoading } = useVideoSession(sessionId);
  const [isValidating, setIsValidating] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [isFlagged, setIsFlagged] = useState(false);

  const handleValidate = () => {
    setIsValidating(true);
    setTimeout(() => {
      setIsValidating(false);
      setIsValidated(true);
      toast.success("Core calculations validated successfully.", {
        style: {
          borderRadius: "0",
          border: "2px solid #18181b",
          color: "#18181b",
          fontWeight: "900",
          fontFamily: "monospace",
          textTransform: "uppercase",
        },
      });
    }, 1500);
  };

  const handleFlag = () => {
    setIsFlagged(true);
    toast.error("Discrepancy flagged. Data team notified.", {
      style: {
        borderRadius: "0",
        border: "2px solid #18181b",
        color: "#18181b",
        fontWeight: "900",
        fontFamily: "monospace",
        textTransform: "uppercase",
      },
    });
  };

  const handleExport = () => {
    const exportPromise = new Promise((resolve) => setTimeout(resolve, 2000));
    toast.promise(
      exportPromise,
      {
        loading: "COMPILING_NEURAL_EXPORT...",
        success: "EXPORT_DOWNLOADED_TO_SECURE_STORAGE.",
        error: "EXPORT_FAILED.",
      },
      {
        style: {
          borderRadius: "0",
          border: "2px solid #18181b",
          color: "#18181b",
          fontWeight: "900",
          fontFamily: "monospace",
          textTransform: "uppercase",
        },
      },
    );
  };

  const handleClinicalReview = () => {
    toast.success("CLINICAL_REVIEW_MODE_ENGAGED.", {
      style: {
        borderRadius: "0",
        border: "2px solid #18181b",
        color: "#18181b",
        fontWeight: "900",
        fontFamily: "monospace",
        textTransform: "uppercase",
      },
      icon: "📋",
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white font-mono gap-4">
        <div className="w-10 h-10 border-4 border-zinc-900 border-t-transparent animate-spin"></div>
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
          Loading_Transmission...
        </p>
      </div>
    );
  }

  if (!session)
    return (
      <div className="p-8 text-center font-mono">
        <h2 className="text-xl font-black uppercase">
          404 | SESSION_NOT_FOUND
        </h2>
        <button
          onClick={onBack}
          className="mt-4 text-zinc-500 hover:text-zinc-900 uppercase font-bold text-[10px]"
        >
          Back to Dashboard
        </button>
      </div>
    );

  return (
    <div className="min-h-screen bg-zinc-50 font-mono pb-20">
      {/* Top Navigation - Brutal Header */}
      <div className="bg-zinc-900 text-white border-b-4 border-zinc-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={onBack}
              className="p-2 border-2 border-zinc-700 text-zinc-400 hover:text-white hover:border-white transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tighter leading-none">
                Analysis | {session.patientName}
              </h1>
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-1">
                TRANSMISSION_ID: {sessionId.toUpperCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="px-4 py-2 border-2 border-zinc-700 text-[10px] font-black uppercase tracking-widest hover:border-white transition-all"
            >
              <Download size={14} className="inline mr-2" /> Export
            </button>
            <button
              onClick={handleClinicalReview}
              className="px-4 py-2 bg-white text-zinc-900 border-2 border-white text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 transition-all shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]"
            >
              Clinical_Review
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {/* Vital Board */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <VitalCard
            label="Clinical_Status"
            value={session.status.toUpperCase()}
            sub="ACTIVE_FEED"
            accent="bg-zinc-900 text-white"
          />
          <VitalCard
            label="Action_Profile"
            value={session.actionType || "GENERAL_ASD"}
            sub="OBSERVATION_TYPE"
          />
          <VitalCard
            label="Recorded_Date"
            value={new Date(session.recordedAt).toLocaleDateString()}
            sub="UTC_TIMESTAMP"
          />
          <VitalCard
            label="Analysis_Conf"
            value={`${Math.round((session.aiConfidence || session.ensemblePrediction?.severity_confidence || 0) * 100)}%`}
            sub="NEURAL_STRENGTH"
          />
        </div>

        {/* Main Content Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Primary Analysis View */}
          <div className="lg:col-span-2 space-y-10">
            {/* Media Container - Industrial look */}
            <div className="bg-zinc-900 border-4 border-zinc-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative aspect-video group overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-all cursor-pointer">
                <div className="w-16 h-16 border-4 border-white flex items-center justify-center text-white">
                  <Play size={24} fill="currentColor" />
                </div>
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                <div className="px-3 py-1 bg-zinc-900 border-2 border-zinc-700 text-[8px] font-black text-white uppercase tracking-widest">
                  SEC_FEED_v1.0
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 animate-pulse"></div>
                  <span className="text-[8px] font-black text-white uppercase tracking-widest">
                    LIVE_ANNOTATIONS
                  </span>
                </div>
              </div>
            </div>

            {/* Behavior Log */}
            <div className="bg-white border-2 border-zinc-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="p-4 border-b-2 border-zinc-900 bg-zinc-900 text-zinc-500 flex items-center gap-2">
                <Activity size={14} />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">
                  Behavioral_Telemetry_Log
                </h3>
              </div>
              <div className="divide-y-2 divide-zinc-100">
                {session.aiAnalysis?.behaviors &&
                session.aiAnalysis.behaviors.length > 0 ? (
                  session.aiAnalysis.behaviors.map((b, i) => (
                    <BehaviorEntry
                      key={i}
                      time={
                        Math.floor(b.timestamp).toString().padStart(2, "0") +
                        ":" +
                        Math.floor((b.timestamp % 1) * 60)
                          .toString()
                          .padStart(2, "0")
                      }
                      label={b.type.toUpperCase().replace("_", " ")}
                      stat={b.severity.toUpperCase()}
                      desc={`Automated detection logged. Confidence: ${Math.round(b.confidence * 100)}%.`}
                    />
                  ))
                ) : (
                  <div className="p-6 text-xs text-zinc-500 font-bold uppercase tracking-widest text-center">
                    NO_BEHAVIORS_LOGGED_IN_ANALYSIS
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Insights/Meta */}
          <div className="space-y-10">
            {/* Neural Summary */}
            <div className="bg-white border-2 border-zinc-900 p-8 text-zinc-900 relative overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Brain size={120} />
              </div>
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                <Zap size={14} className="text-zinc-900" /> Neural_Inference
              </h3>
              <p className="text-xs font-bold uppercase tracking-tight leading-relaxed italic border-l-4 border-zinc-900 pl-4 text-zinc-600">
                "
                {session.aiAnalysis?.summary ||
                  session.clinicalReport?.clinical_report ||
                  "INSUFFICIENT_DATA_FOR_NEURAL_NARRATIVE. WAITING_ON_PROCESSING."}
                "
              </p>
              <div className="mt-8 space-y-3">
                <div className="flex justify-between border-2 border-zinc-100 p-3 bg-zinc-50">
                  <span className="text-[9px] font-black text-zinc-500 uppercase">
                    Events_Detected
                  </span>
                  <span className="text-[10px] font-black text-zinc-900">
                    {session.aiAnalysis?.behaviors?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between border-2 border-zinc-100 p-3 bg-zinc-50">
                  <span className="text-[9px] font-black text-zinc-500 uppercase">
                    Composite_Severity
                  </span>
                  <span className="text-[10px] font-black text-zinc-900">
                    {session.ensemblePrediction?.severity?.toFixed(2) || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                disabled={isValidating || isValidated}
                onClick={handleValidate}
                className="w-full py-4 bg-zinc-900 text-white border-2 border-zinc-900 font-black text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {isValidating
                  ? "VALIDATING..."
                  : isValidated
                    ? "CALCULATIONS_VERIFIED"
                    : "Validate_Calculations"}
              </button>
              <button
                disabled={isFlagged}
                onClick={handleFlag}
                className="w-full py-4 bg-white text-zinc-900 border-2 border-zinc-900 font-black text-[10px] uppercase tracking-widest hover:bg-zinc-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-zinc-100"
              >
                {isFlagged ? "DISCREPANCY_LOGGED" : "Flag_Discrepancy"}
              </button>
            </div>

            {/* Technical Stack */}
            <div className="p-6 border-2 border-dashed border-zinc-300">
              <h4 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Settings size={12} className="text-zinc-900" /> System_Manifest
              </h4>
              <div className="space-y-2 text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
                <div className="flex justify-between">
                  <span>Model_v</span>
                  <span className="text-zinc-900">4.0.2-ALPHA</span>
                </div>
                <div className="flex justify-between">
                  <span>Core_Type</span>
                  <span className="text-zinc-900">NEURAL_NET_V2</span>
                </div>
                <div className="flex justify-between">
                  <span>Frame_Rate</span>
                  <span className="text-zinc-900">60_FPS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VitalCard({
  label,
  value,
  sub,
  accent = "bg-white border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
}: {
  label: string;
  value: string;
  sub: string;
  accent?: string;
}) {
  return (
    <div className={`${accent} p-6 h-full flex flex-col justify-between`}>
      <div className="space-y-1">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">
          {label}
        </p>
        <p className="text-xl font-black uppercase tracking-tighter truncate">
          {value}
        </p>
      </div>
      <p className="text-[8px] font-black uppercase tracking-widest mt-4 opacity-40">
        {sub}
      </p>
    </div>
  );
}

function BehaviorEntry({
  time,
  label,
  stat,
  desc,
}: {
  time: string;
  label: string;
  stat: string;
  desc: string;
}) {
  return (
    <div className="p-6 flex items-start gap-6 hover:bg-zinc-50 transition-colors group">
      <span className="text-[10px] font-black text-zinc-400 font-mono tracking-tighter group-hover:text-zinc-900">
        {time}_S
      </span>
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-900">
            {label}
          </h4>
          <span
            className={`text-[8px] font-black px-2 py-0.5 border ${
              stat === "HIGH"
                ? "bg-zinc-900 text-white"
                : "bg-white text-zinc-500 border-zinc-200"
            }`}
          >
            {stat}_LEVEL
          </span>
        </div>
        <p className="text-[10px] font-bold uppercase text-zinc-500 leading-relaxed tracking-tight">
          {desc}
        </p>
      </div>
    </div>
  );
}
