import React, { useState } from "react";
import {
  FileText,
  Download,
  Eye,
  Lock,
  ShieldCheck,
  Loader2,
  FileCheck2,
} from "lucide-react";
import toast from "../../../lib/toast";
import { useVideoSessions, useGenerateReport, useDeleteVideoSession, useUnpublishPatientClinicalReport } from "../../../api/clinical";
import { useCaregiverPatients } from "../../../api/patient";
import { Trash2 } from "lucide-react";

export default function CaregiverReportsScreen() {
  const { data: sessionsData, isLoading: sessionsLoading } = useVideoSessions();
  const { data: patientsData, isLoading: patientsLoading } = useCaregiverPatients();
  const generateReport = useGenerateReport();
  const deleteSession = useDeleteVideoSession();
  const unpublishReport = useUnpublishPatientClinicalReport();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sessions = sessionsData?.sessions || [];
  const publishedSessions = sessions.filter(
    (s: any) => s.status === "published",
  );

  const patients = Array.isArray(patientsData) ? patientsData : (patientsData as any)?.patients || [];
  const patient = patients[0]; // Assuming one patient for now
  const hasPublishedAggregatedReport = patient?.isLatestClinicalReportPublished && patient?.latestClinicalReport;

  const handleDownload = async (report: any, isAggregated = false) => {
    const reportId = isAggregated ? `agg_${patient?.id}` : report.id;
    setDownloadingId(reportId);
    const toastId = toast.loading(isAggregated ? "Generating Aggregated Clinical Report..." : "Generating PDF report...");

    try {
      const blob = await generateReport.mutateAsync({
        patientId: isAggregated ? patient?.id : report.patientId,
        sessionId: isAggregated ? undefined : report.id,
        includeGoals: isAggregated,
        includeCharts: true,
        includeTables: isAggregated,
        includeNotes: true,
        watermark: true,
        reportType: isAggregated ? "clinical_summary" : "session",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const name = (patient?.fullName || "Patient").replace(/\s+/g, "_");
      const filename = isAggregated 
        ? `Aggregated_Clinical_Report_${name}_${new Date().toISOString().split("T")[0]}.pdf`
        : `Session_Report_${name}_${report.id}_${new Date().toISOString().split("T")[0]}.pdf`;
      
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Report downloaded successfully!", { id: toastId });
    } catch (error) {
      console.error("PDF Generation failed", error);
      toast.error("Failed to generate report. Please try again.", {
        id: toastId,
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePreview = async (report: any, isAggregated = false) => {
    const reportId = isAggregated ? `agg_${patient?.id}` : report.id;
    setDownloadingId(reportId);
    const toastId = toast.loading("Generating preview...");

    try {
      const blob = await generateReport.mutateAsync({
        patientId: isAggregated ? patient?.id : report.patientId,
        sessionId: isAggregated ? undefined : report.id,
        includeGoals: isAggregated,
        includeCharts: true,
        includeTables: isAggregated,
        includeNotes: true,
        watermark: true,
        reportType: isAggregated ? "clinical_summary" : "session",
      });

      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");

      toast.success("Preview opened in new tab", { id: toastId });
    } catch (error) {
      console.error("PDF Preview failed", error);
      toast.error("Failed to generate preview. Please try again.", {
        id: toastId,
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm("Are you sure you want to delete this report? This action cannot be undone.")) {
      return;
    }

    setDeletingId(sessionId);
    const toastId = toast.loading("Deleting session report...");

    try {
      await deleteSession.mutateAsync(sessionId);
      toast.success("Report deleted successfully", { id: toastId });
    } catch (error) {
      console.error("Failed to delete session", error);
      toast.error("Failed to delete report. Please try again.", { id: toastId });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAggregatedReport = async () => {
    if (!patient?.id) return;
    if (!window.confirm("Are you sure you want to hide the comprehensive clinical summary? You will need to contact your therapist to restore it.")) {
      return;
    }

    setDeletingId(`agg_${patient?.id}`);
    const toastId = toast.loading("Hiding clinical summary...");

    try {
      await unpublishReport.mutateAsync(patient.id);
      toast.success("Clinical summary hidden successfully", { id: toastId });
    } catch (error) {
      console.error("Failed to hide clinical summary", error);
      toast.error("Failed to hide summary. Please try again.", { id: toastId });
    } finally {
      setDeletingId(null);
    }
  };

  const isLoading = sessionsLoading || patientsLoading;

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-mono selection:bg-zinc-100 p-8 md:p-12 animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-12 border-b border-zinc-100 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-400 mb-2">
              SHARED DOCUMENTATION
            </h3>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">
              Clinical Reports
            </h1>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-2 underline decoration-zinc-100 underline-offset-4">
              SECURE LINK TO THERAPIST ANALYSIS
            </p>
          </div>
          <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-100 px-4 py-2 text-[10px] font-black uppercase text-zinc-500 tracking-widest">
            <Lock size={12} className="text-zinc-900" /> Secure Access Only
          </div>
        </header>

        {/* Global Notice */}
        <div className="mb-12 border-l-4 border-zinc-900 bg-zinc-50 p-6 flex items-start gap-4">
          <ShieldCheck className="text-zinc-900 mt-0.5" size={20} />
          <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed text-zinc-600">
            These diagnostic summaries have been shared by your primary
            therapist. Technical metrics are processed for caregiver
            readability. Contact support if document integrity is compromised.
          </p>
        </div>

        {/* Aggregated Report Section */}
        {hasPublishedAggregatedReport && (
          <div className="mb-12">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-6 flex items-center gap-2">
              CONSOLIDATED TREATMENT OVERVIEW
            </h3>
            <div className="border border-zinc-900 p-8 flex flex-col md:flex-row md:items-center justify-between gap-8 bg-zinc-900 text-white relative group">
              <div className="absolute top-0 right-0 p-1">
                <FileCheck2 size={16} className="text-zinc-700" />
              </div>

              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white flex items-center justify-center text-zinc-900">
                  <ShieldCheck size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight mb-2">
                    Comprehensive Clinical Summary
                  </h3>
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                    <span>
                      LAST UPDATED:{" "}
                      {patient.latestClinicalReportPublishedAt
                        ? new Date(patient.latestClinicalReportPublishedAt).toLocaleDateString()
                        : "RECENT"}
                    </span>
                    <span className="text-white">STATUS: APPROVED FOR CAREGIVER</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handlePreview(null, true)}
                  disabled={!!downloadingId}
                  className="flex items-center gap-3 border border-white text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-zinc-900 transition-all disabled:opacity-50"
                >
                  {downloadingId === `agg_${patient?.id}` ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Eye size={14} />
                  )}{" "}
                  View Report
                </button>
                <button
                  onClick={() => handleDownload(null, true)}
                  disabled={!!downloadingId}
                  className="flex items-center gap-3 bg-white text-zinc-900 px-8 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 transition-all disabled:opacity-50"
                >
                  {downloadingId === `agg_${patient?.id}` ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}{" "}
                  Get PDF
                </button>
                <button
                  onClick={handleDeleteAggregatedReport}
                  disabled={!!deletingId}
                  className="flex items-center justify-center w-12 h-12 border border-zinc-700 text-zinc-400 hover:text-red-500 hover:border-red-500 transition-all disabled:opacity-50"
                  title="Hide Report"
                >
                  {deletingId === `agg_${patient?.id}` ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reports Registry */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-6 flex items-center gap-2">
            INDIVIDUAL SESSION REGISTRY
          </h3>

          {isLoading ? (
            <div className="py-12 flex justify-center text-zinc-400">
              <span className="text-xs uppercase tracking-widest font-black animate-pulse text-zinc-500">
                Retrieving Secure Documents...
              </span>
            </div>
          ) : publishedSessions.length === 0 && !hasPublishedAggregatedReport ? (
            <div className="border border-zinc-100 p-12 text-center bg-zinc-50">
              <FileText size={32} className="mx-auto text-zinc-300 mb-4" />
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500">
                No Published Reports Available
              </h3>
              <p className="text-[10px] font-bold text-zinc-400 mt-2 uppercase">
                Your therapist has not published any clinical reports yet.
              </p>
            </div>
          ) : (
            publishedSessions.map((report: any) => {
              const isProcessing = downloadingId === report.id;
              return (
                <div
                  key={report.id}
                  className="border border-zinc-100 p-8 flex flex-col md:flex-row md:items-center justify-between gap-8 hover:bg-zinc-50 hover:border-zinc-300 transition-all group relative"
                >
                  {/* Corner Accent */}
                  <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100">
                    <div className="w-1.5 h-1.5 bg-zinc-900"></div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 group-hover:text-zinc-900 group-hover:border-zinc-900 transition-colors">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-tight mb-2 group-hover:translate-x-1 transition-transform">
                        {report.actionType
                          ? report.actionType.replace("_", " ") + " Analysis"
                          : "Session Review"}
                      </h3>
                      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                        <span>
                          DATE RELEASED:{" "}
                          {report.publishedAt
                            ? new Date(report.publishedAt).toLocaleDateString()
                            : "UNKNOWN"}
                        </span>
                        <span>PATIENT: {report.patientName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(report);
                      }}
                      disabled={!!downloadingId}
                      className="flex items-center gap-3 border border-zinc-900 text-zinc-900 px-6 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 transition-all disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Eye size={14} />
                      )}{" "}
                      Preview
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(report);
                      }}
                      disabled={!!downloadingId}
                      className="flex items-center gap-3 bg-zinc-900 text-white px-8 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-50 shadow-lg shadow-zinc-900/10"
                    >
                      {isProcessing ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Download size={14} />
                      )}{" "}
                      Download
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSession(report.id);
                      }}
                      disabled={!!deletingId}
                      className="flex items-center justify-center w-12 h-12 border border-zinc-100 text-zinc-300 hover:text-red-600 hover:border-red-600 transition-all disabled:opacity-50"
                      title="Delete Report"
                    >
                      {deletingId === report.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Metadata */}
        <footer className="mt-24 pt-8 border-t border-zinc-100 flex justify-between">
          <div className="text-[8px] font-black text-zinc-300 uppercase tracking-[0.5em]">
            SYSTEM FS EXT4 | ENCRYPTED
          </div>
          <div className="text-[8px] font-black text-zinc-300 uppercase tracking-[0.5em]">
            HASH CHECK OK
          </div>
        </footer>
      </div>
    </div>
  );
}
