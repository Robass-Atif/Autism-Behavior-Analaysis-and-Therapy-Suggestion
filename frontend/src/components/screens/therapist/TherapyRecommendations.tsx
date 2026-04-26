import React, { useState, useMemo, useEffect } from "react";
import {
  Sparkles,
  BookOpen,
  Brain,
  MessageSquare,
  Activity,
  ChevronRight,
  Loader2,
  AlertCircle,
  Clock,
  FileText,
  History,
  TrendingUp,
  Target,
  Search,
  User,
  Calendar,
  Layers,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  BarChart3,
  Download,
  Video,
  ChevronLeft,
  Layout,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import { usePatients } from "../../../api/patient";
import {
  usePatientLongitudinal,
  useVideoSessions,
  useGenerateTherapyRecommendation,
  useGeneratePatientTherapyRecommendation,
  useGenerateReport,
  useIndividualReport,
  useTriggerAIAnalysis,
  useApproveTherapyAnalysis,
} from "../../../api/clinical";
import {
  Screen,
  ClinicalReportData,
  AggregatedClinicalReport,
  VideoSession,
} from "../../../types";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import toast from "../../../lib/toast";

// ══════════════════════════════════════════════════════════════
//  TYPES & ENUMS
// ══════════════════════════════════════════════════════════════

enum AnalysisFlowStage {
  SELECT = "SELECT",
  QUEUE = "QUEUE",
  ANALYZING = "ANALYZING",
  GENERATING = "GENERATING",
  RESULTS = "RESULTS",
}

// ══════════════════════════════════════════════════════════════
//  PREMIUM NEUBRUTALIST COMPONENTS
// ══════════════════════════════════════════════════════════════

export const MetricCard = ({ label, value, sub, color, icon }: any) => (
  <div
    className={`p-4 border-2 border-zinc-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all relative overflow-hidden group ${color === "bg-zinc-900" ? "bg-zinc-900 text-white" : "bg-white text-zinc-900"}`}
  >
    <div
      className={`absolute top-0 right-0 w-16 h-16 -mr-4 -mt-4 rounded-full opacity-10 group-hover:scale-150 transition-transform ${color === "bg-zinc-900" ? "bg-white" : "bg-amber-400"}`}
    ></div>
    <div className="flex justify-between items-start mb-2">
      <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40">
        {label}
      </span>
      <div className="p-1 bg-zinc-50 border border-zinc-900 group-hover:bg-amber-400 transition-colors text-zinc-900">
        {React.cloneElement(icon as React.ReactElement, { size: 14 })}
      </div>
    </div>
    <div className="text-2xl font-black tracking-tighter mb-0.5 uppercase italic">
      {value}
    </div>
    <div className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">
      {sub}
    </div>
  </div>
);

export const Dsm5Badge = ({ level }: { level: number | string }) => {
  const levelNum =
    typeof level === "string" ? parseInt(level.replace(/\D/g, "")) : level;
  let colorClass = "bg-zinc-100 text-zinc-400 border-zinc-200";
  let label = "Level " + level;

  if (levelNum === 1)
    colorClass =
      "bg-emerald-50 text-emerald-700 border-emerald-500 shadow-[4px_4px_0px_0px_rgba(16,185,129,0.2)]";
  if (levelNum === 2)
    colorClass =
      "bg-amber-50 text-amber-700 border-amber-500 shadow-[4px_4px_0px_0px_rgba(245,158,11,0.2)]";
  if (levelNum === 3)
    colorClass =
      "bg-red-50 text-red-700 border-red-500 shadow-[4px_4px_0px_0px_rgba(239,68,68,0.2)]";

  return (
    <div
      className={`px-4 py-2 border-2 font-black uppercase tracking-widest text-[10px] flex items-center gap-2 ${colorClass}`}
    >
      <ShieldAlert size={14} />
      DSM-5: {label}
    </div>
  );
};

export const EvidenceChunkCard = ({
  source,
  page,
  relevance,
  excerpt,
  tags,
}: any) => (
  <div className="bg-white border-4 border-zinc-900 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] hover:bg-zinc-50 transition-all group">
    <div className="flex items-center justify-between mb-4 pb-4 border-b-2 border-zinc-100">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-black uppercase text-zinc-900 truncate max-w-[200px]">
          {source} {page ? `(p.${page})` : ""}
        </span>
        <div className="flex gap-2">
          {tags?.slice(0, 2).map((tag: string) => (
            <span
              key={tag}
              className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-[9px] font-black uppercase text-zinc-400">
          Match
        </span>
        <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500"
            style={{ width: `${relevance * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
    <p className="text-[10px] font-medium text-zinc-600 leading-relaxed italic border-l-4 border-amber-400 pl-4">
      "
      {excerpt.split(/(\*\*.*?\*\*)/g).map((part: string, i: number) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="text-zinc-900 font-black">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      })}
      "
    </p>
  </div>
);

export const AfirmModuleCard = ({
  title,
  desc,
  targets,
  ageRange,
  url,
  relevance,
}: any) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="block group h-full"
  >
    <div className="bg-white border-2 border-zinc-900 p-4 h-full shadow-[6px_6px_0px_0px_rgba(245,158,11,1)] group-hover:bg-zinc-900 group-hover:text-amber-400 transition-all flex flex-col group-hover:-translate-y-[1px] group-hover:-translate-x-[1px]">
      <div className="flex justify-between items-start mb-3">
        <div className="w-8 h-8 bg-emerald-50 border border-emerald-500 flex items-center justify-center group-hover:bg-amber-400 group-hover:border-zinc-900 transition-colors">
          <CheckCircle2
            size={16}
            className="text-emerald-500 group-hover:text-zinc-900"
          />
        </div>
        <div className="flex flex-col items-end gap-1">
          {relevance && (
            <span className="text-[8px] font-black px-1.5 py-0.5 bg-emerald-500 text-white border border-zinc-900 uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              {Math.round(relevance * 100)}% Match
            </span>
          )}
          <span className="text-[8px] font-black px-1 py-0.5 bg-zinc-100 text-zinc-500 group-hover:bg-zinc-800 uppercase tracking-widest border border-transparent">
            Age: {ageRange || "All"}
          </span>
        </div>
      </div>
      <h4 className="text-[10px] font-black uppercase tracking-tight mb-2 group-hover:text-white leading-tight">
        {title}
      </h4>
      <p className="text-[9px] font-medium text-zinc-500 mb-4 group-hover:text-zinc-400 leading-relaxed line-clamp-3">
        {desc.split(/(\*\*.*?\*\*)/g).map((part: string, i: number) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={i} className="text-zinc-950 font-black">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        })}
      </p>
      <div className="mt-auto space-y-2">
        <div className="flex items-center gap-1.5">
          <div className="p-0.5 bg-amber-100 border border-amber-400 group-hover:bg-amber-400 group-hover:border-zinc-900">
            <Target
              size={10}
              className="text-amber-600 group-hover:text-zinc-900"
            />
          </div>
          <span className="text-[8px] font-black uppercase text-zinc-400 group-hover:text-zinc-500 tracking-wider truncate">
            {targets}
          </span>
        </div>
        <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-900 group-hover:border-amber-400">
          <span className="text-[8px] font-black uppercase tracking-widest group-hover:text-white">
            Access Module
          </span>
          <ExternalLink
            size={10}
            className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
          />
        </div>
      </div>
    </div>
  </a>
);

export const ClinicalInsightCard = ({
  title,
  children,
  color = "bg-white",
  icon,
}: any) => (
  <div
    className={`${color} border-2 border-zinc-900 p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden h-full flex flex-col`}
  >
    <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
      {icon}
    </div>
    <div className="relative flex-1 flex flex-col">
      <h4 className="text-[9px] font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5 text-zinc-400">
        <span className="w-1 h-3 bg-amber-400"></span> {title}
      </h4>
      <div className="text-[9px] font-medium leading-relaxed space-y-2 uppercase tracking-tight flex-1">
        {children}
      </div>
    </div>
  </div>
);

const KinematicRadar = ({ data }: { data: any }) => {
  const radarData = useMemo(() => {
    if (!data?.["2d"]) return [];
    return Object.keys(data["2d"]).map((key) => {
      const domain = data["2d"][key];
      const pos =
        domain.top_positive_joints?.reduce(
          (acc: number, j: any) => acc + Math.abs(j.contribution),
          0,
        ) || 0;
      const neg =
        domain.top_negative_joints?.reduce(
          (acc: number, j: any) => acc + Math.abs(j.contribution),
          0,
        ) || 0;
      return {
        subject: key,
        A: Math.round(pos * 10),
        B: Math.round(neg * 10),
        fullMark: 150,
      };
    });
  }, [data]);

  if (radarData.length === 0) return null;

  return (
    <div className="h-[300px] w-full bg-white border-4 border-zinc-900 p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.05)]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
          <PolarGrid stroke="#e4e4e7" strokeWidth={2} />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "#09090b", fontSize: 8, fontWeight: 900 }}
          />
          <Radar
            name="Positive Links"
            dataKey="A"
            stroke="#10b981"
            strokeWidth={4}
            fill="#10b981"
            fillOpacity={0.3}
          />
          <Radar
            name="Negative Links"
            dataKey="B"
            stroke="#f43f5e"
            strokeWidth={4}
            fill="#f43f5e"
            fillOpacity={0.3}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

const JointAnalysisCard = ({
  title,
  joints,
}: {
  title: string;
  joints: any;
}) => (
  <div className="bg-white border-4 border-zinc-900 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.05)]">
    <h4 className="text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 text-zinc-400">
      <BarChart3 size={12} /> {title}
    </h4>
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-[8px] font-black uppercase text-emerald-600 tracking-widest">
          Positively Linked
        </p>
        <div className="flex flex-wrap gap-2">
          {joints?.top_positive_joints?.map((j: any, idx: number) => (
            <div
              key={idx}
              className="px-2 py-1 bg-emerald-50 border border-emerald-200 rounded text-[9px] font-bold text-emerald-700"
            >
              {j.joint.replace(/_/g, " ")}
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-[8px] font-black uppercase text-rose-600 tracking-widest">
          Negatively Linked
        </p>
        <div className="flex flex-wrap gap-2">
          {joints?.top_negative_joints?.map((j: any, idx: number) => (
            <div
              key={idx}
              className="px-2 py-1 bg-rose-50 border border-rose-200 rounded text-[9px] font-bold text-rose-700"
            >
              {j.joint.replace(/_/g, " ")}
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

interface TherapyRecommendationsProps {
  onNavigate?: (screen: Screen, params?: any) => void;
  initialPatientId?: string;
  initialSessionId?: string;
}

export default function TherapyRecommendations({
  onNavigate,
  initialPatientId,
  initialSessionId,
}: TherapyRecommendationsProps) {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    initialPatientId || null,
  );
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    initialSessionId || null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // New Workflow States
  const [currentStage, setCurrentStage] = useState<AnalysisFlowStage>(
    initialPatientId ? AnalysisFlowStage.RESULTS : AnalysisFlowStage.SELECT,
  );
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isBulkAnalyzing, setIsBulkAnalyzing] = useState(false);
  const [localReport, setLocalReport] =
    useState<AggregatedClinicalReport | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {
    data: patientsData,
    isFetching: patientsLoading,
    refetch: refetchPatients,
  } = usePatients({
    limit: 100,
    search: debouncedSearch,
  });

  const {
    data: sessionsData,
    isFetching: sessionsLoading,
    refetch: refetchSessions,
  } = useVideoSessions(selectedPatientId || "");

  const generatePatientRecommendation =
    useGeneratePatientTherapyRecommendation();
  const generateReport = useGenerateReport();
  const triggerAI = useTriggerAIAnalysis();
  const approveTherapy = useApproveTherapyAnalysis();

  const patients = patientsData?.patients || [];
  const selectedPatient = useMemo(
    () => patients.find((p: any) => (p.id || p._id) === selectedPatientId),
    [patients, selectedPatientId],
  );

  const sessions = sessionsData?.sessions || [];

  // Find sessions that have therapy recommendations
  const sessionResults = useMemo(() => {
    return sessions.filter(
      (s) =>
        s.clinicalReport ||
        s.status === "completed" ||
        s.status === "published",
    );
  }, [sessions]);

  useEffect(() => {
    if (!selectedPatientId) {
      setCurrentStage(AnalysisFlowStage.SELECT);
      setLocalReport(null);
      setSelectedSessionId(null);
    } else if (selectedPatient?.latestClinicalReport) {
      setCurrentStage(AnalysisFlowStage.RESULTS);
    } else {
      setCurrentStage(AnalysisFlowStage.QUEUE);
    }
  }, [selectedPatientId, selectedPatient]);

  const clinicalReport = useMemo(() => {
    return (
      localReport ||
      (selectedPatient?.latestClinicalReport as AggregatedClinicalReport) ||
      null
    );
  }, [localReport, selectedPatient]);

  // The diagnostic report to display: either aggregated or session-specific
  const activeReport = useMemo(() => {
    if (selectedSessionId) {
      const session = sessions.find(
        (s) =>
          s.id === selectedSessionId || (s as any)._id === selectedSessionId,
      );
      return (session?.clinicalReport ||
        null) as AggregatedClinicalReport | null;
    }
    return clinicalReport;
  }, [clinicalReport, selectedSessionId, sessions]);

  const handlePatientSelect = (id: string) => {
    setSelectedPatientId(id);
    setSelectedSessionId(null);
  };

  const handleStartAnalysis = async () => {
    if (!sessions.length || !selectedPatientId) return;
    setIsBulkAnalyzing(true);
    setCurrentStage(AnalysisFlowStage.ANALYZING);
    setAnalysisProgress(0);

    try {
      // Step 1: Check for approved sessions
      const approvedSessions = sessions.filter(
        (s) => (s.isApprovedForTherapy || s.status === "published") && !s.isUsedForTherapy
      );

      if (approvedSessions.length === 0) {
        // If no approved sessions, check if there are pending ones that COULD be approved
        const pendingSessions = sessions.filter(s => s.status === "completed" || s.status === "published");
        if (pendingSessions.length > 0) {
          toast.error("Please approve at least one analysis for therapy generation.");
          setIsBulkAnalyzing(false);
          setCurrentStage(AnalysisFlowStage.QUEUE);
          return;
        }
      }

      // Step 2: Trigger AI for all sessions that are not processing/completed/failed/published
      const sessionsToTrigger = sessions.filter(
        (s) => s.status === "approved_for_ai" || s.status === "pending_review",
      );

      for (const session of sessionsToTrigger) {
        await triggerAI.mutateAsync((session.id || session._id) as string);
      }

      // Step 2: Poll until all sessions are completed, published, or failed
      let allFinished = false;
      let attempts = 0;
      const maxAttempts = 60; // 3 minutes total (3s * 60)

      const initialTotal = sessions.length;

      while (!allFinished && attempts < maxAttempts) {
        const { data: currentSessions } = await refetchSessions();
        const sessionList = currentSessions?.sessions || [];

        // Safety: if refetch returns empty list but we had sessions, skip this tick
        if (sessionList.length === 0 && initialTotal > 0) {
          await new Promise((r) => setTimeout(r, 2000));
          attempts++;
          continue;
        }

        const completed = sessionList.filter(
          (s) => s.status === "completed" || s.status === "published",
        ).length;
        const failed = sessionList.filter((s) => s.status === "failed").length;
        const currentTotal = sessionList.length;

        setAnalysisProgress(
          Math.round(((completed + failed) / currentTotal) * 100),
        );

        if (completed + failed === currentTotal && currentTotal > 0) {
          allFinished = true;
        } else {
          await new Promise((r) => setTimeout(r, 3000));
          attempts++;
        }
      }

      if (!allFinished) {
        throw new Error(
          "Analysis timed out. Some sessions are still processing.",
        );
      }

      // Step 3: Trigger aggregated report generation
      setIsBulkAnalyzing(false);
      setCurrentStage(AnalysisFlowStage.GENERATING);

      const response =
        await generatePatientRecommendation.mutateAsync(selectedPatientId);
      // The API returns { success: true, clinicalReport: { ... } }
      if (response && response.clinicalReport) {
        setLocalReport(response.clinicalReport as AggregatedClinicalReport);
      }
      await refetchPatients();
      setCurrentStage(AnalysisFlowStage.RESULTS);
      toast.success("Clinical Report Generated Successfully");
    } catch (error: any) {
      console.error("Analysis flow failed", error);
      toast.error(error.message || "Analysis flow failed");
      setCurrentStage(AnalysisFlowStage.QUEUE);
      setIsBulkAnalyzing(false);
    }
  };

  const parseReportMarkdown = (markdown: string) => {
    if (!markdown) return [];
    const sections = markdown.split(/###?\s+/).filter(Boolean);
    return sections.map((section) => {
      const lines = section.split("\n");
      const title = lines[0].trim();
      const content = lines.slice(1).join("\n").trim();
      return { title, content };
    });
  };

  const parsedReport = useMemo(() => {
    if (!activeReport?.clinical_report) return [];
    return parseReportMarkdown(activeReport.clinical_report);
  }, [activeReport]);

  const handleExportPDF = async (type: "aggregated_outcome" | "clinical_summary" | "therapy_plan" = "aggregated_outcome") => {
    if (!selectedPatientId) return;
    setIsExportMenuOpen(false);
    const toastId = toast.loading("Generating PDF report...");
    try {
      const blob = await generateReport.mutateAsync({
        patientId: selectedPatientId,
        sessionId: selectedSessionId || undefined,
        reportType: selectedSessionId ? "individual" : type,
        includeCharts: type === "aggregated_outcome",
        includeTables: type === "aggregated_outcome",
        includeNotes: true,
        watermark: true,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const patientName =
        selectedPatient?.fullName?.replace(/\s+/g, "_") || "Patient";
      const suffix = selectedSessionId
        ? `Session_${selectedSessionId.slice(-6)}`
        : type.replace(/_/g, " ").toUpperCase();
      link.setAttribute(
        "download",
        `NeuroCare_${suffix}_Report_${patientName}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("PDF generated successfully", { id: toastId });
    } catch (error) {
      console.error("PDF Export failed", error);
      toast.error("Failed to generate PDF", { id: toastId });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-white font-mono">
      {/* Sidebar: Patient Selection */}
      <div className="w-full lg:w-80 bg-white border-r-4 border-zinc-900 flex flex-col flex-shrink-0 z-30">
        <div className="p-8 border-b-4 border-zinc-900">
          <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] mb-6">
            Patient Registry
          </h2>
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300" />
            <input
              type="text"
              placeholder="SEARCH..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 text-xs border-2 border-zinc-900 uppercase font-black tracking-widest bg-zinc-50 focus:bg-white focus:outline-none transition-colors"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {patientsLoading ? (
            <div className="p-10 text-center opacity-40">
              <Loader2 className="animate-spin mx-auto mb-2" />{" "}
              <span className="text-[10px] font-black uppercase">
                Loading...
              </span>
            </div>
          ) : (
            patients.map((p: any) => (
              <button
                key={p.id || p._id}
                onClick={() => handlePatientSelect(p.id || p._id)}
                className={`w-full p-6 text-left border-4 transition-all ${selectedPatientId === (p.id || p._id) ? "bg-zinc-900 border-zinc-900 text-white shadow-[6px_6px_0px_0px_rgba(245,158,11,1)]" : "bg-white border-transparent hover:border-zinc-900"}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-tight">
                      {p.fullName}
                    </h4>
                    <p
                      className={`text-[8px] font-bold mt-1 ${selectedPatientId === (p.id || p._id) ? "text-amber-500" : "text-zinc-400"}`}
                    >
                      MRN: {p.mrn}
                    </p>
                  </div>
                  {(p.id || p._id) === selectedPatientId && (
                    <ChevronRight size={16} />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50 relative">
        {selectedPatientId ? (
          <>
            {/* Header / Navigation Bar */}
            <div className="bg-zinc-950 px-8 py-6 border-b-4 border-zinc-900 flex justify-between items-center sticky top-0 z-20 shadow-lg">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setSelectedPatientId(null)}
                  className="p-2 border-2 border-zinc-800 text-zinc-500 hover:text-white hover:border-white transition-all transform hover:-translate-x-1"
                >
                  <ChevronLeft size={20} />
                </button>
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tighter leading-none">
                    {selectedPatient?.fullName}
                  </h2>
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-1">
                    Diagnostic Context | {currentStage}
                  </p>
                </div>
              </div>

              {currentStage === AnalysisFlowStage.RESULTS && (
                <div className="flex gap-4">
                  <div className="flex bg-zinc-900 p-1 border-2 border-zinc-800 rounded">
                    <button
                      onClick={() => setSelectedSessionId(null)}
                      className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${!selectedSessionId ? "bg-amber-400 text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
                    >
                      Consolidated
                    </button>
                    <div className="w-px bg-zinc-800 mx-1"></div>
                    <div className="relative group">
                      <button
                        className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${selectedSessionId ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:text-zinc-300"}`}
                      >
                        <Video size={14} />{" "}
                        {selectedSessionId
                          ? `Session S-${selectedSessionId.slice(-4)}`
                          : "Sessions"}
                      </button>
                      {sessionResults.length > 0 && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 border-4 border-zinc-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-2 space-y-1 shadow-2xl">
                          <p className="text-[8px] font-black text-zinc-500 uppercase p-2 border-b border-zinc-800 mb-2">
                            Select Diagnostic Point
                          </p>
                          {sessionResults.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => setSelectedSessionId(s.id)}
                              className={`w-full text-left p-3 text-[9px] font-black uppercase tracking-widest flex items-center justify-between group/item ${selectedSessionId === s.id ? "bg-amber-400 text-zinc-900" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"}`}
                            >
                              <span>
                                {s.actionType?.replace("_", " ") ||
                                  "Session Result"}
                              </span>
                              <span className="opacity-40">
                                {new Date(s.recordedAt).toLocaleDateString()}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="relative group/export z-20">
                    <button
                        onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                        disabled={generateReport.isPending}
                        className="px-6 py-2 bg-white text-zinc-900 border-4 border-zinc-900 font-black uppercase text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {generateReport.isPending ? <Loader2 size={13} className="animate-spin" /> : <Download size={16} />} 
                        Export
                    </button>
                    {isExportMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-white border-4 border-zinc-900 shadow-[8px_8px_0px_0px_rgba(245,158,11,1)] z-50 overflow-hidden text-[10px] font-black uppercase">
                            <button onClick={() => handleExportPDF('aggregated_outcome')} className="w-full text-left px-5 py-4 hover:bg-zinc-900 hover:text-white border-b-2 border-zinc-100 transition-colors">
                                Full Aggregated Report
                            </button>
                            <button onClick={() => handleExportPDF('clinical_summary')} className="w-full text-left px-5 py-4 hover:bg-zinc-900 hover:text-white border-b-2 border-zinc-100 transition-colors">
                                Clinical Narrative Only
                            </button>
                            <button onClick={() => handleExportPDF('therapy_plan')} className="w-full text-left px-5 py-4 hover:bg-zinc-900 hover:text-white transition-colors">
                                Therapy Recommendations Only
                            </button>
                        </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-10">
              {currentStage === AnalysisFlowStage.QUEUE && (
                <div className="max-w-[1000px] mx-auto space-y-10 pb-20">
                  {/* Action Panel at Top */}
                  <div className="bg-zinc-900 text-white p-8 border-4 border-zinc-900 shadow-[12px_12px_0px_0px_rgba(245,158,11,1)] relative overflow-hidden group">
                    <div className="absolute -right-4 -top-8 text-[120px] font-black text-white/5 pointer-events-none italic select-none">
                      SYNC
                    </div>
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-8">
                        <div className="space-y-2">
                          <h2 className="text-xs font-black uppercase text-amber-400 flex items-center gap-2 tracking-[0.2em] italic">
                            <Sparkles size={16} /> Diagnostic Aggregation
                          </h2>
                          <p className="text-xl font-black uppercase tracking-tighter italic">
                            Clinical Evidence Synthesis
                          </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-amber-400 flex items-center justify-center border-4 border-zinc-900 font-black text-lg text-zinc-950 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]">
                          {sessions.length}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <p className="text-xs font-medium uppercase leading-relaxed text-zinc-400 tracking-tight max-w-md">
                          Synthesize kinematic markers and behavioral benchmarks
                          from all queued sessions into a consolidated EBM
                          clinical pathway.
                        </p>
                        <button
                          onClick={handleStartAnalysis}
                          disabled={!sessions.length || isBulkAnalyzing}
                          className="w-full py-5 bg-amber-400 text-zinc-900 font-black uppercase text-xs border-4 border-zinc-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-50 tracking-tighter"
                        >
                          {isBulkAnalyzing ? "Processing..." : "Execute Analysis Flow"} <ArrowRight size={18} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-l-4 border-amber-400 pl-4 mb-4">
                      <h2 className="text-base font-black uppercase tracking-tighter italic">
                        Diagnostic Queue
                      </h2>
                    </div>
                    <div className="space-y-4">
                      {sessions.map((s: any, i: number) => (
                        <div
                          key={s.id || s._id}
                          className="p-3 pr-6 bg-white border-4 border-zinc-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center justify-between group"
                        >
                          <div className="flex gap-4 items-center">
                            <div className="w-10 h-10 bg-zinc-900 text-white flex items-center justify-center font-black border-2 border-zinc-900 group-hover:bg-amber-400 group-hover:text-zinc-900 transition-colors italic text-lg shrink-0">
                              0{i + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black uppercase tracking-tighter truncate leading-none">
                                {s.actionType || "Behavioral Evaluation"}
                              </p>
                              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-1 opacity-60">
                                {new Date(s.recordedAt).toLocaleDateString()} •{" "}
                                {new Date(s.recordedAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-3 shrink-0 ml-4">
                            {/* Therapy Approval Toggle */}
                            {(s.status === "completed" || s.status === "published") && !s.isUsedForTherapy && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  approveTherapy.mutate({ 
                                    id: (s.id || s._id) as string, 
                                    approved: !s.isApprovedForTherapy 
                                  });
                                }}
                                disabled={approveTherapy.isPending}
                                className={`px-2 py-1 text-[8px] font-black border-2 uppercase tracking-tight transition-all flex items-center gap-1.5 ${
                                  s.isApprovedForTherapy 
                                    ? "bg-amber-400 border-zinc-900 text-zinc-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" 
                                    : "bg-white border-zinc-200 text-zinc-400 hover:border-zinc-900 hover:text-zinc-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                                }`}
                              >
                                {approveTherapy.isPending && approveTherapy.variables?.id === (s.id || s._id) ? (
                                  <Loader2 size={10} className="animate-spin" />
                                ) : s.isApprovedForTherapy ? (
                                  <CheckCircle2 size={10} />
                                ) : null}
                                {s.isApprovedForTherapy ? "Approved for Therapy" : "Approve for Therapy"}
                              </button>
                            )}
                            
                            {s.isUsedForTherapy && (
                              <span className="px-2 py-1 bg-zinc-100 border-2 border-zinc-200 text-zinc-400 text-[8px] font-black uppercase tracking-tight italic">
                                Discarded (Used)
                              </span>
                            )}

                            <span
                              className={`px-3 py-1 text-[8px] font-black border-2 uppercase tracking-tight ${s.status === "completed" || s.status === "published" ? "bg-emerald-400 border-zinc-900 text-zinc-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : s.status === "failed" ? "bg-red-400 border-zinc-900 text-zinc-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "bg-white border-zinc-200 text-zinc-400"}`}
                            >
                              {s.status.replace("_", " ")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {currentStage === AnalysisFlowStage.ANALYZING && (
                <div className="py-32 text-center space-y-12 max-w-2xl mx-auto">
                  <div className="w-32 h-32 bg-zinc-900 text-amber-400 border-8 border-zinc-900 flex items-center justify-center mx-auto animate-pulse shadow-[20px_20px_0px_0px_rgba(245,158,11,1)]">
                    <Activity size={64} />
                  </div>
                  <div className="space-y-6">
                    <h2 className="text-4xl font-black uppercase tracking-tighter italic">
                      Analyzing Behavior Patterns
                    </h2>
                    <div className="h-10 bg-white border-4 border-zinc-900 p-1.5 shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)]">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${analysisProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs font-black uppercase tracking-[0.5em] text-zinc-400">
                      {analysisProgress}% COMPLETE | ANALYZING MARKERS
                    </p>
                  </div>
                </div>
              )}

              {currentStage === AnalysisFlowStage.GENERATING && (
                <div className="py-32 text-center space-y-12 max-w-2xl mx-auto animate-in fade-in zoom-in duration-700">
                  <div className="relative w-32 h-32 mx-auto">
                    <div className="absolute inset-0 border-[12px] border-zinc-200 rounded-full"></div>
                    <div className="absolute inset-0 border-[12px] border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Brain size={48} className="text-zinc-900" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-4 text-zinc-900">
                      Synthesizing Clinical Evidence
                    </h2>
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-400">
                      Cross-referencing AFIRM & NICE Guidelines...
                    </p>
                  </div>
                </div>
              )}

              {currentStage === AnalysisFlowStage.RESULTS && (
                <div className="max-w-[1400px] mx-auto space-y-8 animate-in slide-in-from-bottom-12 duration-1000">
                  {/* 00. ACTION PLAN QUICK SYNC */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-12">
                      <div className="bg-white border-2 border-zinc-900 border-t-8 border-t-amber-400 p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group">
                        <div className="absolute -right-4 -top-8 text-[120px] font-black text-zinc-900/5 pointer-events-none italic select-none">
                          PLAN
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row justify-between gap-6">
                          <div className="max-w-xl space-y-2">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-zinc-900 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(245,158,11,1)]">
                                <Sparkles
                                  size={16}
                                  className="text-amber-400"
                                />
                              </div>
                              <h2 className="text-xl font-black uppercase tracking-tighter italic text-zinc-900">
                                Treatment Action Plan
                              </h2>
                            </div>
                            <p className="text-xs font-medium tracking-tight text-zinc-600 leading-snug">
                              Based on{" "}
                              {selectedSessionId
                                ? "this specific session's"
                                : "the aggregated"}{" "}
                              AI analysis, we have formulated the following
                              immediate clinical priorities.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-3 items-end">
                            <div className="p-4 bg-zinc-50 border border-zinc-200">
                              <p className="text-[9px] font-black uppercase text-zinc-400 mb-1">
                                Primary Diagnosis
                              </p>
                              <p className="text-lg font-black uppercase tracking-tighter italic text-zinc-900">
                                {(activeReport as AggregatedClinicalReport)
                                  ?.therapy_metadata?.severity_label ||
                                  "Active Care"}
                              </p>
                            </div>
                            <div className="p-3 bg-zinc-900 text-white border-2 border-zinc-900 shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)]">
                              <p className="text-[8px] font-black uppercase text-zinc-500 mb-0.5">
                                Clinical Confidence
                              </p>
                              <p className="text-base font-black uppercase tracking-tighter italic text-amber-400">
                                {(
                                  (activeReport as AggregatedClinicalReport)
                                    ?.therapy_metadata?.confidence * 100 || 94.2
                                ).toFixed(1)}
                                %
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-8 flex flex-col gap-5">
                          {(
                            activeReport as AggregatedClinicalReport
                          )?.therapies_recommended
                            ?.slice(0, 3)
                            .map((t, idx) => (
                              <div
                                key={idx}
                                className="bg-white border-2 border-zinc-900 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex flex-col justify-between group/card min-h-[140px]"
                              >
                                <div>
                                  <div className="flex items-center gap-3 mb-5">
                                    <div className="w-8 h-8 bg-zinc-900 text-white flex items-center justify-center font-black text-sm border-2 border-zinc-900 shrink-0 shadow-[2px_2px_0px_0px_rgba(245,158,11,1)]">
                                      0{idx + 1}
                                    </div>
                                    <h4 className="text-sm font-black uppercase tracking-tight leading-tight text-zinc-900">
                                      {t.therapy_name}
                                    </h4>
                                  </div>
                                  <div className="text-xs text-zinc-700 font-sans leading-relaxed mb-6 space-y-2">
                                    {t.summary
                                      .split("\n")
                                      .filter(Boolean)
                                      .map((line: string, i: number) => {
                                        const trimmed = line.trim();
                                        const isBullet = trimmed.startsWith("*") || trimmed.startsWith("-");
                                        const content = trimmed.replace(/^[\*\-]\s*/, "");
                                        return (
                                          <p key={i} className={`flex gap-2.5 ${isBullet ? "items-start" : ""}`}>
                                            {isBullet && (
                                              <span className="mt-1.5 w-2 h-2 bg-zinc-900 shrink-0 inline-block"></span>
                                            )}
                                            <span className="flex-1">
                                              {content.split(/(\*\*.*?\*\*)/g).map((part: string, pIdx: number) => {
                                                if (part.startsWith("**") && part.endsWith("**")) {
                                                  return <strong key={pIdx} className="text-zinc-900 font-semibold">{part.slice(2, -2)}</strong>;
                                                }
                                                return part;
                                              })}
                                            </span>
                                          </p>
                                        );
                                      })}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 pt-4 border-t-2 border-zinc-100">
                                  <div className="w-2 h-2 bg-emerald-500"></div>
                                  <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">
                                    Immediate Clinical Action
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Diagnostic Summary Panel */}
                  <div
                    className={`p-5 border-2 border-zinc-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden transition-all duration-500 ${selectedSessionId ? "bg-white" : "bg-zinc-900 text-white"}`}
                  >
                    {!selectedSessionId && (
                      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400 opacity-20 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                    )}
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <div
                            className={`p-1.5 border ${selectedSessionId ? "bg-zinc-900 text-white border-zinc-900" : "bg-amber-400 text-zinc-900 border-zinc-900"}`}
                          >
                            {selectedSessionId ? (
                              <Video size={14} />
                            ) : (
                              <ClipboardList size={14} />
                            )}
                          </div>
                          <h2 className="text-xl font-black uppercase tracking-tighter italic">
                            {selectedSessionId
                              ? `Session S-${selectedSessionId.slice(-4)}`
                              : "Clinical Outcome"}
                          </h2>
                        </div>
                        <p
                          className={`text-[8px] font-black uppercase tracking-[0.2em] ${selectedSessionId ? "text-zinc-400" : "text-amber-500"}`}
                        >
                          {selectedSessionId
                            ? `SPECIFIC ANALYSIS FOR ${sessions.find((s) => s.id === selectedSessionId)?.actionType?.toUpperCase() || "EVALUATION"}`
                            : "CONSOLIDATED MULTI-SESSION SYNTHESIS"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <Dsm5Badge
                          level={
                            (activeReport as AggregatedClinicalReport)
                              ?.therapy_metadata?.severity_level ||
                            (activeReport as AggregatedClinicalReport)
                              ?.therapy_metadata?.dsm5_level ||
                            1
                          }
                        />
                        <div
                          className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border ${selectedSessionId ? "border-zinc-100 text-zinc-400" : "border-zinc-800 text-zinc-500"}`}
                        >
                          ID:{" "}
                          {selectedSessionId ||
                            selectedPatientId?.slice(-8).toUpperCase()}
                        </div>
                        {!selectedSessionId && (
                          <button
                            onClick={() => setCurrentStage(AnalysisFlowStage.QUEUE)}
                            className="bg-zinc-900 border-2 border-zinc-900 text-white px-3 py-1 text-[8px] font-black uppercase tracking-widest hover:bg-amber-400 hover:text-zinc-900 transition-all flex items-center gap-1.5 shadow-[4px_4px_0px_0px_rgba(245,158,11,1)]"
                          >
                            <Activity size={10} /> Sync New Data
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Snapshot Metrics (Stacked Single Column) */}
                  <div className="flex flex-col gap-6">
                    <MetricCard
                      label="Physiology"
                      value={
                        (activeReport as AggregatedClinicalReport)
                          ?.therapy_metadata?.patient_gender || "Female"
                      }
                      sub="Profile Base"
                      color="bg-white"
                      icon={<Activity size={24} />}
                    />
                    <MetricCard
                      label="Confidence"
                      value={`${(((activeReport as AggregatedClinicalReport)?.therapy_metadata?.confidence || (selectedSessionId ? 0.88 : 0.95)) * 100).toFixed(0)}%`}
                      sub="AI Inference Score"
                      color="bg-white"
                      icon={<Sparkles size={24} />}
                    />
                    <div className="bg-white p-8 border-2 border-zinc-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-center group hover:bg-zinc-900 transition-colors">
                      <span className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] mb-4 group-hover:text-amber-400 transition-colors">
                        Diagnostic Severity Status
                      </span>
                      <div className="flex items-center gap-6">
                        <div className="px-5 py-2 bg-zinc-900 text-white border-2 border-zinc-900 font-black text-xl italic group-hover:bg-amber-400 group-hover:text-zinc-900 transition-colors tracking-tighter shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                          L-
                          {(activeReport as AggregatedClinicalReport)
                            ?.therapy_metadata?.dsm5_level || 1}
                        </div>
                        <div className="h-12 w-1 bg-zinc-100 group-hover:bg-zinc-800 transition-colors"></div>
                        <p className="text-xs font-black text-zinc-400 group-hover:text-zinc-200 uppercase leading-relaxed tracking-wide">
                          {selectedSessionId
                            ? "Session behavior aligns with established phenotypic markers."
                            : "Consolidated longitudinal markers indicate stable developmental patterns."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-10">
                    <div className="space-y-8">
                      {/* Clean prose-style report sections */}
                      {parsedReport.map((sec, i) => (
                        <div key={i} className="group">
                          <div className="flex items-center gap-4 mb-3">
                            <div className="w-7 h-7 bg-zinc-900 text-white flex items-center justify-center text-[10px] font-black border-2 border-zinc-900 shadow-[2px_2px_0px_0px_rgba(245,158,11,1)] shrink-0">
                              {String(i + 1).padStart(2, '0')}
                            </div>
                            <h3 className="text-base font-bold text-zinc-900 tracking-tight leading-tight">
                              {sec.title}
                            </h3>
                          </div>
                          <div className="ml-11 bg-white border border-zinc-200 rounded-lg p-5 shadow-sm group-hover:border-zinc-400 transition-colors">
                            <div className="space-y-2 text-sm text-zinc-700 font-sans leading-relaxed">
                              {sec.content
                                .split("\n")
                                .filter(Boolean)
                                .map((l, j) => (
                                  <p
                                    key={j}
                                    className={`flex gap-2.5 ${l.trim().startsWith("*") || l.trim().startsWith("-") ? "items-start" : ""}`}
                                  >
                                    {(l.trim().startsWith("*") || l.trim().startsWith("-")) && (
                                      <span className="mt-1.5 w-2 h-2 bg-zinc-900 shrink-0 inline-block"></span>
                                    )}
                                    <span className="flex-1">
                                      {l
                                        .trim()
                                        .replace(/^[\*\-]+\s*/, "")
                                        .split(/(\*\*.*?\*\*)/g)
                                        .map((part: string, idx: number) => {
                                          if (part.startsWith("**") && part.endsWith("**")) {
                                            return (
                                              <strong key={idx} className="text-zinc-900 font-semibold">
                                                {part.slice(2, -2)}
                                              </strong>
                                            );
                                          }
                                          return part;
                                        })}
                                    </span>
                                  </p>
                                ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pharmacological / Parent-Mediated Cards */}
                    {(
                      activeReport as AggregatedClinicalReport
                    )?.therapies_recommended?.map((t: any, idx: number) => {
                      if (t.therapy_name.includes("Pharmacological")) {
                        return (
                          <ClinicalInsightCard
                            key={idx}
                            title="Pharmacological Protocols"
                            color="bg-rose-50/50"
                            icon={<ShieldAlert size={120} className="text-rose-100" />}
                          >
                            <div className="space-y-4">
                              {t.summary.split("\n").filter(Boolean).map((line: string, i: number) => (
                                <div key={i} className="flex gap-4 items-start bg-white p-4 border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                  <div className="w-2 h-6 bg-rose-500 shrink-0"></div>
                                  <p className="font-sans text-sm text-zinc-800 leading-relaxed">{line.replace(/^\*+\s*/, "")}</p>
                                </div>
                              ))}
                            </div>
                          </ClinicalInsightCard>
                        );
                      }
                      if (t.therapy_name.includes("Parent-Mediated")) {
                        return (
                          <ClinicalInsightCard
                            key={idx}
                            title="Family Support Ecology"
                            color="bg-amber-50/50"
                            icon={<User size={120} className="text-amber-100" />}
                          >
                            <div className="space-y-4">
                              {t.summary.split("\n").filter(Boolean).map((line: string, i: number) => (
                                <div key={i} className="flex gap-4 items-start bg-white p-4 border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                  <div className="w-2 h-6 bg-amber-500 shrink-0"></div>
                                  <p className="font-sans text-sm text-zinc-800 leading-relaxed">{line.replace(/^\*+\s*/, "")}</p>
                                </div>
                              ))}
                            </div>
                          </ClinicalInsightCard>
                        );
                      }
                      return null;
                    })}

                    {/* Targeted Interventions */}
                    <div className="pt-12 space-y-8">
                      <div className="flex items-center gap-8">
                        <div className="h-1.5 bg-zinc-900 flex-1 border-y border-white"></div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter italic">Targeted Interventions</h3>
                        <div className="h-1.5 bg-zinc-900 flex-1 border-y border-white"></div>
                      </div>
                      <div className="flex flex-col gap-5">
                        {(activeReport as AggregatedClinicalReport)?.therapies_recommended
                          ?.flatMap((t: any) => {
                            if (
                              t.therapy_name.includes("Pharmacological") ||
                              t.therapy_name.includes("Parent-Mediated") ||
                              t.therapy_name.includes("Kinematic") ||
                              t.therapy_name.includes("Details") ||
                              t.therapy_name.includes("RAG")
                            ) return [];
                            if (t.therapy_name.includes("AFIRM")) {
                              const modules = t.summary.split(/\n\* \*\*/).filter(Boolean);
                              return modules.map((m: string) => {
                                const titleMatch = m.match(/^(.*?)\*\*/);
                                const title = titleMatch ? titleMatch[1].trim() : "Therapy Module";
                                const descMatch = m.match(/Description:\s*(.*?)(?:\n|$)/);
                                const desc = descMatch ? descMatch[1].trim() : m.slice(0, 150) + "...";
                                const targetsMatch = m.match(/Targets:\s*(.*?)(?:\n|$)/);
                                const targets = targetsMatch ? targetsMatch[1].trim() : "Behavioral";
                                const urlMatch = m.match(/Link:\s*\[.*?\]\((.*?)\)/);
                                const url = urlMatch ? urlMatch[1] : "https://afirm.fpg.unc.edu/afirm-modules";
                                return { therapy_name: title, summary: desc, intervention_targets: targets, relevance_score: t.relevance_score, url };
                              });
                            }
                            return [t];
                          })
                          .map((t: any, idx: number) => (
                            <AfirmModuleCard
                              key={idx}
                              title={t.therapy_name}
                              desc={t.summary}
                              targets={t.intervention_targets}
                              relevance={t.relevance_score}
                              url={t.url || t.summary.match(/\[(.*?)\]\((.*?)\)/)?.[2] || "https://afirm.fpg.unc.edu/afirm-modules"}
                            />
                          ))}
                      </div>
                    </div>

                    {/* EBM Grounds */}
                    <div className="pt-16 border-t-4 border-zinc-200 space-y-12">
                      <div className="bg-zinc-900 p-10 border-2 border-zinc-900 shadow-[8px_8px_0px_0px_rgba(16,185,129,1)]">
                        <h3 className="text-[12px] font-black uppercase text-emerald-400 flex items-center gap-3 mb-10 tracking-[0.3em]">
                          <ShieldAlert size={18} /> EBM Grounds
                        </h3>
                        <div className="flex flex-col gap-8">
                          {(activeReport as AggregatedClinicalReport)?.retrieved_chunks?.slice(0, 4).map((chunk: any, i: number) => (
                            <EvidenceChunkCard
                              key={i}
                              source={chunk.source}
                              page={chunk.page}
                              relevance={chunk.rerank_score ? chunk.rerank_score / 3 : 0.8}
                              excerpt={chunk.text}
                              tags={[chunk.content_type, chunk.intervention_type]}
                            />
                          ))}
                          {(!(activeReport as AggregatedClinicalReport)?.retrieved_chunks ||
                            (activeReport as AggregatedClinicalReport)?.retrieved_chunks?.length === 0) && (
                            <div className="p-10 border-4 border-dashed border-zinc-800 text-center">
                              <p className="text-[10px] font-black uppercase text-zinc-600 italic">No citations retrieved.</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-4">
                        <button className="w-full py-5 bg-zinc-900 text-white font-black uppercase text-xs flex items-center justify-center gap-3 border-4 border-zinc-900 hover:bg-zinc-800 transition-all shadow-[8px_8px_0px_0px_rgba(245,158,11,1)]">
                          <CheckCircle2 size={20} /> Commit Treatment Plan
                        </button>
                        <button className="w-full py-5 bg-white border-4 border-zinc-900 text-zinc-900 font-black uppercase text-xs flex items-center justify-center gap-3 hover:bg-zinc-50 transition-all">
                          <MessageSquare size={20} /> Share Findings with Team
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Longitudinal Context */}
                  {!selectedSessionId && clinicalReport?.sessions_included && (
                    <div className="pt-12 border-t-4 border-zinc-900">
                      <div className="flex items-center justify-between mb-8 px-4">
                        <div>
                          <h3 className="text-2xl font-black uppercase tracking-tighter italic">
                            Longitudinal Footprint
                          </h3>
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">
                            Aggregate behavioral mapping across{" "}
                            {clinicalReport.sessions_included.length} analyzed
                            sessions
                          </p>
                        </div>
                        <div className="px-4 py-2 border-2 border-zinc-900 bg-amber-400 text-xs font-black uppercase italic shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                          Validated Dataset
                        </div>
                      </div>
                      <div className="flex overflow-x-auto pb-8 gap-6 no-scrollbar px-4">
                        {clinicalReport.sessions_included.map(
                          (s: any, i: number) => (
                            <button
                              key={i}
                              onClick={() => setSelectedSessionId(s.sessionId)}
                              className="min-w-[280px] p-6 border-2 border-zinc-900 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group hover:bg-zinc-900 text-left transition-all"
                            >
                              <div className="absolute -right-3 -top-6 text-[80px] font-black text-zinc-50 group-hover:text-white/5 pointer-events-none italic">
                                0{i + 1}
                              </div>
                              <div className="relative space-y-4">
                                <div className="w-10 h-10 bg-amber-400 border-2 border-zinc-900 group-hover:bg-white flex items-center justify-center transition-all">
                                  <Video size={18} className="text-zinc-900" />
                                </div>
                                <div>
                                  <p className="text-xs font-black uppercase group-hover:text-amber-400 transition-colors tracking-tight">
                                    {s.actionType?.replace("_", " ") ||
                                      "Clinical Session"}
                                  </p>
                                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                                    {new Date(
                                      s.recordedAt,
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="pt-4 border-t-2 border-zinc-100 group-hover:border-zinc-800 flex justify-between items-center group/btn">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[8px] font-black uppercase text-zinc-300 group-hover:text-zinc-600">
                                      ID: {s.sessionId.slice(-6)}
                                    </span>
                                    {s.status && (
                                      <span className={`px-1 py-0.5 text-[6px] font-black border-2 uppercase tracking-tight ${s.status === "published" ? "bg-emerald-400 border-zinc-900 text-zinc-950" : "bg-zinc-100 border-zinc-200 text-zinc-400"}`}>
                                        {s.status.replace("_", " ")}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-amber-500 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all flex items-center gap-1.5">
                                    <span className="text-[7px] font-black uppercase">
                                      View Report
                                    </span>
                                    <ChevronRight size={14} />
                                  </div>
                                </div>
                              </div>
                            </button>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center animate-in fade-in duration-500">
            <div className="w-40 h-40 bg-zinc-100 border-4 border-zinc-200 border-dashed animate-pulse flex items-center justify-center mb-10">
              <Brain size={64} className="text-zinc-300" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-zinc-300 italic">
              Select Patient for Diagnostic Sync
            </h2>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mt-4 max-w-sm leading-relaxed">
              Choose a patient from the registry index to initialize the
              clinical therapy planning workflow.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
