import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Users,
  Calendar,
  ChevronRight,
  Share2,
  Check,
  Loader2,
  ArrowRight,
  Download,
  AlertCircle,
  Clock,
  Activity,
  Brain,
  Target,
  ShieldAlert,
  Edit3,
  Save,
  Video,
  X,
  BookOpen,
  BarChart3,
  Layers,
  TrendingUp,
} from "lucide-react";
import { usePatients, usePatient } from "../../../api/patient";
import {
  usePublishPatientClinicalReport,
  useResendPatientClinicalReport,
  useGenerateReport,
  useUpdatePatientClinicalReport,
  useVideoSessions,
} from "../../../api/clinical";
import toast from "../../../lib/toast";
import { Patient, AggregatedClinicalReport, VideoSession } from "../../../types";
import { Dsm5Badge } from "./TherapyRecommendations";

// ─── Inline Markdown to JSX Renderer ────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Empty line
    if (!line.trim()) { i++; continue; }

    // H3 heading: ### or ####
    const h3Match = line.match(/^#{2,4}\s+(.+)/);
    if (h3Match) {
      elements.push(
        <h3 key={i} className="text-base font-bold text-zinc-900 tracking-tight mt-6 mb-2 flex items-center gap-2">
          <span className="w-1 h-5 bg-amber-400 rounded-full shrink-0 inline-block"></span>
          {renderInline(h3Match[1])}
        </h3>
      );
      i++;
      continue;
    }

    // H2 heading: ##
    const h2Match = line.match(/^#{1,2}\s+(.+)/);
    if (h2Match) {
      elements.push(
        <h2 key={i} className="text-lg font-bold text-zinc-900 tracking-tight mt-8 mb-3 border-b border-zinc-200 pb-2">
          {renderInline(h2Match[1])}
        </h2>
      );
      i++;
      continue;
    }

    // Bullet list item: * or -
    if (line.match(/^\s*[\*\-]\s+/)) {
      const bulletItems: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^\s*[\*\-]\s+/)) {
        bulletItems.push(
          <li key={i} className="flex gap-2.5 text-sm text-zinc-700 leading-relaxed">
            <span className="mt-1.5 w-2 h-2 bg-zinc-900 shrink-0 inline-block"></span>
            <span>{renderInline(lines[i].replace(/^\s*[\*\-]\s+/, ""))}</span>
          </li>
        );
        i++;
      }
      elements.push(<ul key={`ul-${i}`} className="space-y-2 mb-3">{bulletItems}</ul>);
      continue;
    }

    // Numbered list: 1. 2. etc
    if (line.match(/^\s*\d+\.\s+/)) {
      const listItems: React.ReactNode[] = [];
      let counter = 0;
      while (i < lines.length && lines[i].match(/^\s*\d+\.\s+/)) {
        counter++;
        listItems.push(
          <li key={i} className="flex gap-3 text-sm text-zinc-700 leading-relaxed">
            <span className="font-bold text-amber-600 shrink-0 w-5 text-right">{counter}.</span>
            <span>{renderInline(lines[i].replace(/^\s*\d+\.\s+/, ""))}</span>
          </li>
        );
        i++;
      }
      elements.push(<ol key={`ol-${i}`} className="space-y-2 mb-3">{listItems}</ol>);
      continue;
    }

    // Normal paragraph
    elements.push(
      <p key={i} className="text-sm text-zinc-700 leading-relaxed mb-3">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  // Split on **bold** markers
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-semibold text-zinc-900">{part.slice(2, -2)}</strong>;
        }
        // Remove any leftover [ ] citation brackets for cleaner reading
        const cleaned = part.replace(/\[([^\]]+)\]/g, "[$1]");
        return <span key={i}>{cleaned}</span>;
      })}
    </>
  );
}

