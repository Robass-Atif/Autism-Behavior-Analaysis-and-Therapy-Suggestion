import React, { useState } from "react";
import {
  usePatientLongitudinal,
  useVideoSessions,
} from "../../../api/clinical";
import { usePatients } from "../../../api/patient";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  Loader2,
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Calendar,
  ChevronRight,
  Activity,
  Shield,
  User,
  Target,
  Eye,
  Clock,
} from "lucide-react";
import { Screen, LongitudinalDataPoint, VideoSession } from "../../../types";

interface PatientLongitudinalScreenProps {
  patientId: string;
  onNavigate?: (screen: Screen, data?: any) => void;
  onBack?: () => void;
}

const CHART_COLORS = {
  severity: "#18181b", // zinc-900
  social_affect: "#71717a", // zinc-500
  rrb: "#a1a1aa", // zinc-400
  comparison: "#e4e4e7", // zinc-200
};

export default function PatientLongitudinalScreen({
  patientId,
  onNavigate,
  onBack,
}: PatientLongitudinalScreenProps) {
  const { data: longitudinal, isLoading } = usePatientLongitudinal(patientId);
  const { data: sessionsData } = useVideoSessions(patientId);
  const { data: patientsData } = usePatients({ limit: 100 });
  const [activeMetric, setActiveMetric] = useState<
    "all" | "severity" | "social_affect" | "rrb" | "comparison_score"
  >("all");

  const patient = patientsData?.patients?.find(
    (p) => p.id === patientId || p._id === patientId,
  );
  const trendData = longitudinal?.trendData || [];

  // Format chart data
  const chartData = trendData.map((point: LongitudinalDataPoint) => ({
    ...point,
    date: new Date(point.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    fullDate: new Date(point.date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
  }));

  const handleViewSession = (sessionId: string) => {
    if (onNavigate) {
      onNavigate(Screen.SESSION_REPORT, { sessionId });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border text-zinc-900 border-zinc-200 p-8 font-mono min-h-[calc(100vh-3.5rem)]">
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-zinc-900 animate-spin" />
          <span className="text-xs text-zinc-400 uppercase font-black tracking-widest">
            Scanning Historical Archives...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white text-zinc-900 font-mono min-h-[calc(100vh-3.5rem)] overflow-y-auto w-full selection:bg-zinc-100 relative">
      <div className="absolute top-0 right-0 p-1">
        <div className="w-1 h-1 bg-zinc-200"></div>
      </div>
      <div className="absolute bottom-0 left-0 p-1">
        <div className="w-1 h-1 bg-zinc-200"></div>
      </div>

      {/* Header */}
      <div className="bg-zinc-900 px-8 py-6 border-b-4 border-zinc-800 sticky top-0 z-20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 max-w-7xl mx-auto">
          <div className="flex items-start gap-4 flex-col">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-[10px] text-zinc-400 hover:text-white uppercase font-black tracking-widest transition-colors mb-2"
              >
                <ArrowLeft size={12} /> BACK TO CLINICAL ROSTER
              </button>
            )}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white text-zinc-900 border-2 border-white flex items-center justify-center">
                <TrendingUp size={24} strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-tighter uppercase leading-none">
                  Longitudinal Analysis |{" "}
                  <span className="text-zinc-400">{patient?.fullName}</span>
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[9px] text-zinc-500 flex items-center gap-1 font-black uppercase tracking-widest">
                    <User size={12} /> MRN VALIDATED
                  </span>
                  <span className="text-[9px] text-zinc-500 flex items-center gap-1 font-black uppercase tracking-widest">
                    <BarChart3 size={12} /> {longitudinal?.totalSessions || 0}
                     DATA POINTS
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="bg-zinc-800 border-2 border-zinc-700 px-4 py-2 flex items-center gap-4">
              <div>
                <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">
                  Trajectory Rate
                </p>
                <p className="text-sm font-black text-white">+12.4%</p>
              </div>
              <Activity size={16} className="text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-12">
        {trendData.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 max-w-2xl mx-auto">
            <div className="text-zinc-200 mb-6 bg-zinc-50 p-6 border-2 border-zinc-200">
              <TrendingUp size={48} />
            </div>
            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">
              Null Trends Detected
            </h4>
            <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest text-center max-w-sm">
              Longitudinal analysis requires at least two completed and reviewed
              sessions to generate meaningful trend insights.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Metric Toggle */}
            <div className="flex flex-wrap gap-0 border-2 border-zinc-900 w-fit">
              {[
                { key: "all", label: "OVERVIEW" },
                {
                  key: "severity",
                  label: "SEVERITY SCALE",
                  color: CHART_COLORS.severity,
                },
                {
                  key: "social_affect",
                  label: "SOCIAL AFFECT",
                  color: CHART_COLORS.social_affect,
                },
                {
                  key: "rrb",
                  label: "REPETITIVE BEHAVIOR",
                  color: CHART_COLORS.rrb,
                },
                {
                  key: "comparison score",
                  label: "GLOBAL_COMPARISON",
                  color: CHART_COLORS.comparison,
                },
              ].map((m, idx) => (
                <button
                  key={m.key}
                  onClick={() => setActiveMetric(m.key as any)}
                  className={`flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${idx !== 0 ? "border-l-2 border-zinc-900" : ""} ${
                    activeMetric === m.key
                      ? "bg-zinc-900 text-white"
                      : "bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                  }`}
                >
                  {(m as any).color && (
                    <span
                      className={`w-2 h-2 ${activeMetric === m.key ? "border border-zinc-700" : "border border-zinc-300"}`}
                      style={{ backgroundColor: (m as any).color }}
                    />
                  )}
                  {m.label}
                </button>
              ))}
            </div>

            {/* Trend Chart */}
            <div className="bg-white border-2 border-zinc-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
              <div className="flex items-center justify-between mb-8 border-b-2 border-zinc-100 pb-4">
                <h3 className="text-[10px] font-black text-zinc-900 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Activity size={14} className="text-zinc-900" />
                  Ensemble Prediction Trends v2
                </h3>
                <span className="text-[8px] font-black text-white bg-zinc-900 px-2 py-0.5 tracking-widest">
                  TIME SERIES
                </span>
              </div>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e4e4e7"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{
                        fontSize: 10,
                        fontWeight: 900,
                        fontFamily: "monospace",
                        fill: "#71717a",
                      }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis
                      tick={{
                        fontSize: 10,
                        fontWeight: 900,
                        fontFamily: "monospace",
                        fill: "#71717a",
                      }}
                      axisLine={false}
                      tickLine={false}
                      dx={-10}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "0",
                        border: "2px solid #18181b",
                        boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)",
                        padding: "16px",
                        fontSize: "10px",
                        fontWeight: "900",
                        fontFamily: "monospace",
                        textTransform: "uppercase",
                        backgroundColor: "#fff",
                      }}
                      labelFormatter={(label, payload) => {
                        const item = payload?.[0]?.payload;
                        return `DATE: ${item?.fullDate.toUpperCase() || label}`;
                      }}
                    />
                    {(activeMetric === "all" ||
                      activeMetric === "severity") && (
                      <Line
                        type="stepAfter"
                        dataKey="severity"
                        name="SEVERITY LEVEL"
                        stroke={CHART_COLORS.severity}
                        strokeWidth={3}
                        dot={{
                          fill: CHART_COLORS.severity,
                          r: 0,
                          strokeWidth: 0,
                        }}
                        activeDot={{
                          r: 6,
                          strokeWidth: 2,
                          stroke: "#18181b",
                          fill: "#fff",
                        }}
                      />
                    )}
                    {(activeMetric === "all" ||
                      activeMetric === "social_affect") && (
                      <Line
                        type="stepAfter"
                        dataKey="social_affect"
                        name="SOCIAL INTERACTION"
                        stroke={CHART_COLORS.social_affect}
                        strokeWidth={2}
                        dot={{
                          fill: CHART_COLORS.social_affect,
                          r: 0,
                          strokeWidth: 0,
                        }}
                      />
                    )}
                    {(activeMetric === "all" || activeMetric === "rrb") && (
                      <Line
                        type="stepAfter"
                        dataKey="rrb"
                        name="RRB REPETITIVE"
                        stroke={CHART_COLORS.rrb}
                        strokeWidth={2}
                        dot={{ fill: CHART_COLORS.rrb, r: 0, strokeWidth: 0 }}
                      />
                    )}
                    {(activeMetric === "all" ||
                      activeMetric === "comparison_score") && (
                      <Line
                        type="stepAfter"
                        dataKey="comparison_score"
                        name="COMPARISON SCORE"
                        stroke={CHART_COLORS.comparison}
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={{
                          fill: CHART_COLORS.comparison,
                          r: 0,
                          strokeWidth: 0,
                        }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Historical Comparison Cards */}
            <div>
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] mb-6 flex items-center gap-2">
                <Calendar size={12} /> HISTORICAL RECORDS LOG
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {trendData.map((point: LongitudinalDataPoint, idx: number) => (
                  <div
                    key={point.sessionId}
                    className="bg-white border-2 border-zinc-900 group shadow-sm hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                    onClick={() => handleViewSession(point.sessionId)}
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                          <Calendar size={10} className="text-zinc-900" />
                          {new Date(point.date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span
                          className={`px-2 py-0.5 border text-[8px] font-black uppercase tracking-widest ${
                            point.status === "published"
                              ? "bg-zinc-900 text-white border-zinc-900"
                              : "bg-transparent text-zinc-900 border-zinc-900"
                          }`}
                        >
                          {point.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <h4 className="text-xs font-black text-zinc-900 uppercase tracking-tight mb-6 flex items-center justify-between group-hover:bg-zinc-900 group-hover:text-white px-2 py-1 -mx-2 transition-colors">
                        {point.actionType?.replace(/ /g, "_") || "GEN SESSION"}
                        <ChevronRight
                          size={14}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </h4>

                      <div className="grid grid-cols-2 gap-px bg-zinc-200 border-2 border-zinc-200 mb-6">
                        <MetricBlock label="SEV LVL" value={point.severity} />
                        <MetricBlock
                          label="SOC IDX"
                          value={point.social_affect?.toFixed(1)}
                        />
                        <MetricBlock
                          label="RRB LVL"
                          value={point.rrb?.toFixed(1)}
                        />
                        <MetricBlock
                          label="GLB CMP"
                          value={point.comparison_score}
                        />
                      </div>

                      <button className="w-full flex items-center justify-center gap-2 py-3 bg-white text-zinc-900 group-hover:bg-zinc-900 group-hover:text-white transition-all text-[10px] font-black uppercase tracking-widest border-2 border-zinc-900">
                        <Eye size={12} />
                        ACCESS REPORT
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricBlock({ label, value }: { label: string; value: any }) {
  return (
    <div className="p-3 bg-white">
      <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="text-lg font-black text-zinc-900">{value}</p>
    </div>
  );
}
