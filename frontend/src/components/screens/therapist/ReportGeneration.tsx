import React, { useState, useMemo, useEffect } from "react";
import {
  Settings,
  FileText,
  Download,
  Eye,
  Printer,
  Check,
  ChevronDown,
  Lock,
  BarChart2,
  Loader2,
} from "lucide-react";
import { useGenerateReport, useVideoSessions } from "../../../api/clinical";
import { usePatients, usePatient } from "../../../api/patient";
import toast from "../../../lib/toast";
import { Patient } from "../../../types";

export default function ReportGeneration() {
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [reportType, setReportType] = useState("individual");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [config, setConfig] = useState({
    charts: true,
    tables: false,
    notes: true,
    watermark: true,
    password: "",
  });

  const { data: patientsData } = usePatients({ limit: 100 });
  const { data: patientDetail } = usePatient(selectedPatientId);
  const { data: sessionsData } = useVideoSessions(
    selectedPatientId || undefined,
  );
  const generateReport = useGenerateReport();
  const isSessionReport = reportType === "session";
  const reportTypeLabel =
    reportType === "session"
      ? "Single Session"
      : reportType === "progress"
        ? "Progress Report"
        : reportType === "consolidated"
          ? "Consolidated Analysis"
          : "Individual Summary";

  const selectedPatient =
    patientDetail ||
    patientsData?.patients.find((p) => p.id === selectedPatientId);

  const sessionStats = useMemo(() => {
    if (!sessionsData?.sessions) return { total: 0, analyzed: 0, pending: 0 };
    const sessions = sessionsData.sessions;
    return {
      total: sessions.length,
      analyzed: sessions.filter(
        (s: any) => s.status === "analyzed" || s.status === "completed",
      ).length,
      pending: sessions.filter((s: any) => s.status === "pending_review")
        .length,
    };
  }, [sessionsData]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const patientId = params.get("patientId");
    const sessionId = params.get("sessionId");
    const incomingReportType = params.get("reportType");

    if (patientId) setSelectedPatientId(patientId);
    if (sessionId) setSelectedSessionId(sessionId);
    if (incomingReportType === "session") setReportType("session");
  }, []);

  useEffect(() => {
    if (!isSessionReport) return;
    const sessions = sessionsData?.sessions || [];
    if (!sessions.length) {
      setSelectedSessionId("");
      return;
    }
    const hasCurrentSelection = sessions.some(
      (s: any) => (s.id || s._id) === selectedSessionId,
    );
    if (!selectedSessionId || !hasCurrentSelection) {
      const firstSessionId =
        (sessions[0] as any)?.id || (sessions[0] as any)?._id || "";
      setSelectedSessionId(firstSessionId);
    }
  }, [isSessionReport, sessionsData, selectedSessionId]);

  useEffect(() => {
    if (reportType === "session") {
      setConfig((prev) => ({ ...prev, charts: true, tables: false, notes: true }));
      return;
    }
    if (reportType === "progress") {
      setConfig((prev) => ({ ...prev, charts: true, tables: false, notes: false }));
      return;
    }
    if (reportType === "consolidated") {
      setConfig((prev) => ({ ...prev, charts: true, tables: true, notes: true }));
      return;
    }
    setConfig((prev) => ({ ...prev, charts: true, tables: false, notes: true }));
  }, [reportType]);

  const buildPayload = () => {
    const payload: any = {
      patientId: selectedPatientId,
      includeCharts: config.charts,
      includeTables: isSessionReport ? false : config.tables,
      includeNotes: config.notes,
      watermark: config.watermark,
      password: config.password || undefined,
      includeGoals: isSessionReport ? false : true,
      reportType: isSessionReport ? "session" : reportType,
    };
    if (isSessionReport) {
      payload.sessionId = selectedSessionId;
    }
    return payload;
  };

  const handleGenerate = async () => {
    if (!selectedPatientId) {
      toast.error("Please select a patient first");
      return;
    }
    if (isSessionReport && !selectedSessionId) {
      toast.error("Please select a session first");
      return;
    }

    const toastId = toast.loading("Generating PDF report...");

    try {
      const blob = await generateReport.mutateAsync(buildPayload());

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const patientName =
        selectedPatient?.fullName?.replace(/\s+/g, "_") || "Patient";
      const prefix = isSessionReport
        ? `session-report-${selectedSessionId}`
        : `Report_${patientName}`;
      link.setAttribute(
        "download",
        `${prefix}_${new Date().toISOString().split("T")[0]}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Report generated successfully!", { id: toastId });
    } catch (error) {
      console.error("PDF Generation failed", error);
      toast.error("Failed to generate report. Please try again.", {
        id: toastId,
      });
    }
  };

  const handlePreview = async () => {
    if (!selectedPatientId) {
      toast.error("Please select a patient first");
      return;
    }
    if (isSessionReport && !selectedSessionId) {
      toast.error("Please select a session first");
      return;
    }

    const toastId = toast.loading("Generating preview...");

    try {
      const blob = await generateReport.mutateAsync(buildPayload());

      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      toast.success("Preview opened in new tab", { id: toastId });
    } catch (error) {
      console.error("PDF Preview failed", error);
      toast.error("Failed to generate preview.", { id: toastId });
    }
  };

  const age = selectedPatient?.dob
    ? Math.floor(
        (Date.now() - new Date(selectedPatient.dob).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000),
      )
    : null;

  return (
    <div className="flex h-full bg-zinc-100 overflow-hidden font-mono text-zinc-900">
      {/* Left Panel: Configuration */}
      <div className="w-full md:w-5/12 lg:w-4/12 bg-white border-r-2 border-zinc-200 flex flex-col h-full z-10">
        <div className="p-6 border-b-2 border-zinc-200">
          <h1 className="text-xl font-black text-zinc-900 flex items-center gap-3 uppercase tracking-tighter">
            <Settings className="text-zinc-900" /> Report Generator
          </h1>
          <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mt-1">
            CONFIGURE & EXPORT CLINICAL DATA
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Section 0: Patient Selection */}
          <section>
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-5 h-5 bg-zinc-900 text-white flex items-center justify-center text-[10px]">
                1
              </span>{" "}
              Select Patient
            </h3>
            <div className="relative">
                <select
                  className="w-full p-3 bg-zinc-50 border-2 border-zinc-200 font-sans text-sm font-medium focus:ring-0 focus:border-zinc-900 appearance-none"
                  value={selectedPatientId}
                  onChange={(e) => {
                    setSelectedPatientId(e.target.value);
                    setSelectedSessionId("");
                  }}
                >
                <option value="">-- Choose a Patient --</option>
                {patientsData?.patients.map((p: Patient) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.mrn})
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                <ChevronDown size={16} />
              </div>
            </div>
          </section>

          {/* Section 1 */}
          <section>
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-5 h-5 bg-zinc-900 text-white flex items-center justify-center text-[10px]">
                2
              </span>{" "}
              Report Type
            </h3>
            <div className="space-y-3">
              <ReportOption
                label="Individual Summary"
                active={reportType === "individual"}
                onClick={() => setReportType("individual")}
              />
              <ReportOption
                label="Progress Report (Quarterly)"
                active={reportType === "progress"}
                onClick={() => setReportType("progress")}
              />
              <ReportOption
                label="Consolidated Analysis"
                active={reportType === "consolidated"}
                onClick={() => setReportType("consolidated")}
              />
              <ReportOption
                label="Single Session"
                active={reportType === "session"}
                onClick={() => setReportType("session")}
              />
            </div>
            <div className="mt-3 bg-zinc-50 border border-zinc-200 p-3 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
              Active mode: {reportTypeLabel}
            </div>
          </section>

          {isSessionReport && (
            <section>
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-5 h-5 bg-zinc-900 text-white flex items-center justify-center text-[10px]">
                  3
                </span>{" "}
                Select Session
              </h3>
              <div className="relative">
                <select
                  className="w-full p-3 bg-zinc-50 border-2 border-zinc-200 font-sans text-sm font-medium focus:ring-0 focus:border-zinc-900 appearance-none"
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  disabled={!selectedPatientId}
                >
                  <option value="">-- Choose a Session --</option>
                  {(sessionsData?.sessions || []).map((s: any) => (
                    <option key={s.id || s._id} value={s.id || s._id}>
                      {new Date(s.recordedAt).toLocaleDateString()} -{" "}
                      {s.actionType || "Session"} - {s.status || "N/A"}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                  <ChevronDown size={16} />
                </div>
              </div>
            </section>
          )}

          {/* Section 2 */}
          <section>
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-5 h-5 bg-zinc-900 text-white flex items-center justify-center text-[10px]">
                {isSessionReport ? 4 : 3}
              </span>{" "}
              Content
            </h3>
            <div className="bg-zinc-50 p-4 space-y-3 border-2 border-zinc-100">
              <Checkbox label="Demographics & History" checked={true} />
              <Checkbox
                label="Therapy Goals Status"
                checked={reportType === "consolidated" || reportType === "individual"}
              />
              <Checkbox
                label="AI Analysis Visualizations"
                checked={config.charts}
                onChange={() =>
                  setConfig({ ...config, charts: !config.charts })
                }
              />
              <Checkbox
                label="Raw Data Tables"
                checked={config.tables}
                onChange={
                  reportType === "session" || reportType === "progress"
                    ? undefined
                    : () => setConfig({ ...config, tables: !config.tables })
                }
              />
              <Checkbox
                label="Therapist Notes"
                checked={config.notes}
                onChange={() => setConfig({ ...config, notes: !config.notes })}
              />
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-5 h-5 bg-zinc-900 text-white flex items-center justify-center text-[10px]">
                {isSessionReport ? 5 : 4}
              </span>{" "}
              Security
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border-2 border-zinc-200">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-zinc-700">
                  <Lock size={14} className="text-zinc-400" /> Password
                  Protection
                </div>
                <input
                  type="password"
                  placeholder="Optional"
                  className="w-24 bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs focus:outline-none focus:border-zinc-900"
                  value={config.password}
                  onChange={(e) =>
                    setConfig({ ...config, password: e.target.value })
                  }
                />
              </div>
              <Checkbox
                label="Watermark 'NEUROCARE'"
                checked={config.watermark}
                onChange={() =>
                  setConfig({ ...config, watermark: !config.watermark })
                }
              />
            </div>
          </section>
        </div>

        <div className="p-6 border-t-2 border-zinc-200 bg-zinc-50 space-y-3">
          <button
            onClick={handlePreview}
            disabled={
              !selectedPatientId ||
              generateReport.isPending ||
              (isSessionReport && !selectedSessionId)
            }
            className={`w-full py-3 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all border-2 ${!selectedPatientId || generateReport.isPending || (isSessionReport && !selectedSessionId) ? "border-zinc-300 text-zinc-400 cursor-not-allowed" : "border-zinc-900 text-zinc-900 hover:bg-zinc-100"}`}
          >
            {generateReport.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Eye size={16} />
            )}{" "}
            Preview in Browser
          </button>
          <button
            onClick={handleGenerate}
            disabled={
              !selectedPatientId ||
              generateReport.isPending ||
              (isSessionReport && !selectedSessionId)
            }
            className={`w-full py-3 text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${!selectedPatientId || generateReport.isPending || (isSessionReport && !selectedSessionId) ? "bg-zinc-400 cursor-not-allowed" : "bg-zinc-900 hover:bg-zinc-800"}`}
          >
            {generateReport.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}{" "}
            Download PDF Report
          </button>
        </div>
      </div>

      {/* Right Panel: Live Preview */}
      <div className="hidden md:flex flex-1 bg-zinc-100 items-center justify-center p-8 overflow-hidden relative">
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={handlePreview}
            disabled={!selectedPatientId || (isSessionReport && !selectedSessionId)}
            className="p-2 border-2 border-zinc-300 bg-white text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 transition-all disabled:opacity-40"
          >
            <Printer size={20} />
          </button>
        </div>

        {/* Paper Document Simulation */}
        <div className="bg-white w-[600px] h-[800px] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] border border-zinc-200 p-12 flex flex-col relative overflow-hidden transform scale-90 lg:scale-100 transition-transform">
          {config.watermark && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 transform -rotate-45">
              <span className="text-8xl font-black text-zinc-900 uppercase">
                NEUROCARE
              </span>
            </div>
          )}

          {/* Report Header */}
          <div className="border-b-4 border-zinc-900 pb-6 mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-black text-zinc-900 mb-1 uppercase tracking-tighter">
                {reportTypeLabel}
              </h1>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">
                Autism Behavior Analysis & Therapy
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-black text-zinc-900 uppercase tracking-widest border-2 border-zinc-900 px-2 py-1 inline-block">
                NEUROCARE
              </div>
              <div className="text-[10px] text-zinc-400 mt-1 font-mono">
                GEN: {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>

          {!selectedPatientId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-300">
              <FileText size={64} className="mb-4" />
              <p className="text-sm font-bold uppercase tracking-widest">
                Select a patient to preview
              </p>
              <p className="text-xs text-zinc-400 mt-2">
                The report preview will appear here
              </p>
            </div>
          ) : (
            <>
              {/* Patient Info - Dynamic */}
              <div className="space-y-8 font-serif flex-1">
                <div className="flex gap-4 mb-8">
                  <div className="w-24 h-24 bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                    <span className="text-3xl font-black text-zinc-300">
                      {selectedPatient?.fullName?.charAt(0) || "?"}
                    </span>
                  </div>
                  <div>
                    <h2 className="font-bold text-xl text-zinc-900">
                      {selectedPatient?.fullName || "Loading..."}
                      {age !== null ? ` (${age}y)` : ""}
                    </h2>
                    <p className="text-sm text-zinc-500 font-mono mt-1">
                      MRN: {selectedPatient?.mrn || "---"}
                    </p>
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {selectedPatient?.asdSeverity && (
                        <span className="bg-zinc-900 text-white text-[10px] px-2 py-1 font-bold uppercase tracking-widest">
                          {selectedPatient.asdSeverity}
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-2 py-1 font-bold uppercase tracking-widest border ${selectedPatient?.status === "Active" ? "border-green-600 text-green-700" : "border-zinc-400 text-zinc-500"}`}
                      >
                        {selectedPatient?.status || "---"}
                      </span>
                    </div>
                    {selectedPatient?.dob && (
                      <p className="text-[10px] text-zinc-400 mt-2 font-mono">
                        DOB:{" "}
                        {new Date(selectedPatient.dob).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Session Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-zinc-50 border border-zinc-200 p-3 text-center">
                    <div className="text-2xl font-black text-zinc-900">
                      {sessionStats.total}
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                      Sessions
                    </div>
                  </div>
                  <div className="bg-zinc-50 border border-zinc-200 p-3 text-center">
                    <div className="text-2xl font-black text-green-700">
                      {sessionStats.analyzed}
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                      Analyzed
                    </div>
                  </div>
                  <div className="bg-zinc-50 border border-zinc-200 p-3 text-center">
                    <div className="text-2xl font-black text-amber-600">
                      {sessionStats.pending}
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                      Pending
                    </div>
                  </div>
                </div>

                {config.charts && (
                  <div className="h-32 bg-zinc-50 border-2 border-zinc-100 flex items-center justify-center text-zinc-300">
                    <BarChart2 size={36} />
                    <span className="ml-2 text-xs font-bold uppercase tracking-widest">
                      AI Analysis Charts
                    </span>
                  </div>
                )}

                {config.tables && (
                  <div className="border-2 border-zinc-900">
                    <div className="h-8 bg-zinc-900 text-white flex items-center px-3 text-[10px] font-bold uppercase tracking-widest">
                      Session Data Table
                    </div>
                    <div className="h-8 border-b border-zinc-100 flex items-center px-3 text-[10px] text-zinc-500">
                      {sessionStats.total > 0
                        ? `${sessionStats.total} session records included`
                        : "No session data"}
                    </div>
                  </div>
                )}

                {config.notes && (
                  <div className="p-4 bg-zinc-50 border-l-4 border-zinc-900 text-sm text-zinc-700 italic">
                    <span className="font-bold not-italic block mb-1 uppercase text-xs tracking-wider">
                      Therapist Notes
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Included from session records
                    </span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-auto border-t-2 border-zinc-100 pt-4 flex justify-between items-center text-[10px] text-zinc-400 font-mono uppercase">
                <span>Page 1</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const ReportOption = ({ label, active, onClick }: any) => (
  <div
    onClick={onClick}
    className={`p-4 border-2 cursor-pointer transition-all flex items-center justify-between group ${active ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 hover:border-zinc-900"}`}
  >
    <span
      className={`text-xs font-bold uppercase tracking-wider ${active ? "text-white" : "text-zinc-600 group-hover:text-zinc-900"}`}
    >
      {label}
    </span>
    {active && <Check size={16} className="text-white" />}
  </div>
);

const Checkbox = ({ label, checked, onChange }: any) => (
  <div
    className={`flex items-center gap-3 group ${onChange ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
    onClick={onChange}
  >
    <div
      className={`w-5 h-5 border-2 flex items-center justify-center transition-colors ${checked ? "bg-zinc-900 border-zinc-900" : "bg-white border-zinc-300 group-hover:border-zinc-500"}`}
    >
      {checked && <Check size={12} className="text-white" />}
    </div>
    <span className="text-xs font-bold uppercase tracking-wide text-zinc-600 group-hover:text-zinc-900 select-none">
      {label}
    </span>
  </div>
);