// ─── Severity color helper ───────────────────────────────────────────────────
function severityColor(level?: number) {
  if (level === 0) return { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300" };
  if (level === 1) return { bg: "bg-red-100", text: "text-red-800", border: "border-red-300" };
  return { bg: "bg-zinc-100", text: "text-zinc-700", border: "border-zinc-300" };
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function OutcomeReports() {
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ai" | "therapy">("therapy");
  const [isEditing, setIsEditing] = useState(false);
  const [editedNarrative, setEditedNarrative] = useState("");
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const { data: patientsData, isLoading: isLoadingPatients } = usePatients({ limit: 100, search: searchQuery });
  const { data: patientDetail, isLoading: isLoadingDetail } = usePatient(selectedPatientId);
  const { data: sessionsData, isLoading: isLoadingSessions } = useVideoSessions(selectedPatientId);
  const publishReport = usePublishPatientClinicalReport();
  const resendReport = useResendPatientClinicalReport();
  const generateReport = useGenerateReport();
  const updateReport = useUpdatePatientClinicalReport();

  const patients = patientsData?.patients || [];
  const selectedPatient = patientDetail || patients.find((p) => p.id === selectedPatientId);
  const clinicalReport = selectedPatient?.latestClinicalReport as AggregatedClinicalReport | undefined;
  const sessions = sessionsData?.sessions || [];
  const analyzedSessions = sessions.filter(
    (s) => s.status === "completed" || s.status === "therapist_review" || s.status === "published"
  );

  useEffect(() => {
    if (clinicalReport?.clinical_report) {
      setEditedNarrative(clinicalReport.clinical_report);
    }
  }, [clinicalReport]);

  const handleSaveEdits = async () => {
    if (!selectedPatientId || !clinicalReport) return;
    const toastId = toast.loading("Saving changes...");
    try {
      await updateReport.mutateAsync({
        patientId: selectedPatientId,
        clinicalReport: { ...clinicalReport, clinical_report: editedNarrative },
      });
      setIsEditing(false);
      toast.success("Report updated successfully!", { id: toastId });
    } catch (error) {
      toast.error("Failed to save changes", { id: toastId });
    }
  };

  const handlePublish = async () => {
    if (!selectedPatientId) return;
    const toastId = toast.loading("Publishing report and sending email to caregiver...");
    try {
      await publishReport.mutateAsync(selectedPatientId);
      toast.success("Report published! Caregiver has been notified via email.", { id: toastId });
    } catch (error) {
      toast.error("Failed to publish report", { id: toastId });
    }
  };

  const handleResend = async () => {
    if (!selectedPatientId) return;
    const toastId = toast.loading("Resending report to caregiver...");
    try {
      await resendReport.mutateAsync(selectedPatientId);
      toast.success("Report resent to caregiver!", { id: toastId });
    } catch (error) {
      toast.error("Failed to resend report", { id: toastId });
    }
  };

  const handleDownloadPDF = async (type: "aggregated_outcome" | "clinical_summary" | "therapy_plan" = "aggregated_outcome") => {
    if (!selectedPatientId) return;
    setIsExportMenuOpen(false);
    const toastId = toast.loading("Generating PDF report...");
    try {
      const blob = await generateReport.mutateAsync({
        patientId: selectedPatientId,
        reportType: type,
        includeCharts: type === "aggregated_outcome",
        includeNotes: true,
        watermark: true,
        includeTables: type === "aggregated_outcome",
        includeGoals: type === "aggregated_outcome",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const name = (selectedPatient?.fullName || "Patient").replace(/\s+/g, "_");
      link.setAttribute("download", `Outcome_Report_${name}_${new Date().toISOString().split("T")[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("PDF generated successfully!", { id: toastId });
    } catch (error) {
      toast.error("Failed to generate PDF", { id: toastId });
    }
  };

  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden">
      {/* ── Sidebar: Patient List ─────────────────────────────────────────── */}
      <div className="w-72 border-r border-zinc-200 flex flex-col h-full bg-zinc-50 shrink-0">
        <div className="p-5 border-b border-zinc-200 bg-white">
          <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <Users size={18} className="text-zinc-500" /> Outcome Reports
          </h2>
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            <input
              type="text"
              placeholder="Search patients..."
              className="w-full pl-9 pr-3 py-2 bg-zinc-100 border border-zinc-200 rounded-lg text-xs text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {isLoadingPatients ? (
            <div className="flex items-center justify-center h-20">
              <Loader2 className="animate-spin text-zinc-400" size={22} />
            </div>
          ) : patients.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs text-zinc-400">No patients found</p>
            </div>
          ) : (
            patients.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPatientId(p.id)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-all flex justify-between items-center gap-2 ${
                  selectedPatientId === p.id
                    ? "bg-zinc-900 border-zinc-900 text-white"
                    : "bg-white border-zinc-200 text-zinc-800 hover:border-zinc-400 hover:shadow-sm"
                }`}
              >
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold truncate">{p.fullName}</h3>
                  <p className={`text-[10px] mt-0.5 truncate ${selectedPatientId === p.id ? "text-zinc-400" : "text-zinc-400"}`}>
                    MRN: {p.mrn}
                  </p>
                </div>
                {p.latestClinicalReport ? (
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${selectedPatientId === p.id ? "bg-emerald-500" : "bg-emerald-100"}`}>
                    <Check size={10} className={selectedPatientId === p.id ? "text-white" : "text-emerald-600"} />
                  </span>
                ) : (
                  <ChevronRight size={14} className={selectedPatientId === p.id ? "text-zinc-500" : "text-zinc-300"} />
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-white">
        {!selectedPatientId ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-300 p-12">
            <FileText size={56} className="mb-4" />
            <h2 className="text-lg font-semibold text-zinc-400">Select a patient</h2>
            <p className="text-sm text-zinc-300 mt-1">to view clinical outcome reports</p>
          </div>
        ) : isLoadingDetail ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="animate-spin text-zinc-400" size={40} />
          </div>
        ) : !clinicalReport ? (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center">
            <AlertCircle size={48} className="text-zinc-300 mb-4" />
            <h2 className="text-lg font-semibold text-zinc-600 mb-2">No report generated yet</h2>
            <p className="text-sm text-zinc-400 max-w-md mb-6">
              This patient doesn't have an aggregated therapy recommendation report yet. Visit the Therapy Planner to analyze sessions and generate a report.
            </p>
            <button
              onClick={() => window.location.href = "/therapy-planner"}
              className="bg-zinc-900 text-white px-6 py-3 text-sm font-semibold rounded-lg flex items-center gap-2 hover:bg-zinc-700 transition-colors"
            >
              Go to Therapy Planner <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto p-8 lg:p-10 animate-in fade-in duration-300">
            {/* ── Report Header ─────────────────────── */}
            <div className="flex flex-col lg:flex-row justify-between items-start gap-6 mb-8">
              <div className="flex gap-4 items-center">
                <div className="w-14 h-14 bg-zinc-900 text-white flex items-center justify-center text-xl font-bold rounded-xl shrink-0">
                  {selectedPatient?.fullName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold text-zinc-900">{selectedPatient?.fullName}</h1>
                    <Dsm5Badge level={clinicalReport.therapy_metadata?.severity_level ?? 1} />
                    {selectedPatient?.isLatestClinicalReportPublished && (
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium rounded-full flex items-center gap-1">
                        <Check size={10} /> Published to Caregiver
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-zinc-400">
                    <span className="flex items-center gap-1"><Clock size={12} /> Last updated: {new Date(clinicalReport.generated_at).toLocaleDateString()}</span>
                    <span className="bg-zinc-100 px-2 py-0.5 rounded">MRN: {selectedPatient?.mrn}</span>
                    <span className="bg-zinc-100 px-2 py-0.5 rounded capitalize">Gender: {selectedPatient?.gender}</span>
                    <span className="bg-zinc-100 px-2 py-0.5 rounded">
                      {clinicalReport.sessions_included?.length || 0} sessions analyzed
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap shrink-0">
                <div className="relative group/export z-20">
                  <button
                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                    disabled={generateReport.isPending}
                    className="px-4 py-2.5 border border-zinc-300 text-zinc-700 text-xs font-semibold rounded-lg hover:bg-zinc-50 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
                  >
                    {generateReport.isPending ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                    EXPORT PDF
                  </button>
                  {isExportMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-zinc-200 rounded-lg shadow-xl overflow-hidden text-xs py-1">
                      <button onClick={() => handleDownloadPDF('aggregated_outcome')} className="w-full text-left px-4 py-3 hover:bg-zinc-50 border-b border-zinc-100 font-semibold text-zinc-900 transition-colors">
                        Full Aggregated Report
                      </button>
                      <button onClick={() => handleDownloadPDF('clinical_summary')} className="w-full text-left px-4 py-3 hover:bg-zinc-50 border-b border-zinc-100 font-semibold text-zinc-700 transition-colors">
                        Clinical Narrative Only
                      </button>
                      <button onClick={() => handleDownloadPDF('therapy_plan')} className="w-full text-left px-4 py-3 hover:bg-zinc-50 font-semibold text-zinc-700 transition-colors">
                        Therapy Recommendations Only
                      </button>
                    </div>
                  )}
                </div>
                 <button
                  onClick={handlePublish}
                  disabled={publishReport.isPending || selectedPatient?.isLatestClinicalReportPublished}
                  className={`px-4 py-2.5 text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors ${
                    selectedPatient?.isLatestClinicalReportPublished
                      ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                      : "bg-zinc-900 text-white hover:bg-zinc-700"
                  }`}
                >
                  {publishReport.isPending ? <Loader2 size={13} className="animate-spin" /> :
                   selectedPatient?.isLatestClinicalReportPublished ? <Check size={13} /> :
                   <Share2 size={13} />}
                  {selectedPatient?.isLatestClinicalReportPublished ? "Published" : "Send to Caregiver"}
                </button>

                {selectedPatient?.isLatestClinicalReportPublished && (
                  <button
                    onClick={handleResend}
                    disabled={resendReport.isPending}
                    className="px-4 py-2.5 text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 shadow-sm"
                  >
                    {resendReport.isPending ? <Loader2 size={13} className="animate-spin" /> : <Share2 size={13} />}
                    Resend to Caregiver
                  </button>
                )}
              </div>
            </div>

            {/* ── Tabs ──────────────────────────────── */}
            <div className="flex border border-zinc-200 rounded-xl overflow-hidden mb-8 bg-zinc-50">
              <button
                onClick={() => setActiveTab("ai")}
                className={`flex-1 py-3 text-xs font-semibold transition-all flex items-center justify-center gap-2 rounded-xl ${
                  activeTab === "ai"
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100"
                }`}
              >
                <Video size={14} /> AI Analysis Results
              </button>
              <button
                onClick={() => setActiveTab("therapy")}
                className={`flex-1 py-3 text-xs font-semibold transition-all flex items-center justify-center gap-2 rounded-xl ${
                  activeTab === "therapy"
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100"
                }`}
              >
                <Brain size={14} /> Therapy Planner Report
              </button>
            </div>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* THERAPY PLANNER TAB                                           */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {activeTab === "therapy" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
                {/* Left: Narrative + Therapies */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Clinical Narrative */}
                  <div className="border border-zinc-200 rounded-xl bg-white overflow-hidden shadow-sm">
                    <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-100 bg-zinc-50">
                      <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
                        <BookOpen size={16} className="text-zinc-500" /> Clinical Narrative
                      </h3>
                      <div className="flex items-center gap-3">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => { setIsEditing(false); setEditedNarrative(clinicalReport?.clinical_report || ""); }}
                              className="text-xs text-zinc-500 hover:text-zinc-800 flex items-center gap-1 transition-colors"
                            >
                              <X size={13} /> Cancel
                            </button>
                            <button
                              onClick={handleSaveEdits}
                              disabled={updateReport.isPending}
                              className="bg-zinc-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-zinc-700 disabled:opacity-50"
                            >
                              {updateReport.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                              Save Edits
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setIsEditing(true)}
                            className="text-xs text-zinc-600 border border-zinc-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-zinc-50 hover:border-zinc-500 transition-all"
                          >
                            <Edit3 size={12} /> Edit Narrative
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-6">
                      {isEditing ? (
                        <div className="space-y-2">
                          <p className="text-xs text-zinc-400 mb-2">You can use Markdown: **bold**, ### headings, * bullets</p>
                          <textarea
                            value={editedNarrative}
                            onChange={(e) => setEditedNarrative(e.target.value)}
                            className="w-full min-h-[420px] p-4 border border-zinc-200 rounded-lg font-mono text-sm text-zinc-800 leading-6 focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-y bg-zinc-50"
                          />
                        </div>
                      ) : (
                        <div className="prose max-w-none">
                          {renderMarkdown(clinicalReport.clinical_report || "")}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recommended Therapies */}
                  {clinicalReport.therapies_recommended && clinicalReport.therapies_recommended.length > 0 && (
                    <div className="border border-zinc-200 rounded-xl bg-white overflow-hidden shadow-sm">
                      <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50">
                        <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
                          <Target size={16} className="text-zinc-500" /> Targeted Interventions
                        </h3>
                      </div>
                      <div className="p-6 space-y-4">
                        {clinicalReport.therapies_recommended
                          .filter((t) =>
                            !t.therapy_name.includes("Kinematic") &&
                            !t.therapy_name.includes("RAG") &&
                            !t.therapy_name.includes("Details")
                          )
                          .map((therapy, i) => (
                            <div key={i} className="border border-zinc-200 rounded-lg bg-white hover:border-zinc-400 hover:shadow-sm transition-all overflow-hidden">
                              <div className="flex items-center justify-between px-5 py-3 bg-zinc-50 border-b border-zinc-100">
                                <h4 className="text-sm font-semibold text-zinc-800">{therapy.therapy_name}</h4>
                                {therapy.relevance_score != null && (
                                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                                    {(therapy.relevance_score * 100).toFixed(0)}% match
                                  </span>
                                )}
                              </div>
                              <div className="px-5 py-4">
                                <div className="prose max-w-none text-sm">
                                  {renderMarkdown(therapy.summary || "")}
                                </div>
                                {therapy.intervention_targets && (
                                  <div className="mt-3 flex items-start gap-2">
                                    <Target size={13} className="text-zinc-400 mt-0.5 shrink-0" />
                                    <p className="text-xs text-zinc-500 leading-relaxed">{therapy.intervention_targets}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: EBM + Stats */}
                <div className="space-y-6">
                  {/* Stats panel */}
                  <div className="border border-zinc-200 rounded-xl bg-white p-5 shadow-sm space-y-4">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                      <BarChart3 size={14} /> Aggregate Summary
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-zinc-50">
                        <span className="text-xs text-zinc-500">Analyzed Sessions</span>
                        <span className="text-sm font-bold text-zinc-900">{clinicalReport.sessions_included?.length || 0}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-zinc-50">
                        <span className="text-xs text-zinc-500">DSM-5 Severity</span>
                        <span className="text-sm font-bold text-zinc-900 capitalize">{clinicalReport.therapy_metadata?.severity_label || "Level 1"}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-zinc-50">
                        <span className="text-xs text-zinc-500">RAG Confidence</span>
                        <span className="text-sm font-bold text-zinc-900">
                          {clinicalReport.therapy_metadata?.confidence != null
                            ? `${(clinicalReport.therapy_metadata.confidence * 100).toFixed(0)}%`
                            : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-xs text-zinc-500">Therapies Found</span>
                        <span className="text-sm font-bold text-zinc-900">{clinicalReport.therapies_recommended?.length || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* EBM Evidence */}
                  {clinicalReport.retrieved_chunks && clinicalReport.retrieved_chunks.length > 0 && (
                    <div className="border border-zinc-200 rounded-xl bg-white overflow-hidden shadow-sm">
                      <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50">
                        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                          <ShieldAlert size={14} /> EBM References
                        </h3>
                      </div>
                      <div className="p-4 space-y-3">
                        {clinicalReport.retrieved_chunks.slice(0, 4).map((chunk, i) => (
                          <div key={i} className="bg-zinc-50 border border-zinc-100 rounded-lg p-3">
                            <p className="text-[10px] font-semibold text-zinc-400 uppercase mb-1">
                              {(chunk as any).metadata?.source || (chunk as any).source || "Reference Library"}
                            </p>
                            <p className="text-xs text-zinc-600 leading-relaxed line-clamp-4 italic">
                              "{(chunk as any).text}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sessions footprint */}
                  {clinicalReport.sessions_included && clinicalReport.sessions_included.length > 0 && (
                    <div className="border border-zinc-200 rounded-xl bg-white overflow-hidden shadow-sm">
                      <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50">
                        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                          <Layers size={14} /> Sessions Included
                        </h3>
                      </div>
                      <div className="p-3 space-y-2">
                        {clinicalReport.sessions_included.map((s: any, i: number) => (
                          <div key={i} className="flex items-center justify-between px-3 py-2 bg-zinc-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Video size={12} className="text-zinc-400" />
                              <span className="text-xs text-zinc-600 capitalize">{s.actionType?.replace("_", " ") || "Clinical Session"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-zinc-400">{new Date(s.recordedAt).toLocaleDateString()}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${s.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                                {s.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* AI ANALYSIS TAB                                               */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {activeTab === "ai" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                    <Activity size={16} className="text-zinc-400" /> Session Analysis History
                  </h3>
                  <span className="text-xs text-zinc-400 bg-zinc-100 px-3 py-1 rounded-full">
                    {analyzedSessions.length} analyzed session{analyzedSessions.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {isLoadingSessions ? (
                  <div className="flex items-center justify-center p-16">
                    <Loader2 className="animate-spin text-zinc-400" size={32} />
                  </div>
                ) : analyzedSessions.length === 0 ? (
                  <div className="p-16 text-center border-2 border-dashed border-zinc-200 rounded-xl">
                    <Video size={40} className="text-zinc-200 mx-auto mb-3" />
                    <p className="text-sm text-zinc-400 font-medium">No analyzed sessions yet</p>
                    <p className="text-xs text-zinc-300 mt-1">Sessions must be analyzed by AI first</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analyzedSessions.map((session) => {
                      const sev = session.ensemblePrediction?.severity;
                      const sevColor = severityColor(sev);
                      // aiConfidence is already 0–100
                      const confidencePct = session.aiConfidence != null ? session.aiConfidence : null;

                      return (
                        <div key={session.id} className="border border-zinc-200 rounded-xl bg-white hover:border-zinc-400 hover:shadow-md transition-all overflow-hidden">
                          {/* Session header */}
                          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-zinc-200 rounded-lg flex items-center justify-center">
                                <Video size={16} className="text-zinc-600" />
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-zinc-900 capitalize">
                                  {session.actionType?.replace(/_/g, " ") || "Clinical Session"}
                                </h4>
                                <p className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                                  <Calendar size={10} />
                                  {new Date(session.recordedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${sevColor.bg} ${sevColor.text} ${sevColor.border}`}>
                                DSM-5 Level {sev ?? "—"}
                              </span>
                              <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${session.status === "published" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-zinc-100 text-zinc-500"}`}>
                                {session.status?.replace(/_/g, " ")}
                              </span>
                            </div>
                          </div>

                          {/* Metrics row */}
                          <div className="grid grid-cols-3 divide-x divide-zinc-100 px-2 py-3">
                            <div className="px-4 text-center">
                              <p className="text-[10px] text-zinc-400 mb-1">AI Confidence</p>
                              <p className="text-lg font-bold text-zinc-900">
                                {confidencePct != null ? `${confidencePct}%` : "—"}
                              </p>
                              {confidencePct != null && (
                                <div className="mt-1.5 w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                                  <div className="h-full bg-zinc-900 rounded-full" style={{ width: `${Math.min(confidencePct, 100)}%` }} />
                                </div>
                              )}
                            </div>
                            <div className="px-4 text-center">
                              <p className="text-[10px] text-zinc-400 mb-1">Social Affect</p>
                              <p className="text-lg font-bold text-zinc-900">
                                {session.ensemblePrediction?.social_affect != null
                                  ? session.ensemblePrediction.social_affect.toFixed(1)
                                  : "—"}
                              </p>
                              <p className="text-[9px] text-zinc-400 mt-0.5">ADOS-2 score</p>
                            </div>
                            <div className="px-4 text-center">
                              <p className="text-[10px] text-zinc-400 mb-1">RRB Score</p>
                              <p className="text-lg font-bold text-zinc-900">
                                {session.ensemblePrediction?.rrb != null
                                  ? session.ensemblePrediction.rrb.toFixed(1)
                                  : "—"}
                              </p>
                              <p className="text-[9px] text-zinc-400 mt-0.5">ADOS-2 score</p>
                            </div>
                          </div>

                          {/* Session AI summary */}
                          {session.aiAnalysis?.summary && (
                            <div className="px-6 pb-4">
                              <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-100">
                                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">AI Summary</p>
                                <p className="text-sm text-zinc-700 leading-relaxed">{session.aiAnalysis.summary}</p>
                              </div>
                            </div>
                          )}

                          {/* Behaviors */}
                          {session.aiAnalysis?.behaviors && session.aiAnalysis.behaviors.length > 0 && (
                            <div className="px-6 pb-5">
                              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">Behavioral Markers</p>
                              <div className="flex flex-wrap gap-2">
                                {session.aiAnalysis.behaviors.map((b: any, bi: number) => (
                                  <span
                                    key={bi}
                                    className={`text-xs px-3 py-1 rounded-full font-medium border ${
                                      b.severity === "High"
                                        ? "bg-red-50 text-red-700 border-red-200"
                                        : b.severity === "Medium"
                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                        : "bg-green-50 text-green-700 border-green-200"
                                    }`}
                                  >
                                    {b.type} ({b.severity})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Recommendations */}
                          {session.aiAnalysis?.recommendations && session.aiAnalysis.recommendations.length > 0 && (
                            <div className="px-6 pb-5 border-t border-zinc-100 pt-4">
                              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">Clinical Recommendations</p>
                              <ul className="space-y-1.5">
                                {session.aiAnalysis.recommendations.map((rec: string, ri: number) => (
                                  <li key={ri} className="flex items-start gap-2 text-sm text-zinc-700">
                                    <span className="mt-2 w-2 h-2 bg-zinc-900 shrink-0"></span>
                                    {rec}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
