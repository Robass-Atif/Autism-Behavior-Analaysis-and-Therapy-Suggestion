import React, { useState, useMemo } from "react";
import {
  Sparkles,
  BookOpen,
  ThumbsUp,
  ThumbsDown,
  Edit,
  ArrowRight,
  Brain,
  FileText,
  CheckCircle2,
  Search,
  User,
  Filter,
  TrendingUp,
  Calendar,
  Clock,
  ChevronRight,
  Layout,
  BarChart,
  Info,
  Loader2,
  Activity,
} from "lucide-react";
import { usePatients } from "../../../api/patient";
import {
  usePatientLongitudinal,
  useVideoSessions,
} from "../../../api/clinical";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Patient, Screen } from "../../../types";

interface TherapyRecommendationsProps {
  onNavigate?: (screen: Screen, data?: any) => void;
}

export default function TherapyRecommendations({
  onNavigate,
}: TherapyRecommendationsProps) {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");

  const { data: patientsData, isLoading: patientsLoading } = usePatients({
    limit: 100,
  });
  const { data: longitudinalData, isLoading: trendsLoading } =
    usePatientLongitudinal(selectedPatientId || "");
  const { data: sessionsData, isLoading: sessionsLoading } = useVideoSessions(
    selectedPatientId || "",
  );

  const patients = patientsData?.patients || [];
  const selectedPatient = useMemo(
    () =>
      patients.find(
        (p) => p.id === selectedPatientId || p._id === selectedPatientId,
      ),
    [patients, selectedPatientId],
  );

  const filteredPatients = patients.filter(
    (p) =>
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.mrn.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const latestSessionWithReport = useMemo(() => {
    return (
      sessionsData?.sessions
        ?.slice()
        .sort(
          (a: any, b: any) =>
            new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
        )
        .find((s: any) => s.clinicalReport || s.aiAnalysis) ||
      sessionsData?.sessions?.[0]
    );
  }, [sessionsData]);

  const clinicalReport = latestSessionWithReport?.clinicalReport;
  const aiAnalysis = latestSessionWithReport?.aiAnalysis;

  const handlePatientSelect = (id: string) => {
    setSelectedPatientId(id);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)] overflow-hidden bg-white font-mono">
      {/* Patient Selection Sidebar - CODEX WHITE THEME */}
      <div className="w-full lg:w-80 bg-white border-r-2 border-zinc-100 flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-zinc-100 bg-white">
          <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-4">
            Patient_Registry
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-300" />
            <input
              type="text"
              placeholder="SEARCH IDENTITY..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-[10px] bg-zinc-50 border border-zinc-200 text-zinc-900 focus:border-zinc-900 outline-none transition-all uppercase font-bold tracking-widest"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {patientsLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Loader2 className="w-4 h-4 text-zinc-300 animate-spin" />
              <span className="text-[8px] text-zinc-400 uppercase font-black tracking-widest">
                Accessing Roster...
              </span>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-8 text-center">
              <User className="w-8 h-8 text-zinc-100 mx-auto mb-2" />
              <p className="text-[10px] text-zinc-400 uppercase font-bold">
                Registry Empty
              </p>
            </div>
          ) : (
            filteredPatients.map((p) => (
              <button
                key={p.id || p._id}
                onClick={() => handlePatientSelect(p.id || p._id || "")}
                className={`w-full flex items-center gap-3 p-3 transition-all duration-200 border-b border-zinc-50 ${
                  selectedPatientId === (p.id || p._id)
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                <div
                  className={`w-8 h-8 flex items-center justify-center text-[10px] font-black border transition-all ${
                    selectedPatientId === (p.id || p._id)
                      ? "bg-white text-zinc-900 border-white"
                      : "bg-zinc-100 text-zinc-400 border-zinc-200"
                  }`}
                >
                  {p.fullName.charAt(0)}
                </div>
                <div className="text-left overflow-hidden">
                  <p
                    className={`text-[10px] font-black truncate uppercase tracking-tight ${selectedPatientId === (p.id || p._id) ? "text-white" : "text-zinc-900"}`}
                  >
                    {p.fullName}
                  </p>
                  <p
                    className={`text-[8px] font-bold tracking-widest ${selectedPatientId === (p.id || p._id) ? "text-zinc-500" : "text-zinc-400"}`}
                  >
                    {p.mrn}
                  </p>
                </div>
                {selectedPatientId === (p.id || p._id) && (
                  <ChevronRight size={12} className="ml-auto text-zinc-500" />
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {selectedPatientId ? (
          <div className="flex-1 overflow-y-auto">
            {/* Context Header */}
            <div className="bg-zinc-900 px-8 py-6 border-b-4 border-zinc-800 sticky top-0 z-20">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 max-w-7xl mx-auto">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white text-zinc-900 border-2 border-white flex items-center justify-center rounded-lg">
                    <Activity size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h1 className="text-xl font-black text-white tracking-tighter uppercase leading-none">
                      Clinical Insights |{" "}
                      <span className="text-zinc-400">
                        {selectedPatient?.fullName}
                      </span>
                    </h1>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[9px] text-zinc-500 flex items-center gap-1 font-black uppercase tracking-widest">
                        <Calendar size={12} /> Assessment Cycle:{" "}
                        {latestSessionWithReport?.recordedAt
                          ? new Date(
                              latestSessionWithReport.recordedAt,
                            ).toLocaleDateString("en-US", {
                              month: "long",
                              year: "numeric",
                            })
                          : new Date().toLocaleDateString("en-US", {
                              month: "long",
                              year: "numeric",
                            })}
                      </span>
                      <span className="text-[9px] text-zinc-500 flex items-center gap-1 font-black uppercase tracking-widest">
                        <TrendingUp size={12} />{" "}
                        {longitudinalData?.totalSessions || 0} Sessions Recorded
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onNavigate?.(Screen.REPORT_GENERATION)}
                    className="px-4 py-2 text-[10px] font-black text-zinc-400 bg-zinc-800 border-2 border-zinc-700 hover:border-zinc-500 transition-all uppercase tracking-widest flex items-center gap-2"
                  >
                    <FileText size={14} /> Export Report
                  </button>
                  <button
                    onClick={() =>
                      onNavigate?.(Screen.PATIENT_LONGITUDINAL, {
                        patientId: selectedPatientId,
                      })
                    }
                    className="px-4 py-2 text-[10px] font-black text-zinc-900 bg-white border-2 border-white hover:bg-zinc-100 transition-all uppercase tracking-widest flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]"
                  >
                    <BarChart size={14} /> Full Analytics
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 md:p-8 max-w-full mx-auto space-y-8 animate-fade-in">
              {/* Top Row: Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Data Matrix */}
                <div className="lg:col-span-2 bg-white border-2 border-zinc-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={16} className="text-zinc-900" />
                      <h3 className="text-[10px] font-black text-zinc-900 uppercase tracking-[0.2em]">
                        Severity Trend Over Time
                      </h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-[3px] bg-zinc-900 rounded-full" />
                        <span className="text-[7px] font-bold text-zinc-500 uppercase">
                          Severity
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-[3px] bg-violet-500 rounded-full" />
                        <span className="text-[7px] font-bold text-zinc-500 uppercase">
                          Social Affect
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-[3px] bg-amber-500 rounded-full" />
                        <span className="text-[7px] font-bold text-zinc-500 uppercase">
                          RRB
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="h-72">
                    {trendsLoading ? (
                      <div className="h-full flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-6 h-6 text-zinc-300 animate-spin" />
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                          Loading clinical data...
                        </span>
                      </div>
                    ) : longitudinalData?.trendData?.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={longitudinalData.trendData}
                          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="gradSeverity"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#18181b"
                                stopOpacity={0.15}
                              />
                              <stop
                                offset="100%"
                                stopColor="#18181b"
                                stopOpacity={0.01}
                              />
                            </linearGradient>
                            <linearGradient
                              id="gradSA"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#8b5cf6"
                                stopOpacity={0.12}
                              />
                              <stop
                                offset="100%"
                                stopColor="#8b5cf6"
                                stopOpacity={0.01}
                              />
                            </linearGradient>
                            <linearGradient
                              id="gradRRB"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#f59e0b"
                                stopOpacity={0.12}
                              />
                              <stop
                                offset="100%"
                                stopColor="#f59e0b"
                                stopOpacity={0.01}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="4 4"
                            vertical={false}
                            stroke="#f4f4f5"
                          />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(d: string) =>
                              new Date(d).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                            }
                            tick={{
                              fontSize: 9,
                              fontWeight: 700,
                              fill: "#a1a1aa",
                            }}
                            axisLine={{ stroke: "#e4e4e7" }}
                            tickLine={false}
                            dy={8}
                          />
                          <YAxis
                            domain={[0, "auto"]}
                            tick={{
                              fontSize: 9,
                              fontWeight: 700,
                              fill: "#a1a1aa",
                            }}
                            axisLine={false}
                            tickLine={false}
                            width={28}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: "8px",
                              border: "1px solid #e4e4e7",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                              fontSize: "11px",
                              fontWeight: "600",
                              fontFamily: "monospace",
                              padding: "10px 14px",
                            }}
                            labelFormatter={(d: string) =>
                              new Date(d).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              })
                            }
                            formatter={(value: number, name: string) => {
                              const labels: Record<string, string> = {
                                severity: "Severity Level",
                                social_affect: "Social Affect",
                                rrb: "RRB Score",
                              };
                              return [
                                typeof value === "number"
                                  ? value.toFixed(1)
                                  : value,
                                labels[name] || name,
                              ];
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="severity"
                            stroke="#18181b"
                            strokeWidth={2.5}
                            fill="url(#gradSeverity)"
                            dot={{ r: 3, fill: "#18181b", strokeWidth: 0 }}
                            activeDot={{
                              r: 5,
                              fill: "#18181b",
                              stroke: "#fff",
                              strokeWidth: 2,
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="social_affect"
                            stroke="#8b5cf6"
                            strokeWidth={1.5}
                            strokeDasharray="4 2"
                            fill="url(#gradSA)"
                            dot={false}
                          />
                          <Area
                            type="monotone"
                            dataKey="rrb"
                            stroke="#f59e0b"
                            strokeWidth={1.5}
                            strokeDasharray="4 2"
                            fill="url(#gradRRB)"
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-300 gap-3 border-2 border-dashed border-zinc-100 rounded-lg">
                        <BarChart size={36} strokeWidth={1} />
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                          No trend data available yet
                        </p>
                        <p className="text-[9px] text-zinc-300 font-medium max-w-xs text-center">
                          Upload and analyze video sessions to begin tracking
                          longitudinal patterns.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Observations Panel */}
                <div className="bg-white p-6 text-white relative overflow-hidden flex flex-col shadow-[6px_6px_0px_0px_rgba(24,24,27,0.2)]">
                  <div className="flex items-center gap-2 mb-6">
                    <Sparkles size={16} className="text-zinc-500" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                      AI Assessment Summary
                    </h3>
                  </div>
                  <div className="space-y-6 flex-1">
                    <p className="text-xs leading-relaxed text-zinc-950 font-bold uppercase tracking-tight line-clamp-6">
                      {aiAnalysis?.summary ||
                        clinicalReport?.clinical_report ||
                        "Awaiting clinical data. Upload and analyze sessions to generate an AI summary."}
                    </p>

                    {/* ADOS Quick Metrics */}
                    {latestSessionWithReport?.ensemblePrediction && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-zinc-50 border border-zinc-200 p-2">
                          <p className="text-[7px] font-black text-zinc-400 uppercase tracking-widest">
                            Severity Level
                          </p>
                          <p className="text-lg font-black text-zinc-900">
                            {latestSessionWithReport.ensemblePrediction
                              .severity ?? "—"}
                          </p>
                          <span
                            className={`text-[7px] font-black px-1 py-0.5 uppercase inline-block mt-1 ${
                              (latestSessionWithReport.ensemblePrediction
                                .severity ?? 0) >= 2
                                ? "bg-red-600 text-white"
                                : (latestSessionWithReport.ensemblePrediction
                                      .severity ?? 0) === 1
                                  ? "bg-amber-600 text-white"
                                  : "bg-emerald-600 text-white"
                            }`}
                          >
                            {(latestSessionWithReport.ensemblePrediction
                              .severity ?? 0) === 0
                              ? "Non-Spectrum"
                              : (latestSessionWithReport.ensemblePrediction
                                    .severity ?? 0) === 1
                                ? "ASD Mild"
                                : "Severe"}
                          </span>
                        </div>
                        <div className="bg-zinc-50 border border-zinc-200 p-2">
                          <p className="text-[7px] font-black text-zinc-400 uppercase tracking-widest">
                            Social-Emotional
                          </p>
                          <p className="text-lg font-black text-zinc-900">
                            {latestSessionWithReport.ensemblePrediction.social_affect?.toFixed(
                              1,
                            ) ?? "—"}
                          </p>
                        </div>
                        <div className="bg-zinc-50 border border-zinc-200 p-2">
                          <p className="text-[7px] font-black text-zinc-400 uppercase tracking-widest">
                            Repetitive Behaviors
                          </p>
                          <p className="text-lg font-black text-zinc-900">
                            {latestSessionWithReport.ensemblePrediction.rrb?.toFixed(
                              1,
                            ) ?? "—"}
                          </p>
                        </div>
                        <div className="bg-zinc-50 border border-zinc-200 p-2">
                          <p className="text-[7px] font-black text-zinc-400 uppercase tracking-widest">
                            ADOS-2 Composite
                          </p>
                          <p className="text-lg font-black text-zinc-900">
                            {latestSessionWithReport.ensemblePrediction
                              .social_affect != null &&
                            latestSessionWithReport.ensemblePrediction.rrb !=
                              null
                              ? (
                                  latestSessionWithReport.ensemblePrediction
                                    .social_affect +
                                  latestSessionWithReport.ensemblePrediction.rrb
                                ).toFixed(1)
                              : "—"}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="pt-6 border-t border-zinc-800 space-y-3">
                      <div className="flex justify-between items-center bg-zinc-950 border border-zinc-800 p-3">
                        <span className="text-[8px] font-black text-zinc-300 uppercase tracking-widest">
                          Model Confidence:
                        </span>
                        <span className="text-xs font-black text-white">
                          {latestSessionWithReport?.ensemblePrediction
                            ?.severity_confidence
                            ? (
                                latestSessionWithReport.ensemblePrediction
                                  .severity_confidence * 100
                              ).toFixed(1) + "%"
                            : aiAnalysis
                              ? "90%"
                              : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-zinc-950 border border-zinc-800 p-3">
                        <span className="text-[8px] font-black text-zinc-300 uppercase tracking-widest">
                          Behavioral Indicators:
                        </span>
                        <span
                          className={`text-xs font-black ${(aiAnalysis?.behaviors?.length ?? 0) > 0 || clinicalReport ? "text-amber-500" : "text-green-500"}`}
                        >
                          {(aiAnalysis?.behaviors?.length ?? 0) > 0 ||
                          clinicalReport
                            ? "DETECTED"
                            : "NOMINAL"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Protocols */}
              <div>
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] mb-6 px-1 flex items-center gap-2">
                  <Layout size={12} /> Recommended Intervention Protocols
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {clinicalReport?.therapies_recommended?.length ? (
                    clinicalReport.therapies_recommended.map(
                      (t: any, i: number) => (
                        <ProtocolCard
                          key={i}
                          priority={t.relevance_score > 0.8 ? "high" : "medium"}
                          title={t.therapy_name.replace(/ /g, "_")}
                          confidence={Math.round(t.relevance_score * 100) || 85}
                          desc={t.summary}
                          reasoning={t.intervention_targets}
                        />
                      ),
                    )
                  ) : aiAnalysis?.recommendations?.length ? (
                    aiAnalysis.recommendations.map((rec: string, i: number) => (
                      <ProtocolCard
                        key={i}
                        priority="medium"
                        title={`Dynamic_Protocol_${i + 1}`}
                        confidence={85}
                        desc={rec}
                        reasoning="Derived from recent telemetry observation."
                      />
                    ))
                  ) : (
                    <div className="col-span-1 md:col-span-2 lg:col-span-3 p-10 border-2 border-dashed border-zinc-200 text-center">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                        No Active Protocols Suggested
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Session History */}
              <div className="bg-white border-2 border-zinc-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <div className="p-4 border-b-2 border-zinc-900 bg-zinc-900 text-zinc-500 flex justify-between items-center">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">
                    Session History
                  </h3>
                  <Clock size={14} />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-zinc-50 border-b-2 border-zinc-100 text-zinc-400">
                        <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest">
                          Date Recorded
                        </th>
                        <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest">
                          Observation Type
                        </th>
                        <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest">
                          Analysis Status
                        </th>
                        <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-zinc-50">
                      {sessionsLoading ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-6 py-10 text-center text-[10px] font-black text-zinc-300 uppercase animate-pulse"
                          >
                            Scanning Transmission History...
                          </td>
                        </tr>
                      ) : sessionsData?.sessions?.length ? (
                        sessionsData.sessions
                          .slice(0, 5)
                          .map((session: any) => (
                            <tr
                              key={session.id}
                              className="hover:bg-zinc-50 transition-colors"
                            >
                              <td className="px-6 py-4">
                                <p className="text-[10px] font-black text-zinc-900 uppercase">
                                  {new Date(
                                    session.recordedAt,
                                  ).toLocaleDateString()}
                                </p>
                                <p className="text-[8px] text-zinc-400 font-mono tracking-tight font-bold">
                                  SHA_{session.id.slice(-6).toUpperCase()}
                                </p>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                                  {session.actionType || "GEN_SESSION"}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`inline-flex px-2 py-0.5 border-2 text-[8px] font-black uppercase tracking-widest ${
                                    session.status === "published"
                                      ? "bg-green-100 border-green-200 text-green-700"
                                      : "bg-zinc-100 border-zinc-200 text-zinc-500"
                                  }`}
                                >
                                  {session.status.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() =>
                                    onNavigate?.(Screen.SESSION_REPORT, {
                                      sessionId: session.id,
                                    })
                                  }
                                  className="text-zinc-900 hover:text-white hover:bg-zinc-900 border-2 border-zinc-900 px-3 py-1.5 text-[10px] font-black uppercase transition-all"
                                >
                                  View Report
                                </button>
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-16 text-center">
                            <FileText className="w-10 h-10 text-zinc-100 mx-auto mb-4" />
                            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">
                              No sessions recorded yet
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Empty State - CODEX STYLE */
          <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white m-8 border-4 border-zinc-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.05)]">
            <div className="w-20 h-20 bg-zinc-900 text-white flex items-center justify-center mb-8 border-4 border-zinc-800 rounded-2xl">
              <Activity size={40} strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl font-black text-zinc-900 mb-2 tracking-tighter uppercase whitespace-nowrap">
              Clinical AI Insights
            </h2>
            <p className="text-zinc-400 text-center text-[10px] font-black uppercase tracking-[0.3em] max-w-sm mb-10 leading-relaxed">
              Select identity from registry to initialize clinical analysis
              feed.
            </p>
            <div className="flex gap-4 w-full max-w-md">
              <div className="flex-1 p-4 bg-zinc-50 border-2 border-zinc-100 text-center">
                <div className="p-2 bg-white border border-zinc-200 w-fit mx-auto mb-3">
                  <TrendingUp size={16} />
                </div>
                <h4 className="text-[9px] font-black text-zinc-900 uppercase tracking-widest mb-1">
                  Trends
                </h4>
                <p className="text-[8px] text-zinc-400 leading-tight uppercase font-bold">
                  Capturing longitudinal motor variance.
                </p>
              </div>
              <div className="flex-1 p-4 bg-zinc-50 border-2 border-zinc-100 text-center">
                <div className="p-2 bg-white border border-zinc-200 w-fit mx-auto mb-3">
                  <Layout size={16} />
                </div>
                <h4 className="text-[9px] font-black text-zinc-900 uppercase tracking-widest mb-1">
                  Protocols
                </h4>
                <p className="text-[8px] text-zinc-400 leading-tight uppercase font-bold">
                  Generating adaptive intervention loops.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RAG Sidebar - Clinical Evidence */}
      {selectedPatientId && (
        <div className="w-80 border-l-2 border-zinc-100 flex-col h-full bg-white hidden xl:flex">
          <div className="p-6 border-b border-zinc-200 bg-white">
            <h3 className="font-black text-zinc-900 flex items-center gap-2 uppercase tracking-[0.2em] text-[10px]">
              <BookOpen size={16} className="text-zinc-400" /> Evidence Library
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="p-4 bg-zinc-900 text-white border-2 border-zinc-900 text-[9px] font-bold leading-relaxed uppercase tracking-widest">
              STATUS:{" "}
              {clinicalReport
                ? "EVIDENCE_MAPPED_TO_DSM5"
                : "WAITING_FOR_DATA_MAP"}
            </div>

            {clinicalReport?.therapies_recommended?.length ? (
              clinicalReport.therapies_recommended.map((t: any, i: number) => (
                <SourceCard
                  key={i}
                  title={t.therapy_name.replace(/ /g, "_")}
                  journal={t.evidence_basis.substring(0, 40) + "..."}
                  relevance={Math.round(t.relevance_score * 100) || 85}
                />
              ))
            ) : (
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-4">
                No sources fetched.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const ProtocolCard = ({
  priority,
  title,
  confidence,
  desc,
  reasoning,
}: any) => {
  return (
    <div className="bg-white border-2 border-zinc-900 p-6 shadow-sm hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 flex flex-col relative group cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
      <div className="flex justify-between items-start mb-6">
        <div>
          <div
            className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border inline-block mb-3 ${
              priority === "high"
                ? "bg-zinc-900 text-white"
                : "bg-white text-zinc-900 border-zinc-900"
            }`}
          >
            {priority}_PRIORITY
          </div>
          <h3 className="text-sm font-black text-zinc-900 tracking-tighter uppercase leading-tight break-all">
            {title}
          </h3>
        </div>
        <div className="bg-zinc-50 border-2 border-zinc-100 p-2 text-center shrink-0 ml-2">
          <span className="text-xs font-black text-zinc-900">
            {confidence}%
          </span>
        </div>
      </div>

      <div className="border-l-4 border-zinc-900 pl-4 mb-6">
        <p className="text-zinc-600 font-bold text-[10px] uppercase leading-relaxed">
          {desc}
        </p>
      </div>

      <div className="bg-zinc-50 border-2 border-zinc-100 p-4 mb-6">
        <h4 className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
          <FileText size={10} /> Clinical_Rationale
        </h4>
        <p className="text-[9px] text-zinc-500 font-bold leading-relaxed uppercase italic">
          {reasoning}
        </p>
      </div>

      <div className="flex gap-2 mt-auto">
        <button className="flex-1 py-2 bg-zinc-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-all border-2 border-zinc-900">
          ACCEPT
        </button>
        <button className="flex-1 py-2 bg-white text-zinc-500 font-black text-[10px] uppercase tracking-widest border-2 border-zinc-200 hover:border-zinc-900 hover:text-zinc-900 transition-all">
          REJECT
        </button>
      </div>
    </div>
  );
};

const SourceCard = ({ title, journal, relevance }: any) => (
  <div className="bg-white border-2 border-zinc-200 p-4 hover:border-zinc-900 transition-all cursor-pointer group shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] hover:shadow-none">
    <div className="flex justify-between items-start mb-2">
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 bg-zinc-900"></div>
        <span className="text-[8px] font-black text-zinc-900 uppercase">
          {relevance}%_WEIGHT
        </span>
      </div>
    </div>
    <h4 className="text-[10px] font-black text-zinc-900 mb-1 leading-snug uppercase tracking-tight line-clamp-2">
      {title}
    </h4>
    <p className="text-[8px] text-zinc-400 font-bold italic uppercase truncate">
      {journal}
    </p>
    <div className="mt-4 flex items-center text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400 group-hover:text-zinc-900 transition-colors">
      READ_FULL <ArrowRight size={10} className="ml-1" />
    </div>
  </div>
);
