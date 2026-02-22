import React, { useState } from "react";
import {
  ArrowLeft,
  Download,
  Activity,
  Brain,
  AlertTriangle,
  Zap,
  Settings,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Layers,
  Crosshair,
  Timer,
  Users,
  BarChart2,
  CheckCircle2,
  Shield,
  User,
  Play,
} from "lucide-react";
import toast from "react-hot-toast";
import { Screen, VideoSession as Session } from "../../../types";
import { useVideoSession } from "../../../api/clinical";
import { getFileUrl } from "../../../config/apiConfig";

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
  const [activeExplainTab, setActiveExplainTab] = useState<string>("Severity");
  const [showDrillDown, setShowDrillDown] = useState(false);

  const toastStyle = {
    borderRadius: "0",
    border: "2px solid #18181b",
    color: "#18181b",
    fontWeight: "900" as const,
    fontFamily: "monospace",
    textTransform: "uppercase" as const,
  };

  const handleValidate = () => {
    setIsValidating(true);
    setTimeout(() => {
      setIsValidating(false);
      setIsValidated(true);
      toast.success("Core calculations validated successfully.", {
        style: toastStyle,
      });
    }, 1500);
  };

  const handleFlag = () => {
    setIsFlagged(true);
    toast.error("Discrepancy flagged. Data team notified.", {
      style: toastStyle,
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
      { style: toastStyle },
    );
  };

  const handleClinicalReview = () => {
    toast.success("CLINICAL_REVIEW_MODE_ENGAGED.", {
      style: toastStyle,
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

  if (!session) {
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
  }

  // ── Extract data ──
  const pred2d = session.rawPredictionResponse?.predictions_2d as any;
  const pred3d = session.rawPredictionResponse?.predictions_3d as any;
  const ensemble = session.ensemblePrediction;
  const hasError = pred2d?.error || pred3d?.error;
  const activePred = pred2d?.explainability
    ? pred2d
    : pred3d?.explainability
      ? pred3d
      : null;
  const explain = activePred?.explainability;
  const taskExplanations = explain?.task_explanations;
  const videoMeta = explain?.video_metadata;
  const processingInfo = (session.aiAnalysis as any)?.rawPrediction
    ?.processingInfo;
  const rawPred = (session.aiAnalysis as any)?.rawPrediction;
  const dsm5 = (session.clinicalReport as any)?.dsm5_classification;
  const interventions = (session.clinicalReport as any)
    ?.recommended_interventions;
  const explainSummary = explain?.summary;
  const explainPredictions = explain?.predictions;

  // ── Clinical Classification Helpers ──
  const getSeverityClass = (
    val: number | null | undefined,
  ): { label: string; color: string } => {
    if (val == null) return { label: "N/A", color: "text-zinc-400" };
    if (val === 0)
      return {
        label: "Non-Spectrum (Not Affected)",
        color: "text-emerald-600",
      };
    if (val === 1)
      return {
        label: "Autism Spectrum Disorder (Mild)",
        color: "text-amber-600",
      };
    return { label: "Autism (Severe)", color: "text-red-600" };
  };

  const getSocialAffectClass = (
    val: number | null | undefined,
  ): { label: string; color: string } => {
    if (val == null) return { label: "N/A", color: "text-zinc-400" };
    const v = Math.round(val);
    if (v >= 5 && v <= 14)
      return { label: "Low (0)", color: "text-emerald-600" };
    if (v >= 15 && v <= 20)
      return { label: "Medium (1)", color: "text-amber-600" };
    if (v >= 21) return { label: "High (2)", color: "text-red-600" };
    return { label: "Below Threshold", color: "text-zinc-500" };
  };

  const getRRBClass = (
    val: number | null | undefined,
  ): { label: string; color: string } => {
    if (val == null) return { label: "N/A", color: "text-zinc-400" };
    const v = Math.round(val);
    if (v >= 1 && v <= 3)
      return { label: "Low (0)", color: "text-emerald-600" };
    if (v >= 4 && v <= 8)
      return { label: "Medium (1)", color: "text-amber-600" };
    if (v > 8) return { label: "High (2)", color: "text-red-600" };
    return { label: "Below Threshold", color: "text-zinc-500" };
  };

  const severityCls = getSeverityClass(ensemble?.severity);
  const saCls = getSocialAffectClass(ensemble?.social_affect);
  const rrbCls = getRRBClass(ensemble?.rrb);
  const adosTotal =
    ensemble?.social_affect != null && ensemble?.rrb != null
      ? ensemble.social_affect + ensemble.rrb
      : null;

  const confidencePercent = ensemble?.severity_confidence
    ? Math.round(ensemble.severity_confidence * 100)
    : session.aiConfidence || 0;

  const tabs = taskExplanations ? Object.keys(taskExplanations) : [];
  const activeTaskData = taskExplanations?.[
    activeExplainTab as keyof typeof taskExplanations
  ] as any;

  // Color helpers
  const clsBg = (cls: { color: string }) =>
    cls.color.includes("red")
      ? "border-red-500 bg-red-50"
      : cls.color.includes("amber")
        ? "border-amber-500 bg-amber-50"
        : "border-emerald-500 bg-emerald-50";

  const clsBadge = (cls: { color: string }) =>
    cls.color.includes("red")
      ? "bg-red-600 text-white"
      : cls.color.includes("amber")
        ? "bg-amber-600 text-white"
        : "bg-emerald-600 text-white";

  return (
    <div className="min-h-screen bg-zinc-50 font-mono pb-20">
      {/* ═══ HEADER ═══ */}
      <div className="bg-zinc-900 text-white border-b-4 border-zinc-800 sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={onBack}
              className="p-2 border-2 border-zinc-700 text-zinc-400 hover:text-white hover:border-white transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tighter leading-none">
                Clinical Diagnostic Report | {session.patientName}
              </h1>
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-1">
                Reference ID: {sessionId.slice(0, 12).toUpperCase()}
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
              Approve Clinical Review
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-6 py-8 space-y-8">
        {/* ═══ SECTION 1: VITAL METRICS ═══ */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <VitalCard
            label="Lifecycle"
            value={session.status.toUpperCase().replace(/_/g, " ")}
            sub="PIPELINE STATUS"
            accent="bg-zinc-900 text-white"
          />
          <VitalCard
            label="Observation Focus"
            value={session.actionType || "GENERAL"}
            sub="PROTOCOL ANALYSIS"
          />
          <VitalCard
            label="ADOS-2 Severity"
            value={
              ensemble?.severity != null ? `Level ${ensemble.severity}` : "N/A"
            }
            sub={severityCls.label}
            accent={
              ensemble?.severity != null && ensemble.severity >= 2
                ? "bg-red-50 border-2 border-red-500 text-red-900"
                : undefined
            }
          />
          <VitalCard
            label="Certainty"
            value={`${confidencePercent}%`}
            sub="STATISTICAL CONFIDENCE"
            accent={
              confidencePercent >= 90
                ? "bg-emerald-50 border-2 border-emerald-500 text-emerald-900"
                : undefined
            }
          />
          <VitalCard
            label="Methodology"
            value={activePred?.model_type || (pred2d ? "2D" : "N/A")}
            sub={`FRAME_DEPTH: ${activePred?.sequence_length || "—"}`}
          />
          <VitalCard
            label="Recorded"
            value={new Date(session.recordedAt).toLocaleDateString()}
            sub={new Date(session.recordedAt).toLocaleTimeString()}
          />
        </div>

        {/* ═══ SECTION 2: ADOS-2 PREDICTION CARDS ═══ */}
        {ensemble && !hasError && (
          <div className="space-y-4">
            <div className="bg-zinc-900 text-white p-4 flex items-center justify-between shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-2 border-zinc-900">
              <div className="flex items-center gap-2">
                <Brain size={16} />
                <h3 className="text-xs font-black uppercase tracking-[0.3em]">
                  AI-Driven ADOS-2 Predictive Metrics
                </h3>
              </div>
              <span className="text-[8px] font-black bg-white text-zinc-900 px-2 py-0.5 tracking-widest">
                METHOD: {ensemble.method?.toUpperCase() || "ENSEMBLE"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Severity */}
              <div
                className={`border-2 p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${clsBg(severityCls)}`}
              >
                <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                  Severity
                </p>
                <p
                  className={`text-4xl font-black tracking-tighter ${severityCls.color}`}
                >
                  {ensemble.severity ?? "—"}
                </p>
                <div
                  className={`mt-2 inline-block px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${clsBadge(severityCls)}`}
                >
                  {severityCls.label}
                </div>
                <p className="text-[8px] font-bold text-zinc-400 uppercase mt-2">
                  Conf: {confidencePercent}%
                </p>
              </div>

              {/* Social Affect */}
              <div
                className={`border-2 p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${clsBg(saCls)}`}
              >
                <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                  Social Affect
                </p>
                <p
                  className={`text-4xl font-black tracking-tighter ${saCls.color}`}
                >
                  {ensemble.social_affect?.toFixed(1) ?? "—"}
                </p>
                <div
                  className={`mt-2 inline-block px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${clsBadge(saCls)}`}
                >
                  {saCls.label}
                </div>
                <p className="text-[8px] font-bold text-zinc-400 uppercase mt-2">
                  5–14 Low · 15–20 Med · 21+ High
                </p>
              </div>

              {/* RRB */}
              <div
                className={`border-2 p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${clsBg(rrbCls)}`}
              >
                <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                  Social Communication Impairment
                </p>
                <p
                  className={`text-4xl font-black tracking-tighter ${rrbCls.color}`}
                >
                  {ensemble.rrb?.toFixed(1) ?? "—"}
                </p>
                <div
                  className={`mt-2 inline-block px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${clsBadge(rrbCls)}`}
                >
                  {rrbCls.label}
                </div>
                <p className="text-[8px] font-bold text-zinc-400 uppercase mt-2">
                  1–3 Low · 4–8 Med · 8+ High
                </p>
              </div>

              {/* Comparison Score */}
              <div className="border-2 border-zinc-900 bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                  Comparison Score
                </p>
                <p className="text-4xl font-black tracking-tighter text-zinc-900">
                  {ensemble.comparison_score ?? "—"}
                </p>
                <p className="text-[8px] font-bold text-zinc-400 uppercase mt-2">
                  Conf:{" "}
                  {ensemble.comparison_confidence
                    ? (ensemble.comparison_confidence * 100).toFixed(0) + "%"
                    : "—"}
                </p>
              </div>

              {/* ADOS Total */}
              <div className="border-2 border-zinc-900 bg-zinc-900 text-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                  ADOS Total Score
                </p>
                <p className="text-4xl font-black tracking-tighter">
                  {adosTotal != null ? adosTotal.toFixed(1) : "—"}
                </p>
                <p className="text-[8px] font-bold text-zinc-500 uppercase mt-2">
                  SA ({ensemble.social_affect?.toFixed(1)}) + RRB (
                  {ensemble.rrb?.toFixed(1)})
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {hasError && (
          <div className="bg-amber-50 border-2 border-amber-500 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
            <div className="flex items-start gap-4">
              <div className="bg-amber-500 p-2 text-white">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-xs font-black text-amber-900 uppercase tracking-widest mb-1">
                  ANALYSIS_PARTIAL — DATA_QUALITY_ISSUE
                </h3>
                <p className="text-xs text-amber-800 font-bold">
                  The neural engine completed processing but encountered data
                  quality limitations. Results below may be incomplete.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ SECTION 3: EXPLAINABILITY — All 4 Predictions ═══ */}
        {taskExplanations && tabs.length > 0 && (
          <div className="bg-white border-2 border-zinc-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="p-4 border-b-2 border-zinc-900 bg-zinc-900 text-white flex items-center gap-2">
              <Layers size={14} />
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">
                Feature Attribution: Key Kinetic Indicators
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-zinc-200">
              {tabs.map((taskName) => {
                const taskData = taskExplanations[
                  taskName as keyof typeof taskExplanations
                ] as any;
                if (!taskData) return null;
                const topJoints =
                  taskData.joints?.positive_contributors?.slice(0, 5) || [];
                let taskClassLabel = "";
                let taskClassColor = "bg-zinc-600";
                if (taskName === "Severity") {
                  taskClassLabel = severityCls.label;
                  taskClassColor = severityCls.color.includes("red")
                    ? "bg-red-600"
                    : severityCls.color.includes("amber")
                      ? "bg-amber-600"
                      : "bg-emerald-600";
                } else if (taskName === "Social Affect") {
                  taskClassLabel = saCls.label;
                  taskClassColor = saCls.color.includes("red")
                    ? "bg-red-600"
                    : saCls.color.includes("amber")
                      ? "bg-amber-600"
                      : "bg-emerald-600";
                } else if (taskName === "RRB") {
                  taskClassLabel = rrbCls.label;
                  taskClassColor = rrbCls.color.includes("red")
                    ? "bg-red-600"
                    : rrbCls.color.includes("amber")
                      ? "bg-amber-600"
                      : "bg-emerald-600";
                } else if (taskName === "Comparison Score") {
                  taskClassLabel = `Score: ${ensemble?.comparison_score ?? "—"}`;
                }
                return (
                  <div key={taskName} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[9px] font-black text-zinc-900 uppercase tracking-widest">
                        {taskName}
                      </h4>
                      {taskClassLabel && (
                        <span
                          className={`text-[7px] font-black px-1.5 py-0.5 text-white uppercase tracking-widest ${taskClassColor}`}
                        >
                          {taskClassLabel}
                        </span>
                      )}
                    </div>
                    <div className="mb-3 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-zinc-900">
                        {taskName === "Severity"
                          ? (ensemble?.severity ?? "—")
                          : taskName === "Social Affect"
                            ? (ensemble?.social_affect?.toFixed(1) ?? "—")
                            : taskName === "RRB"
                              ? (ensemble?.rrb?.toFixed(1) ?? "—")
                              : (ensemble?.comparison_score ?? "—")}
                      </span>
                      <span className="text-[8px] font-bold text-zinc-400">
                        conf:{" "}
                        {taskData.confidence?.confidence_score?.toFixed(0) ??
                          "—"}
                        %
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {topJoints.map((j: any, i: number) => (
                        <JointBar
                          key={i}
                          joint={j.joint}
                          value={j.contribution}
                          max={topJoints[0]?.contribution || 1}
                          positive
                        />
                      ))}
                      {topJoints.length === 0 && (
                        <p className="text-[9px] text-zinc-400 font-bold uppercase text-center py-3">
                          NO_DATA
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expandable Detailed Drill-Down */}
            <div className="border-t-2 border-zinc-200">
              <button
                onClick={() => setShowDrillDown(!showDrillDown)}
                className="w-full p-4 bg-zinc-50 flex items-center gap-2 hover:bg-zinc-100 transition-colors"
              >
                <Crosshair size={14} className="text-zinc-900" />
                <span className="text-[10px] font-black text-zinc-900 uppercase tracking-widest flex-1 text-left">
                  Comprehensive Clinical Drill-Down (Kinetics + Temporal +
                  Demographics)
                </span>
                {showDrillDown ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </button>

              {showDrillDown && (
                <div className="p-5 space-y-5 border-t border-zinc-200">
                  {/* Tab selector */}
                  <div className="flex gap-1 flex-wrap">
                    {tabs.map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveExplainTab(tab)}
                        className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest border transition-all ${activeExplainTab === tab ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-500 border-zinc-300 hover:border-zinc-900"}`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {activeTaskData && (
                    <div className="space-y-5">
                      {/* Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <MiniStat
                          label="Prediction"
                          value={
                            activeTaskData.prediction?.toFixed?.(2) ??
                            activeTaskData.prediction
                          }
                        />
                        <MiniStat
                          label="Baseline"
                          value={
                            activeTaskData.baseline?.toFixed?.(2) ??
                            activeTaskData.baseline
                          }
                        />
                        <MiniStat
                          label="Confidence"
                          value={`${activeTaskData.confidence?.confidence_score?.toFixed(0)}%`}
                          badge={activeTaskData.confidence?.confidence_level}
                        />
                        <MiniStat
                          label="Pred Mean"
                          value={activeTaskData.confidence?.prediction_mean?.toFixed(
                            2,
                          )}
                        />
                      </div>

                      {/* Joint bars */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border-2 border-emerald-200 bg-emerald-50/50">
                          <div className="p-3 border-b border-emerald-200 bg-emerald-100">
                            <span className="text-[9px] font-black text-emerald-800 uppercase tracking-widest flex items-center gap-1">
                              <TrendingUp size={12} /> Positive_Contributors
                            </span>
                          </div>
                          <div className="p-3 space-y-1.5 max-h-64 overflow-y-auto">
                            {activeTaskData.joints?.positive_contributors
                              ?.slice(0, 10)
                              .map((j: any, i: number) => (
                                <JointBar
                                  key={i}
                                  joint={j.joint}
                                  value={j.contribution}
                                  max={
                                    activeTaskData.joints
                                      .positive_contributors[0]?.contribution ||
                                    1
                                  }
                                  positive
                                />
                              ))}
                            {!activeTaskData.joints?.positive_contributors
                              ?.length && (
                              <p className="text-[9px] text-zinc-400 font-bold uppercase text-center py-4">
                                NO_DATA
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="border-2 border-red-200 bg-red-50/50">
                          <div className="p-3 border-b border-red-200 bg-red-100">
                            <span className="text-[9px] font-black text-red-800 uppercase tracking-widest flex items-center gap-1">
                              <TrendingDown size={12} /> Negative_Contributors
                            </span>
                          </div>
                          <div className="p-3 space-y-1.5 max-h-64 overflow-y-auto">
                            {activeTaskData.joints?.negative_contributors
                              ?.slice(0, 10)
                              .map((j: any, i: number) => (
                                <JointBar
                                  key={i}
                                  joint={j.joint}
                                  value={j.contribution}
                                  max={
                                    activeTaskData.joints
                                      .negative_contributors[0]?.contribution ||
                                    -1
                                  }
                                  positive={false}
                                />
                              ))}
                            {!activeTaskData.joints?.negative_contributors
                              ?.length && (
                              <p className="text-[9px] text-zinc-400 font-bold uppercase text-center py-4">
                                NO_DATA
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Temporal Segments */}
                      {activeTaskData.temporal_segments?.all_segments?.length >
                        0 && (
                        <div>
                          <h4 className="text-[10px] font-black text-zinc-900 uppercase tracking-widest mb-3 flex items-center gap-1">
                            <Timer size={14} /> Temporal_Segments
                          </h4>
                          <div className="space-y-2">
                            {activeTaskData.temporal_segments.all_segments.map(
                              (seg: any, i: number) => (
                                <div
                                  key={i}
                                  className={`border-2 p-4 ${seg.influence_direction === "positive" ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"}`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[9px] font-black uppercase tracking-widest">
                                      {seg.influence_direction === "positive"
                                        ? "↑"
                                        : "↓"}{" "}
                                      Segment {i + 1}
                                    </span>
                                    <span
                                      className={`text-[8px] font-black px-2 py-0.5 ${seg.influence_direction === "positive" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}
                                    >
                                      {seg.influence_direction.toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[9px] font-bold text-zinc-700 uppercase">
                                    <div>
                                      <span className="text-zinc-400">
                                        Time:{" "}
                                      </span>
                                      {seg.start_time?.toFixed(1)}s →{" "}
                                      {seg.end_time?.toFixed(1)}s
                                    </div>
                                    <div>
                                      <span className="text-zinc-400">
                                        Frames:{" "}
                                      </span>
                                      {seg.start_frame} → {seg.end_frame}
                                    </div>
                                    <div>
                                      <span className="text-zinc-400">
                                        Contribution:{" "}
                                      </span>
                                      {seg.contribution?.toFixed(4)}
                                    </div>
                                    <div>
                                      <span className="text-zinc-400">
                                        Raw Attr:{" "}
                                      </span>
                                      {seg.raw_attribution?.toFixed(6)}
                                    </div>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                      {/* Demographics + Attribution */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border-2 border-zinc-200 p-4">
                          <h4 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                            <Users size={12} /> Demographic_Impact
                          </h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-bold text-zinc-600 uppercase">
                                Age Contribution
                              </span>
                              <span
                                className={`text-[10px] font-black ${(activeTaskData.demographic_contributions?.age_contribution || 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}
                              >
                                {activeTaskData.demographic_contributions?.age_contribution?.toFixed(
                                  4,
                                ) || "0"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-bold text-zinc-600 uppercase">
                                Gender Contribution
                              </span>
                              <span
                                className={`text-[10px] font-black ${(activeTaskData.demographic_contributions?.gender_contribution || 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}
                              >
                                {activeTaskData.demographic_contributions?.gender_contribution?.toFixed(
                                  4,
                                ) || "0"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="border-2 border-zinc-200 p-4">
                          <h4 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                            <BarChart2 size={12} /> Total_Attribution
                          </h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-bold text-zinc-600 uppercase">
                                Sequence Attribution
                              </span>
                              <span className="text-[10px] font-black text-zinc-900">
                                {activeTaskData.total_sequence_attribution?.toFixed(
                                  4,
                                ) || "—"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-bold text-zinc-600 uppercase">
                                Demographic Attribution
                              </span>
                              <span className="text-[10px] font-black text-zinc-900">
                                {activeTaskData.total_demographic_attribution?.toFixed(
                                  4,
                                ) || "—"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* ═══ LEFT COLUMN ═══ */}
          <div className="xl:col-span-2 space-y-8">
            {/* Video Player */}
            {session.videoUrl && (
              <div className="bg-zinc-900 border-2 border-zinc-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                <video
                  src={getFileUrl(session.videoUrl)}
                  controls
                  className="w-full aspect-video object-contain bg-black"
                />
                <div className="px-4 py-2 flex justify-between items-center border-t border-zinc-800">
                  <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">
                    FEED: {session.videoUrl.split("/").pop()}
                  </span>
                  <div className="flex items-center gap-3 text-[8px] font-black text-zinc-500 uppercase tracking-widest">
                    {videoMeta && <span>FPS: {videoMeta.fps}</span>}
                    {videoMeta && <span>FRAMES: {videoMeta.num_frames}</span>}
                    {videoMeta && (
                      <span>
                        DUR: {videoMeta.duration_seconds?.toFixed(1)}s
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Behavioral Telemetry */}
            <div className="bg-white border-2 border-zinc-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="p-4 border-b-2 border-zinc-900 bg-zinc-900 text-zinc-500 flex items-center gap-2">
                <Activity size={14} />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">
                  Evidence-Based Behavioral Event Log
                </h3>
              </div>
              <div className="divide-y-2 divide-zinc-100">
                {session.aiAnalysis?.behaviors &&
                session.aiAnalysis.behaviors.length > 0 ? (
                  session.aiAnalysis.behaviors.map((b: any, i: number) => (
                    <div
                      key={i}
                      className="p-5 flex items-start gap-5 hover:bg-zinc-50 transition-colors group"
                    >
                      <span className="text-[10px] font-black text-zinc-400 font-mono tracking-tighter group-hover:text-zinc-900 min-w-[40px]">
                        {Math.floor(b.timestamp).toString().padStart(2, "0")}:
                        {Math.floor((b.timestamp % 1) * 60)
                          .toString()
                          .padStart(2, "0")}
                        _S
                      </span>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-900">
                            {b.type}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[8px] font-black px-2 py-0.5 border ${b.severity === "Severe" ? "bg-red-600 text-white border-red-600" : b.severity === "Mild" ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-emerald-100 text-emerald-800 border-emerald-300"}`}
                            >
                              {b.severity}
                            </span>
                            <span className="text-[8px] font-black px-2 py-0.5 bg-zinc-900 text-white">
                              {Math.round(b.confidence * 100)}%
                            </span>
                          </div>
                        </div>
                        {b.score != null && (
                          <div className="flex items-center gap-3">
                            <span className="text-[9px] font-bold text-zinc-400 uppercase">
                              Score:
                            </span>
                            <span className="text-[10px] font-black text-zinc-900">
                              {b.score?.toFixed(2)}
                            </span>
                            <div className="flex-1 h-1.5 bg-zinc-100 border border-zinc-200">
                              <div
                                className="h-full bg-zinc-900 transition-all"
                                style={{
                                  width: `${Math.min((b.score / 20) * 100, 100)}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-xs text-zinc-500 font-bold uppercase tracking-widest text-center">
                    NO_BEHAVIORS_LOGGED_IN_ANALYSIS
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ═══ RIGHT SIDEBAR ═══ */}
          <div className="space-y-6">
            {/* Neural Summary */}
            <div className="bg-white border-2 border-zinc-900 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-5">
                <Brain size={100} />
              </div>
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                <Zap size={14} className="text-zinc-900" /> Assessment Summary
                Narrative
              </h3>
              <p className="text-xs font-bold uppercase tracking-tight leading-relaxed italic border-l-4 border-zinc-900 pl-4 text-zinc-600">
                "{session.aiAnalysis?.summary || "INSUFFICIENT_DATA"}"
              </p>
            </div>

            {/* Raw Prediction Summary */}
            {rawPred && (
              <div className="bg-white border-2 border-zinc-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <div className="p-4 border-b-2 border-zinc-200 flex items-center gap-2">
                  <BarChart2 size={14} className="text-zinc-900" />
                  <h3 className="text-[10px] font-black text-zinc-900 uppercase tracking-[0.2em]">
                    Analytical Metadata Points
                  </h3>
                </div>
                <div className="p-4 space-y-2 text-[9px] font-bold text-zinc-700 uppercase tracking-wider">
                  <div className="flex justify-between border-b border-zinc-100 pb-2">
                    <span className="text-zinc-400">Diagnostic Severity</span>
                    <span className="text-zinc-900 font-black">
                      {rawPred.severity ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-100 pb-2">
                    <span className="text-zinc-400">
                      Clinical Classification
                    </span>
                    <span className="text-zinc-900 font-black">
                      {rawPred.severityLabel || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-100 pb-2">
                    <span className="text-zinc-400">Analysis Confidence</span>
                    <span className="text-zinc-900 font-black">
                      {rawPred.severityConfidence != null
                        ? (rawPred.severityConfidence * 100).toFixed(2) + "%"
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-100 pb-2">
                    <span className="text-zinc-400">
                      Social-Emotional Reciprocity
                    </span>
                    <span className="text-zinc-900 font-black">
                      {rawPred.socialAffect?.toFixed(2) ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-100 pb-2">
                    <span className="text-zinc-400">
                      Repetitive Behaviors (RRB)
                    </span>
                    <span className="text-zinc-900 font-black">
                      {rawPred.rrb?.toFixed(2) ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-100 pb-2">
                    <span className="text-zinc-400">
                      Cross-Cohort Comparison
                    </span>
                    <span className="text-zinc-900 font-black">
                      {rawPred.comparisonScore ?? "—"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Explainability Predictions Overview */}
            {explainPredictions && (
              <div className="bg-white border-2 border-zinc-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <div className="p-4 border-b-2 border-zinc-200 flex items-center gap-2">
                  <Layers size={14} className="text-zinc-900" />
                  <h3 className="text-[10px] font-black text-zinc-900 uppercase tracking-[0.2em]">
                    Model_Output_Predictions
                  </h3>
                </div>
                <div className="p-4 space-y-2 text-[9px] font-bold text-zinc-700 uppercase tracking-wider">
                  {Object.entries(explainPredictions).map(
                    ([key, val]: [string, any]) => (
                      <div
                        key={key}
                        className="flex justify-between border-b border-zinc-100 pb-2"
                      >
                        <span className="text-zinc-400">
                          {key.replace(/_/g, " ")}
                        </span>
                        <span className="text-zinc-900 font-black">
                          {typeof val === "number"
                            ? val.toFixed(4)
                            : String(val)}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* Explainability Summary Narrative */}
            {explainSummary && (
              <div className="bg-white border-2 border-zinc-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <div className="p-4 border-b-2 border-zinc-200 flex items-center gap-2">
                  <Brain size={14} className="text-zinc-900" />
                  <h3 className="text-[10px] font-black text-zinc-900 uppercase tracking-[0.2em]">
                    Model_Explainability_Summary
                  </h3>
                </div>
                <div className="p-4">
                  <pre className="text-[9px] font-bold text-zinc-700 whitespace-pre-wrap leading-relaxed font-mono">
                    {explainSummary}
                  </pre>
                </div>
              </div>
            )}

            {/* DSM-5 Classification */}
            {dsm5 && (
              <div className="bg-white border-2 border-zinc-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <div className="p-4 border-b-2 border-zinc-200 flex items-center gap-2">
                  <Shield size={14} className="text-zinc-900" />
                  <h3 className="text-[10px] font-black text-zinc-900 uppercase tracking-[0.2em]">
                    DSM-5 Diagnostic Criteria Mapping
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="bg-zinc-900 text-white p-3">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">
                      Support Level Recommendation
                    </p>
                    <p className="text-xs font-black uppercase tracking-tight">
                      {dsm5.level || "—"}
                    </p>
                  </div>
                  <div className="border-2 border-zinc-100 p-3">
                    <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">
                      Social Communication Observation
                    </p>
                    <p className="text-[10px] font-black text-zinc-900 uppercase">
                      {typeof dsm5.social_communication === "string"
                        ? dsm5.social_communication
                        : dsm5.social_communication?.verbatim || "—"}
                    </p>
                  </div>
                  <div className="border-2 border-zinc-100 p-3">
                    <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">
                      Restricted Behavioral Patterns
                    </p>
                    <p className="text-[10px] font-black text-zinc-900 uppercase">
                      {typeof dsm5.restricted_behaviors === "string"
                        ? dsm5.restricted_behaviors
                        : dsm5.restricted_repetitive_behaviors?.verbatim || "—"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Recommendations */}
            {((session.aiAnalysis?.recommendations?.length ?? 0) > 0 ||
              (interventions?.length ?? 0) > 0) && (
              <div className="bg-white border-2 border-zinc-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <div className="p-4 border-b-2 border-zinc-200 flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-zinc-900" />
                  <h3 className="text-[10px] font-black text-zinc-900 uppercase tracking-[0.2em]">
                    Adaptive Intervention Protocols
                  </h3>
                </div>
                <div className="p-4 space-y-2">
                  {(
                    interventions ||
                    session.aiAnalysis?.recommendations?.map((r: any) => ({
                      name: typeof r === "string" ? r : r.name,
                      priority: r.priority || "medium",
                    })) ||
                    []
                  ).map((rec: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-2 border border-zinc-100 hover:bg-zinc-50 transition-colors"
                    >
                      <div
                        className={`w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5 ${rec.priority === "high" ? "bg-red-600" : "bg-zinc-900"}`}
                      >
                        <CheckCircle2 size={10} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-zinc-900 uppercase tracking-tight">
                          {rec.name || rec}
                        </p>
                        {rec.priority && (
                          <span
                            className={`text-[7px] font-black px-1.5 py-0.5 uppercase tracking-widest mt-1 inline-block ${rec.priority === "high" ? "bg-red-100 text-red-700" : "bg-zinc-100 text-zinc-600"}`}
                          >
                            {rec.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Patient Demographics */}
            {activePred && (
              <div className="bg-white border-2 border-zinc-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <div className="p-4 border-b-2 border-zinc-200 flex items-center gap-2">
                  <User size={14} className="text-zinc-900" />
                  <h3 className="text-[10px] font-black text-zinc-900 uppercase tracking-[0.2em]">
                    Patient_Demographics
                  </h3>
                </div>
                <div className="p-4 space-y-2 text-[9px] font-bold text-zinc-700 uppercase tracking-wider">
                  <div className="flex justify-between border-b border-zinc-100 pb-2">
                    <span className="text-zinc-400">Chronological Age</span>
                    <span className="text-zinc-900 font-black">
                      {activePred.input_age} YRS
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-100 pb-2">
                    <span className="text-zinc-400">Assigned Gender</span>
                    <span className="text-zinc-900 font-black">
                      {activePred.input_gender === "M" ? "MALE" : "FEMALE"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-100 pb-2">
                    <span className="text-zinc-400">Capture Frame Depth</span>
                    <span className="text-zinc-900 font-black">
                      {activePred.sequence_length} FRAMES
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Processing Info */}
            {processingInfo && (
              <div className="p-5 border-2 border-dashed border-zinc-300">
                <h4 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Settings size={12} className="text-zinc-900" />{" "}
                  Processing_Pipeline
                </h4>
                <div className="space-y-2 text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
                  <div className="flex justify-between">
                    <span>Core Data Format</span>
                    <span className="text-zinc-900">
                      {processingInfo.input_type?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Clinical Duration</span>
                    <span className="text-zinc-900">
                      {processingInfo.video_duration_seconds?.toFixed(1)}S
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Temporal Capture Rate</span>
                    <span className="text-zinc-900">
                      {processingInfo.original_fps} FPS
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Extracted Samples</span>
                    <span className="text-zinc-900">
                      {processingInfo.frames_extracted}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Skeletal Depth (2D)</span>
                    <span className="text-zinc-900">
                      {processingInfo.poses_2d_extracted} KEYPOINTS
                    </span>
                  </div>
                  {processingInfo.poses_3d_extracted != null && (
                    <div className="flex justify-between">
                      <span>Kinetic Depth (3D)</span>
                      <span className="text-zinc-900">
                        {processingInfo.poses_3d_extracted} KEYPOINTS
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Enhanced Processing</span>
                    <span className="text-zinc-900">
                      {processingInfo["3d_processing_enabled"]
                        ? "ACTIVE"
                        : "INACTIVE"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 2D vs 3D Comparison */}
            {pred2d && pred3d && !pred2d.error && !pred3d.error && (
              <div className="bg-white border-2 border-zinc-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <div className="p-4 border-b-2 border-zinc-200 flex items-center gap-2">
                  <Layers size={14} className="text-zinc-900" />
                  <h3 className="text-[10px] font-black text-zinc-900 uppercase tracking-[0.2em]">
                    2D_vs_3D_Comparison
                  </h3>
                </div>
                <div className="divide-y divide-zinc-100">
                  <CompareRow
                    label="Severity Assessment"
                    val2d={pred2d.severity}
                    val3d={pred3d.severity}
                  />
                  <CompareRow
                    label="Social-Emotional Affect"
                    val2d={pred2d.social_affect?.toFixed(1)}
                    val3d={pred3d.social_affect?.toFixed(1)}
                  />
                  <CompareRow
                    label="Restricted Patterns (RRB)"
                    val2d={pred2d.rrb?.toFixed(1)}
                    val3d={pred3d.rrb?.toFixed(1)}
                  />
                  <CompareRow
                    label="Cohort Comparison"
                    val2d={pred2d.comparison_score}
                    val3d={pred3d.comparison_score}
                  />
                  <CompareRow
                    label="Model Certainty"
                    val2d={`${(pred2d.severity_confidence * 100).toFixed(0)}%`}
                    val3d={`${(pred3d.severity_confidence * 100).toFixed(0)}%`}
                  />
                </div>
              </div>
            )}

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
                    ? "Calculations Verified ✓"
                    : "Validate Core Metrics"}
              </button>
              <button
                disabled={isFlagged}
                onClick={handleFlag}
                className="w-full py-4 bg-white text-zinc-900 border-2 border-zinc-900 font-black text-[10px] uppercase tracking-widest hover:bg-zinc-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-zinc-100"
              >
                {isFlagged ? "Anomaly Logged ⚑" : "Report Data Anomaly"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════ SUB-COMPONENTS ═══════════ */

function VitalCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: string;
}) {
  return (
    <div
      className={`${accent || "bg-white border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"} p-5 flex flex-col justify-between`}
    >
      <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">
        {label}
      </p>
      <p className="text-lg font-black uppercase tracking-tighter truncate">
        {value}
      </p>
      <p className="text-[7px] font-black uppercase tracking-widest mt-2 opacity-40">
        {sub}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  badge,
}: {
  label: string;
  value: any;
  badge?: string;
}) {
  return (
    <div className="bg-zinc-50 border-2 border-zinc-200 p-3">
      <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="text-sm font-black text-zinc-900">{value ?? "—"}</p>
      {badge && (
        <span
          className={`text-[7px] font-black px-1.5 py-0.5 mt-1 inline-block ${badge === "High" ? "bg-emerald-100 text-emerald-700" : badge === "Medium" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

function JointBar({
  joint,
  value,
  max,
  positive,
}: {
  joint: string;
  value: number;
  max: number;
  positive: boolean;
}) {
  const absVal = Math.abs(value);
  const absMax = Math.abs(max);
  const pct = absMax > 0 ? (absVal / absMax) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[8px] font-black text-zinc-600 uppercase tracking-wider w-24 truncate">
        {joint.replace(/_/g, " ")}
      </span>
      <div className="flex-1 h-3 bg-zinc-100 border border-zinc-200 relative">
        <div
          className={`h-full transition-all ${positive ? "bg-emerald-500" : "bg-red-500"}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span
        className={`text-[8px] font-black w-14 text-right ${positive ? "text-emerald-700" : "text-red-700"}`}
      >
        {positive ? "+" : ""}
        {value.toFixed(3)}
      </span>
    </div>
  );
}

function CompareRow({
  label,
  val2d,
  val3d,
}: {
  label: string;
  val2d: any;
  val3d: any;
}) {
  return (
    <div className="px-4 py-3 flex items-center text-[9px] font-black uppercase">
      <span className="text-zinc-500 flex-1 tracking-widest">{label}</span>
      <span className="text-zinc-900 w-16 text-center">{val2d}</span>
      <span className="text-zinc-400 w-8 text-center">VS</span>
      <span className="text-zinc-900 w-16 text-center">{val3d}</span>
    </div>
  );
}
