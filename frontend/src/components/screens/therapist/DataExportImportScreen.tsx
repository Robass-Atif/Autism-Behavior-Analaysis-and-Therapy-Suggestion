import React, { useState, useCallback } from "react";
import {
  Download,
  Users,
  Video,
  Target,
  Check,
  Loader2,
  ChevronDown,
  Database,
  Shield,
} from "lucide-react";
import toast from "react-hot-toast";
import { usePatients } from "../../../api/patient";
import { useVideoSessions, useTherapyGoals } from "../../../api/clinical";

type ExportFormat = "csv" | "json";
type DataType = "patients" | "sessions" | "goals" | "all";
type DateRange = "all" | "30" | "90" | "365";

export default function DataExportImportScreen() {
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [dataType, setDataType] = useState<DataType>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [isExporting, setIsExporting] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");

  const { data: patientsData, isLoading: patientsLoading } = usePatients({ limit: 200 });
  const { data: sessionsData, isLoading: sessionsLoading } = useVideoSessions();
  const { data: goalsRaw, isLoading: goalsLoading } = useTherapyGoals();

  const patients = patientsData?.patients || [];
  const sessions = sessionsData?.sessions || [];
  const goals = goalsRaw?.goals || [];

  const isLoading = patientsLoading || sessionsLoading || goalsLoading;

  // Filtering helpers
  const isInDateRange = useCallback((dateStr?: string): boolean => {
    if (dateRange === "all" || !dateStr) return true;
    const days = parseInt(dateRange);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return new Date(dateStr).getTime() >= cutoff;
  }, [dateRange]);

  // Get filtered data
  const getFilteredPatients = useCallback(() => {
    let result = [...patients];
    if (selectedPatientId) result = result.filter((p: any) => p.id === selectedPatientId);
    return result;
  }, [patients, selectedPatientId]);

  const getFilteredSessions = useCallback(() => {
    let result = [...sessions];
    if (selectedPatientId) result = result.filter((s: any) => s.patientId === selectedPatientId);
    result = result.filter((s: any) => isInDateRange(s.recordedAt || s.createdAt));
    return result;
  }, [sessions, selectedPatientId, isInDateRange]);

  const getFilteredGoals = useCallback(() => {
    let result = [...goals];
    if (selectedPatientId) result = result.filter((g: any) => g.patientId === selectedPatientId);
    return result;
  }, [goals, selectedPatientId]);

  const filteredPatients = getFilteredPatients();
  const filteredSessions = getFilteredSessions();
  const filteredGoals = getFilteredGoals();

  const stats = {
    patients: filteredPatients.length,
    sessions: filteredSessions.length,
    goals: filteredGoals.length,
  };

  const totalRecords =
    (dataType === "all" || dataType === "patients" ? stats.patients : 0) +
    (dataType === "all" || dataType === "sessions" ? stats.sessions : 0) +
    (dataType === "all" || dataType === "goals" ? stats.goals : 0);

  // CSV builder
  const escapeCSV = (val: any): string => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const toCSV = (headers: string[], rows: any[][]): string => {
    const lines = [headers.map(escapeCSV).join(",")];
    for (const row of rows) {
      lines.push(row.map(escapeCSV).join(","));
    }
    return lines.join("\r\n");
  };

  const buildAllCSV = (): string => {
    const sections: string[] = [];

    if (dataType === "patients" || dataType === "all") {
      const headers = ["MRN", "Full Name", "DOB", "Gender", "Status", "ASD Severity", "Diagnosis Date", "Email", "Phone"];
      const rows = filteredPatients.map((p: any) => [
        p.mrn || "", p.fullName || "", p.dob || "", p.gender || "", p.status || "Active",
        p.asdSeverity || "", p.diagnosisDate || "", p.email || "", p.phone || "",
      ]);
      sections.push("=== PATIENTS ===");
      sections.push(toCSV(headers, rows));
    }

    if (dataType === "sessions" || dataType === "all") {
      const headers = ["Patient", "Action Type", "Status", "Recorded At", "Duration (s)", "Quality", "Uploaded By", "Caregiver", "AI Confidence"];
      const rows = filteredSessions.map((s: any) => [
        s.patientName || "", s.actionType || "", s.status || "",
        s.recordedAt ? new Date(s.recordedAt).toLocaleString() : "",
        s.duration ?? "", s.qualityScore || "", s.uploadedBy || "",
        s.caregiverName || "", s.aiConfidence ?? "",
      ]);
      sections.push("");
      sections.push("=== VIDEO SESSIONS ===");
      sections.push(toCSV(headers, rows));
    }

    if (dataType === "goals" || dataType === "all") {
      const headers = ["Title", "Category", "Status", "Progress %", "Priority", "Start Date", "Target Date"];
      const rows = filteredGoals.map((g: any) => [
        g.title || "", g.category || "", g.status || "", g.progress ?? "",
        g.priority || "", g.startDate || "", g.targetDate || "",
      ]);
      sections.push("");
      sections.push("=== THERAPY GOALS ===");
      sections.push(toCSV(headers, rows));
    }

    return sections.join("\r\n");
  };

  const buildJSON = () => {
    const data: any = {
      exportedAt: new Date().toISOString(),
      filters: {
        dataType,
        dateRange: dateRange === "all" ? "all" : `last_${dateRange}_days`,
        patient: selectedPatientId || "all",
      },
    };

    if (dataType === "patients" || dataType === "all") {
      data.patients = filteredPatients.map((p: any) => ({
        mrn: p.mrn, fullName: p.fullName, dob: p.dob, gender: p.gender,
        status: p.status, asdSeverity: p.asdSeverity, diagnosisDate: p.diagnosisDate,
        email: p.email, phone: p.phone,
      }));
    }

    if (dataType === "sessions" || dataType === "all") {
      data.sessions = filteredSessions.map((s: any) => ({
        patientName: s.patientName, patientId: s.patientId, actionType: s.actionType,
        status: s.status, recordedAt: s.recordedAt, duration: s.duration,
        qualityScore: s.qualityScore, uploadedBy: s.uploadedBy,
        caregiverName: s.caregiverName, aiConfidence: s.aiConfidence,
      }));
    }

    if (dataType === "goals" || dataType === "all") {
      data.goals = filteredGoals.map((g: any) => ({
        title: g.title, category: g.category, status: g.status,
        progress: g.progress, priority: g.priority,
        startDate: g.startDate, targetDate: g.targetDate,
      }));
    }

    return JSON.stringify(data, null, 2);
  };

  const handleExport = () => {
    if (totalRecords === 0) {
      toast.error("No records to export");
      return;
    }

    setIsExporting(true);

    try {
      const timestamp = new Date().toISOString().split("T")[0];
      const label = dataType === "all" ? "clinical_data" : dataType;
      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === "csv") {
        content = buildAllCSV();
        filename = `${label}_export_${timestamp}.csv`;
        mimeType = "text/csv;charset=utf-8;";
      } else {
        content = buildJSON();
        filename = `${label}_export_${timestamp}.json`;
        mimeType = "application/json;charset=utf-8;";
      }

      // Create and trigger download
      const BOM = "\uFEFF"; // UTF-8 BOM for Excel compatibility
      const blob = new Blob([format === "csv" ? BOM + content : content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();

      // Cleanup after a short delay to ensure download starts
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 250);

      toast.success(`Exported ${totalRecords} records as ${format.toUpperCase()}`);
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-mono selection:bg-zinc-100 p-8 md:p-12 animate-in fade-in duration-500">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-12 border-b border-zinc-100 pb-8">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-400 mb-2">
            DATA MANAGEMENT
          </h3>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">
            Export Center
          </h1>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-2 underline decoration-zinc-100 underline-offset-4">
            DOWNLOAD CLINICAL RECORDS IN STRUCTURED FORMAT
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Configuration */}
          <div className="lg:col-span-2 space-y-8">
            {/* Step 1: Data Type */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-4 flex items-center gap-2">
                <span className="w-5 h-5 bg-zinc-900 text-white flex items-center justify-center text-[10px]">1</span>
                SELECT DATA
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {([
                  { key: "all", label: "All Data", icon: Database, count: stats.patients + stats.sessions + stats.goals },
                  { key: "patients", label: "Patients", icon: Users, count: stats.patients },
                  { key: "sessions", label: "Sessions", icon: Video, count: stats.sessions },
                  { key: "goals", label: "Goals", icon: Target, count: stats.goals },
                ] as const).map(({ key, label, icon: Icon, count }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDataType(key)}
                    className={`p-4 border-2 text-left transition-all cursor-pointer ${
                      dataType === key
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 hover:border-zinc-400"
                    }`}
                  >
                    <Icon size={18} className={dataType === key ? "text-white mb-2" : "text-zinc-400 mb-2"} />
                    <div className="text-[10px] font-black uppercase tracking-widest">{label}</div>
                    <div className={`text-2xl font-black mt-1 ${dataType === key ? "text-white" : "text-zinc-900"}`}>
                      {isLoading ? "..." : count}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Step 2: Filters */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-4 flex items-center gap-2">
                <span className="w-5 h-5 bg-zinc-900 text-white flex items-center justify-center text-[10px]">2</span>
                FILTERS
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">
                    Patient
                  </label>
                  <div className="relative">
                    <select
                      value={selectedPatientId}
                      onChange={(e) => setSelectedPatientId(e.target.value)}
                      className="w-full p-3 bg-zinc-50 border-2 border-zinc-200 font-mono text-sm font-bold focus:ring-0 focus:border-zinc-900 appearance-none"
                    >
                      <option value="">All Patients</option>
                      {patients.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName} ({p.mrn})
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">
                    Date Range
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {([
                      { key: "all", label: "All" },
                      { key: "30", label: "30D" },
                      { key: "90", label: "90D" },
                      { key: "365", label: "1Y" },
                    ] as const).map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setDateRange(key)}
                        className={`py-2 border-2 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                          dateRange === key
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 hover:border-zinc-400"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Step 3: Format */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-4 flex items-center gap-2">
                <span className="w-5 h-5 bg-zinc-900 text-white flex items-center justify-center text-[10px]">3</span>
                FORMAT
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {([
                  { key: "csv", label: "CSV", desc: "Spreadsheet-compatible" },
                  { key: "json", label: "JSON", desc: "Developer-friendly" },
                ] as const).map(({ key, label, desc }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormat(key)}
                    className={`p-4 border-2 text-left transition-all flex items-center justify-between cursor-pointer ${
                      format === key
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 hover:border-zinc-400"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-black uppercase tracking-widest">{label}</div>
                      <div className={`text-[10px] mt-1 ${format === key ? "text-zinc-300" : "text-zinc-400"}`}>
                        {desc}
                      </div>
                    </div>
                    {format === key && <Check size={18} />}
                  </button>
                ))}
              </div>
            </section>

            {/* Export Button */}
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || isLoading}
              className={`w-full py-4 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all cursor-pointer ${
                isExporting || isLoading
                  ? "bg-zinc-300 text-zinc-500 cursor-not-allowed"
                  : "bg-zinc-900 text-white hover:bg-zinc-800 active:bg-zinc-700"
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Loading Data...
                </>
              ) : isExporting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Exporting...
                </>
              ) : totalRecords === 0 ? (
                <>
                  <Download size={16} /> No Records Found
                </>
              ) : (
                <>
                  <Download size={16} /> Export {totalRecords} Records as {format.toUpperCase()}
                </>
              )}
            </button>
          </div>

          {/* Right: Preview Summary */}
          <div className="space-y-6">
            <div className="border-2 border-zinc-200 p-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-6">
                EXPORT PREVIEW
              </h3>

              <div className="space-y-4">
                {(dataType === "all" || dataType === "patients") && (
                  <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-100">
                    <div className="flex items-center gap-3">
                      <Users size={14} className="text-zinc-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Patients</span>
                    </div>
                    <span className="text-sm font-black">{isLoading ? "..." : stats.patients}</span>
                  </div>
                )}
                {(dataType === "all" || dataType === "sessions") && (
                  <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-100">
                    <div className="flex items-center gap-3">
                      <Video size={14} className="text-zinc-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Sessions</span>
                    </div>
                    <span className="text-sm font-black">{isLoading ? "..." : stats.sessions}</span>
                  </div>
                )}
                {(dataType === "all" || dataType === "goals") && (
                  <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-100">
                    <div className="flex items-center gap-3">
                      <Target size={14} className="text-zinc-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Goals</span>
                    </div>
                    <span className="text-sm font-black">{isLoading ? "..." : stats.goals}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-100">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Records</span>
                  <span className="text-xl font-black">{isLoading ? "..." : totalRecords}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-100 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  <span>Format</span>
                  <span className="text-zinc-900">{format.toUpperCase()}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  <span>Range</span>
                  <span className="text-zinc-900">
                    {dateRange === "all" ? "All Time" : `Last ${dateRange} Days`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  <span>Patient</span>
                  <span className="text-zinc-900 truncate ml-4 max-w-[120px]">
                    {selectedPatientId
                      ? patients.find((p: any) => p.id === selectedPatientId)?.fullName || "Selected"
                      : "All"}
                  </span>
                </div>
              </div>
            </div>

            <div className="border border-zinc-100 p-4 flex items-start gap-3">
              <Shield size={14} className="text-zinc-400 mt-0.5" />
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-900 mb-1">
                  Live Data
                </div>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider leading-relaxed">
                  Exports pull real-time data from your clinical records. Single file download per export.
                </p>
              </div>
            </div>

            {/* Data table preview */}
            {!isLoading && filteredSessions.length > 0 && (dataType === "all" || dataType === "sessions") && (
              <div className="border border-zinc-100 p-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-3">
                  SESSION PREVIEW
                </h4>
                <div className="space-y-2">
                  {filteredSessions.slice(0, 5).map((s: any, i: number) => (
                    <div key={s.id || i} className="flex items-center justify-between text-[10px] py-1.5 border-b border-zinc-50 last:border-0">
                      <div className="font-bold text-zinc-700 truncate max-w-[120px]">
                        {s.patientName || "Unknown"}
                      </div>
                      <div className="flex items-center gap-2">
                        {s.caregiverName && (
                          <span className="text-zinc-400 truncate max-w-[60px]">{s.caregiverName}</span>
                        )}
                        <span
                          className={`px-1.5 py-0.5 font-black uppercase tracking-wider ${
                            s.status === "completed" || s.status === "published"
                              ? "bg-green-50 text-green-700"
                              : s.status === "processing"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {(s.status || "").replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isLoading && filteredPatients.length > 0 && (dataType === "all" || dataType === "patients") && (
              <div className="border border-zinc-100 p-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-3">
                  PATIENT PREVIEW
                </h4>
                <div className="space-y-2">
                  {filteredPatients.slice(0, 5).map((p: any, i: number) => (
                    <div key={p.id || i} className="flex items-center justify-between text-[10px] py-1.5 border-b border-zinc-50 last:border-0">
                      <div className="font-bold text-zinc-700 truncate max-w-[120px]">
                        {p.fullName}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400">{p.mrn}</span>
                        <span className={`px-1.5 py-0.5 font-black uppercase tracking-wider ${
                          (p.status || "Active") === "Active" ? "bg-green-50 text-green-700" : "bg-zinc-100 text-zinc-600"
                        }`}>
                          {p.status || "Active"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-24 pt-8 border-t border-zinc-100 flex justify-between">
          <div className="text-[8px] font-black text-zinc-300 uppercase tracking-[0.5em]">
            EXPORT ENGINE v1.0 | CLIENT-SIDE
          </div>
          <div className="text-[8px] font-black text-zinc-300 uppercase tracking-[0.5em]">
            {new Date().toLocaleDateString()}
          </div>
        </footer>
      </div>
    </div>
  );
}
