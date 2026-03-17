import React, { useState, useMemo, useEffect } from "react";
import {
  TrendingUp,
  Loader2,
  ArrowLeft,
  BarChart3,
  Calendar,
  ChevronRight,
  Activity,
  User,
  Clock,
  Search,
  Layout,
  Filter,
  Eye,
  ArrowRight,
  Brain,
} from "lucide-react";
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
  AreaChart,
  Area,
} from "recharts";
import { Screen, LongitudinalDataPoint } from "../../../types";

interface PatientLongitudinalScreenProps {
  patientId: string;
  onNavigate?: (screen: Screen, data?: any) => void;
  onBack?: () => void;
}

const CHART_COLORS = {
  severity: "#18181b", // zinc-900
  social_affect: "#f59e0b", // amber-500
  rrb: "#71717a", // zinc-500
  comparison: "#a1a1aa", // zinc-400
};

export default function PatientLongitudinalScreen({
  patientId: initialPatientId,
  onNavigate,
  onBack,
}: PatientLongitudinalScreenProps) {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    initialPatientId || null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeMetric, setActiveMetric] = useState<
    "all" | "severity" | "social_affect" | "rrb" | "comparison_score"
  >("all");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: patientsData, isLoading: patientsLoading } = usePatients({
    limit: 100,
    search: debouncedSearch,
  });
  const { data: longitudinal, isFetching: trendsLoading, refetch: refetchTrends } =
    usePatientLongitudinal(selectedPatientId || "");
  const { data: sessionsData, isFetching: sessionsLoading, refetch: refetchSessions } = useVideoSessions(selectedPatientId || "");

  const patients = patientsData?.patients || [];
  const selectedPatient = useMemo(
    () =>
      patients.find(
        (p) => p.id === selectedPatientId || p._id === selectedPatientId,
      ),
    [patients, selectedPatientId],
  );

  // Search is now handled by the backend
  const filteredPatients = patients;

  const trendData = longitudinal?.trendData || [];

  // Format chart data
  const chartData = useMemo(() => {
    return trendData.map((point: LongitudinalDataPoint) => ({
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
  }, [trendData]);

  const handlePatientSelect = (id: string) => {
    setSelectedPatientId(id);
  };

  const handleViewSession = (sessionId: string) => {
    if (onNavigate) {
      onNavigate(Screen.SESSION_REPORT, { sessionId });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)] overflow-hidden bg-white font-mono">
      {/* Patient Selection Sidebar (Registry Index) */}
      <div className="w-full lg:w-80 bg-white border-r-4 border-zinc-900 flex flex-col flex-shrink-0 z-30">
        <div className="p-8 border-b-4 border-zinc-900 bg-white">
          <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] mb-6">
            Registry Index
          </h2>
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300" />
            <input
              type="text"
              placeholder="SEARCH IDENTITY..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 text-xs bg-zinc-50 border-2 border-zinc-900 text-zinc-900 focus:bg-white outline-none transition-all uppercase font-black tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-[2px] focus:translate-y-[2px]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {patientsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
              <Loader2 className="w-6 h-6 text-zinc-900 animate-spin" />
              <span className="text-[10px] text-zinc-900 uppercase font-black tracking-widest">
                Accessing Files...
              </span>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-12 text-center opacity-20">
              <User className="w-12 h-12 text-zinc-900 mx-auto mb-4" />
              <p className="text-[10px] text-zinc-900 uppercase font-black">
                Void Registry
              </p>
            </div>
          ) : (
            filteredPatients.map((p) => (
              <button
                key={p.id || p._id}
                onClick={() => handlePatientSelect(p.id || p._id || "")}
                className={`w-full flex items-center gap-4 p-4 transition-all duration-200 border-2 ${
                  selectedPatientId === (p.id || p._id)
                    ? "bg-zinc-900 text-white border-zinc-900 shadow-[4px_4px_0px_0px_rgba(245,158,11,1)]"
                    : "bg-white text-zinc-500 border-zinc-100 hover:border-zinc-900 hover:text-zinc-900"
                }`}
              >
                <div
                  className={`w-10 h-10 flex items-center justify-center text-xs font-black border-2 transition-all ${
                    selectedPatientId === (p.id || p._id)
                      ? "bg-white text-zinc-900 border-white"
                      : "bg-zinc-50 text-zinc-300 border-zinc-100"
                  }`}
                >
                  {p.fullName.charAt(0)}
                </div>
                <div className="text-left overflow-hidden">
                  <p
                    className={`text-[11px] font-black truncate uppercase tracking-tight ${selectedPatientId === (p.id || p._id) ? "text-white" : "text-zinc-900"}`}
                  >
                    {p.fullName}
                  </p>
                  <p
                    className={`text-[8px] font-bold tracking-widest ${selectedPatientId === (p.id || p._id) ? "text-amber-500" : "text-zinc-400"}`}
                  >
                    {p.mrn}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {selectedPatientId ? (
          <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <div className="bg-zinc-900 px-8 py-6 border-b-6 border-zinc-800 sticky top-0 z-20">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 max-w-7xl mx-auto">
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 bg-white text-zinc-900 border-2 border-zinc-900 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
                    <TrendingUp size={24} strokeWidth={3} />
                  </div>
                  <div>
                    <h1 className="text-xl font-black text-white tracking-tighter uppercase leading-none mb-2">
                      Progress Trends |{" "}
                      <span className="text-amber-400">
                        {selectedPatient?.fullName}
                      </span>
                    </h1>
                    <div className="flex flex-wrap items-center gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">
                          Matrix Status: Live Data
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="text-zinc-600" size={14} />
                        <span className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">
                          Chronological Points: {trendData.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      refetchTrends();
                      refetchSessions();
                    }}
                    disabled={trendsLoading || sessionsLoading}
                    className="px-5 py-2.5 text-[10px] font-black text-zinc-900 bg-amber-400 border-2 border-zinc-900 hover:bg-amber-300 transition-all uppercase tracking-[0.2em] flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] disabled:opacity-50"
                  >
                    <Activity size={14} className={trendsLoading || sessionsLoading ? "animate-spin" : ""} /> Refresh Stream
                  </button>
                </div>
              </div>
            </div>

            <div className="max-w-7xl mx-auto p-8 space-y-10">
              {trendsLoading ? (
                <div className="py-40 flex flex-col items-center justify-center gap-8">
                  <Loader2 className="w-12 h-12 text-zinc-900 animate-spin" />
                  <p className="text-xs font-black uppercase tracking-[0.5em] text-zinc-400">
                    Decrypting Historical Data...
                  </p>
                </div>
              ) : trendData.length === 0 ? (
                <div className="py-32 flex flex-col items-center justify-center border-4 border-dashed border-zinc-200 bg-zinc-50 rounded-none group">
                  <TrendingUp
                    size={64}
                    className="text-zinc-200 group-hover:text-amber-500 transition-colors mb-8"
                  />
                  <h3 className="text-lg font-black text-zinc-900 uppercase tracking-widest mb-4">
                    Insufficient Data Stream
                  </h3>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] text-center max-w-md px-10 leading-loose">
                    Clinical trends require a minimum of two analyzed sessions.
                    Please record and process more sessions to enable time-series
                    visualization.
                  </p>
                </div>
              ) : (
                <div className="space-y-20">
                  {/* METRIC CONTROLS */}
                  <div className="flex flex-wrap gap-3">
                    {[
                      { key: "all", label: "Global Overview", color: "#000" },
                      {
                        key: "severity",
                        label: "Severity Scale",
                        color: CHART_COLORS.severity,
                      },
                      {
                        key: "social_affect",
                        label: "Social Affect",
                        color: CHART_COLORS.social_affect,
                      },
                      {
                        key: "rrb",
                        label: "Repetitive Behavior",
                        color: CHART_COLORS.rrb,
                      },
                    ].map((m) => (
                      <button
                        key={m.key}
                        onClick={() => setActiveMetric(m.key as any)}
                        className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest border-2 border-zinc-900 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                          activeMetric === m.key
                            ? "bg-zinc-900 text-white translate-x-[1px] translate-y-[1px] shadow-none"
                            : "bg-white text-zinc-900 hover:bg-zinc-50"
                        }`}
                      >
                        <span
                          className="inline-block w-1.5 h-1.5 mr-2"
                          style={{ backgroundColor: m.color }}
                        ></span>
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {/* MASTER TREND CHART */}
                  <div className="bg-white border-2 border-zinc-900 p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.05)] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-50 -mr-16 -mt-16 rotate-45 group-hover:bg-amber-50 transition-colors"></div>
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-[10px] font-black text-zinc-900 uppercase tracking-[0.4em] flex items-center gap-3">
                        <Activity size={14} className="text-amber-500" /> Longitudinal
                        Trajectory
                      </h2>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 bg-zinc-900"></div>
                          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">
                            Confidence Bounds
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={chartData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                        >
                          <CartesianGrid
                            strokeDasharray="4 4"
                            stroke="#f4f4f5"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="date"
                            tick={{
                              fontSize: 10,
                              fontWeight: 900,
                              fill: "#18181b",
                            }}
                            axisLine={false}
                            tickLine={false}
                            dy={20}
                          />
                          <YAxis
                            tick={{
                              fontSize: 10,
                              fontWeight: 900,
                              fill: "#18181b",
                            }}
                            axisLine={false}
                            tickLine={false}
                            dx={-20}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: "0",
                              border: "4px solid #18181b",
                              boxShadow: "8px 8px 0px 0px rgba(0,0,0,1)",
                              padding: "20px",
                              backgroundColor: "#fff",
                            }}
                            labelStyle={{
                              fontSize: "10px",
                              fontWeight: "900",
                              color: "#f59e0b",
                              marginBottom: "10px",
                              textTransform: "uppercase",
                              letterSpacing: "0.2em",
                            }}
                            itemStyle={{
                              fontSize: "10px",
                              fontWeight: "900",
                              textTransform: "uppercase",
                              padding: "4px 0",
                            }}
                          />
                          {(activeMetric === "all" ||
                            activeMetric === "severity") && (
                            <Line
                              type="monotone"
                              dataKey="severity"
                              name="SEVERITY"
                              stroke={CHART_COLORS.severity}
                              strokeWidth={6}
                              dot={{
                                r: 6,
                                fill: "#fff",
                                stroke: CHART_COLORS.severity,
                                strokeWidth: 4,
                              }}
                              activeDot={{ r: 10, strokeWidth: 0 }}
                            />
                          )}
                          {(activeMetric === "all" ||
                            activeMetric === "social_affect") && (
                            <Line
                              type="monotone"
                              dataKey="social_affect"
                              name="SOCIAL AFFECT"
                              stroke={CHART_COLORS.social_affect}
                              strokeWidth={4}
                              dot={{
                                r: 4,
                                fill: "#fff",
                                stroke: CHART_COLORS.social_affect,
                                strokeWidth: 3,
                              }}
                            />
                          )}
                          {(activeMetric === "all" || activeMetric === "rrb") && (
                            <Line
                              type="monotone"
                              dataKey="rrb"
                              name="RRB SCORE"
                              stroke={CHART_COLORS.rrb}
                              strokeWidth={3}
                              strokeDasharray="10 10"
                              dot={{
                                r: 4,
                                fill: "#fff",
                                stroke: CHART_COLORS.rrb,
                                strokeWidth: 2,
                              }}
                            />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* HISTORICAL CHRONO LOG */}
                  <div className="space-y-8">
                    <h2 className="text-[10px] font-black text-zinc-900 uppercase tracking-[0.4em] flex items-center gap-3">
                      <Clock size={14} className="text-zinc-400" /> Chronological Records
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {trendData.map((point: LongitudinalDataPoint) => (
                        <RecordCard
                          key={point.sessionId}
                          point={point}
                          onClick={() => handleViewSession(point.sessionId)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50">
            <div className="w-32 h-32 bg-white border-8 border-zinc-900 rotate-6 flex items-center justify-center shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] hover:rotate-0 transition-transform cursor-pointer group">
              <TrendingUp className="w-12 h-12 text-zinc-900 group-hover:text-amber-500 transition-colors" />
            </div>
            <h2 className="mt-16 text-xl font-black text-zinc-900 uppercase tracking-[0.4em]">
              Select Progress Path
            </h2>
            <p className="mt-6 text-[11px] text-zinc-400 font-black uppercase tracking-widest">
              Scan the clinical registry to load historical trajectory
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const RecordCard = ({ point, onClick }: any) => (
  <div
    onClick={onClick}
    className="bg-white border-2 border-zinc-900 p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer group"
  >
    <div className="flex justify-between items-start mb-5">
      <div className="bg-zinc-900 text-white px-2 py-0.5 text-[7px] font-black uppercase tracking-widest">
        {new Date(point.date).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </div>
      <Eye size={12} className="text-zinc-300 group-hover:text-zinc-900" />
    </div>

    <h3 className="text-[10px] font-black text-zinc-900 uppercase tracking-tighter mb-4 underline decoration-zinc-100 group-hover:decoration-amber-400 decoration-2 underline-offset-4 transition-all">
      {point.actionType || "Analytical Session"}
    </h3>

    <div className="grid grid-cols-2 gap-3">
      <div className="p-2.5 bg-zinc-50 border border-zinc-100">
        <p className="text-[6px] font-black text-zinc-400 uppercase mb-0.5">
          Severity
        </p>
        <p className="text-base font-black text-zinc-900">{point.severity}</p>
      </div>
      <div className="p-2.5 bg-zinc-50 border border-zinc-100">
        <p className="text-[6px] font-black text-zinc-400 uppercase mb-0.5">
          Social
        </p>
        <p className="text-base font-black text-zinc-900">
          {point.social_affect?.toFixed(1)}
        </p>
      </div>
    </div>

    <div className="mt-6 flex items-center justify-between">
      <span
        className={`text-[7px] font-black uppercase tracking-widest ${point.status === "published" ? "text-emerald-500" : "text-amber-500"}`}
      >
        ● {point.status}
      </span>
      <ArrowRight size={12} className="text-zinc-900" />
    </div>
  </div>
);
